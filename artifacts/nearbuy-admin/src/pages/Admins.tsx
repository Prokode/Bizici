import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  moderator: "Modérateur",
};

export default function AdminsPage() {
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
      toast({ title: "Administrateur créé" });
      setCreating(false);
      setForm({ username: "", password: "", role: "admin" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateRole = useMutation({
    mutationFn: (vars: { id: string; role: AdminRole }) =>
      api.patch<AdminFull>(`/api/admin/admins/${vars.id}`, { role: vars.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: "Rôle mis à jour" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updatePassword = useMutation({
    mutationFn: (vars: { id: string; password: string }) =>
      api.patch<AdminFull>(`/api/admin/admins/${vars.id}`, { password: vars.password }),
    onSuccess: () => {
      toast({ title: "Mot de passe mis à jour" });
      setResetPwId(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/admins/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admins"] });
      toast({ title: "Administrateur supprimé" });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<AdminFull>[] = [
    {
      key: "username",
      header: "Identifiant",
      cell: (a) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{a.username}</span>
          {a.isRoot ? <Crown className="size-3.5 text-primary" /> : null}
        </div>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      cell: (a) =>
        a.isRoot ? (
          <Badge>Root</Badge>
        ) : (
          <Select
            value={a.role}
            onValueChange={(v) => updateRole.mutate({ id: a.id, role: v as AdminRole })}
          >
            <SelectTrigger className="w-40" data-testid={`select-role-${a.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">{ROLE_LABEL.super_admin}</SelectItem>
              <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
              <SelectItem value="moderator">{ROLE_LABEL.moderator}</SelectItem>
            </SelectContent>
          </Select>
        ),
    },
    {
      key: "createdAt",
      header: "Créé le",
      cell: (a) => new Date(a.createdAt).toLocaleDateString("fr-FR"),
    },
    {
      key: "lastLoginAt",
      header: "Dernière connexion",
      cell: (a) =>
        a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("fr-FR") : <span className="text-muted-foreground">—</span>,
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
              Mot de passe
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
        title="Administrateurs"
        description="Gérer les comptes admin (réservé au super admin)"
        actions={
          <Button onClick={() => setCreating(true)} data-testid="button-create-admin">
            <Plus className="size-4" />
            Nouvel admin
          </Button>
        }
      />

      <DataTable rows={list.data ?? []} columns={columns} loading={list.isLoading} testId="table-admins" />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adm-username">Identifiant</Label>
              <Input
                id="adm-username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                data-testid="input-admin-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-password">Mot de passe</Label>
              <Input
                id="adm-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="input-admin-password"
              />
              <div className="text-xs text-muted-foreground">8 caractères minimum.</div>
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AdminRole }))}>
                <SelectTrigger data-testid="select-admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">{ROLE_LABEL.super_admin}</SelectItem>
                  <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                  <SelectItem value="moderator">{ROLE_LABEL.moderator}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
            <Button
              disabled={create.isPending || !form.username.trim() || form.password.length < 8}
              onClick={() => create.mutate()}
              data-testid="button-confirm-create-admin"
            >
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetPwId} onOpenChange={(o) => { if (!o) { setResetPwId(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-pw">Nouveau mot de passe</Label>
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
              Annuler
            </Button>
            <Button
              disabled={updatePassword.isPending || newPassword.length < 8}
              onClick={() => resetPwId && updatePassword.mutate({ id: resetPwId, password: newPassword })}
            >
              {updatePassword.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'administrateur ?</DialogTitle>
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
