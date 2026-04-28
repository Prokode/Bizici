import { Link } from "wouter";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { SiteFooter } from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
        <Link href="/" className="flex items-center gap-3">
          <NearBuyLogo size={36} />
          <span className="text-xl font-bold tracking-tight">NearBuy</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-700">
          <a href="#how" className="hover:text-orange-600 hidden sm:inline">
            Comment ça marche
          </a>
          <a href="#download" className="hover:text-orange-600 hidden sm:inline">
            Télécharger
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Trouvez ce que vous cherchez,{" "}
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              à deux pas de chez vous.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto">
            NearBuy connecte les clients aux commerces de proximité — produits,
            stocks, prix et discussion en direct avec le vendeur.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 text-base transition-colors"
            >
              Télécharger l'application
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-400 text-neutral-800 font-semibold px-6 py-3 text-base transition-colors"
            >
              En savoir plus
            </a>
          </div>
        </section>

        <section
          id="how"
          className="px-6 py-16 bg-neutral-50 border-y border-neutral-100"
        >
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Côté client",
                body: "Téléchargez l'application NearBuy pour découvrir les commerces près de vous, demander un produit et discuter avec le vendeur.",
              },
              {
                title: "Côté vendeur",
                body: "L'application NearBuy Business vous permet de gérer votre stock, vos prix, et de répondre aux clients en temps réel.",
              },
              {
                title: "Confiance & proximité",
                body: "Pas d'intermédiaire. Vous parlez directement au commerçant à côté de chez vous, vous payez sur place.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-6 shadow-sm border border-neutral-100"
              >
                <h3 className="text-lg font-semibold text-neutral-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="download" className="px-6 py-20 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Disponible bientôt
          </h2>
          <p className="mt-4 text-neutral-600">
            NearBuy arrive prochainement sur l'App Store et Google Play.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
