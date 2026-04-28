import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Crown } from "lucide-react";
import { api, type AdminFull, type AdminRole } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Column, DataTable } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";

export default function AdminsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { admin: currentAdmin } = useAuth();
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminFull | null>(null);
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [form, setForm] = useState<{ username: string; password: string; role: AdminRole }>({
    username: "",
    password: "",
    role: "admin",
  });
  const [newPassword, setNewPassword] = useState("");

  const list = useQuery({
    queryKey: ["admins"],
    queryFn: () =>
      api
        .get<{ admins: AdminFull[] }>("/api/admin/admins")
        .then((r) => r.admins),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<AdminFull>("/api/admin/admins", {
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: t("admins.created") });
      setCreating(false);
      setForm({ username: "", password: "", role: "admin" });
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const updateRole = useMutation({
    mutationFn: (vars: { id: string; role: AdminRole }) =>
      api.patch<AdminFull>(`/api/admin/admins/${vars.id}`, { role: vars.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: t("admins.roleUpdated") });
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const updatePassword = useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      api.patch<AdminFull>(`/api/admin/admins/${vars.id}`, { password: vars.password }),
    onSuccess: () => {
      toast({ title: t("admins.passwordUpdated") });
      setResetPwId(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/admins/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: t("admins.deleted") });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: t("common.errorTitle"), description: e.message, variant: "destructive" }),
  });

  const columns: Column<AdminFull>[] = [
    {
      key: "username",
      header: t("admins.username"),
      cell: (a) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{a.username}</span>
          {a.isRoot ? <Crown className="size-3.5 text-primary" /> : null}
        </div>
      ),
    },
    {
      key: "role",
      header: t("admins.role"),
      cell: (a) =>
        a.isRoot ? (
          <Badge>{t("admins.rootBadge")}</Badge>
        ) : (
          <Select
            value={a.role}
            onValueChange={(v) => updateRole.mutate({ id: a.id, role: v as AdminRole })}
          >
            <SelectTrigger className="w-40" data-testid={`select-role-${a.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">{t("admins.roles.super_admin")}</SelectItem>
              <SelectItem value="admin">{t("admins.roles.admin")}</SelectItem>
              <SelectItem value="moderator">{t("admins.roles.moderator")}</SelectItem>
            </SelectContent>
          </Select>
        ),
    },
    {
      key: "createdAt",
      header: t("admins.createdOn"),
      cell: (a) => new Date(a.createdAt).toLocaleDateString(locale),
    },
    {
      key: "lastLoginAt",
      header: t("admins.lastLogin"),
      cell: (a) =>
        a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString(locale) : <span className="text-muted-foreground">{t("common.dash")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-40 text-right",
      cell: (a) => (
        <div className="flex justify-end gap-1">
          {!a.isRoot ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetPwId(a.id)}
              data-testid={`button-reset-pw-${a.id}`}
            >
              {t("admins.passwordButton")}
            </Button>
          ) : null}
          {!a.isRoot && a.id !== currentAdmin?.id ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(a)}
              data-testid={`button-delete-${a.id}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("admins.title")}
        description={t("admins.description")}
        actions={
          <Button onClick={() => setCreating(true)} data-testid="button-create-admin">
            <Plus className="size-4" />
            {t("admins.newAdmin")}
          </Button>
        }
      />

      <DataTable rows={list.data ?? []} columns={columns} loading={list.isLoading} testId="table-admins" />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admins.newAdminTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adm-username">{t("admins.username")}</Label>
              <Input
                id="adm-username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                data-testid="input-admin-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-password">{t("admins.password")}</Label>
              <Input
                id="adm-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="input-admin-password"
              />
              <div className="text-xs text-muted-foreground">{t("admins.passwordHint")}</div>
            </div>
            <div className="space-y-2">
              <Label>{t("admins.role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AdminRole }))}>
                <SelectTrigger data-testid="select-admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">{t("admins.roles.super_admin")}</SelectItem>
                  <SelectItem value="admin">{t("admins.roles.admin")}</SelectItem>
                  <SelectItem value="moderator">{t("admins.roles.moderator")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={create.isPending || !form.username.trim() || form.password.length < 8}
              onClick={() => create.mutate()}
              data-testid="button-confirm-create-admin"
            >
              {create.isPending ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPwId} onOpenChange={(o) => { if (!o) { setResetPwId(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admins.changePassword")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-pw">{t("admins.newPassword")}</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPwId(null); setNewPassword(""); }}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={updatePassword.isPending || newPassword.length < 8}
              onClick={() => resetPwId && updatePassword.mutate({ id: resetPwId, password: newPassword })}
            >
              {updatePassword.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admins.confirmDeleteTitle")}</DialogTitle>
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
