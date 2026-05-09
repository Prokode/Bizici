import { ReactNode, useState } from "react";
import {
  LayoutDashboard, Monitor, ShoppingCart, Gamepad2, CircuitBoard,
  Tags, Users, MapPin, BarChart3, KeyRound, Settings, Search,
  Bell, Power, ChevronDown, Sun, Moon
} from "lucide-react";

type NavItem = { label: string; icon: any; active?: boolean; badge?: string | number };

const NAV: NavItem[] = [
  { label: "Tableau de bord", icon: LayoutDashboard },
  { label: "Postes", icon: Monitor, badge: 24 },
  { label: "Vente en cours", icon: ShoppingCart, badge: "3" },
  { label: "Consoles", icon: Gamepad2 },
  { label: "Cartes", icon: CircuitBoard },
  { label: "Tarifs", icon: Tags },
  { label: "Utilisateurs", icon: Users },
  { label: "Locaux", icon: MapPin },
  { label: "Rapports", icon: BarChart3 },
  { label: "Licence", icon: KeyRound },
  { label: "Paramètres", icon: Settings },
];

export function Shell({ activeLabel, title, subtitle, actions, children }: {
  activeLabel: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [dark, setDark] = useState(false);

  return (
    <div className={`gcm-root flex ${dark ? "gcm-dark" : ""}`} style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
        <div className="px-5 py-5 border-b flex items-center gap-3" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="w-9 h-9 rounded-md flex items-center justify-center gcm-glow-neon" style={{ background: "linear-gradient(135deg, var(--gcm-neon), var(--gcm-cyan))" }}>
            <span className="gcm-display font-extrabold text-white text-sm" style={{ textShadow: "0 1px 0 rgba(0,0,0,0.2)" }}>G</span>
          </div>
          <div>
            <div className="gcm-display text-[15px] font-bold" style={{ color: "var(--gcm-neon-strong)" }}>GCM</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Game Center Manager</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((it) => {
            const Icon = it.icon;
            const active = it.label === activeLabel;
            return (
              <button
                key={it.label}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
                style={{
                  background: active ? "var(--gcm-neon-dim)" : "transparent",
                  color: active ? "var(--gcm-neon-strong)" : "var(--gcm-text-dim)",
                  borderLeft: active ? "2px solid var(--gcm-neon)" : "2px solid transparent",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{it.label}</span>
                {it.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded gcm-mono"
                    style={{ background: active ? "var(--gcm-neon)" : "var(--gcm-panel-2)", color: active ? "#fff" : "var(--gcm-text-dim)" }}>
                    {it.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-md" style={{ background: "var(--gcm-panel-2)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--gcm-magenta)" }}>KS</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">Koffi Samuel</div>
              <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>Administrateur</div>
            </div>
            <Power className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b flex items-center px-6 gap-4" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--gcm-text-muted)" }}>
            <span>Local · Lomé Centre</span>
            <ChevronDown className="w-3 h-3" />
          </div>
          <div className="flex-1 max-w-md ml-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border" style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
              <Search className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} />
              <input placeholder="Rechercher poste, client, ticket..." className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--gcm-text-muted)]" />
              <span className="text-[10px] px-1.5 py-0.5 rounded gcm-mono" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-muted)" }}>⌘K</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs gcm-mono" style={{ color: "var(--gcm-neon-strong)" }}>
              <span className="w-2 h-2 rounded-full gcm-pulse" style={{ background: "var(--gcm-neon)", boxShadow: "0 0 8px var(--gcm-neon)" }} />
              EN LIGNE
            </div>
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? "Mode clair" : "Mode sombre"}
              className="w-9 h-9 rounded-md flex items-center justify-center border transition-colors"
              style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)", color: "var(--gcm-text-dim)" }}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="relative w-9 h-9 rounded-md flex items-center justify-center border" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <Bell className="w-4 h-4" style={{ color: "var(--gcm-text-dim)" }} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "var(--gcm-magenta)" }}>5</span>
            </button>
          </div>
        </header>

        {/* Page header */}
        <div className="px-8 pt-6 pb-4 flex items-end justify-between gap-4 border-b" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-bg-2)" }}>
          <div>
            <h1 className="gcm-display text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm mt-1" style={{ color: "var(--gcm-text-dim)" }}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        <main className="flex-1 p-8 overflow-auto gcm-grid-bg">{children}</main>
      </div>
    </div>
  );
}
