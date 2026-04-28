import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Trans, useTranslation } from "react-i18next";
import { NearBuyLogo } from "@/components/NearBuyLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type AccountType = "customer" | "seller" | "both";

export default function DeleteAccountPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
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
      setError(t("deletion.errorName"));
      return;
    }
    if (!email.trim()) {
      setError(t("deletion.errorEmail"));
      return;
    }
    if (!confirmed) {
      setError(t("deletion.errorConfirm"));
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
        let msg = `Error ${res.status}`;
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
            msg = t("deletion.errorRateLimit", { minutes });
          }
        }
        throw new Error(msg);
      }

      navigate("/supprimer-compte/confirmation", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("deletion.errorGeneric"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const accountOptions: Array<{ value: AccountType; labelKey: string }> = [
    { value: "customer", labelKey: "deletion.accountTypeCustomer" },
    { value: "seller", labelKey: "deletion.accountTypeSeller" },
    { value: "both", labelKey: "deletion.accountTypeBoth" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
        <Link href="/" className="flex items-center gap-3">
          <NearBuyLogo size={36} />
          <span className="text-xl font-bold tracking-tight">NearBuy</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-orange-600"
          >
            ← {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 px-6 py-10 md:py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("deletion.title")}
          </h1>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            <Trans
              i18nKey="deletion.intro"
              components={{ strong: <strong /> }}
            />
          </p>

          <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-neutral-800">
            <p className="font-semibold text-orange-700">
              {t("deletion.afterTitle")}
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-neutral-700">
              <li>{t("deletion.after1")}</li>
              <li>{t("deletion.after2")}</li>
              <li>{t("deletion.after3")}</li>
              <li>{t("deletion.after4")}</li>
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
                {t("deletion.fullName")}
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
                {t("deletion.email")}
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
                {t("deletion.emailHint")}
              </p>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-neutral-800">
                {t("deletion.accountType")}
              </legend>
              <div className="mt-2 space-y-2">
                {accountOptions.map((opt) => (
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
                    <span className="text-sm text-neutral-800">
                      {t(opt.labelKey)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-neutral-800"
              >
                {t("deletion.reason")}{" "}
                <span className="text-neutral-500 font-normal">
                  {t("deletion.reasonOptional")}
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
                <Trans
                  i18nKey="deletion.confirm"
                  components={{ strong: <strong /> }}
                />
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
              {submitting ? t("deletion.submitting") : t("deletion.submit")}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
