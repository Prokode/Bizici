import { useTranslation } from "react-i18next";
import { Shell } from "../components/Shell";
import { Sparkles, Rocket } from "lucide-react";

const KNOWN = new Set(["ventes","consoles","cartes","tarifs","users","locaux","rapports","licence","settings"]);

export function ComingSoon({ section, dark, onToggleDark }: { section: string; dark: boolean; onToggleDark: () => void }) {
  const { t } = useTranslation();
  const key = KNOWN.has(section) ? section : "dashboard";
  const title = t(`nav.${key}`);

  return (
    <Shell dark={dark} onToggleDark={onToggleDark} title={title} eyebrow="GCM" subtitle="">
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center text-white gcm-grad-violet gcm-shadow-glow mb-6">
            <Rocket className="w-9 h-9" />
          </div>
          <h2 className="gcm-display text-3xl font-bold mb-3 gcm-grad-text">{title}</h2>
          <p className="text-sm" style={{ color: "var(--gcm-text-dim)" }}>
            <Sparkles className="inline w-4 h-4 mr-1" style={{ color: "var(--gcm-fuchsia)" }} />
            Coming soon · Bientôt disponible
          </p>
        </div>
      </div>
    </Shell>
  );
}
