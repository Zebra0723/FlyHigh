import { createContext, useContext, useState, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

// Session code: "nickname-xxxx" e.g. "arjun-X7K2"
// Stored in module-level vars — survives re-renders in the same browser tab

let _sessionCode = "";
let _nickname = "";

function generateCode(nickname: string): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const slug = nickname.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "pilot";
  return `${slug}-${suffix}`;
}

interface SessionCtx {
  sessionCode: string;
  nickname: string;
  isActive: boolean;
  login: (nickname: string, code?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const SessionContext = createContext<SessionCtx>({
  sessionCode: "", nickname: "", isActive: false,
  login: async () => ({ ok: false }),
  logout: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionCode, setSessionCode] = useState(_sessionCode);
  const [nickname, setNickname] = useState(_nickname);

  const login = async (nick: string, code?: string): Promise<{ ok: boolean; error?: string }> => {
    const sc = code?.trim() || generateCode(nick);
    try {
      await apiRequest("POST", "/api/personal/session", { sessionCode: sc, nickname: nick.trim() });
      _sessionCode = sc;
      _nickname = nick.trim();
      setSessionCode(sc);
      setNickname(nick.trim());
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  };

  const logout = () => {
    _sessionCode = "";
    _nickname = "";
    setSessionCode("");
    setNickname("");
  };

  return (
    <SessionContext.Provider value={{ sessionCode, nickname, isActive: !!sessionCode, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() { return useContext(SessionContext); }
