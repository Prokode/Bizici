import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLang } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "fr") as SupportedLang;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-sidebar-border bg-transparent p-0.5"
      role="group"
      aria-label={t("common.language")}
    >
      {(["fr", "en"] as const).map((lang) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            {t(lang === "fr" ? "common.languageFr" : "common.languageEn")}
          </button>
        );
      })}
    </div>
  );
}
