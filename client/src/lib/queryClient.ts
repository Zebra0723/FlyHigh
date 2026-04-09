import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Module-level token reference (set by AuthContext on login)
let _authToken = "";
export function setAuthToken(token: string) { _authToken = token; }
export function getAuthToken() { return _authToken; }

function authHeaders(token?: string): HeadersInit {
  const t = token ?? _authToken;
  return t ? { "x-session-token": t } : {};
}

// apiFetch: for queryFn with optional token override
export async function apiFetch(url: string, token?: string): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders(token) });
  await throwIfResNotOk(res);
  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  token?: string,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(token),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = `${API_BASE}${queryKey[0]}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: { retry: false },
  },
});
