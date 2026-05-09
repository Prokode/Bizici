import "./_group.css";
import { useState } from "react";
import { Shell } from "./_Shell";
import {
  Monitor, Gamepad2, Wrench, Plus, Filter, Grid3x3, List,
  Clock4, User, Coins, Play, Pause, X, Power, Wifi
} from "lucide-react";

type Status = "occupe" | "libre" | "maintenance" | "reserve";
type Type = "PC" | "PS5" | "XBOX" | "SWITCH";

type Poste = {
  id: string;
  type: Type;
  status: Status;
  client?: string;
  jeu?: string;
  debut?: string;
  duree?: string;
  montant?: string;
};

const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  occupe:      { label: "OCCUPÉ",      color: "var(--gcm-magenta)", bg: "var(--gcm-magenta-dim)" },
  libre:       { label: "LIBRE",       color: "var(--gcm-neon)",    bg: "var(--gcm-neon-dim)" },
  maintenance: { label: "MAINTENANCE", color: "var(--gcm-amber)",   bg: "rgba(255,184,78,0.15)" },
  reserve:     { label: "RÉSERVÉ",     color: "var(--gcm-cyan)",    bg: "rgba(78,226,255,0.15)" },
};

const TYPE_ICON: Record<Type, any> = { PC: Monitor, PS5: Gamepad2, XBOX: Gamepad2, SWITCH: Gamepad2 };

const POSTES: Poste[] = [
  { id: "PC-01",  type: "PC",    status: "occupe", client: "Akouvi T.",  jeu: "Valorant",   debut: "19:12", duree: "00:48", montant: "640 F" },
  { id: "PC-02",  type: "PC",    status: "libre" },
  { id: "PC-03",  type: "PC",    status: "occupe", client: "Edem A.",    jeu: "CS2",        debut: "19:30", duree: "00:30", montant: "400 F" },
  { id: "PC-04",  type: "PC",    status: "maintenance" },
  { id: "PC-05",  type: "PC",    status: "occupe", client: "Sika K.",    jeu: "League of L.", debut: "18:55", duree: "01:05", montant: "880 F" },
  { id: "PC-06",  type: "PC",    status: "libre" },
  { id: "PC-07",  type: "PC",    status: "occupe", client: "Mensah E.",  jeu: "CS2",        debut: "18:58", duree: "01:02", montant: "840 F" },
  { id: "PC-08",  type: "PC",    status: "reserve", client: "Réservé 20:30" },
  { id: "PC-09",  type: "PC",    status: "libre" },
  { id: "PC-10",  type: "PC",    status: "occupe", client: "Yawa B.",    jeu: "Fortnite",   debut: "19:40", duree: "00:20", montant: "260 F" },
  { id: "PC-11",  type: "PC",    status: "occupe", client: "Kossi O.",   jeu: "Apex Legends", debut: "19:00", duree: "01:00", montant: "800 F" },
  { id: "PC-12",  type: "PC",    status: "occupe", client: "Adjo M.",    jeu: "Valorant",   debut: "19:30", duree: "00:30", montant: "400 F" },
  { id: "PS5-01", type: "PS5",   status: "occupe", client: "Afi D.",     jeu: "GTA V",      debut: "18:40", duree: "01:20", montant: "1 320 F" },
  { id: "PS5-02", type: "PS5",   status: "libre" },
  { id: "PS5-03", type: "PS5",   status: "occupe", client: "Komi L.",    jeu: "FC 25",      debut: "19:20", duree: "00:40", montant: "660 F" },
  { id: "PS5-04", type: "PS5",   status: "occupe", client: "Komi A.",    jeu: "EA FC 25",   debut: "19:42", duree: "00:18", montant: "300 F" },
  { id: "PS5-05", type: "PS5",   status: "maintenance" },
  { id: "PS5-06", type: "PS5",   status: "libre" },
  { id: "XBX-01", type: "XBOX",  status: "occupe", client: "Têtê G.",    jeu: "Halo Inf.",  debut: "19:05", duree: "00:55", montant: "910 F" },
  { id: "XBX-02", type: "XBOX",  status: "occupe", client: "Yao K.",     jeu: "Forza H5",   debut: "19:15", duree: "00:45", montant: "750 F" },
  { id: "XBX-03", type: "XBOX",  status: "libre" },
  { id: "SWT-01", type: "SWITCH",status: "occupe", client: "Akorlé V.",  jeu: "Smash Bros", debut: "19:25", duree: "00:35", montant: "580 F" },
  { id: "SWT-02", type: "SWITCH",status: "reserve", client: "Réservé 21:00" },
  { id: "SWT-03", type: "SWITCH",status: "libre" },
];

function PosteCard({ p, onClick }: { p: Poste; onClick: () => void }) {
  const s = STATUS[p.status];
  const Icon = TYPE_ICON[p.type];
  const isOccupe = p.status === "occupe";
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-lg border p-4 transition-all hover:-translate-y-0.5 overflow-hidden"
      style={{
        background: "var(--gcm-panel)",
        borderColor: isOccupe ? "rgba(255,46,196,0.4)" : p.status === "libre" ? "rgba(124,255,107,0.3)" : "var(--gcm-border)",
        boxShadow: isOccupe ? "0 0 18px rgba(255,46,196,0.12)" : p.status === "libre" ? "0 0 18px rgba(124,255,107,0.10)" : "none",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.color, opacity: 0.6 }} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "var(--gcm-panel-2)", color: s.color }}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="gcm-display text-sm font-bold">{p.id}</div>
            <div className="text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>{p.type}</div>
          </div>
        </div>
        <span className="text-[9px] gcm-mono px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
          {s.label}
        </span>
      </div>

      <div className="mt-3 min-h-[58px]">
        {p.status === "occupe" && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <User className="w-3 h-3" style={{ color: "var(--gcm-text-muted)" }} />
              <span className="font-medium truncate">{p.client}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "var(--gcm-text-dim)" }}>
              <Gamepad2 className="w-3 h-3" />
              <span className="truncate">{p.jeu}</span>
            </div>
          </>
        )}
        {p.status === "libre" && (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs gcm-mono" style={{ color: "var(--gcm-text-muted)" }}>· · · disponible · · ·</span>
          </div>
        )}
        {p.status === "maintenance" && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--gcm-amber)" }}>
            <Wrench className="w-3 h-3" /> Hors service
          </div>
        )}
        {p.status === "reserve" && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--gcm-cyan)" }}>
            <Clock4 className="w-3 h-3" /> {p.client}
          </div>
        )}
      </div>

      {isOccupe && (
        <div className="mt-2 pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: "var(--gcm-border)" }}>
          <span className="gcm-mono" style={{ color: "var(--gcm-text-dim)" }}>{p.duree}</span>
          <span className="gcm-mono font-semibold" style={{ color: "var(--gcm-magenta)" }}>{p.montant}</span>
        </div>
      )}
    </button>
  );
}

function Modal({ poste, onClose }: { poste: Poste; onClose: () => void }) {
  const s = STATUS[poste.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "var(--gcm-modal-backdrop)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-xl border overflow-hidden" style={{ background: "var(--gcm-bg-2)", borderColor: "var(--gcm-border-strong)", boxShadow: "0 20px 60px rgba(15,23,42,0.25)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md flex items-center justify-center gcm-glow-magenta" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-magenta)" }}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="gcm-display text-lg font-bold">{poste.id}</div>
              <div className="text-xs" style={{ color: "var(--gcm-text-dim)" }}>{poste.type} · Session en cours</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/5" style={{ color: "var(--gcm-text-dim)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md" style={{ background: s.bg }}>
            <span className="text-xs gcm-mono" style={{ color: s.color }}>● {s.label}</span>
            <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--gcm-text-dim)" }}>
              <Wifi className="w-3 h-3" /> En ligne · 192.168.1.42
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Client</div>
              <div className="text-sm font-semibold mt-1">{poste.client}</div>
            </div>
            <div className="rounded-md border p-3" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Jeu</div>
              <div className="text-sm font-semibold mt-1">{poste.jeu}</div>
            </div>
            <div className="rounded-md border p-3" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Début</div>
              <div className="text-sm font-semibold mt-1 gcm-mono">{poste.debut}</div>
            </div>
            <div className="rounded-md border p-3" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Durée</div>
              <div className="text-sm font-semibold mt-1 gcm-mono">{poste.duree}</div>
            </div>
          </div>

          <div className="rounded-md p-4 text-center border" style={{ background: "var(--gcm-bg)", borderColor: "var(--gcm-border-strong)" }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gcm-text-muted)" }}>Total à encaisser</div>
            <div className="gcm-display text-3xl font-bold mt-1 gcm-text-glow-magenta" style={{ color: "var(--gcm-magenta)" }}>
              {poste.montant}
            </div>
            <div className="text-[10px] mt-1 gcm-mono" style={{ color: "var(--gcm-text-dim)" }}>Tarif PC · 800 F / heure</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button className="py-2 rounded-md border text-xs flex items-center justify-center gap-1.5" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-cyan)" }}>
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button className="py-2 rounded-md border text-xs flex items-center justify-center gap-1.5" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-amber)" }}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
            <button className="py-2 rounded-md border text-xs flex items-center justify-center gap-1.5" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-text-dim)" }}>
              <Power className="w-3.5 h-3.5" /> Reboot
            </button>
          </div>

          <button className="w-full py-3 rounded-md font-bold gcm-glow-neon flex items-center justify-center gap-2 text-white" style={{ background: "var(--gcm-neon)" }}>
            <Coins className="w-4 h-4" /> CLÔTURER & ENCAISSER
          </button>
        </div>
      </div>
    </div>
  );
}

export function Postes() {
  const [selected, setSelected] = useState<Poste | null>(POSTES[12]); // PS5-01 modal open by default for preview

  const counts = POSTES.reduce((a, p) => ({ ...a, [p.status]: (a[p.status] || 0) + 1 }), {} as Record<Status, number>);

  return (
    <Shell
      activeLabel="Postes"
      title="Postes de jeu"
      subtitle={`${POSTES.length} postes · ${counts.occupe || 0} occupés · ${counts.libre || 0} libres`}
      actions={
        <>
          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: "var(--gcm-border-strong)" }}>
            <button className="px-2.5 py-2" style={{ background: "var(--gcm-panel-2)", color: "var(--gcm-neon)" }}><Grid3x3 className="w-4 h-4" /></button>
            <button className="px-2.5 py-2" style={{ background: "var(--gcm-panel)", color: "var(--gcm-text-muted)" }}><List className="w-4 h-4" /></button>
          </div>
          <button className="px-3 py-2 rounded-md border text-sm flex items-center gap-2" style={{ borderColor: "var(--gcm-border-strong)", color: "var(--gcm-text-dim)", background: "var(--gcm-panel)" }}>
            <Filter className="w-4 h-4" /> Filtrer
          </button>
          <button className="px-3 py-2 rounded-md text-sm font-semibold gcm-glow-neon flex items-center gap-2 text-white" style={{ background: "var(--gcm-neon)" }}>
            <Plus className="w-4 h-4" /> Nouveau poste
          </button>
        </>
      }
    >
      {/* Status legend */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(["occupe","libre","reserve","maintenance"] as Status[]).map(k => {
          const s = STATUS[k];
          return (
            <div key={k} className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs" style={{ borderColor: "var(--gcm-border)", background: "var(--gcm-panel)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              <span style={{ color: s.color }}>{s.label}</span>
              <span className="gcm-mono" style={{ color: "var(--gcm-text-dim)" }}>{counts[k] || 0}</span>
            </div>
          );
        })}
        <div className="ml-auto text-xs gcm-mono" style={{ color: "var(--gcm-text-muted)" }}>
          Taux d'occupation · <span style={{ color: "var(--gcm-neon)" }}>{Math.round(((counts.occupe || 0) / POSTES.length) * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {POSTES.map(p => <PosteCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
      </div>

      {selected && <Modal poste={selected.status === "occupe" ? selected : POSTES[12]} onClose={() => setSelected(null)} />}
    </Shell>
  );
}
