import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type KarmaEvent, type Paginated } from "@/lib/api";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export default function KarmaPage() {
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["karma-events", page],
    queryFn: () =>
      api.get<Paginated<KarmaEvent>>(`/api/admin/karma-events?page=${page}&pageSize=30`),
  });

  const columns: Column<KarmaEvent>[] = [
    {
      key: "user",
      header: "Utilisateur",
      cell: (k) =>
        k.user ? (
          <div>
            <div>{k.user.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{k.user.email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">[supprimé]</span>
        ),
    },
    { key: "kind", header: "Évènement", cell: (k) => <code className="text-xs">{k.kind}</code> },
    {
      key: "points",
      header: "Points",
      cell: (k) => (
        <span className={cn("font-medium", k.points >= 0 ? "text-green-600" : "text-destructive")}>
          {k.points >= 0 ? "+" : ""}
          {k.points}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note",
      cell: (k) => k.note ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (k) => new Date(k.createdAt).toLocaleString("fr-FR"),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Karma" description="Évènements de réputation des utilisateurs" />
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
