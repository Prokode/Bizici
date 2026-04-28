import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const SPLASH_FLAG_KEY = "nearbuy_admin_splash_played";

function shouldPlaySplash(): boolean {
  if (typeof window === "undefined") return false;
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
    /* sessionStorage unavailable — splash will replay; harmless */
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {showSplash ? (
        <AnimatedSplash
          onFinish={() => {
            markSplashPlayed();
            setShowSplash(false);
          }}
        />
      ) : null}
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                N
              </div>
              <div>
                <CardTitle className="text-xl">{t("login.appName")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("login.tagline")}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <div className="text-sm text-destructive" data-testid="text-error">
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
        </CardContent>
      </Card>
    </div>
  );
}
