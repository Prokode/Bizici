import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
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
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  superOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/users", label: "Utilisateurs", icon: Users },
  { href: "/shops", label: "Boutiques", icon: Store },
  { href: "/products", label: "Produits", icon: Package },
  { href: "/categories", label: "Catégories", icon: Tag },
  { href: "/conversations", label: "Messages", icon: MessageSquare },
  { href: "/invitations", label: "Invitations", icon: Mail },
  { href: "/broadcasts", label: "Recherches", icon: Megaphone },
  { href: "/karma", label: "Karma", icon: Sparkles },
  { href: "/admins", label: "Administrateurs", icon: Shield, superOnly: true },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const [location] = useLocation();

  const items = NAV.filter(
    (item) => !item.superOnly || admin?.role === "super_admin",
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold">
              N
            </div>
            <div>
              <div className="font-semibold leading-tight">NearBuy</div>
              <div className="text-xs text-sidebar-foreground/70 leading-tight">
                Espace admin
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover-elevate active-elevate-2 border border-transparent",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-accent-border"
                      : "text-sidebar-foreground/85",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
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
                ? "Root"
                : admin?.role === "super_admin"
                  ? "Super admin"
                  : admin?.role === "admin"
                    ? "Admin"
                    : "Modérateur"}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-sidebar-foreground border-sidebar-border bg-transparent"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
