import { useQuery } from "@tanstack/react-query";
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
};

function StatCard({ label, value, hint, icon: Icon, color }: StatCardProps) {
  return (
    <Card data-testid={`stat-${label.toLowerCase()}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-semibold mt-1">
              {value.toLocaleString("fr-FR")}
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/api/admin/stats"),
    refetchInterval: 30_000,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité NearBuy"
      />

      {error ? (
        <div className="text-sm text-destructive mb-4">
          Impossible de charger les statistiques.
        </div>
      ) : null}

      {isLoading || !data ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Utilisateurs"
              value={data.users.total}
              hint={`+${data.users.newThisWeek} cette semaine`}
              icon={Users}
              color="hsl(199 89% 48%)"
            />
            <StatCard
              label="Boutiques"
              value={data.shops.total}
              hint={`${data.shops.open} ouvertes`}
              icon={Store}
              color="hsl(24 95% 53%)"
            />
            <StatCard
              label="Produits"
              value={data.products.total}
              hint={`${data.products.outOfStock} en rupture`}
              icon={Package}
              color="hsl(142 71% 45%)"
            />
            <StatCard
              label="Messages"
              value={data.messages.total}
              hint={`${data.messages.today} aujourd'hui`}
              icon={MessageSquare}
              color="hsl(271 81% 56%)"
            />
            <StatCard
              label="Conversations"
              value={data.conversations.total}
              icon={MessageSquare}
              color="hsl(199 89% 48%)"
            />
            <StatCard
              label="Recherches actives"
              value={data.broadcasts.active}
              hint={`${data.broadcasts.total} au total`}
              icon={Megaphone}
              color="hsl(24 95% 53%)"
            />
            <StatCard
              label="Invitations en attente"
              value={data.invitations.pending}
              icon={Mail}
              color="hsl(0 72% 51%)"
            />
            <StatCard
              label="Catégories"
              value={data.categories.total}
              icon={Tag}
              color="hsl(142 71% 45%)"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-primary" />
                Messages des 7 derniers jours
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
                      return d.toLocaleDateString("fr-FR", {
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
                      new Date(v as string).toLocaleDateString("fr-FR", {
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
                Karma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {data.karma.events.toLocaleString("fr-FR")}
              </div>
              <div className="text-sm text-muted-foreground">
                évènements enregistrés au total
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
