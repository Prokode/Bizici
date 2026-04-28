import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  Store,
  Package,
  MessageSquare,
  Megaphone,
  Sparkles,
  Mail,
  Tag,
} from "lucide-react";
import { api, type Stats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/PageHeader";

type StatCardProps = {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
  color: string;
  locale: string;
};

function StatCard({ label, value, hint, icon: Icon, color, locale }: StatCardProps) {
  return (
    <Card data-testid={`stat-${label.toLowerCase()}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-semibold mt-1">
              {value.toLocaleString(locale)}
            </div>
            {hint ? (
              <div className="text-xs text-muted-foreground mt-1">{hint}</div>
            ) : null}
          </div>
          <div
            className="size-10 rounded-lg flex items-center justify-center"
            style={{ background: color }}
          >
            <Icon className="size-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/api/admin/stats"),
    refetchInterval: 30_000,
  });

  return (
    <PageContainer>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {error ? (
        <div className="text-sm text-destructive mb-4">
          {t("dashboard.loadError")}
        </div>
      ) : null}

      {isLoading || !data ? (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t("dashboard.stats.users")}
              value={data.users.total}
              hint={t("dashboard.hints.newThisWeek", { count: data.users.newThisWeek })}
              icon={Users}
              color="hsl(199 89% 48%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.shops")}
              value={data.shops.total}
              hint={t("dashboard.hints.shopsOpen", { count: data.shops.open })}
              icon={Store}
              color="hsl(24 95% 53%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.products")}
              value={data.products.total}
              hint={t("dashboard.hints.productsOutOfStock", { count: data.products.outOfStock })}
              icon={Package}
              color="hsl(142 71% 45%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.messages")}
              value={data.messages.total}
              hint={t("dashboard.hints.messagesToday", { count: data.messages.today })}
              icon={MessageSquare}
              color="hsl(271 81% 56%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.conversations")}
              value={data.conversations.total}
              icon={MessageSquare}
              color="hsl(199 89% 48%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.activeBroadcasts")}
              value={data.broadcasts.active}
              hint={t("dashboard.hints.broadcastsTotal", { count: data.broadcasts.total })}
              icon={Megaphone}
              color="hsl(24 95% 53%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.pendingInvitations")}
              value={data.invitations.pending}
              icon={Mail}
              color="hsl(0 72% 51%)"
              locale={locale}
            />
            <StatCard
              label={t("dashboard.stats.categories")}
              value={data.categories.total}
              icon={Tag}
              color="hsl(142 71% 45%)"
              locale={locale}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-primary" />
                {t("dashboard.messagesChart")}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.messagesLast7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return d.toLocaleDateString(locale, {
                        weekday: "short",
                        day: "2-digit",
                      });
                    }}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleDateString(locale, {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })
                    }
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                {t("dashboard.karma")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.karma.events.toLocaleString(locale)}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.karmaTotal")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
