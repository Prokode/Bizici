import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api, type Invitation, type Paginated } from "@/lib/api";
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

export default function InvitationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Invitation | null>(null);

  const list = useQuery({
    queryKey: ["invitations", page],
    queryFn: () =>
      api.get<Paginated<Invitation>>(`/api/admin/invitations?page=${page}&pageSize=20`),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: t("invitations.deleted") });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const columns: Column<Invitation>[] = [
    { key: "email", header: t("invitations.email"), cell: (i) => i.email },
    {
      key: "role",
      header: t("invitations.role"),
      cell: (i) => (
        <Badge variant="secondary">{t(`admins.memberRoles.${i.role}`, { defaultValue: i.role })}</Badge>
      ),
    },
    { key: "shop", header: t("invitations.shop"), cell: (i) => i.shop.name },
    {
      key: "status",
      header: t("invitations.status"),
      cell: (i) =>
        i.acceptedAt ? (
          <Badge>{t("invitations.acceptedOn", { date: new Date(i.acceptedAt).toLocaleDateString(locale) })}</Badge>
        ) : (
          <Badge variant="secondary">{t("invitations.pending")}</Badge>
        ),
    },
    {
      key: "createdAt",
      header: t("invitations.createdOn"),
      cell: (i) => new Date(i.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (i) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmDelete(i)}
          data-testid={`button-delete-${i.id}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t("invitations.title")} description={t("invitations.description")} />

      <DataTable rows={list.data?.items ?? []} columns={columns} loading={list.isLoading} testId="table-invitations" />
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
            <DialogTitle>{t("invitations.confirmDeleteTitle")}</DialogTitle>
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
