import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Search } from "lucide-react";
import { api, type Paginated, type ShopDetail, type ShopListItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

export default function ShopsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ShopListItem | null>(null);

  const list = useQuery({
    queryKey: ["shops", page, search],
    queryFn: () =>
      api.get<Paginated<ShopListItem>>(
        `/api/admin/shops?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const detail = useQuery({
    queryKey: ["shop", openId],
    queryFn: () => api.get<ShopDetail>(`/api/admin/shops/${openId}`),
    enabled: !!openId,
  });

  const toggleOpen = useMutation({
    mutationFn: (vars: { id: string; isOpen: boolean }) =>
      api.patch<ShopListItem>(`/api/admin/shops/${vars.id}`, { isOpen: vars.isOpen }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["shop"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/shops/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Boutique supprimée" });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<ShopListItem>[] = [
    {
      key: "name",
      header: "Nom",
      cell: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          {s.marketName ? (
            <div className="text-xs text-muted-foreground">{s.marketName}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "seller",
      header: "Vendeur",
      cell: (s) =>
        s.seller ? (
          <div>
            <div>{s.seller.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{s.seller.email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "open",
      header: "Statut",
      cell: (s) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={s.isOpen}
            onCheckedChange={(checked) => toggleOpen.mutate({ id: s.id, isOpen: checked })}
            data-testid={`switch-open-${s.id}`}
          />
          <Badge variant={s.isOpen ? "default" : "secondary"}>
            {s.isOpen ? "Ouverte" : "Fermée"}
          </Badge>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Création",
      cell: (s) => new Date(s.createdAt).toLocaleDateString("fr-FR"),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (s) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(s);
          }}
          data-testid={`button-delete-${s.id}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Boutiques"
        description="Toutes les boutiques NearBuy"
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
                placeholder="Rechercher (nom, marché)…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 w-72"
                data-testid="input-search-shops"
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
        onRowClick={(s) => setOpenId(s.id)}
        testId="table-shops"
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
            <DialogTitle>Détails boutique</DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <div className="text-muted-foreground py-8 text-center">Chargement…</div>
          ) : detail.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom" value={detail.data.shop.name} />
                <Field label="Marché" value={detail.data.shop.marketName} />
                <Field label="Stand" value={detail.data.shop.stallInfo} />
                <Field
                  label="Coordonnées"
                  value={`${detail.data.shop.location.coordinates[1].toFixed(5)}, ${detail.data.shop.location.coordinates[0].toFixed(5)}`}
                  mono
                />
                <Field label="Produits" value={String(detail.data.productsCount)} />
                <Field label="Conversations" value={String(detail.data.conversationsCount)} />
              </div>

              <div>
                <div className="font-medium mb-2">Membres ({detail.data.members.length})</div>
                {detail.data.members.length === 0 ? (
                  <div className="text-muted-foreground">Aucun membre</div>
                ) : (
                  <div className="space-y-1">
                    {detail.data.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between border border-card-border rounded-md px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{m.name ?? m.email ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                        <Badge variant={m.role === "seller" ? "default" : "secondary"}>
                          {m.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la boutique ?</DialogTitle>
            <DialogDescription>
              "{confirmDelete?.name}" et tous ses produits seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              data-testid="button-confirm-delete-shop"
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
