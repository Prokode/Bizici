import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const SPLASH_FLAG_KEY = "nearbuy_admin_splash_played";

function shouldPlaySplash(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("splash=force")) return true;
  if (window.location.search.includes("splash=skip")) return false;
  try {
    return window.sessionStorage.getItem(SPLASH_FLAG_KEY) !== "1";
  } catch {
    return true;
  }
}

function markSplashPlayed(): void {
  try {
    window.sessionStorage.setItem(SPLASH_FLAG_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, admin, loading } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState<boolean>(() => shouldPlaySplash());

  useEffect(() => {
    if (!loading && admin) navigate("/", { replace: true });
  }, [admin, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 401
            ? t("login.invalidCredentials")
            : err.message
          : t("login.loginError");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {showSplash ? (
        <AnimatedSplash
          onFinish={() => {
            markSplashPlayed();
            setShowSplash(false);
          }}
        />
      ) : null}

      {/* Brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] shrink-0 p-12 text-white"
        style={{
          background: "linear-gradient(145deg, #1B2A5C 0%, #243670 55%, #1a3a4a 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}bizici-pin.png`}
            alt="BizIci"
            className="size-10 object-contain"
          />
          <div>
            <div className="text-xl font-bold leading-tight tracking-tight">
              Biz<span style={{ color: "#7FB927" }}>Ici</span>
            </div>
            <div className="text-xs text-white/60 leading-tight">Admin</div>
          </div>
        </div>

        <div>
          <div className="text-4xl font-bold leading-snug mb-4">
            {t("login.brandHeadline")}
          </div>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            {t("login.brandSubline")}
          </p>
          <div className="space-y-3">
            {(["brandPoint1", "brandPoint2", "brandPoint3"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="size-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#F58220" }}
                >
                  <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </div>
                <span className="text-sm text-white/80">{t(`login.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-white/40">
          © {new Date().getFullYear()} BizIci · {t("login.allRightsReserved")}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 lg:hidden mb-4">
                <img
                  src={`${import.meta.env.BASE_URL}bizici-pin.png`}
                  alt="BizIci"
                  className="size-8 object-contain"
                />
                <span className="font-bold text-lg">
                  Biz<span style={{ color: "#7FB927" }}>Ici</span>
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{t("login.appName")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("login.tagline")}</p>
            </div>
            <LanguageSwitcher />
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("login.identifier")}</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                data-testid="input-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            {error ? (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive" data-testid="text-error">
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              data-testid="button-login"
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
