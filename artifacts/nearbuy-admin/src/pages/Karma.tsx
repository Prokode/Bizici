import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type KarmaEvent, type Paginated } from "@/lib/api";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export default function KarmaPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["karma-events", page],
    queryFn: () =>
      api.get<Paginated<KarmaEvent>>(`/api/admin/karma-events?page=${page}&pageSize=30`),
  });

  const columns: Column<KarmaEvent>[] = [
    {
      key: "user",
      header: t("karma.user"),
      cell: (k) =>
        k.user ? (
          <div>
            <div>{k.user.name ?? t("common.dash")}</div>
            <div className="text-xs text-muted-foreground">{k.user.email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">{t("common.deleted")}</span>
        ),
    },
    { key: "kind", header: t("karma.event"), cell: (k) => <code className="text-xs">{k.kind}</code> },
    {
      key: "points",
      header: t("karma.points"),
      cell: (k) => (
        <span className={cn("font-medium", k.points >= 0 ? "text-green-600" : "text-destructive")}>
          {k.points >= 0 ? "+" : ""}
          {k.points}
        </span>
      ),
    },
    {
      key: "note",
      header: t("karma.note"),
      cell: (k) => k.note ?? <span className="text-muted-foreground">{t("common.dash")}</span>,
    },
    {
      key: "createdAt",
      header: t("karma.date"),
      cell: (k) => new Date(k.createdAt).toLocaleString(locale),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t("karma.title")} description={t("karma.description")} />
      <DataTable rows={list.data?.items ?? []} columns={columns} loading={list.isLoading} testId="table-karma" />
      {list.data ? (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </PageContainer>
  );
}
