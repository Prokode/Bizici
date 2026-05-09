import { ReactNode, useState } from "react";
import {
  LayoutDashboard, Monitor, ShoppingCart, Gamepad2, CircuitBoard,
  Tags, Users, MapPin, BarChart3, KeyRound, Settings, Search,
  Bell, ChevronDown, Sun, Moon, Sparkles, Command
} from "lucide-react";

type NavItem = { label: string; icon: any; badge?: string | number };

const NAV_TOP: NavItem[] = [
  { label: "Tableau de bord", icon: LayoutDashboard },
  { label: "Postes", icon: Monitor, badge: 24 },
  { label: "Vente en cours", icon: ShoppingCart, badge: "3" },
];
const NAV_CATALOG: NavItem[] = [
  { label: "Consoles", icon: Gamepad2 },
  { label: "Cartes", icon: CircuitBoard },
  { label: "Tarifs", icon: Tags },
];
const NAV_ADMIN: NavItem[] = [
  { label: "Utilisateurs", icon: Users },
  { label: "Locaux", icon: MapPin },
  { label: "Rapports", icon: BarChart3 },
  { label: "Licence", icon: KeyRound },
  { label: "Paramètres", icon: Settings },
];

function NavGroup({ title, items, active }: { title?: string; items: NavItem[]; active: string }) {
  return (
    <div className="space-y-0.5">
      {title && <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{title}</div>}
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = it.label === active;
        return (
          <button
            key={it.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "gcm-nav-active" : ""}`}
            style={!isActive ? { color: "var(--gcm-text-dim)" } : undefined}
          >
            <Icon className="w-[17px] h-[17px]" />
            <span className="flex-1 text-left">{it.label}</span>
            {it.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md gcm-mono font-semibold"
                style={isActive
                  ? { background: "var(--gcm-grad-violet)", color: "#fff" }
                  : { background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Shell({ activeLabel, title, subtitle, eyebrow, actions, children, hero }: {
  activeLabel: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  hero?: ReactNode; // optional custom hero replacing the default page header
  children: ReactNode;
}) {
  const [dark, setDark] = useState(false);

  return (
    <div className={`gcm-root flex ${dark ? "gcm-dark" : ""}`} style={{ minHeight: "100vh" }}>
      {/* === Sidebar === */}
      <aside className="w-[260px] shrink-0 border-r flex flex-col" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center gcm-shadow-glow gcm-grad-violet">
            <span className="gcm-display font-bold text-white text-lg">G</span>
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5" style={{ color: "var(--gcm-fuchsia-bright)" }} />
          </div>
          <div>
            <div className="gcm-display text-[17px] font-bold leading-none">GCM</div>
            <div className="text-[10px] mt-1 uppercase tracking-[0.2em]" style={{ color: "var(--gcm-text-muted)" }}>Game Center</div>
          </div>
        </div>

        {/* Local pill */}
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl border flex items-center gap-2.5"
             style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gcm-violet-soft)", color: "var(--gcm-violet)" }}>
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px]" style={{ color: "var(--gcm-text-muted)" }}>Local actif</div>
            <div className="text-xs font-semibold truncate">Lomé Centre</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--gcm-text-muted)" }} />
        </div>

        <nav className="flex-1 px-2 pb-4 overflow-y-auto space-y-1">
          <NavGroup items={NAV_TOP} active={activeLabel} />
          <NavGroup title="Catalogue" items={NAV_CATALOG} active={activeLabel} />
          <NavGroup title="Administration" items={NAV_ADMIN} active={activeLabel} />
        </nav>

        {/* Pro card */}
        <div className="m-3 p-4 rounded-xl text-white relative overflow-hidden gcm-grad-violet">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
          <Sparkles className="w-4 h-4 mb-2 relative" />
          <div className="gcm-display text-sm font-bold relative">Licence Pro</div>
          <div className="text-[11px] mt-0.5 mb-3 relative" style={{ color: "rgba(255,255,255,0.85)" }}>Expire dans 84 jours</div>
          <button className="text-[11px] px-2.5 py-1.5 rounded-md bg-white/95 text-violet-700 font-bold relative">RENOUVELER →</button>
        </div>

        <div className="p-3 border-t flex items-center gap-3" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white gcm-grad-fuchsia">KS</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "var(--gcm-emerald)", borderColor: "var(--gcm-bg-2)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">Koffi Samuel</div>
            <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>Administrateur</div>
          </div>
          <button className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: "var(--gcm-text-muted)" }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* === Main === */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b flex items-center px-6 gap-4 shrink-0" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors"
                 style={{ background: "var(--gcm-panel-2)", borderColor: "transparent" }}>
              <Search className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} />
              <input placeholder="Rechercher poste, client, ticket..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--gcm-text-muted)]" />
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
              EN LIGNE · 18 actifs
            </div>
            <button onClick={() => setDark(d => !d)} title={dark ? "Mode clair" : "Mode sombre"}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white gcm-grad-fuchsia">5</span>
            </button>
          </div>
        </header>

        {/* Default page header (or hero override) */}
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
