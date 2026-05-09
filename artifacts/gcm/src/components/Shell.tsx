import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Monitor, ShoppingCart, Gamepad2, CircuitBoard,
  Tags, Users, MapPin, BarChart3, KeyRound, Settings, Search,
  Bell, ChevronDown, Sun, Moon, Sparkles, Command, Globe
} from "lucide-react";

type NavItem = { key: string; href: string; icon: any; badge?: string | number };

const NAV_TOP: NavItem[] = [
  { key: "dashboard", href: "/",        icon: LayoutDashboard },
  { key: "postes",    href: "/postes",  icon: Monitor, badge: 24 },
  { key: "ventes",    href: "/ventes",  icon: ShoppingCart, badge: "3" },
];
const NAV_CATALOG: NavItem[] = [
  { key: "consoles", href: "/consoles", icon: Gamepad2 },
  { key: "cartes",   href: "/cartes",   icon: CircuitBoard },
  { key: "tarifs",   href: "/tarifs",   icon: Tags },
];
const NAV_ADMIN: NavItem[] = [
  { key: "users",    href: "/users",    icon: Users },
  { key: "locaux",   href: "/locaux",   icon: MapPin },
  { key: "rapports", href: "/rapports", icon: BarChart3 },
  { key: "licence",  href: "/licence",  icon: KeyRound },
  { key: "settings", href: "/settings", icon: Settings },
];

function NavGroup({ titleKey, items }: { titleKey?: string; items: NavItem[] }) {
  const { t } = useTranslation();
  const [loc] = useLocation();
  return (
    <div className="space-y-0.5">
      {titleKey && (
        <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>
          {t(titleKey)}
        </div>
      )}
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = loc === it.href;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "gcm-nav-active" : ""}`}
            style={!isActive ? { color: "var(--gcm-text-dim)" } : undefined}
          >
            <Icon className="w-[17px] h-[17px]" />
            <span className="flex-1 text-left">{t(`nav.${it.key}`)}</span>
            {it.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md gcm-mono font-semibold"
                style={isActive
                  ? { background: "var(--gcm-grad-violet)", color: "#fff" }
                  : { background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
                {it.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function LangSwitcher() {
  const { i18n, t } = useTranslation();
  const next = i18n.language?.startsWith("fr") ? "en" : "fr";
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      title={t("topbar.language")}
      className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors text-xs font-bold gcm-mono"
      style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
      <Globe className="w-3.5 h-3.5" />
      {(i18n.language || "fr").slice(0, 2).toUpperCase()}
    </button>
  );
}

export function Shell({ title, subtitle, eyebrow, actions, children, hero, dark, onToggleDark }: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  hero?: ReactNode;
  children: ReactNode;
  dark: boolean;
  onToggleDark: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--gcm-bg)" }}>
      {/* === Sidebar === */}
      <aside className="w-[260px] shrink-0 border-r flex flex-col" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center gcm-shadow-glow gcm-grad-violet">
            <span className="gcm-display font-bold text-white text-lg">G</span>
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: "var(--gcm-fuchsia-bright)" }} />
          </div>
          <div>
            <div className="gcm-display text-[17px] font-bold leading-none">{t("app.name")}</div>
            <div className="text-[10px] mt-1 uppercase tracking-[0.2em]" style={{ color: "var(--gcm-text-muted)" }}>{t("app.tagline")}</div>
          </div>
        </div>

        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl border flex items-center gap-2.5"
             style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gcm-violet-soft)", color: "var(--gcm-violet)" }}>
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px]" style={{ color: "var(--gcm-text-muted)" }}>{t("sidebar.active_local")}</div>
            <div className="text-xs font-semibold truncate">Lomé Centre</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--gcm-text-muted)" }} />
        </div>

        <nav className="flex-1 px-2 pb-4 overflow-y-auto space-y-1">
          <NavGroup items={NAV_TOP} />
          <NavGroup titleKey="nav.section_catalog" items={NAV_CATALOG} />
          <NavGroup titleKey="nav.section_admin" items={NAV_ADMIN} />
        </nav>

        <div className="m-3 p-4 rounded-xl text-white relative overflow-hidden gcm-grad-violet">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
          <Sparkles className="w-4 h-4 mb-2 relative" />
          <div className="gcm-display text-sm font-bold relative">{t("sidebar.license_pro")}</div>
          <div className="text-[11px] mt-0.5 mb-3 relative" style={{ color: "rgba(255,255,255,0.85)" }}>{t("sidebar.license_expires", { days: 84 })}</div>
          <button className="text-[11px] px-2.5 py-1.5 rounded-md bg-white/95 text-violet-700 font-bold relative">{t("sidebar.renew")} →</button>
        </div>

        <div className="p-3 border-t flex items-center gap-3" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white gcm-grad-fuchsia">KS</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "var(--gcm-emerald)", borderColor: "var(--gcm-bg-2)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">Koffi Samuel</div>
            <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>{t("sidebar.role_admin")}</div>
          </div>
          <button className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: "var(--gcm-text-muted)" }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* === Main === */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center px-6 gap-4 shrink-0" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl" style={{ background: "var(--gcm-panel-2)" }}>
              <Search className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} />
              <input
                aria-label={t("topbar.search")}
                placeholder={t("topbar.search")}
                className="bg-transparent outline-none text-sm flex-1"
                style={{ color: "var(--gcm-text)" }}
              />
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md gcm-mono font-semibold" style={{ background: "var(--gcm-bg-2)", color: "var(--gcm-text-dim)" }}>
                <Command className="w-2.5 h-2.5" /> K
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 text-[11px] gcm-mono font-semibold px-3 py-1.5 rounded-full"
                 style={{ background: "rgba(16,185,129,0.10)", color: "var(--gcm-emerald)" }}>
              <span className="relative w-2 h-2 rounded-full" style={{ background: "var(--gcm-emerald)" }}>
                <span className="absolute inset-0 rounded-full gcm-pulse" style={{ background: "var(--gcm-emerald)" }} />
              </span>
              {t("topbar.online", { count: 18 })}
            </div>
            <LangSwitcher />
            <button onClick={onToggleDark}
                    aria-label={dark ? t("topbar.switch_light") : t("topbar.switch_dark")}
                    title={dark ? t("topbar.switch_light") : t("topbar.switch_dark")}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button aria-label="Notifications" className="relative w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white gcm-grad-fuchsia">5</span>
            </button>
          </div>
        </header>

        {hero ? hero : title && (
          <div className="px-8 pt-7 pb-5 flex items-end justify-between gap-4" style={{ background: "var(--gcm-bg-2)" }}>
            <div>
              {eyebrow && <div className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-1.5" style={{ color: "var(--gcm-violet)" }}>{eyebrow}</div>}
              <h1 className="gcm-display text-[28px] font-bold leading-tight">{title}</h1>
              {subtitle && <p className="text-sm mt-1.5" style={{ color: "var(--gcm-text-dim)" }}>{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        <main className="flex-1 px-8 py-6 overflow-auto gcm-aurora">{children}</main>
      </div>
    </div>
  );
}
