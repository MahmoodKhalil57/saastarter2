import { requestReset, signInGoogle, signInWith2fa, signUp, verify2fa } from "../api.js";

let mode = "sign-in";
let challenge = null;
const el = (id) => document.getElementById(id);
const fail = (id, message) => {
  el(id).textContent = message;
  el(id).classList.remove("s2-hidden");
};

el("google").addEventListener("click", () => signInGoogle());
el("mode").addEventListener("click", () => {
  mode = mode === "sign-in" ? "sign-up" : "sign-in";
  el("auth-title").textContent = mode === "sign-in" ? "Sign in" : "Create an account";
  el("submit").textContent = mode === "sign-in" ? "Sign in" : "Create account";
  el("mode").textContent = mode === "sign-in" ? "Create an account instead" : "Sign in instead";
  el("name").classList.toggle("s2-hidden", mode === "sign-in");
});
el("submit").addEventListener("click", async () => {
  el("auth-error").classList.add("s2-hidden");
  const email = el("email").value,
    password = el("password").value;
  if (mode === "sign-up") {
    const response = await signUp(email, password, el("name").value || email);
    if (!response.ok) return fail("auth-error", (await response.json()).message ?? "Something went wrong.");
    return void (location.href = "./account.html");
  }
  const result = await signInWith2fa(email, password);
  if (!result.ok) return fail("auth-error", "Wrong email or password.");
  if (result.twoFactor) {
    challenge = result.twoFactor;
    el("auth-view").classList.add("s2-hidden");
    el("totp-view").classList.remove("s2-hidden");
    return;
  }
  location.href = "./account.html";
});
// wa-otp-input fires wa-change when the last digit lands — no button needed,
// but keep one for paste-and-click users.
const submitTotp = async () => {
  if (await verify2fa(el("totp-code").value, challenge)) location.href = "./account.html";
  else fail("totp-error", "Wrong code — try again.");
};
el("totp-verify").addEventListener("click", submitTotp);
el("totp-code").addEventListener("wa-change", submitTotp);

el("forgot").addEventListener("click", async () => {
  const email = el("email").value;
  if (!email) return fail("auth-error", "Enter your email first.");
  await requestReset(email);
  fail("auth-error", "If that account exists, a reset link is on its way.");
});
