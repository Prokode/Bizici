import { useTranslation } from "react-i18next";
import { Shell } from "../components/Shell";
import {
  Monitor, Coins, Clock4, Users2, TrendingUp, ArrowUpRight,
  Gamepad2, Calendar, Sparkles, Trophy, Zap, Activity, Plus
} from "lucide-react";

const HOURS = ["08","09","10","11","12","13","14","15","16","17","18","19","20","21","22"];
const REV   = [22,30,38,42,55,48,40,52,68,72,80,92,86,70,52];
const REV_AVG = REV.map((v, i) => Math.max(15, v - 12 - (i % 3) * 4));

const TOP_GAMES = [
  { name: "EA FC 25", pct: 84, color: "var(--gcm-violet)" },
  { name: "Valorant", pct: 71, color: "var(--gcm-fuchsia)" },
  { name: "Call of Duty MW3", pct: 58, color: "var(--gcm-cyan)" },
  { name: "Forza Horizon 5", pct: 42, color: "var(--gcm-amber)" },
  { name: "Mortal Kombat 1", pct: 33, color: "var(--gcm-violet-bright)" },
];

function Hero() {
  const { t } = useTranslation();
  return (
    <div className="relative rounded-3xl overflow-hidden gcm-shadow-lg" style={{ background: "var(--gcm-grad-hero)" }}>
      <div className="absolute inset-0 gcm-dotgrid opacity-40" />
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.10)", filter: "blur(40px)" }} />
      <div className="absolute bottom-0 left-1/3 w-72 h-40 rounded-full" style={{ background: "rgba(244,114,182,0.35)", filter: "blur(60px)" }} />

      <div className="relative grid grid-cols-[1.4fr,1fr] gap-8 p-8 text-white">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
            <Sparkles className="w-3.5 h-3.5" /> {t("dashboard.eyebrow")}
          </div>
          <div className="gcm-display text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{t("dashboard.revenue_today")}</div>
          <div className="flex items-baseline gap-3 mt-1">
            <div className="gcm-display text-[68px] font-bold leading-none tracking-tight">74 500</div>
            <div className="gcm-display text-2xl font-medium opacity-90">F&nbsp;CFA</div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.25)", color: "#A7F3D0" }}>
              <TrendingUp className="w-3 h-3" /> {t("dashboard.vs_yesterday", { value: "+8.4%" })}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>{t("dashboard.goal_today", { amount: "90 000 F" })}</span>
          </div>

          <div className="mt-5 max-w-xs">
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              <span className="gcm-mono">82%</span>
              <span className="gcm-mono">{t("dashboard.remaining", { amount: "15 500 F" })}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
              <div className="h-full rounded-full" style={{ width: "82%", background: "linear-gradient(90deg, #fff, #FBCFE8)", boxShadow: "0 0 12px rgba(255,255,255,0.6)" }} />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button className="px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-bold flex items-center gap-2 shadow-lg hover:scale-[1.02] transition">
              <Plus className="w-4 h-4" /> {t("dashboard.new_session")}
            </button>
            <button className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Calendar className="w-4 h-4" /> {t("dashboard.today")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBCFE8" />
                  <stop offset="100%" stopColor="#fff" />
                </linearGradient>
              </defs>
              <circle cx="110" cy="110" r="92" stroke="rgba(255,255,255,0.18)" strokeWidth="14" fill="none" />
              <circle cx="110" cy="110" r="92" stroke="url(#ringGrad)" strokeWidth="14" fill="none"
                      strokeLinecap="round" strokeDasharray="578" strokeDashoffset="144"
                      transform="rotate(-90 110 110)" style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.5))" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{t("dashboard.occupancy")}</div>
              <div className="gcm-display text-5xl font-bold mt-1">75%</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>{t("dashboard.posts_count", { used: 18, total: 24 })}</div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] gcm-mono" style={{ color: "#A7F3D0" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#A7F3D0", boxShadow: "0 0 8px #A7F3D0" }} />
                {t("dashboard.live")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, icon: Icon, accent, sparkUp }: any) {
  const points = [10, 30, 18, 45, 28, 60, 38, 72, 50, 65];
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * 100} ${50 - p / 2}`).join(" ");
  const id = label.replace(/\s+/g, "");
  return (
    <div className="relative rounded-2xl p-5 border overflow-hidden gcm-glass gcm-shadow-sm transition-all hover:gcm-shadow-md hover:-translate-y-0.5"
         style={{ borderColor: "var(--gcm-border)" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{label}</div>
          <div className="gcm-display text-3xl font-bold mt-2 tracking-tight">{value}</div>
          <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: sparkUp ? "var(--gcm-emerald)" : "var(--gcm-red)" }}>
            <TrendingUp className={`w-3 h-3 ${!sparkUp ? "rotate-180" : ""}`} /> {sub}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: accent }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 w-full h-12 opacity-60">
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 50 L 0 50 Z`} fill={`url(#spark-${id})`} />
        <path d={path} fill="none" stroke={accent} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Dashboard(props: { dark: boolean; onToggleDark: () => void }) {
  const { t } = useTranslation();

  const ticker = [
    { kind: "session",  text: t("dashboard.ticker.session_started", { poste: "PS5-04", client: "Komi A.", game: "EA FC 25" }) },
    { kind: "encaisse", text: t("dashboard.ticker.cashed", { amount: "1 320 F", poste: "PS5-01" }) },
    { kind: "session",  text: t("dashboard.ticker.extended", { poste: "PC-12", client: "Adjo M." }) },
    { kind: "alert",    text: t("dashboard.ticker.alert", { poste: "PC-04" }) },
    { kind: "session",  text: t("dashboard.ticker.session_started", { poste: "XBX-02", client: "Yao K.", game: "Forza Horizon 5" }) },
    { kind: "encaisse", text: t("dashboard.ticker.cashed", { amount: "800 F", poste: "PC-07" }) },
  ];

  const activity = [
    { who: "Komi A.",   what: t("dashboard.activity.session", { poste: "PS5-04" }),                      when: t("dashboard.activity.ago_minutes", { n: 2 }),  color: "var(--gcm-violet)",  icon: Zap },
    { who: "Afi D.",    what: t("dashboard.activity.cashed",  { amount: "1 320 F", poste: "PS5-01" }),   when: t("dashboard.activity.ago_minutes", { n: 5 }),  color: "var(--gcm-emerald)", icon: Coins },
    { who: "Adjo M.",   what: t("dashboard.activity.extended",{ poste: "PC-12" }),                       when: t("dashboard.activity.ago_minutes", { n: 8 }),  color: "var(--gcm-cyan)",    icon: Clock4 },
    { who: "Sika K.",   what: t("dashboard.activity.new_client"),                                        when: t("dashboard.activity.ago_minutes", { n: 12 }), color: "var(--gcm-fuchsia)", icon: Users2 },
    { who: t("dashboard.activity.system"), what: t("dashboard.activity.maintenance", { poste: "PC-04" }),when: t("dashboard.activity.ago_minutes", { n: 18 }), color: "var(--gcm-amber)",   icon: Activity },
  ];

  return (
    <Shell {...props}>
      <div className="space-y-6 max-w-[1400px]">
        <Hero />

        {/* Ticker */}
        <div className="rounded-2xl border overflow-hidden gcm-glass gcm-shadow-sm" style={{ borderColor: "var(--gcm-border)" }}>
          <div className="flex items-stretch">
            <div className="px-4 flex items-center gap-2 text-white text-xs font-bold gcm-grad-violet">
              <Activity className="w-3.5 h-3.5" /> {t("dashboard.live")}
            </div>
            <div className="flex-1 overflow-hidden relative" style={{ maskImage: "linear-gradient(90deg, transparent, #000 40px, #000 calc(100% - 40px), transparent)" }}>
              <div className="flex gap-8 py-2.5 whitespace-nowrap gcm-marquee" style={{ width: "max-content" }}>
                {[...ticker, ...ticker].map((tt, i) => (
                  <span key={i} className="text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{
                      background: tt.kind === "encaisse" ? "var(--gcm-emerald)" : tt.kind === "alert" ? "var(--gcm-amber)" : "var(--gcm-violet)"
                    }} />
                    <span style={{ color: "var(--gcm-text-dim)" }}>{tt.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <MiniStat label={t("dashboard.kpi_occupied")} value="18 / 24" sub={t("dashboard.vs_yesterday", { value: "+12%" })} sparkUp icon={Monitor} accent="#7C3AED" />
          <MiniStat label={t("dashboard.kpi_sessions")} value="18"     sub={t("dashboard.kpi_since_hour", { n: 3 })} sparkUp icon={Clock4}  accent="#06B6D4" />
          <MiniStat label={t("dashboard.kpi_clients")}  value="42"     sub={t("dashboard.vs_yesterday", { value: "-2.1%" })} sparkUp={false} icon={Users2} accent="#EC4899" />
          <MiniStat label={t("dashboard.kpi_basket")}   value="1 770 F" sub={t("dashboard.vs_yesterday", { value: "+5.8%" })} sparkUp icon={Coins}  accent="#10B981" />
        </div>

        {/* Chart + activity */}
        <div className="grid grid-cols-[1.6fr,1fr] gap-4">
          <div className="rounded-2xl border p-6 gcm-glass gcm-shadow-md" style={{ borderColor: "var(--gcm-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{t("dashboard.chart.eyebrow")}</div>
                <div className="gcm-display text-xl font-bold mt-0.5">{t("dashboard.chart.title")}</div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md gcm-grad-violet" /> {t("dashboard.chart.today")}</span>
                <span className="flex items-center gap-1.5" style={{ color: "var(--gcm-text-dim)" }}><span className="w-3 h-3 rounded-md gcm-grad-fuchsia" /> {t("dashboard.chart.avg7")}</span>
              </div>
            </div>
            <div className="h-60 flex items-end gap-1.5">
              {REV.map((v, i) => (
                <div key={i} className="flex-1 self-stretch flex flex-col justify-end gap-0.5 group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] gcm-mono opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--gcm-violet-deep)", color: "#fff" }}>
                    {Math.round(v * 80)} F
                  </div>
                  <div className="flex gap-0.5 items-end h-full">
                    <div className="flex-1 rounded-t-md gcm-grad-violet" style={{ height: `${v}%`, boxShadow: "0 0 8px rgba(139,92,246,0.35)" }} />
                    <div className="flex-1 rounded-t-md gcm-grad-fuchsia" style={{ height: `${REV_AVG[i]}%`, opacity: 0.85 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 gcm-mono text-[10px]" style={{ color: "var(--gcm-text-muted)" }}>
              {HOURS.map(h => <span key={h}>{h}h</span>)}
            </div>
          </div>

          <div className="rounded-2xl border p-6 gcm-glass gcm-shadow-md" style={{ borderColor: "var(--gcm-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{t("dashboard.activity.eyebrow")}</div>
                <div className="gcm-display text-lg font-bold mt-0.5">{t("dashboard.activity.title")}</div>
              </div>
              <span className="text-[10px] gcm-mono px-2 py-1 rounded-md" style={{ background: "var(--gcm-violet-soft)", color: "var(--gcm-violet)" }}>{t("dashboard.activity.per_hour")}</span>
            </div>
            <div className="space-y-3">
              {activity.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: a.color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {i < activity.length - 1 && (
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-px h-full" style={{ background: "var(--gcm-border)" }} />
                      )}
                    </div>
                    <div className="flex-1 pb-3 min-w-0">
                      <div className="text-sm font-semibold truncate">{a.who}</div>
                      <div className="text-xs truncate" style={{ color: "var(--gcm-text-dim)" }}>{a.what}</div>
                      <div className="text-[10px] mt-0.5 gcm-mono" style={{ color: "var(--gcm-text-muted)" }}>{a.when}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top games + leaderboard */}
        <div className="grid grid-cols-[1fr,1fr] gap-4">
          <div className="rounded-2xl border p-6 gcm-glass gcm-shadow-md" style={{ borderColor: "var(--gcm-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white gcm-grad-violet"><Gamepad2 className="w-4 h-4" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{t("dashboard.top_games.eyebrow")}</div>
                  <div className="gcm-display text-base font-bold">{t("dashboard.top_games.title")}</div>
                </div>
              </div>
              <button className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--gcm-violet)" }}>
                {t("dashboard.top_games.see_all")} <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3.5">
              {TOP_GAMES.map((g, idx) => (
                <div key={g.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="gcm-mono text-[10px] w-4 font-bold" style={{ color: "var(--gcm-text-muted)" }}>#{idx + 1}</span>
                      <span className="font-semibold">{g.name}</span>
                    </div>
                    <span className="gcm-mono font-semibold" style={{ color: g.color }}>{g.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--gcm-panel-2)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${g.pct}%`,
                      background: `linear-gradient(90deg, ${g.color}, ${g.color}88)`,
                      boxShadow: `0 0 10px ${g.color}66`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6 gcm-glass gcm-shadow-md" style={{ borderColor: "var(--gcm-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white gcm-grad-fuchsia"><Trophy className="w-4 h-4" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: "var(--gcm-text-muted)" }}>{t("dashboard.top_clients.eyebrow")}</div>
                  <div className="gcm-display text-base font-bold">{t("dashboard.top_clients.title")}</div>
                </div>
              </div>
              <button className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--gcm-fuchsia)" }}>
                {t("dashboard.top_clients.see_all")} <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { rank: 1, name: "Komi A.",   sessions: 28, spent: "42 800 F", grad: "linear-gradient(135deg,#FBBF24,#F59E0B)", medal: "🥇" },
                { rank: 2, name: "Afi D.",    sessions: 24, spent: "38 200 F", grad: "linear-gradient(135deg,#E5E7EB,#9CA3AF)", medal: "🥈" },
                { rank: 3, name: "Yao K.",    sessions: 19, spent: "31 500 F", grad: "linear-gradient(135deg,#FCD7A4,#D97706)", medal: "🥉" },
                { rank: 4, name: "Adjo M.",   sessions: 17, spent: "27 100 F", grad: "var(--gcm-grad-violet)", medal: "" },
                { rank: 5, name: "Mensah E.", sessions: 15, spent: "24 600 F", grad: "var(--gcm-grad-violet)", medal: "" },
              ].map(c => (
                <div key={c.rank} className="flex items-center gap-3 p-2.5 rounded-xl">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: c.grad }}>
                    {c.medal || `#${c.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px]" style={{ color: "var(--gcm-text-muted)" }}>{t("dashboard.top_clients.sessions_this_month", { n: c.sessions })}</div>
                  </div>
                  <div className="gcm-mono text-sm font-bold" style={{ color: "var(--gcm-violet)" }}>{c.spent}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
