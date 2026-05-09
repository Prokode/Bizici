import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Postes } from "./pages/Postes";
import { ComingSoon } from "./pages/ComingSoon";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

function App() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("gcm-theme") === "dark");

  useEffect(() => {
    applyTheme(dark);
    localStorage.setItem("gcm-theme", dark ? "dark" : "light");
  }, [dark]);

  const themeProps = { dark, onToggleDark: () => setDark(d => !d) };

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={() => <Dashboard {...themeProps} />} />
        <Route path="/postes" component={() => <Postes {...themeProps} />} />
        <Route path="/:section" component={({ params }) => <ComingSoon section={params.section} {...themeProps} />} />
        <Route component={() => <ComingSoon section="" {...themeProps} />} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
