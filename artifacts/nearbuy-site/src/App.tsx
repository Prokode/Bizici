import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/Home";
import DeleteAccountPage from "@/pages/DeleteAccount";
import DeleteAccountConfirmationPage from "@/pages/DeleteAccountConfirmation";
import PrivacyPage from "@/pages/Privacy";
import TermsPage from "@/pages/Terms";

const queryClient = new QueryClient();

const SPLASH_FLAG_KEY = "bizici_site_splash_played";

function shouldPlaySplash(): boolean {
  if (typeof window === "undefined") return false;
  // `?splash=force` query param forces the splash to play (useful for QA/preview).
  if (window.location.search.includes("splash=force")) return true;
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/supprimer-compte" component={DeleteAccountPage} />
      <Route
        path="/supprimer-compte/confirmation"
        component={DeleteAccountConfirmationPage}
      />
      <Route path="/confidentialite" component={PrivacyPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/conditions" component={TermsPage} />
      <Route path="/terms" component={TermsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState<boolean>(() => shouldPlaySplash());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash ? (
          <AnimatedSplash
            onFinish={() => {
              markSplashPlayed();
              setShowSplash(false);
            }}
          />
        ) : null}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
