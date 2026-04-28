import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      toast({ title: "Invitation supprimée" });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<Invitation>[] = [
    { key: "email", header: "Email", cell: (i) => i.email },
    { key: "role", header: "Rôle", cell: (i) => <Badge variant="secondary">{i.role}</Badge> },
    { key: "shop", header: "Boutique", cell: (i) => i.shop.name },
    {
      key: "status",
      header: "Statut",
      cell: (i) =>
        i.acceptedAt ? (
          <Badge>Acceptée le {new Date(i.acceptedAt).toLocaleDateString("fr-FR")}</Badge>
        ) : (
          <Badge variant="secondary">En attente</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Créée le",
      cell: (i) => new Date(i.createdAt).toLocaleDateString("fr-FR"),
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
      <PageHeader title="Invitations" description="Invitations envoyées aux vendeurs et sous-vendeurs" />

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
            <DialogTitle>Supprimer l'invitation ?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
            >
              {del.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
