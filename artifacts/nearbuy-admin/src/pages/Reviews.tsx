import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

function Stars({ value, label }: { value: number; label: string }) {
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
        {label}
      </span>
    </div>
  );
}

export default function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { admin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({ title: t("reviews.deleted") });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => {
      toast({
        title: t("reviews.deleteFailed"),
        description: err?.message ?? t("reviews.unknownError"),
        variant: "destructive",
      });
    },
  });

  const handleDelete = (r: AdminShopReview) => {
    const ok = window.confirm(
      t("reviews.confirmDelete", {
        who: r.customerName ?? r.customerEmail ?? t("reviews.anonymousCustomer"),
      }),
    );
    if (!ok) return;
    removeMutation.mutate(r.id);
  };

  const columns: Column<AdminShopReview>[] = [
    {
      key: "shop",
      header: t("reviews.shop"),
      cell: (r) => (
        <div>
          <div className="font-medium">{r.shopName ?? t("common.dash")}</div>
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
      header: t("reviews.customer"),
      cell: (r) => (
        <div>
          <div>{r.customerName ?? t("common.dash")}</div>
          <div className="text-xs text-muted-foreground">
            {r.customerEmail ?? t("common.dash")}
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: t("reviews.rating"),
      cell: (r) => <Stars value={r.rating} label={t("reviews.valueOfFive", { value: r.rating })} />,
    },
    {
      key: "comment",
      header: t("reviews.comment"),
      cell: (r) =>
        r.comment ? (
          <div className="max-w-md whitespace-pre-wrap text-sm">
            {r.comment}
          </div>
        ) : (
          <span className="text-muted-foreground">{t("common.dash")}</span>
        ),
    },
    {
      key: "createdAt",
      header: t("reviews.date"),
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleString(locale)}
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
        title={t("reviews.title")}
        description={t("reviews.description")}
      />
      <div className="mb-4 max-w-sm">
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={t("reviews.searchPlaceholder")}
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
