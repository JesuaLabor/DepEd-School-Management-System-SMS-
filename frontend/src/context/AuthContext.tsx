import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import type { User, TokenPayload } from "@/types";
import { api } from "@/services/api";

interface AuthContextValue {
  user:    User | null;
  token:   string | null;
  loading: boolean;
  login:   (token: string, user: User) => void;
  logout:  () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) { setLoading(false); return; }

    try {
      const payload = jwtDecode<TokenPayload>(storedToken);
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        setLoading(false);
        return;
      }
      setToken(storedToken);
      api.auth.me()
        .then(setUser)
        .catch(() => { localStorage.removeItem("token"); })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem("token");
      setLoading(false);
    }
  }, []);

  function login(newToken: string, newUser: User) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
