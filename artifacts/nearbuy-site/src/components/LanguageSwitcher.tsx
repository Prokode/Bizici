import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLang } from "@/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "fr") as SupportedLang;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-[#D9CDB9] bg-[#FFFDF7] p-0.5 shadow-sm"
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
                ? "rounded-full bg-[#B94F35] text-white"
                : "rounded-full text-[#46544A] hover:text-[#26392F]")
            }
          >
            {t(lang === "fr" ? "nav.languageFr" : "nav.languageEn")}
          </button>
        );
      })}
    </div>
  );
}
