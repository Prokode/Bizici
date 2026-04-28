import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2, Search, RotateCcw } from "lucide-react";
import { api, type Paginated, type ProductListItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function ProductsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState<"active" | "all" | "deleted">("active");
  const [confirmAction, setConfirmAction] = useState<{ product: ProductListItem; mode: "soft" | "hard" } | null>(null);

  const list = useQuery({
    queryKey: ["products", page, search, includeDeleted],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (includeDeleted !== "active") params.set("includeDeleted", "true");
      if (search) params.set("search", search);
      return api
        .get<Paginated<ProductListItem>>(`/api/admin/products?${params.toString()}`)
        .then((r) => {
          if (includeDeleted === "deleted") {
            const items = r.items.filter((p) => p.deletedAt);
            return { ...r, items, total: items.length };
          }
          return r;
        });
    },
  });

  const del = useMutation({
    mutationFn: (vars: { id: string; mode: "soft" | "hard" }) =>
      api.del<{ success: true }>(`/api/admin/products/${vars.id}?mode=${vars.mode}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: t("products.deleted") });
      setConfirmAction(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const restore = useMutation({
    mutationFn: (id: string) => api.post<ProductListItem>(`/api/admin/products/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: t("products.restored") });
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const columns: Column<ProductListItem>[] = [
    {
      key: "photo",
      header: "",
      className: "w-12",
      cell: (p) =>
        p.photos[0] ? (
          <img src={p.photos[0]} alt="" className="size-10 rounded object-cover bg-muted" />
        ) : (
          <div className="size-10 rounded bg-muted" />
        ),
    },
    {
      key: "name",
      header: t("products.product"),
      cell: (p) => (
        <div>
          <div className={p.deletedAt ? "line-through text-muted-foreground" : "font-medium"}>
            {p.name}
          </div>
          {p.brand ? <div className="text-xs text-muted-foreground">{p.brand}</div> : null}
        </div>
      ),
    },
    { key: "shop", header: t("products.shop"), cell: (p) => p.shop.name },
    {
      key: "price",
      header: t("products.price"),
      cell: (p) => `${p.price.toFixed(2)} €`,
    },
    {
      key: "stock",
      header: t("products.stock"),
      cell: (p) => (
        <div className="flex items-center gap-2">
          <span>{p.quantity}</span>
          <Badge variant={p.stockStatus === "in_stock" ? "default" : "secondary"}>
            {p.stockStatus === "in_stock" ? t("products.inStock") : t("products.outOfStock")}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32 text-right",
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {p.deletedAt ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => restore.mutate(p.id)}
                title={t("products.restore")}
                data-testid={`button-restore-${p.id}`}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmAction({ product: p, mode: "hard" })}
                title={t("products.deletePermanently")}
                data-testid={`button-hard-delete-${p.id}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmAction({ product: p, mode: "soft" })}
              title={t("common.delete")}
              data-testid={`button-delete-${p.id}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={includeDeleted} onValueChange={(v) => { setPage(1); setIncludeDeleted(v as typeof includeDeleted); }}>
              <SelectTrigger className="w-44" data-testid="select-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("products.filterActive")}</SelectItem>
                <SelectItem value="all">{t("products.filterAll")}</SelectItem>
                <SelectItem value="deleted">{t("products.filterDeleted")}</SelectItem>
              </SelectContent>
            </Select>
            <form
              onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput); }}
              className="flex items-center gap-2"
            >
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t("products.searchPlaceholder")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 w-64"
                  data-testid="input-search-products"
                />
              </div>
              <Button type="submit" variant="outline">{t("common.filter")}</Button>
            </form>
          </div>
        }
      />

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        testId="table-products"
      />
      {list.data ? (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.mode === "hard" ? t("products.confirmHardTitle") : t("products.confirmSoftTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.mode === "hard"
                ? t("products.confirmHardDesc", { name: confirmAction.product.name })
                : t("products.confirmSoftDesc", { name: confirmAction?.product.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmAction && del.mutate({ id: confirmAction.product.id, mode: confirmAction.mode })}
              data-testid="button-confirm-delete-product"
            >
              {del.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
