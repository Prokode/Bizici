import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const STATUS_LABEL: Record<Broadcast["status"], { label: string; variant: "default" | "secondary" }> = {
  active: { label: "Active", variant: "default" },
  found: { label: "Trouvée", variant: "secondary" },
  expired: { label: "Expirée", variant: "secondary" },
};

export default function BroadcastsPage() {
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
      toast({ title: "Recherche supprimée" });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<Broadcast>[] = [
    { key: "query", header: "Recherche", cell: (b) => b.query },
    {
      key: "status",
      header: "Statut",
      cell: (b) => <Badge variant={STATUS_LABEL[b.status].variant}>{STATUS_LABEL[b.status].label}</Badge>,
    },
    {
      key: "location",
      header: "Localisation",
      cell: (b) => (
        <span className="font-mono text-xs">
          {b.location.coordinates[1].toFixed(4)}, {b.location.coordinates[0].toFixed(4)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Créée le",
      cell: (b) => new Date(b.createdAt).toLocaleDateString("fr-FR"),
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
      <PageHeader title="Recherches diffusées" description="Demandes lancées par les clients" />

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
            <DialogTitle>Supprimer la recherche ?</DialogTitle>
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
