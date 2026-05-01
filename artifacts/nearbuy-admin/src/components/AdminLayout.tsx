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

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}bizici-pin.png`}
                alt="BizIci"
                className="size-9 object-contain"
              />
              <div>
                <div className="font-semibold leading-tight tracking-tight">
                  <span className="text-white">Biz</span>
                  <span style={{ color: "#7FB927" }}>Ici</span>
                </div>
                <div className="text-xs text-sidebar-foreground/70 leading-tight">
                  Admin
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover-elevate active-elevate-2 border border-transparent",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-accent-border"
                      : "text-sidebar-foreground/85",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{label}</span>
                  {item.href === "/validations" && pendingCount > 0 ? (
                    <span
                      data-testid="badge-pending-kyc"
                      className="inline-flex items-center justify-center rounded-full bg-[#F58220] text-white text-[11px] font-semibold leading-none min-w-[20px] h-5 px-1.5"
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <div className="px-2 text-xs">
            <div className="font-medium text-sidebar-foreground">
              {admin?.username}
            </div>
            <div className="text-sidebar-foreground/60">
              {admin?.isRoot
                ? t("admins.rootBadge")
                : admin?.role === "super_admin"
                  ? t("admins.roles.super_admin")
                  : admin?.role === "admin"
                    ? t("admins.roles.admin")
                    : t("admins.roles.moderator")}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-sidebar-foreground border-sidebar-border bg-transparent"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="size-4" />
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
