// Framework-free client core: locale, session (bearer-first), guest-by-default.
import { base } from "./config.js";

const KEY = "baas.session-token";
export const token = () => localStorage.getItem(KEY);
export const authHeader = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

// --- locale (en/ar) — the baas resolves localized fields server-side ---
export const getLocale = () => (localStorage.getItem("locale") === "ar" ? "ar" : "en");
export const setLocale = (locale) => { localStorage.setItem("locale", locale); location.reload(); };
export const localeQuery = (joiner = "?") => `${joiner}locale=${getLocale()}`;

const authPath = (path) => `${base}/auth${path}`;

async function post(path, body, headers = {}) {
  const response = await fetch(authPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(), ...headers },
    body: JSON.stringify(body),
  });
  const setToken = response.headers.get("set-auth-token");
  if (setToken) localStorage.setItem(KEY, setToken);
  if (response.ok) dispatchEvent(new Event("session-changed"));
  return response;
}

export const signUp = (email, password, name) => post("/sign-up/email", { email, password, name });
export const signIn = (email, password) => post("/sign-in/email", { email, password });
export const signInGuest = () => post("/sign-in/anonymous", {});
export const signOut = () => { localStorage.removeItem(KEY); dispatchEvent(new Event("session-changed")); };
export const updateProfile = (name) => post("/update-user", { name });
export const updateAvatar = (image) => post("/update-user", { image });
export const changeEmail = (newEmail) => post("/change-email", { newEmail, callbackURL: location.href });
export const changePassword = (currentPassword, newPassword) =>
  post("/change-password", { currentPassword, newPassword, revokeOtherSessions: true });
export const deleteAccount = (password) => post("/delete-user", { password, callbackURL: location.origin });
export const enable2fa = (password) => post("/two-factor/enable", { password });
export const confirm2fa = (code) => post("/two-factor/verify-totp", { code });

/** Sign-in that surfaces the 2FA challenge (bridged header, no cookies). */
export async function signInWith2fa(email, password) {
  const response = await post("/sign-in/email", { email, password });
  const challenge = response.headers.get("set-two-factor-token");
  if (challenge) return { ok: true, twoFactor: challenge };
  return { ok: response.ok };
}
export async function verify2fa(code, challenge) {
  const response = await fetch(authPath("/two-factor/verify-totp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "two-factor-token": challenge },
    body: JSON.stringify({ code }),
  });
  const t = response.headers.get("set-auth-token");
  if (t) { localStorage.setItem(KEY, t); dispatchEvent(new Event("session-changed")); }
  return response.ok;
}

/** Google OAuth = a top-level navigation (state cookie must land first-party). */
export const signInGoogle = () => {
  location.href = authPath(`/sign-in/social/google?callbackURL=${encodeURIComponent(location.origin + location.pathname)}`);
};
/** OAuth return: #auth_token → stored bearer. Call on every page load. */
export function consumeAuthFragment() {
  const match = location.hash.match(/[#&]auth_token=([^&]+)/);
  if (!match) return;
  localStorage.setItem(KEY, decodeURIComponent(match[1]));
  history.replaceState(null, "", location.pathname + location.search);
  dispatchEvent(new Event("session-changed"));
}

export async function getSession() {
  if (!token()) return null;
  const response = await fetch(authPath("/get-session"), { headers: authHeader() });
  if (!response.ok) return null;
  return (await response.json())?.user ?? null;
}

/** Guest-by-default (commerce.md §3a.5): mint a session on first need. */
export async function ensureSession() {
  if (!token()) await signInGuest().catch(() => {});
  return authHeader();
}
