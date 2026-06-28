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
  TrendingUp,
} from "lucide-react";
import { api, type Stats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/PageHeader";

type StatCardProps = {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
  accentColor: string;
  bgColor: string;
  locale: string;
};

function StatCard({ label, value, hint, icon: Icon, accentColor, bgColor, locale }: StatCardProps) {
  return (
    <Card
      data-testid={`stat-${label.toLowerCase()}`}
      className="overflow-hidden"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {value.toLocaleString(locale)}
            </div>
            {hint ? (
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <TrendingUp className="size-3 shrink-0" />
                {hint}
              </div>
            ) : null}
          </div>
          <div
            className="size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: bgColor }}
          >
            <Icon className="size-4" style={{ color: accentColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type StatGroup = {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
  accentColor: string;
  bgColor: string;
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "fr-FR";
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/api/admin/stats"),
    refetchInterval: 30_000,
  });

  const statGroups: StatGroup[] = data
    ? [
        {
          label: t("dashboard.stats.users"),
          value: data.users.total,
          hint: t("dashboard.hints.newThisWeek", { count: data.users.newThisWeek }),
          icon: Users,
          accentColor: "#F58220",
          bgColor: "#FEF0E2",
        },
        {
          label: t("dashboard.stats.shops"),
          value: data.shops.total,
          hint: t("dashboard.hints.shopsOpen", { count: data.shops.open }),
          icon: Store,
          accentColor: "#1B2A5C",
          bgColor: "#E7ECF7",
        },
        {
          label: t("dashboard.stats.products"),
          value: data.products.total,
          hint: t("dashboard.hints.productsOutOfStock", { count: data.products.outOfStock }),
          icon: Package,
          accentColor: "#7FB927",
          bgColor: "#EAF4E2",
        },
        {
          label: t("dashboard.stats.messages"),
          value: data.messages.total,
          hint: t("dashboard.hints.messagesToday", { count: data.messages.today }),
          icon: MessageSquare,
          accentColor: "#F58220",
          bgColor: "#FEF0E2",
        },
        {
          label: t("dashboard.stats.conversations"),
          value: data.conversations.total,
          icon: MessageSquare,
          accentColor: "#1B2A5C",
          bgColor: "#E7ECF7",
        },
        {
          label: t("dashboard.stats.activeBroadcasts"),
          value: data.broadcasts.active,
          hint: t("dashboard.hints.broadcastsTotal", { count: data.broadcasts.total }),
          icon: Megaphone,
          accentColor: "#7FB927",
          bgColor: "#EAF4E2",
        },
        {
          label: t("dashboard.stats.pendingInvitations"),
          value: data.invitations.pending,
          icon: Mail,
          accentColor: "#F58220",
          bgColor: "#FEF0E2",
        },
        {
          label: t("dashboard.stats.categories"),
          value: data.categories.total,
          icon: Tag,
          accentColor: "#1B2A5C",
          bgColor: "#E7ECF7",
        },
      ]
    : [];

  return (
    <PageContainer>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {error ? (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
          {t("dashboard.loadError")}
        </div>
      ) : null}

      {isLoading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="pt-5 pb-5">
                <div className="h-16 animate-pulse bg-muted rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statGroups.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                hint={s.hint}
                icon={s.icon}
                accentColor={s.accentColor}
                bgColor={s.bgColor}
                locale={locale}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="size-6 rounded-md flex items-center justify-center"
                  style={{ background: "#FEF0E2" }}
                >
                  <MessageSquare className="size-3.5" style={{ color: "#F58220" }} />
                </span>
                {t("dashboard.messagesChart")}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.messagesLast7Days} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return d.toLocaleDateString(locale, {
                        weekday: "short",
                        day: "2-digit",
                      });
                    }}
                    stroke="hsl(var(--border))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--border))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    cursor={{ fill: "hsl(var(--muted))", radius: 6 }}
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleDateString(locale, {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })
                    }
                  />
                  <Bar dataKey="count" fill="#F58220" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="size-6 rounded-md flex items-center justify-center"
                  style={{ background: "#EAF4E2" }}
                >
                  <Sparkles className="size-3.5" style={{ color: "#7FB927" }} />
                </span>
                {t("dashboard.karma")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {data.karma.events.toLocaleString(locale)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("dashboard.karmaTotal")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
