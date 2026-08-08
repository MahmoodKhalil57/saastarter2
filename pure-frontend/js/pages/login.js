import { signInGoogle, signInWith2fa, signUp, verify2fa } from "../api.js";

let mode = "sign-in";
let challenge = null;
const el = (id) => document.getElementById(id);
const fail = (id, message) => { el(id).textContent = message; el(id).classList.remove("d-none"); };

el("google").onclick = () => signInGoogle();
el("mode").onclick = () => {
  mode = mode === "sign-in" ? "sign-up" : "sign-in";
  el("auth-title").textContent = mode === "sign-in" ? "Sign in" : "Create an account";
  el("submit").textContent = mode === "sign-in" ? "Sign in" : "Create account";
  el("mode").textContent = mode === "sign-in" ? "Create an account instead" : "Sign in instead";
  el("name").classList.toggle("d-none", mode === "sign-in");
};
el("submit").onclick = async () => {
  el("auth-error").classList.add("d-none");
  const email = el("email").value, password = el("password").value;
  if (mode === "sign-up") {
    const response = await signUp(email, password, el("name").value || email);
    if (!response.ok) return fail("auth-error", (await response.json()).message ?? "Something went wrong.");
    return void (location.href = "./account.html");
  }
  const result = await signInWith2fa(email, password);
  if (!result.ok) return fail("auth-error", "Wrong email or password.");
  if (result.twoFactor) {
    challenge = result.twoFactor;
    el("auth-view").classList.add("d-none");
    el("totp-view").classList.remove("d-none");
    return;
  }
  location.href = "./account.html";
};
el("totp-verify").onclick = async () => {
  if (await verify2fa(el("totp-code").value, challenge)) location.href = "./account.html";
  else fail("totp-error", "Wrong code — try again.");
};
