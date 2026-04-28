import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, type Category } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Column, DataTable } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";

type EditState = { mode: "create" } | { mode: "edit"; cat: Category } | null;

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "" });

  const list = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api
        .get<{ items: Category[] }>("/api/admin/categories")
        .then((r) => r.items),
  });

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        icon: form.icon.trim() || null,
      };
      if (editing?.mode === "edit") {
        return api.patch<Category>(`/api/admin/categories/${editing.cat.id}`, body);
      }
      return api.post<Category>("/api/admin/categories", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: editing?.mode === "edit" ? t("categories.updated") : t("categories.created") });
      setEditing(null);
      setForm({ name: "", slug: "", icon: "" });
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: t("categories.deleted") });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  function openEdit(c: Category) {
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? "" });
    setEditing({ mode: "edit", cat: c });
  }

  function openCreate() {
    setForm({ name: "", slug: "", icon: "" });
    setEditing({ mode: "create" });
  }

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: t("categories.category"),
      cell: (c) => (
        <div className="flex items-center gap-2">
          {c.icon ? <span className="text-xl">{c.icon}</span> : null}
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { key: "slug", header: t("categories.slug"), cell: (c) => <code className="text-xs">{c.slug}</code> },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} data-testid={`button-edit-${c.id}`}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(c)}
            data-testid={`button-delete-${c.id}`}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("categories.title")}
        description={t("categories.description")}
        actions={
          <Button onClick={openCreate} data-testid="button-create">
            <Plus className="size-4" />
            {t("categories.newCategory")}
          </Button>
        }
      />

      <DataTable rows={list.data ?? []} columns={columns} loading={list.isLoading} testId="table-categories" />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === "edit" ? t("categories.editCategory") : t("categories.newCategory")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t("categories.name")}</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-cat-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">{t("categories.slugLabel")}</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder={t("categories.slugPlaceholder")}
                data-testid="input-cat-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">{t("categories.iconLabel")}</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder={t("categories.iconPlaceholder")}
                data-testid="input-cat-icon"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
            <Button
              disabled={createOrUpdate.isPending || !form.name.trim()}
              onClick={() => createOrUpdate.mutate()}
              data-testid="button-save"
            >
              {createOrUpdate.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("categories.confirmDeleteTitle")}</DialogTitle>
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
