import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Column, DataTable, Pagination } from "@/components/DataTable";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

type KycStatus = "unsubmitted" | "pending" | "approved" | "rejected";
type DocType = "id_card" | "passport" | "driver_license";

type AdminKycListItem = {
  id: string;
  shopId: string;
  shopName: string;
  marketName: string | null;
  sellerId: string;
  sellerEmail: string | null;
  sellerName: string | null;
  status: KycStatus;
  documentType: DocType | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

type AdminKycListResponse = {
  items: AdminKycListItem[];
  page: number;
  pageSize: number;
  total: number;
};

type AdminKycDetail = AdminKycListItem & {
  rejectionReason: string | null;
  frontImageBase64: string | null;
  backImageBase64: string | null;
};

const STATUS_TABS: KycStatus[] = ["pending", "approved", "rejected", "unsubmitted"];

export default function ValidationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { toast } = useToast();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<KycStatus>("pending");
  const [page, setPage] = useState(1);
  const [openShopId, setOpenShopId] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canWrite = admin?.role === "super_admin" || admin?.role === "admin";

  const list = useQuery({
    queryKey: ["admin-kyc", status, page],
    queryFn: () =>
      api.get<AdminKycListResponse>(
        `/api/admin/kyc?status=${status}&page=${page}&pageSize=20`,
      ),
  });

  const detail = useQuery({
    queryKey: ["admin-kyc-detail", openShopId],
    queryFn: () => api.get<AdminKycDetail>(`/api/admin/kyc/${openShopId}`),
    enabled: !!openShopId,
  });

  const approve = useMutation({
    mutationFn: (shopId: string) =>
      api.post<{ ok: true }>(`/api/admin/kyc/${shopId}/approve`),
    onSuccess: () => {
      toast({ title: t("validations.approved") });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-pending-count"] });
      setOpenShopId(null);
    },
    onError: (err: any) => {
      toast({
        title: t("validations.approveFailed"),
        description: err?.message ?? "",
        variant: "destructive",
      });
    },
  });

  const reject = useMutation({
    mutationFn: ({ shopId, reason }: { shopId: string; reason: string }) =>
      api.post<{ ok: true }>(`/api/admin/kyc/${shopId}/reject`, { reason }),
    onSuccess: () => {
      toast({ title: t("validations.rejected") });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-pending-count"] });
      setOpenShopId(null);
      setRejectMode(false);
      setRejectReason("");
    },
    onError: (err: any) => {
      toast({
        title: t("validations.rejectFailed"),
        description: err?.message ?? "",
        variant: "destructive",
      });
    },
  });

  const closeDialog = () => {
    setOpenShopId(null);
    setRejectMode(false);
    setRejectReason("");
  };

  const columns: Column<AdminKycListItem>[] = [
    {
      key: "shop",
      header: t("validations.shop"),
      cell: (r) => (
        <div>
          <div className="font-medium">{r.shopName}</div>
          {r.marketName ? (
            <div className="text-xs text-muted-foreground">{r.marketName}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "seller",
      header: t("validations.seller"),
      cell: (r) => (
        <div className="text-sm">
          <div>{r.sellerName ?? t("common.dash")}</div>
          <div className="text-xs text-muted-foreground">
            {r.sellerEmail ?? t("common.dash")}
          </div>
        </div>
      ),
    },
    {
      key: "docType",
      header: t("validations.docTypeHeader"),
      cell: (r) =>
        r.documentType ? (
          <Badge variant="outline">
            {t(`validations.docType.${r.documentType}`)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("common.dash")}
          </span>
        ),
    },
    {
      key: "submittedAt",
      header: t("validations.submittedAt"),
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.submittedAt
            ? new Date(r.submittedAt).toLocaleString(locale)
            : t("common.dash")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpenShopId(r.shopId)}
          disabled={r.status === "unsubmitted"}
          data-testid={`btn-review-${r.shopId}`}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          {t("validations.review")}
        </Button>
      ),
    },
  ];

  const d = detail.data;

  return (
    <PageContainer>
      <PageHeader
        title={t("validations.title")}
        description={t("validations.description")}
      />

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as KycStatus);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          {STATUS_TABS.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              data-testid={`tab-kyc-${s}`}
              className="gap-1.5"
            >
              {s === "pending" ? (
                <Clock className="h-3.5 w-3.5" />
              ) : s === "approved" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : s === "rejected" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : null}
              {t(`validations.status.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        testId="table-validations"
      />
      {list.data ? (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onPageChange={setPage}
        />
      ) : null}

      <Dialog open={!!openShopId} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {d ? d.shopName : t("validations.loading")}
            </DialogTitle>
            <DialogDescription>
              {d?.sellerEmail ?? ""}
              {d?.documentType
                ? ` · ${t(`validations.docType.${d.documentType}`)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t("validations.loading")}
            </div>
          ) : d ? (
            <div className="space-y-4">
              {d.status === "rejected" && d.rejectionReason ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  <div className="font-medium text-destructive mb-0.5">
                    {t("validations.previousRejection")}
                  </div>
                  <div className="text-foreground/80">{d.rejectionReason}</div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {d.frontImageBase64 ? (
                  <ImagePanel
                    label={t("validations.frontLabel")}
                    base64={d.frontImageBase64}
                  />
                ) : null}
                {d.backImageBase64 ? (
                  <ImagePanel
                    label={t("validations.backLabel")}
                    base64={d.backImageBase64}
                  />
                ) : null}
              </div>

              {rejectMode ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("validations.rejectReasonLabel")}
                  </label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("validations.rejectReasonPlaceholder")}
                    rows={3}
                    data-testid="input-reject-reason"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            {rejectMode ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    d &&
                    reject.mutate({
                      shopId: d.shopId,
                      reason: rejectReason.trim(),
                    })
                  }
                  disabled={!rejectReason.trim() || reject.isPending}
                  data-testid="btn-confirm-reject"
                >
                  {t("validations.confirmReject")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={closeDialog}>
                  {t("common.close")}
                </Button>
                {canWrite && d && d.status !== "approved" ? (
                  <Button
                    variant="outline"
                    onClick={() => setRejectMode(true)}
                    disabled={reject.isPending || approve.isPending}
                    data-testid="btn-open-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    {t("validations.reject")}
                  </Button>
                ) : null}
                {canWrite && d && d.status !== "approved" ? (
                  <Button
                    onClick={() => approve.mutate(d.shopId)}
                    disabled={approve.isPending || reject.isPending}
                    data-testid="btn-approve"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {t("validations.approve")}
                  </Button>
                ) : null}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ImagePanel({ label, base64 }: { label: string; base64: string }) {
  const src = base64.startsWith("data:")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <a href={src} target="_blank" rel="noreferrer">
        <img
          src={src}
          alt={label}
          className="rounded-md border border-border w-full object-contain max-h-72 bg-muted/30"
        />
      </a>
    </div>
  );
}
