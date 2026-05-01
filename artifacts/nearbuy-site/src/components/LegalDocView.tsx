import type { LegalDoc } from "@workspace/legal-content";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function LegalDocView({
  doc,
  testIdPrefix,
}: {
  doc: LegalDoc;
  testIdPrefix: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
        <Link href="/" className="flex items-center gap-3">
          <NearBuyLogo size={36} />
          <span className="text-xl font-bold tracking-tight">
            <span style={{ color: "#1B2A5C" }}>Biz</span>
            <span style={{ color: "#7FB927" }}>Ici</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-[#F58220]"
          >
            ← {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 px-6 py-10 md:py-16">
        <article
          className="max-w-3xl mx-auto"
          data-testid={`${testIdPrefix}-article`}
        >
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight"
            data-testid={`${testIdPrefix}-title`}
          >
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {t("legal.lastUpdated")}: {doc.lastUpdated}
          </p>

          <p className="mt-6 text-neutral-700 leading-relaxed text-base">
            {doc.intro}
          </p>

          <div className="mt-10 space-y-8">
            {doc.sections.map((section, idx) => (
              <section key={idx} data-testid={`${testIdPrefix}-section-${idx}`}>
                <h2 className="text-xl font-semibold text-[#1B2A5C]">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-neutral-700 leading-relaxed text-[15px] whitespace-pre-line"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-[#1B2A5C]/15 bg-[#1B2A5C]/5 p-4 text-sm text-neutral-700">
            <p>
              <strong>{t("legal.contactTitle")}</strong>
            </p>
            <p className="mt-1">
              {t("legal.contactBody")}{" "}
              <a
                href="mailto:privacy@bizici.fr"
                className="text-[#F58220] hover:underline"
              >
                privacy@bizici.fr
              </a>
            </p>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
