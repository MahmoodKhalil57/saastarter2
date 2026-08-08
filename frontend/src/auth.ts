import { useEffect, useState } from "react";
import { config } from "./config";

/**
 * The end-user session, BEARER-first (auth-pools.md §1a): a static origin
 * cannot use cookies against the CORS-no-credentials API, so the pool's
 * `set-auth-token` is stored and sent as `Authorization: Bearer`. This is
 * the whole client — no SDK, ~40 lines.
 */

const auth = (path: string) => `${config.endpoint}/v1/projects/${config.project}/auth${path}`;
const KEY = "baas.session-token";

export const token = (): string | null => localStorage.getItem(KEY);
export const authHeader = (): Record<string, string> => {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export type PoolUser = { id: string; email: string; name: string; image?: string | null };

async function post(path: string, body: unknown): Promise<Response> {
  const response = await fetch(auth(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  const setToken = response.headers.get("set-auth-token");
  if (setToken) localStorage.setItem(KEY, setToken);
  return response;
}

export const signUp = (email: string, password: string, name: string) =>
  post("/sign-up/email", { email, password, name });
export const signIn = (email: string, password: string) =>
  post("/sign-in/email", { email, password });
export const requestReset = (email: string) =>
  post("/request-password-reset", { email, redirectTo: `${location.origin}${config.basename}/` });
export function signOut(): void {
  localStorage.removeItem(KEY);
}

// --- Account lifecycle (auth-pools.md §1.5) — all server-side flows; the
// --- pool's better-auth surface is the API, mail rides notifications.
export const updateProfile = (name: string) => post("/update-user", { name });
export const updateAvatar = (image: string) => post("/update-user", { image });
export const changeEmail = (newEmail: string) =>
  post("/change-email", { newEmail, callbackURL: `${location.origin}${config.basename}/account` });
export const changePassword = (currentPassword: string, newPassword: string, revokeOtherSessions = true) =>
  post("/change-password", { currentPassword, newPassword, revokeOtherSessions });
/** Sends a confirmation email; the link ANONYMIZES the account (server veto on hard delete). */
export const deleteAccount = (password: string) =>
  post("/delete-user", { password, callbackURL: `${location.origin}${config.basename}/` });

async function getSession(): Promise<PoolUser | null> {
  if (!token()) return null;
  const response = await fetch(auth("/get-session"), { headers: authHeader() });
  if (!response.ok) return null;
  const body = (await response.json()) as { user?: PoolUser } | null;
  return body?.user ?? null;
}

/** Reactive session hook: null = signed out, undefined = still loading. */
export function useSession(): { user: PoolUser | null | undefined; refresh: () => void } {
  const [user, setUser] = useState<PoolUser | null | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void getSession().then((u) => !cancelled && setUser(u));
    return () => {
      cancelled = true;
    };
  }, [nonce]);
  return { user, refresh: () => setNonce((n) => n + 1) };
}
