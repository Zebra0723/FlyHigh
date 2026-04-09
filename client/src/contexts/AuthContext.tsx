import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { SafeUser } from "@shared/schema";
import { setAuthToken } from "@/lib/queryClient";

// Token stored in module-level var + window.name for remember-me persistence
// window.name survives page reloads within the same tab and is not blocked in iframes
let _token = "";
let _user: SafeUser | null = null;

function saveToWindowName(token: string) {
  try {
    const data = JSON.parse(window.name || "{}");
    data.fhToken = token;
    window.name = JSON.stringify(data);
  } catch { window.name = JSON.stringify({ fhToken: token }); }
}

function clearFromWindowName() {
  try {
    const data = JSON.parse(window.name || "{}");
    delete data.fhToken;
    window.name = JSON.stringify(data);
  } catch { window.name = "{}"; }
}

function loadFromWindowName(): string {
  try {
    const data = JSON.parse(window.name || "{}");
    return data.fhToken || "";
  } catch { return ""; }
}

interface AuthCtx {
  user: SafeUser | null;
  token: string;
  isLoggedIn: boolean;
  restoring: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, username: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuth: (user: SafeUser, token: string, remember: boolean) => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null, token: "", isLoggedIn: false, restoring: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
  setAuth: () => {},
});

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function apiFetch(path: string, method: string, body?: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-session-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(_user);
  const [token, setToken] = useState(_token);
  const [restoring, setRestoring] = useState(!_user); // true on first load if no user yet

  // On mount: try to restore session from window.name (remember me)
  useEffect(() => {
    const saved = loadFromWindowName();
    if (saved && !_user) {
      apiFetch("/api/me", "GET", undefined, saved)
        .then(async res => {
          if (res.ok) {
            const u = await res.json();
            _token = saved; _user = u;
            setAuthToken(saved);
            setUser(u); setToken(saved);
          } else {
            clearFromWindowName();
          }
        })
        .catch(() => clearFromWindowName())
        .finally(() => setRestoring(false));
    } else {
      setRestoring(false);
    }
  }, []);

  const setAuth = (u: SafeUser, t: string, remember: boolean) => {
    _user = u; _token = t;
    setAuthToken(t);
    if (remember) saveToWindowName(t); else clearFromWindowName();
    setUser(u); setToken(t);
  };

  const login = async (email: string, password: string, remember = false): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiFetch("/api/login", "POST", { email, password });
      const d = await res.json();
      if (!res.ok) return { ok: false, error: d.error || "Login failed" };
      setAuth(d.user, d.token, remember);
      return { ok: true };
    } catch { return { ok: false, error: "Network error" }; }
  };

  const register = async (email: string, username: string, password: string, remember = false): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await apiFetch("/api/register", "POST", { email, username, password });
      const d = await res.json();
      if (!res.ok) return { ok: false, error: d.error || "Registration failed" };
      setAuth(d.user, d.token, remember);
      return { ok: true };
    } catch { return { ok: false, error: "Network error" }; }
  };

  const logout = async () => {
    if (_token) await apiFetch("/api/logout", "POST", undefined, _token).catch(() => {});
    clearFromWindowName();
    _user = null; _token = "";
    setAuthToken("");
    setUser(null); setToken("");
  };

  // Show a spinner while restoring session — prevents flash of login screen
  if (restoring) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground">Restoring session…</p>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!user, restoring, login, register, logout, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
