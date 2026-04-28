import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { SiteFooter } from "@/components/SiteFooter";

type AccountType = "customer" | "seller" | "both";

export default function DeleteAccountPage() {
  const [, navigate] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Veuillez entrer votre nom complet (au moins 2 caractères).");
      return;
    }
    if (!email.trim()) {
      setError("Veuillez entrer l'adresse e-mail liée à votre compte.");
      return;
    }
    if (!confirmed) {
      setError(
        "Vous devez confirmer que vous comprenez les conséquences de la suppression.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/account-deletion-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          accountType,
          reason: reason.trim(),
          confirmed,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        let msg = `Erreur ${res.status}`;
        try {
          const j = JSON.parse(txt);
          if (j?.error) msg = String(j.error);
        } catch {
          /* ignore */
        }
        if (res.status === 429) {
          const retryAfterRaw = res.headers.get("Retry-After");
          const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : NaN;
          if (Number.isFinite(retryAfter) && retryAfter > 0) {
            const minutes = Math.max(1, Math.ceil(retryAfter / 60));
            msg = `Trop de demandes envoyées depuis cette adresse. Réessayez dans environ ${minutes} minute${minutes > 1 ? "s" : ""}.`;
          }
        }
        throw new Error(msg);
      }

      navigate("/supprimer-compte/confirmation", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
        <Link href="/" className="flex items-center gap-3">
          <NearBuyLogo size={36} />
          <span className="text-xl font-bold tracking-tight">NearBuy</span>
        </Link>
        <Link href="/" className="text-sm text-neutral-600 hover:text-orange-600">
          ← Retour à l'accueil
        </Link>
      </header>

      <main className="flex-1 px-6 py-10 md:py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Demande de suppression de compte
          </h1>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            Vous pouvez demander la suppression de votre compte NearBuy
            (client) ou NearBuy Business (vendeur) en remplissant ce formulaire.
            Notre équipe traitera votre demande dans un délai de{" "}
            <strong>30 jours maximum</strong> et vous contactera à l'adresse
            e-mail indiquée pour confirmer la suppression.
          </p>

          <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-neutral-800">
            <p className="font-semibold text-orange-700">
              Que se passe-t-il après la suppression&nbsp;?
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-neutral-700">
              <li>
                Votre profil, vos messages et vos préférences sont
                définitivement supprimés.
              </li>
              <li>
                Si vous êtes vendeur, votre commerce et vos produits sont
                également retirés de l'application.
              </li>
              <li>
                Certaines informations peuvent être conservées pour des raisons
                légales (factures, journaux de sécurité) jusqu'à 5 ans.
              </li>
              <li>L'opération est irréversible.</li>
            </ul>
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-6"
            data-testid="form-delete-account"
          >
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-neutral-800"
              >
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
                required
                maxLength={200}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-neutral-100"
                data-testid="input-full-name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-800"
              >
                Adresse e-mail liée à votre compte
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
                maxLength={320}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-neutral-100"
                data-testid="input-email"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Utilisez la même adresse que celle de votre compte NearBuy.
              </p>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-neutral-800">
                Type de compte à supprimer
              </legend>
              <div className="mt-2 space-y-2">
                {(
                  [
                    { value: "customer", label: "Compte client (NearBuy)" },
                    {
                      value: "seller",
                      label: "Compte vendeur (NearBuy Business)",
                    },
                    {
                      value: "both",
                      label:
                        "Les deux (j'utilise NearBuy comme client ET vendeur)",
                    },
                  ] as Array<{ value: AccountType; label: string }>
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 hover:border-orange-300 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={opt.value}
                      checked={accountType === opt.value}
                      onChange={() => setAccountType(opt.value)}
                      disabled={submitting}
                      className="mt-1 accent-orange-500"
                      data-testid={`radio-account-type-${opt.value}`}
                    />
                    <span className="text-sm text-neutral-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-neutral-800"
              >
                Motif de la suppression{" "}
                <span className="text-neutral-500 font-normal">
                  (facultatif)
                </span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                maxLength={2000}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-neutral-100"
                data-testid="input-reason"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {reason.length} / 2000
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={submitting}
                className="mt-1 accent-orange-500"
                data-testid="checkbox-confirm"
              />
              <span className="text-sm text-neutral-800">
                Je confirme avoir compris que la suppression est{" "}
                <strong>définitive</strong> et que je ne pourrai plus accéder à
                mon compte ni récupérer mes données.
              </span>
            </label>

            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className={
                error
                  ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  : "sr-only"
              }
              data-testid="error-message"
            >
              {error ?? ""}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 text-base transition-colors"
              data-testid="button-submit"
            >
              {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
