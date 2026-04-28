import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import {
  api,
  type AdminReviewsResponse,
  type AdminShopReview,
} from "@/lib/api";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

/**
 * Stars row — read-only display in the moderation table.
 */
function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= value
              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
      <span className="ml-1 text-xs font-medium text-muted-foreground">
        {value}/5
      </span>
    </div>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { admin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only super_admin and admin (writers) may delete reviews; moderators see
  // the list read-only. The button is hidden when `canWrite` is false.
  const canWrite = admin?.role === "super_admin" || admin?.role === "admin";

  const list = useQuery({
    queryKey: ["admin-reviews", page, search],
    queryFn: () =>
      api.get<AdminReviewsResponse>(
        `/api/admin/reviews?page=${page}&pageSize=20${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`,
      ),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      api.del<{ ok: true }>(`/api/admin/reviews/${id}`),
    onSuccess: () => {
      toast({ title: "Avis supprimé." });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => {
      toast({
        title: "Suppression impossible",
        description: err?.message ?? "Erreur inconnue",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (r: AdminShopReview) => {
    const ok = window.confirm(
      `Supprimer l'avis de ${r.customerName ?? r.customerEmail ?? "ce client"} ?`,
    );
    if (!ok) return;
    removeMutation.mutate(r.id);
  };

  const columns: Column<AdminShopReview>[] = [
    {
      key: "shop",
      header: "Boutique",
      cell: (r) => (
        <div>
          <div className="font-medium">{r.shopName ?? "—"}</div>
          {r.shopMarketName ? (
            <div className="text-xs text-muted-foreground">
              {r.shopMarketName}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "customer",
      header: "Client",
      cell: (r) => (
        <div>
          <div>{r.customerName ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {r.customerEmail ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Note",
      cell: (r) => <Stars value={r.rating} />,
    },
    {
      key: "comment",
      header: "Commentaire",
      cell: (r) =>
        r.comment ? (
          <div className="max-w-md whitespace-pre-wrap text-sm">
            {r.comment}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleString("fr-FR")}
        </span>
      ),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            cell: (r: AdminShopReview) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(r)}
                disabled={removeMutation.isPending}
                data-testid={`btn-delete-review-${r.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ),
          } as Column<AdminShopReview>,
        ]
      : []),
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Avis"
        description="Modération des avis clients sur les boutiques"
      />
      <div className="mb-4 max-w-sm">
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Rechercher dans les commentaires…"
          data-testid="input-search-reviews"
        />
      </div>
      <DataTable
        rows={list.data?.reviews ?? []}
        columns={columns}
        loading={list.isLoading}
        testId="table-reviews"
      />
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
