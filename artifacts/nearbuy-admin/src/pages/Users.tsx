import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
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
      toast({ title: t("users.deleted") });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const columns: Column<UserListItem>[] = [
    { key: "name", header: t("users.name"), cell: (u) => u.name ?? <span className="text-muted-foreground">{t("common.dash")}</span> },
    { key: "email", header: t("users.email"), cell: (u) => u.email ?? <span className="text-muted-foreground">{t("common.dash")}</span> },
    {
      key: "createdAt",
      header: t("users.registeredOn"),
      cell: (u) => new Date(u.createdAt).toLocaleDateString(locale),
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
        title={t("users.title")}
        description={t("users.description")}
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
                placeholder={t("users.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 w-72"
                data-testid="input-search"
              />
            </div>
            <Button type="submit" variant="outline">{t("common.filter")}</Button>
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
            <DialogTitle>{t("users.userDetails")}</DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <div className="text-muted-foreground py-8 text-center">{t("common.loading")}</div>
          ) : detail.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("users.name")} value={detail.data.user.name} />
                <Field label={t("users.email")} value={detail.data.user.email} />
                <Field label={t("users.clerkId")} value={detail.data.user.clerkUserId} mono />
                <Field
                  label={t("users.registeredOn")}
                  value={new Date(detail.data.user.createdAt).toLocaleString(locale)}
                />
              </div>

              <div>
                <div className="font-medium mb-2">{t("users.shopsOwned", { count: detail.data.shopsOwned.length })}</div>
                {detail.data.shopsOwned.length === 0 ? (
                  <div className="text-muted-foreground">{t("users.noShops")}</div>
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
                          {s.isOpen ? t("users.open") : t("users.closed")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Sparkles className="size-4 text-primary" />
                  {t("users.karmaTotal", { points: detail.data.karma.total })}
                </div>
                {detail.data.karma.recent.length === 0 ? (
                  <div className="text-muted-foreground">{t("users.noKarmaEvents")}</div>
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
                            {new Date(k.createdAt).toLocaleDateString(locale)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {t("users.conversationsCount", { count: detail.data.conversationsCount })}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("users.confirmDeleteDesc", { who: confirmDelete?.email ?? confirmDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              data-testid="button-confirm-delete"
            >
              {del.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : ""}>
        {value ?? <span className="text-muted-foreground">{t("common.dash")}</span>}
      </div>
    </div>
  );
}

