import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Search, Sparkles } from "lucide-react";
import { api, type Paginated, type UserDetail, type UserListItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";

export default function UsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserListItem | null>(null);

  const list = useQuery({
    queryKey: ["users", page, search],
    queryFn: () =>
      api.get<Paginated<UserListItem>>(
        `/api/admin/users?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const detail = useQuery({
    queryKey: ["user", openId],
    queryFn: () => api.get<UserDetail>(`/api/admin/users/${openId}`),
    enabled: !!openId,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Utilisateur supprimé" });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<UserListItem>[] = [
    { key: "name", header: "Nom", cell: (u) => u.name ?? <span className="text-muted-foreground">—</span> },
    { key: "email", header: "Email", cell: (u) => u.email ?? <span className="text-muted-foreground">—</span> },
    {
      key: "createdAt",
      header: "Inscription",
      cell: (u) => new Date(u.createdAt).toLocaleDateString("fr-FR"),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (u) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(u);
          }}
          data-testid={`button-delete-${u.id}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs"
        description="Tous les comptes clients NearBuy"
        actions={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, email)…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 w-72"
                data-testid="input-search"
              />
            </div>
            <Button type="submit" variant="outline">Filtrer</Button>
          </form>
        }
      />

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        onRowClick={(u) => setOpenId(u.id)}
        testId="table-users"
      />
      {list.data ? (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails utilisateur</DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <div className="text-muted-foreground py-8 text-center">Chargement…</div>
          ) : detail.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom" value={detail.data.user.name} />
                <Field label="Email" value={detail.data.user.email} />
                <Field label="Clerk ID" value={detail.data.user.clerkUserId} mono />
                <Field
                  label="Inscription"
                  value={new Date(detail.data.user.createdAt).toLocaleString("fr-FR")}
                />
              </div>

              <div>
                <div className="font-medium mb-2">Boutiques possédées ({detail.data.shopsOwned.length})</div>
                {detail.data.shopsOwned.length === 0 ? (
                  <div className="text-muted-foreground">Aucune</div>
                ) : (
                  <div className="space-y-1">
                    {detail.data.shopsOwned.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between border border-card-border rounded-md px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{s.name}</div>
                          {s.marketName ? (
                            <div className="text-xs text-muted-foreground">{s.marketName}</div>
                          ) : null}
                        </div>
                        <Badge variant={s.isOpen ? "default" : "secondary"}>
                          {s.isOpen ? "Ouverte" : "Fermée"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Sparkles className="size-4 text-primary" />
                  Karma — total : {detail.data.karma.total}
                </div>
                {detail.data.karma.recent.length === 0 ? (
                  <div className="text-muted-foreground">Aucun évènement récent</div>
                ) : (
                  <div className="space-y-1">
                    {detail.data.karma.recent.map((k) => (
                      <div key={k.id} className="flex items-center justify-between text-xs border-b border-card-border py-1.5 last:border-0">
                        <div>
                          <span className="font-medium">{k.kind}</span>
                          {k.note ? <span className="text-muted-foreground ml-2">{k.note}</span> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={k.points >= 0 ? "text-green-600" : "text-destructive"}>
                            {k.points >= 0 ? "+" : ""}{k.points}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(k.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {detail.data.conversationsCount} conversation(s)
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'utilisateur ?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.email ?? confirmDelete?.name} sera définitivement supprimé. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              data-testid="button-confirm-delete"
            >
              {del.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : ""}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
