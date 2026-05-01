import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50 px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-sm text-neutral-700 font-semibold">
            BizIci &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {t("footer.tagline")}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/supprimer-compte"
            className="text-neutral-700 hover:text-[#F58220] underline-offset-4 hover:underline"
            data-testid="footer-link-delete-account"
          >
            {t("footer.deletion")}
          </Link>
          <a
            href="mailto:support@bizici.app"
            className="text-neutral-700 hover:text-[#F58220]"
          >
            Contact support
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}
