import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-[#E1D6C4] bg-[#F6EFDF] px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-sm text-neutral-700 font-semibold">
            <span className="text-[#2F6246]">ici</span><span className="text-[#B94F35]">Biz</span> &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {t("footer.tagline")}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/confidentialite"
            className="text-[#26392F] hover:text-[#B94F35] underline-offset-4 hover:underline"
            data-testid="footer-link-privacy"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            href="/conditions"
            className="text-[#26392F] hover:text-[#B94F35] underline-offset-4 hover:underline"
            data-testid="footer-link-terms"
          >
            {t("footer.terms")}
          </Link>
          <Link
            href="/supprimer-compte"
            className="text-[#26392F] hover:text-[#B94F35] underline-offset-4 hover:underline"
            data-testid="footer-link-delete-account"
          >
            {t("footer.deletion")}
          </Link>
          <a
            href="mailto:support@bizici.app"
            className="text-[#26392F] hover:text-[#B94F35]"
          >
            Contact support
          </a>
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}
