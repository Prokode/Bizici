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
    <div className="min-h-[100dvh] flex bg-background">
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
        className="hidden lg:flex flex-col justify-between w-[45%] shrink-0 p-12 text-foreground"
        style={{
          background: "linear-gradient(145deg, #FFF8E9 0%, #F8EBD5 58%, #E9F1E6 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}icibiz-mark.svg`}
            alt="iciBiz"
            className="size-10 object-contain"
          />
          <div>
            <div className="text-xl font-bold leading-tight tracking-tight">
              <span style={{ color: "#2F6246" }}>ici</span><span style={{ color: "#B94F35" }}>Biz</span>
            </div>
            <div className="text-xs text-foreground/65 leading-tight">Admin</div>
          </div>
        </div>

        <div>
          <div className="text-4xl font-bold leading-snug mb-4 text-[#26392F]">
            {t("login.brandHeadline")}
          </div>
          <p className="text-[#26392F]/75 text-base leading-relaxed mb-8">
            {t("login.brandSubline")}
          </p>
          <div className="space-y-3">
            {(["brandPoint1", "brandPoint2", "brandPoint3"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="size-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#B94F35" }}
                >
                  <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </div>
                 <span className="text-sm text-[#26392F]/85">{t(`login.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#26392F]/75">
          © {new Date().getFullYear()} iciBiz · {t("login.allRightsReserved")}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-border/70 bg-card p-7 shadow-sm sm:p-9">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 lg:hidden mb-4">
                <img
                  src={`${import.meta.env.BASE_URL}icibiz-mark.svg`}
                  alt="iciBiz"
                  className="size-8 object-contain"
                />
                <span className="font-bold text-lg">
                  <span style={{ color: "#2F6246" }}>ici</span><span style={{ color: "#B94F35" }}>Biz</span>
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight" aria-label={t("login.appName")}>
                <span style={{ color: "#2F6246" }}>ici</span><span style={{ color: "#B94F35" }}>Biz</span>
                <span className="text-foreground"> Admin</span>
              </h1>
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
