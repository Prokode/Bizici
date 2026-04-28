import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { api, getToken, setToken, type Admin } from "./api";

type AuthState = {
  admin: Admin | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On mount, if we have a token, try to fetch /me
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ admin: Admin }>("/api/admin/auth/me")
      .then((res) => setAdmin(res.admin))
      .catch(() => {
        setToken(null);
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; admin: Admin }>(
      "/api/admin/auth/login",
      { username, password },
    );
    setToken(res.token);
    setAdmin(res.admin);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ admin, loading, login, logout }),
    [admin, loading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && !admin) navigate("/login", { replace: true });
  }, [admin, loading, navigate]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!admin) return null;
  return <>{children}</>;
}
