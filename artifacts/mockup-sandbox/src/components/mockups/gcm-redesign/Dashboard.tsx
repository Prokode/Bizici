import "./_group.css";
import { Shell } from "./_Shell";
import {
  Monitor, Coins, Clock4, Users2, TrendingUp, TrendingDown,
  Gamepad2, Calendar, ArrowUpRight, MoreHorizontal
} from "lucide-react";

function Stat({ label, value, delta, up, icon: Icon, accent }: any) {
  return (
    <div className="relative rounded-lg p-5 border overflow-hidden" style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>{label}</div>
          <div className="gcm-display text-3xl font-bold mt-2">{value}</div>
        </div>
        <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${accent}22`, color: accent }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs">
        {up ? <TrendingUp className="w-3 h-3" style={{ color: "var(--gcm-neon)" }} /> : <TrendingDown className="w-3 h-3" style={{ color: "var(--gcm-red)" }} />}
        <span className="gcm-mono" style={{ color: up ? "var(--gcm-neon)" : "var(--gcm-red)" }}>{delta}</span>
        <span style={{ color: "var(--gcm-text-muted)" }}>vs hier</span>
      </div>
    </div>
  );
}

function Bar({ h, color }: { h: number; color: string }) {
  return (
    <div className="flex-1 self-stretch flex flex-col justify-end">
      <div className="w-full rounded-t-sm" style={{ height: `${h}%`, background: `linear-gradient(180deg, ${color}, ${color}33)`, boxShadow: `0 0 12px ${color}55` }} />
    </div>
  );
}

const HOURS = ["08","09","10","11","12","13","14","15","16","17","18","19","20","21","22"];
const REV = [22,30,38,42,55,48,40,52,68,72,80,92,86,70,52];

const SESSIONS = [
  { poste: "PS5-04", client: "Komi A.", jeu: "EA FC 25", debut: "19:42", duree: "00:18", tarif: "500 F/30min" },
  { poste: "PC-12", client: "Adjo M.",  jeu: "Valorant",  debut: "19:30", duree: "00:30", tarif: "400 F/30min" },
  { poste: "XBX-02",client: "Yao K.",   jeu: "Forza H5",  debut: "19:15", duree: "00:45", tarif: "500 F/30min" },
  { poste: "PC-07", client: "Mensah E.",jeu: "CS2",       debut: "18:58", duree: "01:02", tarif: "400 F/30min" },
  { poste: "PS5-01",client: "Afi D.",   jeu: "GTA V",     debut: "18:40", duree: "01:20", tarif: "500 F/30min" },
];

export function Dashboard() {
  return (
    <Shell
      activeLabel="Tableau de bord"
      title="Tableau de bord"
      subtitle="Vue d'ensemble du centre · Vendredi 09 mai 2026"
      actions={
        <>
          <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-2" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-text-dim)", background: "var(--gcm-panel)" }}>
            <Calendar className="w-4 h-4" /> Aujourd'hui
          </button>
          <button className="px-3 py-2 rounded-md text-sm font-semibold gcm-glow-neon flex items-center gap-2" style={{ background: "var(--gcm-neon)", color: "#000" }}>
            Nouvelle session <ArrowUpRight className="w-4 h-4" />
          </button>
        </>
      }
    >
      {/* hide the activeLabel item for dashboard view */}
      <style>{`.gcm-root nav button[style*="border-left: 2px solid var(--gcm-neon)"] { }`}</style>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Postes occupés" value="18 / 24" delta="+12%" up icon={Monitor} accent="#7CFF6B" />
        <Stat label="Recette du jour" value="74 500 F" delta="+8.4%" up icon={Coins} accent="#FF2EC4" />
        <Stat label="Sessions en cours" value="18" delta="+3" up icon={Clock4} accent="#4EE2FF" />
        <Stat label="Clients uniques" value="42" delta="-2.1%" up={false} icon={Users2} accent="#FFB84E" />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        {/* Chart */}
        <div className="col-span-2 rounded-lg border p-5" style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Recette horaire</div>
              <div className="gcm-display text-lg font-semibold mt-0.5">Aujourd'hui vs Moyenne 7j</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "var(--gcm-neon)" }} /> Aujourd'hui</span>
              <span className="flex items-center gap-1.5" style={{ color: "var(--gcm-text-dim)" }}><span className="w-2 h-2 rounded-sm" style={{ background: "var(--gcm-magenta)" }} /> Moy. 7j</span>
              <button><MoreHorizontal className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} /></button>
            </div>
          </div>
          <div className="h-56 flex items-end gap-2">
            {REV.map((v, i) => (
              <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                <Bar h={v} color="#7CFF6B" />
                <Bar h={Math.max(15, v - 12 - (i % 3) * 4)} color="#FF2EC4" />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 gcm-mono text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>
            {HOURS.map(h => <span key={h}>{h}h</span>)}
          </div>
        </div>

        {/* Top jeux */}
        <div className="rounded-lg border p-5" style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="gcm-display text-sm font-semibold">Top jeux</div>
            <Gamepad2 className="w-4 h-4" style={{ color: "var(--gcm-text-muted)" }} />
          </div>
          <div className="space-y-3">
            {[
              { name: "EA FC 25", pct: 84, c: "var(--gcm-neon)" },
              { name: "Valorant", pct: 71, c: "var(--gcm-magenta)" },
              { name: "Call of Duty MW3", pct: 58, c: "var(--gcm-cyan)" },
              { name: "Forza Horizon 5", pct: 42, c: "var(--gcm-amber)" },
              { name: "Mortal Kombat 1", pct: 33, c: "#A78BFA" },
              { name: "GTA V", pct: 27, c: "#7CFF6B" },
            ].map((g) => (
              <div key={g.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{g.name}</span>
                  <span className="gcm-mono" style={{ color: "var(--gcm-text-dim)" }}>{g.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--gcm-panel-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: g.c, boxShadow: `0 0 6px ${g.c}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div className="rounded-lg border mt-4 overflow-hidden" style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--gcm-border)" }}>
          <div>
            <div className="gcm-display text-sm font-semibold">Sessions en cours</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--gcm-text-muted)" }}>Mise à jour en temps réel</div>
          </div>
          <button className="text-xs gcm-mono px-2 py-1 rounded border" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-neon)" }}>VOIR TOUT →</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>
              <th className="text-left px-5 py-2 font-medium">Poste</th>
              <th className="text-left py-2 font-medium">Client</th>
              <th className="text-left py-2 font-medium">Jeu</th>
              <th className="text-left py-2 font-medium">Début</th>
              <th className="text-left py-2 font-medium">Durée</th>
              <th className="text-left py-2 font-medium">Tarif</th>
              <th className="text-right px-5 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {SESSIONS.map((s, i) => (
              <tr key={i} className="border-t" style={{ borderColor: "var(--gcm-border)" }}>
                <td className="px-5 py-3">
                  <span className="gcm-mono text-xs px-2 py-1 rounded" style={{ background: "var(--gcm-neon-dim)", color: "var(--gcm-neon)" }}>{s.poste}</span>
                </td>
                <td className="py-3">{s.client}</td>
                <td className="py-3" style={{ color: "var(--gcm-text-dim)" }}>{s.jeu}</td>
                <td className="py-3 gcm-mono text-xs" style={{ color: "var(--gcm-text-dim)" }}>{s.debut}</td>
                <td className="py-3 gcm-mono text-xs">{s.duree}</td>
                <td className="py-3 text-xs" style={{ color: "var(--gcm-text-dim)" }}>{s.tarif}</td>
                <td className="px-5 py-3 text-right">
                  <button className="text-xs px-2.5 py-1 rounded border hover:bg-white/5" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-text)" }}>Clôturer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
