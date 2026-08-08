// Shared chrome: navbar (injected once — no templating engine, no build),
// dark mode (Bootstrap 5.3 data-bs-theme), locale (en/ar + RTL css swap),
// live cart badge, toasts. Import on every page.
import { consumeAuthFragment, getLocale, getSession, setLocale, signOut } from "./api.js";
import { getCart } from "./store.js";

const dark = () => localStorage.getItem("theme") === "dark";
const applyTheme = () => document.documentElement.setAttribute("data-bs-theme", dark() ? "dark" : "light");
const applyLocale = () => {
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  const link = document.getElementById("bs-css");
  if (link) link.href = `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap${locale === "ar" ? ".rtl" : ""}.min.css`;
};

export function toast(message, ok = true) {
  const el = document.createElement("div");
  el.className = `alert alert-${ok ? "success" : "danger"} position-fixed bottom-0 end-0 m-3 shadow`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

const NAV = `
<nav class="navbar navbar-expand-md border-bottom">
  <div class="container">
    <a class="navbar-brand fw-bold" href="./index.html">saastarter2 <span class="badge text-bg-secondary">pure</span></a>
    <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav-items"><span class="navbar-toggler-icon"></span></button>
    <div class="collapse navbar-collapse" id="nav-items">
      <ul class="navbar-nav ms-auto align-items-md-center gap-2">
        <li class="nav-item"><a class="nav-link" href="./products.html" data-i18n="nav.products">Products</a></li>
        <li class="nav-item"><a class="nav-link" href="./blog.html" data-i18n="nav.blog">Blog</a></li>
        <li class="nav-item"><a class="nav-link" href="./cart.html">Cart <span id="cart-count" class="badge text-bg-primary d-none"></span></a></li>
        <li class="nav-item"><a class="nav-link" id="nav-account" href="./login.html">Sign in</a></li>
        <li class="nav-item"><button class="btn btn-sm btn-outline-secondary" id="theme-toggle">🌙</button></li>
        <li class="nav-item"><button class="btn btn-sm btn-outline-secondary" id="locale-toggle">ع</button></li>
      </ul>
    </div>
  </div>
</nav>`;

async function refreshSessionUi() {
  const user = await getSession();
  const link = document.getElementById("nav-account");
  if (!link) return;
  if (user && !user.isAnonymous) {
    link.textContent = "Account";
    link.href = "./account.html";
  } else {
    link.textContent = "Sign in";
    link.href = "./login.html";
  }
}

async function refreshCartBadge() {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  const cart = await getCart();
  const count = (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = String(count);
  badge.classList.toggle("d-none", count === 0);
}

export function initChrome() {
  applyTheme();
  applyLocale();
  consumeAuthFragment();
  const mount = document.getElementById("nav");
  if (mount) mount.innerHTML = NAV;
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    localStorage.setItem("theme", dark() ? "light" : "dark");
    applyTheme();
  });
  document.getElementById("locale-toggle")?.addEventListener("click", () => setLocale(getLocale() === "en" ? "ar" : "en"));
  addEventListener("session-changed", refreshSessionUi);
  addEventListener("cart-changed", refreshCartBadge);
  void refreshSessionUi();
  void refreshCartBadge();
}

export { signOut };
initChrome();
