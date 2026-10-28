import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, MapPin, MessageCircle, CalendarCheck, ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { PhoneMockup, MapScreen, ChatScreen } from "@/components/site/PhoneMockup";
import { StoreBadges } from "@/components/site/StoreBadges";

const INK = "#26392F";
const TERRACOTTA = "#B94F35";
const GREEN = "#2F6246";

export default function HomePage() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();

  const features = [
    { Icon: Camera, title: t("feat.searchTitle"), body: t("feat.searchBody"), color: TERRACOTTA, bg: "#F8E8DA" },
    { Icon: MapPin, title: t("feat.mapTitle"), body: t("feat.mapBody"), color: GREEN, bg: "#E6EFE5" },
    { Icon: MessageCircle, title: t("feat.chatTitle"), body: t("feat.chatBody"), color: INK, bg: "#E9EBDD" },
    { Icon: CalendarCheck, title: t("feat.bookTitle"), body: t("feat.bookBody"), color: TERRACOTTA, bg: "#F8E8DA" },
  ];

  const trust = [t("hero.trust1"), t("hero.trust2"), t("hero.trust3")];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FFF8E9] text-[#26392F]">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden">
          {/* gradient blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#B94F35]/15 blur-3xl" />
            <div className="absolute right-[-6rem] top-20 h-96 w-96 rounded-full bg-[#2F6246]/15 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#26392F]/8 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:pb-28 md:pt-20">
            <div className="text-center md:text-left">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#B94F35]/30 bg-[#F8E8DA] px-4 py-1.5 text-xs font-semibold text-[#873722]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B94F35] opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#B94F35]" />
                  </span>
                  {t("hero.badge")}
                </span>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl" style={{ color: INK }}>
                  {t("hero.titleA")}{" "}
                  <span className="text-[#B94F35]">
                    {t("hero.titleB")}
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-600 md:mx-0 md:text-xl">
                  {t("hero.subtitle")}
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                  <a
                    href="#download"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#B94F35] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#B94F35]/20 transition-all hover:-translate-y-0.5 hover:bg-[#9F402B] hover:shadow-xl"
                  >
                    {t("hero.ctaDownload")}
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </a>
                  <a
                    href="#features"
                    className="inline-flex items-center justify-center rounded-full border border-[#D9CDB9] bg-[#FFFDF7] px-7 py-3.5 text-base font-semibold text-[#26392F] transition-colors hover:border-[#B94F35]"
                  >
                    {t("hero.ctaLearn")}
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-start">
                  {trust.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E6EFE5]">
                        <Check size={12} color="#2F6246" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            {/* hero phone */}
            <Reveal delay={0.15} className="flex justify-center">
              <motion.div
                animate={reduce ? undefined : { y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-[#B94F35]/15 to-[#2F6246]/15 blur-2xl" />
                <PhoneMockup>
                  <MapScreen />
                </PhoneMockup>
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section id="features" className="bg-[#F6EFDF] px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: INK }}>
                {t("feat.title")}
              </h2>
              <p className="mt-4 text-lg text-neutral-600">{t("feat.subtitle")}</p>
            </Reveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.07}>
                  <div className="group h-full rounded-[1.25rem] border border-[#E1D6C4] bg-[#FFFDF7] p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: f.bg }}
                    >
                      <f.Icon size={22} color={f.color} />
                    </div>
                    <h3 className="mt-5 text-lg font-bold" style={{ color: INK }}>
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- SHOWCASE (chat) ---------- */}
        <section className="overflow-hidden px-6 py-20 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
            <Reveal className="order-2 flex justify-center md:order-1">
              <div className="relative">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-[#2F6246]/15 to-[#B94F35]/15 blur-2xl" />
                <PhoneMockup>
                  <ChatScreen />
                </PhoneMockup>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="order-1 md:order-2">
              <span className="text-sm font-bold uppercase tracking-wide text-[#B94F35]">
                {t("feat.chatTitle")}
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: INK }}>
                {t("showcase.title")}
              </h2>
              <p className="mt-4 text-lg text-neutral-600">{t("showcase.body")}</p>
              <ul className="mt-7 space-y-3">
                {[t("showcase.b1"), t("showcase.b2"), t("showcase.b3")].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-neutral-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E6EFE5]">
                      <Check size={13} color="#2F6246" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------- TWO-SIDED ---------- */}
        <section id="how" className="bg-[#F6EFDF] px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: INK }}>
                {t("twosided.title")}
              </h2>
              <p className="mt-4 text-lg text-neutral-600">{t("twosided.subtitle")}</p>
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-[1.25rem] border border-[#E1D6C4] bg-[#FFFDF7] p-8 shadow-sm">
                  <span className="inline-flex rounded-full bg-[#F8E8DA] px-3 py-1 text-xs font-bold text-[#873722]">
                    <><span className="text-[#2F6246]">ici</span><span className="text-[#B94F35]">Biz</span></>
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold" style={{ color: INK }}>
                    {t("twosided.customerTitle")}
                  </h3>
                  <p className="mt-3 text-neutral-600">{t("twosided.customerBody")}</p>
                  <a
                    href="#download"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#B94F35] hover:gap-3 transition-all"
                  >
                    {t("twosided.customerCta")} <ArrowRight size={16} />
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div
                  className="relative h-full overflow-hidden rounded-[1.25rem] border border-[#D6E4D5] bg-[#E6EFE5] p-8 text-[#26392F] shadow-sm"
                >
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#2F6246]/10 blur-2xl" />
                  <span className="inline-flex rounded-full bg-[#2F6246] px-3 py-1 text-xs font-bold text-white">
                    <><span className="text-[#A9D6B8]">ici</span><span className="text-[#DB9276]">Biz</span><span className="text-white"> Pro</span></>
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold">{t("twosided.sellerTitle")}</h3>
                  <p className="mt-3 text-[#26392F]/80">{t("twosided.sellerBody")}</p>
                  <a
                    href="#download"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#2F6246] hover:gap-3 transition-all"
                  >
                    {t("twosided.sellerCta")} <ArrowRight size={16} />
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- DOWNLOAD / FINAL CTA ---------- */}
        <section id="download" className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div
                className="relative overflow-hidden rounded-[2rem] border border-[#D8CBB6] bg-[#E9F0E3] px-8 py-16 text-center shadow-xl md:px-16"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-[#B94F35]/12 blur-3xl" />
                  <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#2F6246]/12 blur-3xl" />
                </div>

                <div className="relative">
                  <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-[#26392F] md:text-5xl">
                    {t("finalCta.title")}
                  </h2>
                  <p className="mx-auto mt-5 max-w-xl text-lg text-[#26392F]/80">
                    {t("finalCta.subtitle")}
                  </p>

                  <div className="mt-10 flex justify-center">
                    <StoreBadges />
                  </div>
                  <p className="mt-6 text-sm font-medium text-[#26392F]/65">
                    {t("download.notify")}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
