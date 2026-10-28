import { Link } from "wouter";
import { Trans, useTranslation } from "react-i18next";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { SiteFooter } from "@/components/SiteFooter";

export default function DeleteAccountConfirmationPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FFF8E9] text-[#26392F]">
      <header className="px-6 py-5 flex items-center justify-between border-b border-[#E1D6C4]">
        <Link href="/" className="flex items-center gap-3">
          <NearBuyLogo size={36} />
          <span className="text-xl font-bold tracking-tight"><span style={{ color: "#2F6246" }}>ici</span><span style={{ color: "#B94F35" }}>Biz</span></span>
        </Link>
      </header>

      <main className="flex-1 px-6 py-16">
        <div
          className="max-w-xl mx-auto text-center"
          data-testid="delete-confirmation"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#B94F35]">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("deletion.successTitle")}
          </h1>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            <Trans
              i18nKey="deletion.successBody"
              components={{ strong: <strong /> }}
            />
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            {t("deletion.successContact")}{" "}
            <a
              href="mailto:support@bizici.app"
              className="text-[#963E2B] hover:underline"
            >
              support@bizici.app
            </a>
            .
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#B94F35] hover:bg-[#9F402B] text-white font-semibold px-6 py-3 text-base transition-colors"
            data-testid="link-home"
          >
            {t("deletion.backHome")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
