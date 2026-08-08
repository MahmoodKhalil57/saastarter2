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

export type PoolUser = { id: string; email: string; name: string; image?: string | null; twoFactorEnabled?: boolean | null; isAnonymous?: boolean | null };

async function post(path: string, body: unknown): Promise<Response> {
  const response = await fetch(auth(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  const setToken = response.headers.get("set-auth-token");
  if (setToken) localStorage.setItem(KEY, setToken);
  // Every session-affecting POST notifies ALL useSession instances (the
  // header included) — client-side sign-in/profile edits update everywhere.
  if (response.ok) window.dispatchEvent(new Event("session-changed"));
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
  window.dispatchEvent(new Event("session-changed"));
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
    const on = () => setNonce((n) => n + 1);
    window.addEventListener("session-changed", on);
    return () => {
      cancelled = true;
      window.removeEventListener("session-changed", on);
    };
  }, [nonce]);
  return { user, refresh: () => setNonce((n) => n + 1) };
}

// --- TOTP two-factor (auth-pools.md §1.6): the pending challenge rides a
// --- bridged header pair (set-two-factor-token / two-factor-token) because
// --- static origins cannot round-trip the plugin's cookie.
export const signInWith2fa = async (
  email: string,
  password: string,
): Promise<{ ok: boolean; twoFactor?: string }> => {
  const response = await post("/sign-in/email", { email, password });
  const challenge = response.headers.get("set-two-factor-token");
  if (challenge) return { ok: true, twoFactor: challenge };
  return { ok: response.ok };
};
export const verify2fa = async (code: string, challenge: string): Promise<boolean> => {
  const response = await fetch(auth("/two-factor/verify-totp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "two-factor-token": challenge },
    body: JSON.stringify({ code }),
  });
  const token = response.headers.get("set-auth-token");
  if (token) localStorage.setItem(KEY, token);
  if (response.ok) window.dispatchEvent(new Event("session-changed"));
  return response.ok;
};
export const enable2fa = async (password: string): Promise<{ totpURI?: string; secret?: string }> => {
  const response = await post("/two-factor/enable", { password });
  if (!response.ok) return {};
  const { totpURI } = (await response.json()) as { totpURI: string };
  return { totpURI, secret: new URL(totpURI).searchParams.get("secret") ?? undefined };
};
export const confirm2fa = async (code: string): Promise<boolean> => (await post("/two-factor/verify-totp", { code })).ok;

// --- Guest sessions + Google OAuth (auth-pools.md §1.2/§1.8) ---
/** One call, no form — a real bearer session for guest checkout. */
export const signInGuest = () => post("/sign-in/anonymous", {});
/** Redirects to Google; the callback returns to the SPA with the session
 *  token in the URL FRAGMENT (picked up by consumeAuthFragment below). */
export const signInGoogle = async (): Promise<void> => {
  const response = await post("/sign-in/social", {
    provider: "google",
    callbackURL: `${location.origin}${config.basename}/account`,
  });
  const { url } = (await response.json()) as { url?: string };
  if (url) location.href = url;
};
/** OAuth return: #auth_token=… → stored bearer, URL cleaned. Call at boot. */
export function consumeAuthFragment(): void {
  const match = location.hash.match(/[#&]auth_token=([^&]+)/);
  if (!match) return;
  localStorage.setItem(KEY, decodeURIComponent(match[1]!));
  history.replaceState(null, "", location.pathname + location.search);
  window.dispatchEvent(new Event("session-changed"));
}
