import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLang } from "@/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "fr") as SupportedLang;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/80 backdrop-blur p-0.5 shadow-sm"
      role="group"
      aria-label={t("nav.language")}
    >
      {(["fr", "en"] as const).map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={
              "px-2.5 py-1 rounded text-xs font-semibold transition-colors " +
              (active
                ? "bg-[#F58220] text-white"
                : "text-gray-600 hover:text-gray-900")
            }
          >
            {t(lang === "fr" ? "nav.languageFr" : "nav.languageEn")}
          </button>
        );
      })}
    </div>
  );
}
