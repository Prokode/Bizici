import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api, type Broadcast, type Paginated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";

const STATUS_VARIANT: Record<Broadcast["status"], "default" | "secondary"> = {
  active: "default",
  found: "secondary",
  expired: "secondary",
};

export default function BroadcastsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Broadcast | null>(null);

  const list = useQuery({
    queryKey: ["broadcasts", page],
    queryFn: () =>
      api.get<Paginated<Broadcast>>(`/api/admin/broadcasts?page=${page}&pageSize=20`),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/broadcasts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcasts"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: t("broadcasts.deleted") });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const columns: Column<Broadcast>[] = [
    { key: "query", header: t("broadcasts.query"), cell: (b) => b.query },
    {
      key: "status",
      header: t("broadcasts.status"),
      cell: (b) => <Badge variant={STATUS_VARIANT[b.status]}>{t(`broadcasts.${b.status}`)}</Badge>,
    },
    {
      key: "location",
      header: t("broadcasts.location"),
      cell: (b) => (
        <span className="font-mono text-xs">
          {b.location.coordinates[1].toFixed(4)}, {b.location.coordinates[0].toFixed(4)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: t("broadcasts.createdOn"),
      cell: (b) => new Date(b.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (b) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmDelete(b)}
          data-testid={`button-delete-${b.id}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t("broadcasts.title")} description={t("broadcasts.description")} />

      <DataTable rows={list.data?.items ?? []} columns={columns} loading={list.isLoading} testId="table-broadcasts" />
      {list.data ? (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("broadcasts.confirmDeleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
            >
              {del.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
