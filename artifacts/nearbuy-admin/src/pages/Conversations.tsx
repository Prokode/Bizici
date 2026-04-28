import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api, type ConversationListItem, type ConversationMessage, type Paginated } from "@/lib/api";
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
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConversationListItem | null>(null);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<ConversationMessage | null>(null);

  const list = useQuery({
    queryKey: ["conversations", page],
    queryFn: () =>
      api.get<Paginated<ConversationListItem>>(
        `/api/admin/conversations?page=${page}&pageSize=20`,
      ),
  });

  const messages = useQuery({
    queryKey: ["conversation-messages", openId],
    queryFn: () =>
      api
        .get<{ items: ConversationMessage[] }>(
          `/api/admin/conversations/${openId}/messages`,
        )
        .then((r) => ({ messages: r.items })),
    enabled: !!openId,
  });

  const delConv = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Conversation supprimée" });
      setConfirmDelete(null);
      setOpenId(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const delMsg = useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/api/admin/messages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-messages"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Message supprimé" });
      setConfirmDeleteMessage(null);
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const columns: Column<ConversationListItem>[] = [
    {
      key: "shop",
      header: "Boutique",
      cell: (c) => c.shop?.name ?? <span className="text-muted-foreground">[supprimée]</span>,
    },
    {
      key: "customer",
      header: "Client",
      cell: (c) =>
        c.customer ? (
          <div>
            <div>{c.customer.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{c.customer.email}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">[supprimé]</span>
        ),
    },
    {
      key: "lastMessage",
      header: "Dernier message",
      cell: (c) => (
        <div className="max-w-md">
          <div className="truncate text-sm">{c.lastMessageText || <span className="text-muted-foreground">—</span>}</div>
          {c.lastMessageAt ? (
            <div className="text-xs text-muted-foreground">
              {new Date(c.lastMessageAt).toLocaleString("fr-FR")}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "unread",
      header: "Non lus",
      cell: (c) => (
        <div className="flex gap-1">
          {c.customerUnreadCount > 0 ? (
            <Badge variant="secondary">Client {c.customerUnreadCount}</Badge>
          ) : null}
          {c.sellerUnreadCount > 0 ? (
            <Badge variant="secondary">Vendeur {c.sellerUnreadCount}</Badge>
          ) : null}
          {c.customerUnreadCount === 0 && c.sellerUnreadCount === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (c) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(c);
          }}
          data-testid={`button-delete-${c.id}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ),
    },
  ];

  const conversation = list.data?.items.find((c) => c.id === openId);

  return (
    <PageContainer>
      <PageHeader title="Messages" description="Modération des conversations entre clients et vendeurs" />

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        onRowClick={(c) => setOpenId(c.id)}
        testId="table-conversations"
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
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {conversation?.shop?.name ?? "Conversation"} ↔ {conversation?.customer?.name ?? conversation?.customer?.email ?? "—"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {messages.isLoading ? (
              <div className="text-muted-foreground text-center py-8">Chargement…</div>
            ) : (messages.data?.messages ?? []).length === 0 ? (
              <div className="text-muted-foreground text-center py-8">Aucun message</div>
            ) : (
              (messages.data?.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "group flex gap-2",
                    m.senderRole === "seller" ? "justify-end" : "justify-start",
                  )}
                >
                  {m.senderRole === "seller" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => setConfirmDeleteMessage(m)}
                      data-testid={`button-delete-msg-${m.id}`}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      m.senderRole === "seller"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    <div className="text-[10px] opacity-70 mb-0.5">
                      {m.senderRole === "seller" ? "Vendeur" : "Client"} · {new Date(m.createdAt).toLocaleString("fr-FR")}
                    </div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                  {m.senderRole === "customer" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => setConfirmDeleteMessage(m)}
                      data-testid={`button-delete-msg-${m.id}`}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la conversation ?</DialogTitle>
            <DialogDescription>
              Tous les messages associés seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={delConv.isPending}
              onClick={() => confirmDelete && delConv.mutate(confirmDelete.id)}
            >
              {delConv.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeleteMessage} onOpenChange={(o) => !o && setConfirmDeleteMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce message ?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteMessage(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={delMsg.isPending}
              onClick={() => confirmDeleteMessage && delMsg.mutate(confirmDeleteMessage.id)}
            >
              {delMsg.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
