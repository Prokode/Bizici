import "./_group.css";
import { useState } from "react";
import { Shell } from "./_Shell";
import {
  Monitor, Gamepad2, Wrench, Plus, Filter, Grid3x3, List,
  Clock4, Coins, Pause, X, Power, Wifi, MoreVertical, MessageCircle, Sparkles
} from "lucide-react";

type Status = "occupe" | "libre" | "maintenance" | "reserve";
type TypeP = "PC" | "PS5" | "XBOX" | "SWITCH";

type Poste = {
  id: string;
  type: TypeP;
  status: Status;
  client?: string;
  jeu?: string;
  debut?: string;
  duree?: string;
  montant?: string;
  progress?: number; // 0-100 of the timeslot used
};

const STATUS: Record<Status, { label: string; color: string; soft: string; grad: string }> = {
  occupe:      { label: "OCCUPÉ",      color: "var(--gcm-fuchsia)",  soft: "var(--gcm-fuchsia-soft)", grad: "linear-gradient(135deg,#EC4899,#C026D3)" },
  libre:       { label: "LIBRE",       color: "var(--gcm-emerald)",  soft: "rgba(16,185,129,0.10)",   grad: "linear-gradient(135deg,#34D399,#10B981)" },
  maintenance: { label: "MAINTENANCE", color: "var(--gcm-amber)",    soft: "rgba(245,158,11,0.12)",   grad: "linear-gradient(135deg,#FBBF24,#F59E0B)" },
  reserve:     { label: "RÉSERVÉ",     color: "var(--gcm-cyan)",     soft: "rgba(6,182,212,0.10)",    grad: "linear-gradient(135deg,#22D3EE,#06B6D4)" },
};

const TYPE_META: Record<TypeP, { icon: any; chip: string; bg: string }> = {
  PC:     { icon: Monitor,  chip: "PC",     bg: "linear-gradient(135deg,#6D28D9,#8B5CF6)" },
  PS5:    { icon: Gamepad2, chip: "PS5",    bg: "linear-gradient(135deg,#0EA5E9,#3B82F6)" },
  XBOX:   { icon: Gamepad2, chip: "XBOX",   bg: "linear-gradient(135deg,#10B981,#059669)" },
  SWITCH: { icon: Gamepad2, chip: "SWITCH", bg: "linear-gradient(135deg,#EF4444,#DC2626)" },
};

const POSTES: Poste[] = [
  { id: "PC-01",  type: "PC",     status: "occupe", client: "Akouvi T.",  jeu: "Valorant",     debut: "19:12", duree: "00:48", montant: "640 F",   progress: 80 },
  { id: "PC-02",  type: "PC",     status: "libre" },
  { id: "PC-03",  type: "PC",     status: "occupe", client: "Edem A.",    jeu: "CS2",          debut: "19:30", duree: "00:30", montant: "400 F",   progress: 50 },
  { id: "PC-04",  type: "PC",     status: "maintenance" },
  { id: "PC-05",  type: "PC",     status: "occupe", client: "Sika K.",    jeu: "League of L.", debut: "18:55", duree: "01:05", montant: "880 F",   progress: 92 },
  { id: "PC-06",  type: "PC",     status: "libre" },
  { id: "PC-07",  type: "PC",     status: "occupe", client: "Mensah E.",  jeu: "CS2",          debut: "18:58", duree: "01:02", montant: "840 F",   progress: 88 },
  { id: "PC-08",  type: "PC",     status: "reserve", client: "Réservé 20:30" },
  { id: "PS5-01", type: "PS5",    status: "occupe", client: "Afi D.",     jeu: "GTA V",        debut: "18:40", duree: "01:20", montant: "1 320 F", progress: 95 },
  { id: "PS5-02", type: "PS5",    status: "libre" },
  { id: "PS5-03", type: "PS5",    status: "occupe", client: "Komi L.",    jeu: "FC 25",        debut: "19:20", duree: "00:40", montant: "660 F",   progress: 65 },
  { id: "PS5-04", type: "PS5",    status: "occupe", client: "Komi A.",    jeu: "EA FC 25",     debut: "19:42", duree: "00:18", montant: "300 F",   progress: 30 },
  { id: "XBX-01", type: "XBOX",   status: "occupe", client: "Têtê G.",    jeu: "Halo Inf.",    debut: "19:05", duree: "00:55", montant: "910 F",   progress: 90 },
  { id: "XBX-02", type: "XBOX",   status: "occupe", client: "Yao K.",     jeu: "Forza H5",     debut: "19:15", duree: "00:45", montant: "750 F",   progress: 75 },
  { id: "XBX-03", type: "XBOX",   status: "libre" },
  { id: "SWT-01", type: "SWITCH", status: "occupe", client: "Akorlé V.",  jeu: "Smash Bros",   debut: "19:25", duree: "00:35", montant: "580 F",   progress: 58 },
  { id: "SWT-02", type: "SWITCH", status: "reserve", client: "Réservé 21:00" },
  { id: "SWT-03", type: "SWITCH", status: "libre" },
];

function PosteCard({ p, onClick }: { p: Poste; onClick: () => void }) {
  const s = STATUS[p.status];
  const t = TYPE_META[p.type];
  const Icon = t.icon;
  const isOccupe = p.status === "occupe";

  return (
    <button onClick={onClick}
      className="group relative text-left rounded-2xl p-4 border overflow-hidden transition-all hover:-translate-y-1 gcm-shadow-sm hover:gcm-shadow-md"
      style={{ background: "var(--gcm-panel)", borderColor: "var(--gcm-border)" }}>
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.grad }} />
      {/* Decorative orb */}
      {isOccupe && <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20" style={{ background: s.grad, filter: "blur(20px)" }} />}

      {/* Header: type chip + status pill */}
      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 gcm-shadow-sm" style={{ background: t.bg }}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="gcm-display text-base font-bold leading-tight">{p.id}</div>
            <div className="text-[10px] mt-0.5 gcm-mono font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{t.chip}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wider" style={{ background: s.soft, color: s.color }}>
          <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: s.color }}>
            {isOccupe && <span className="absolute inset-0 rounded-full gcm-pulse" style={{ background: s.color }} />}
          </span>
          {s.label}
        </div>
      </div>

      {/* Body */}
      <div className="mt-3.5 min-h-[64px]">
        {p.status === "occupe" && (
          <>
            <div className="text-sm font-semibold truncate">{p.client}</div>
            <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "var(--gcm-text-dim)" }}>
              <Gamepad2 className="w-3 h-3" /> <span className="truncate">{p.jeu}</span>
            </div>
            {/* progress */}
            <div className="mt-2.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--gcm-panel-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: s.grad, boxShadow: `0 0 8px ${s.color}66` }} />
              </div>
            </div>
          </>
        )}
        {p.status === "libre" && (
          <div className="flex flex-col items-center justify-center h-16 text-center">
            <Sparkles className="w-4 h-4 mb-1" style={{ color: "var(--gcm-emerald)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--gcm-emerald)" }}>Disponible</span>
            <span className="text-[10px] mt-0.5" style={{ color: "var(--gcm-text-muted)" }}>Toucher pour démarrer</span>
          </div>
        )}
        {p.status === "maintenance" && (
          <div className="flex items-center gap-2 text-xs h-16" style={{ color: "var(--gcm-amber)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.soft }}><Wrench className="w-3.5 h-3.5" /></div>
            <div>
              <div className="font-semibold">Hors service</div>
              <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>Tech assigné</div>
            </div>
          </div>
        )}
        {p.status === "reserve" && (
          <div className="flex items-center gap-2 text-xs h-16" style={{ color: "var(--gcm-cyan)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.soft }}><Clock4 className="w-3.5 h-3.5" /></div>
            <div>
              <div className="font-semibold">{p.client}</div>
              <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>2 personnes</div>
            </div>
          </div>
        )}
      </div>

      {isOccupe && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="flex items-center gap-1 text-[11px] gcm-mono" style={{ color: "var(--gcm-text-dim)" }}>
            <Clock4 className="w-3 h-3" /> {p.duree}
          </div>
          <div className="gcm-mono text-sm font-bold gcm-grad-text" style={{ background: s.grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {p.montant}
          </div>
        </div>
      )}
    </button>
  );
}

function Modal({ poste, onClose }: { poste: Poste; onClose: () => void }) {
  const s = STATUS[poste.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "var(--gcm-modal-backdrop)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden gcm-shadow-lg" style={{ background: "var(--gcm-bg-2)" }}>
        {/* Gradient header */}
        <div className="relative px-6 pt-6 pb-5 text-white overflow-hidden" style={{ background: s.grad }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="absolute bottom-0 left-1/3 w-32 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.10)", filter: "blur(20px)" }} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 hover:bg-white/25 transition">
            <X className="w-4 h-4" />
          </button>
          <div className="relative flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] font-semibold opacity-90">{s.label} · Session live</div>
              <div className="gcm-display text-3xl font-bold leading-tight mt-0.5">{poste.id}</div>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 backdrop-blur">
              <Wifi className="w-3 h-3" /> 192.168.1.42
            </span>
            <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur">{poste.type}</span>
            <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur">Ping 12ms</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Client + game */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "var(--gcm-panel-2)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold gcm-grad-fuchsia">
              {poste.client?.split(" ").map(p => p[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{poste.client}</div>
              <div className="text-xs flex items-center gap-1.5" style={{ color: "var(--gcm-text-dim)" }}>
                <Gamepad2 className="w-3 h-3" /> {poste.jeu}
              </div>
            </div>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gcm-bg-2)", color: "var(--gcm-violet)" }}>
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Time stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "var(--gcm-violet-soft)" }}>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--gcm-violet)" }}>Début</div>
              <div className="gcm-display text-xl font-bold mt-1 gcm-mono">{poste.debut}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--gcm-fuchsia-soft)" }}>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--gcm-fuchsia)" }}>Durée</div>
              <div className="gcm-display text-xl font-bold mt-1 gcm-mono">{poste.duree}</div>
            </div>
          </div>

          {/* Total card */}
          <div className="rounded-2xl p-5 text-center text-white relative overflow-hidden" style={{ background: "var(--gcm-grad-hero)" }}>
            <div className="absolute inset-0 gcm-dotgrid opacity-30" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold opacity-90">Total à encaisser</div>
              <div className="gcm-display text-5xl font-bold mt-2 leading-none">{poste.montant}</div>
              <div className="text-[11px] mt-2 gcm-mono opacity-90">Tarif PC · 800 F / heure</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <button className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-cyan)" }}>
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-amber)" }}>
              <Plus className="w-3.5 h-3.5" /> +30min
            </button>
            <button className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-text-dim)" }}>
              <Power className="w-3.5 h-3.5" /> Reboot
            </button>
          </div>

          <button className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 gcm-shadow-glow gcm-grad-violet hover:scale-[1.01] transition">
            <Coins className="w-4 h-4" /> CLÔTURER & ENCAISSER
          </button>
        </div>
      </div>
    </div>
  );
}

function PostesHero({ counts, total }: { counts: Record<Status, number>; total: number }) {
  const occupRate = Math.round(((counts.occupe || 0) / total) * 100);
  return (
    <div className="px-8 pt-7 pb-5 flex items-end justify-between gap-6" style={{ background: "var(--gcm-bg-2)" }}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-1.5" style={{ color: "var(--gcm-violet)" }}>Catalogue · {total} postes</div>
        <h1 className="gcm-display text-[28px] font-bold leading-tight">Postes de jeu</h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {(["occupe","libre","reserve","maintenance"] as Status[]).map(k => {
            const s = STATUS[k];
            return (
              <div key={k} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.soft, color: s.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                {s.label} · <span className="gcm-mono">{counts[k] || 0}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Big rate */}
        <div className="text-right pr-4 border-r" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--gcm-text-muted)" }}>Occupation</div>
          <div className="gcm-display text-2xl font-bold gcm-grad-text">{occupRate}%</div>
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ background: "var(--gcm-panel-2)" }}>
          <button className="px-3 py-2 text-white gcm-grad-violet"><Grid3x3 className="w-4 h-4" /></button>
          <button className="px-3 py-2" style={{ color: "var(--gcm-text-muted)" }}><List className="w-4 h-4" /></button>
        </div>
        <button className="px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border" style={{ borderColor: "var(--gcm-border)", color: "var(--gcm-text-dim)", background: "var(--gcm-panel)" }}>
          <Filter className="w-4 h-4" /> Filtrer
        </button>
        <button className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2 gcm-shadow-glow gcm-grad-violet">
          <Plus className="w-4 h-4" /> Nouveau
        </button>
      </div>
    </div>
  );
}

export function Postes() {
  const [selected, setSelected] = useState<Poste | null>(POSTES.find(p => p.id === "PS5-01") || null);
  const counts = POSTES.reduce((a, p) => ({ ...a, [p.status]: (a[p.status] || 0) + 1 }), {} as Record<Status, number>);

  return (
    <Shell activeLabel="Postes" hero={<PostesHero counts={counts} total={POSTES.length} />}>
      <div className="grid grid-cols-6 gap-4 max-w-[1400px]">
        {POSTES.map(p => <PosteCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
      </div>

      {selected && (
        <Modal poste={selected.status === "occupe" ? selected : (POSTES.find(p => p.id === "PS5-01") || POSTES[0])} onClose={() => setSelected(null)} />
      )}
    </Shell>
  );
}
