import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function SiteHeader() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 transition-all duration-300 " +
        (scrolled
          ? "border-b border-[#E1D6C4]/80 bg-[#FFF8E9]/90 backdrop-blur-xl shadow-sm"
          : "border-b border-transparent bg-transparent")
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <NearBuyLogo size={34} />
          <span className="text-xl font-extrabold tracking-tight">
            <span style={{ color: "#2F6246" }}>ici</span>
            <span style={{ color: "#B94F35" }}>Biz</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-700">
          <a
            href="#features"
            className="hidden transition-colors hover:text-[#B94F35] sm:inline"
          >
            {t("nav.features")}
          </a>
          <a
            href="#how"
            className="hidden transition-colors hover:text-[#B94F35] sm:inline"
          >
            {t("nav.how")}
          </a>
          <LanguageSwitcher />
          <a
            href="#download"
            className="inline-flex items-center justify-center rounded-full bg-[#B94F35] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#9F402B] hover:shadow-md"
          >
            {t("nav.download")}
          </a>
        </nav>
      </div>
    </header>
  );
}
