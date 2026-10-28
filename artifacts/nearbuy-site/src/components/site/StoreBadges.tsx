import { useTranslation } from "react-i18next";
import { FaApple, FaGooglePlay } from "react-icons/fa";

/**
 * "Coming soon" App Store / Google Play badges. The apps aren't published yet,
 * so these are styled like the real store buttons but carry a soft "soon" pill
 * instead of linking out — honest while still building download intent.
 */
export function StoreBadges({ className }: { className?: string }) {
  const { t } = useTranslation();
  const badges = [
    { Icon: FaApple, label: t("download.appStore") },
    { Icon: FaGooglePlay, label: t("download.googlePlay") },
  ];
  return (
    <div className={"flex flex-wrap items-center gap-3 " + (className ?? "")}>
      {badges.map(({ Icon, label }) => (
        <div
          key={label}
          className="group relative inline-flex cursor-default items-center gap-3 rounded-[18px] border border-[#3D5748] bg-[#26392F] px-5 py-3 text-white shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <Icon className="h-7 w-7" />
          <div className="text-left leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-white/60">
              {t("download.badgeSoonOn")}
            </p>
            <p className="text-base font-semibold">{label}</p>
          </div>
          <span className="absolute -right-2 -top-2 rounded-full bg-[#2F6246] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
            {t("download.soon")}
          </span>
        </div>
      ))}
    </div>
  );
}
