import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Tag,
  MessageSquare,
  Shield,
  Mail,
  Megaphone,
  Sparkles,
  Star,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  superOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/users", labelKey: "nav.users", icon: Users },
  { href: "/shops", labelKey: "nav.shops", icon: Store },
  { href: "/products", labelKey: "nav.products", icon: Package },
  { href: "/categories", labelKey: "nav.categories", icon: Tag },
  { href: "/conversations", labelKey: "nav.conversations", icon: MessageSquare },
  { href: "/invitations", labelKey: "nav.invitations", icon: Mail },
  { href: "/broadcasts", labelKey: "nav.broadcasts", icon: Megaphone },
  { href: "/karma", labelKey: "nav.karma", icon: Sparkles },
  { href: "/reviews", labelKey: "nav.reviews", icon: Star },
  { href: "/validations", labelKey: "nav.validations", icon: ShieldCheck },
  { href: "/admins", labelKey: "nav.admins", icon: Shield, superOnly: true },
];

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(/[\s_.-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  const items = NAV.filter(
    (item) => !item.superOnly || admin?.role === "super_admin",
  );

  const pendingKyc = useQuery({
    queryKey: ["admin-kyc-pending-count"],
    queryFn: () =>
      api.get<{ count: number }>(`/api/admin/kyc/pending-count`),
    refetchInterval: 60_000,
    enabled: !!admin,
  });
  const pendingCount = pendingKyc.data?.count ?? 0;

  const roleLabel = admin?.isRoot
    ? t("admins.rootBadge")
    : admin?.role === "super_admin"
      ? t("admins.roles.super_admin")
      : admin?.role === "admin"
        ? t("admins.roles.admin")
        : t("admins.roles.moderator");

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className="w-64 shrink-0 flex flex-col border-r border-sidebar-border"
        style={{
          background: "linear-gradient(180deg, hsl(225 55% 23%) 0%, hsl(225 58% 18%) 100%)",
          color: "hsl(220 20% 92%)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <img
                  src={`${import.meta.env.BASE_URL}bizici-pin.png`}
                  alt="BizIci"
                  className="size-6 object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight tracking-tight">
                  <span className="text-white">Biz</span>
                  <span style={{ color: "#7FB927" }}>Ici</span>
                </div>
                <div className="text-[11px] text-white/50 leading-tight mt-px">
                  Admin
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey);
            const active =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-${item.href.replace(/\//g, "") || "home"}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "border border-transparent",
                    active
                      ? "bg-white/10 text-white border-white/10"
                      : "text-white/70 hover:bg-white/6 hover:text-white/90",
                  )}
                  style={active ? { borderLeft: "3px solid #F58220", paddingLeft: "calc(0.75rem - 2px)" } : {}}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-[#F58220]" : "")} />
                  <span className="flex-1">{label}</span>
                  {item.href === "/validations" && pendingCount > 0 ? (
                    <span
                      data-testid="badge-pending-kyc"
                      className="inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1"
                      style={{ background: "#F58220" }}
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
              style={{ background: "#F58220" }}
            >
              {getInitials(admin?.username)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {admin?.username}
              </div>
              <div className="text-[11px] text-white/50 truncate">{roleLabel}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/8 border-0"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="size-4 mr-2" />
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
