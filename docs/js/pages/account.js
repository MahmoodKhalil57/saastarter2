import {
  changeEmail,
  changePassword,
  confirm2fa,
  deleteAccount,
  enable2fa,
  getSession,
  signOut,
  updateAvatar,
  updateProfile,
} from "../api.js";
import {
  billingPortal,
  mintKey,
  money,
  myOrders,
  myWishlist,
  proActive,
  subscribe,
  toggleWishlist,
  uploadMedia,
} from "../store.js";
import { config } from "../config.js";
import { toast } from "../chrome.js";

const el = (id) => document.getElementById(id);
const user = await getSession();
if (!user) location.href = "./login";
el("guest-hint").classList.toggle("s2-hidden", !user?.isAnonymous);
el("who").textContent = user?.email ?? "";
el("prof-name").value = user?.name ?? "";
el("tf-state").textContent = user?.twoFactorEnabled ? "✓ on" : "";
if (user?.twoFactorEnabled) el("tf-setup").classList.add("s2-hidden");

el("prof-save").addEventListener("click", async () =>
  toast((await updateProfile(el("prof-name").value)).ok ? "Saved ✓" : "Failed", true),
);
// avatar (per-project media behind the seam)
if (user?.image) {
  el("avatar").src = user.image;
  el("avatar").classList.remove("s2-hidden");
  el("avatar-fallback").classList.add("s2-hidden");
} else el("avatar-fallback").textContent = (user?.name || "?").slice(0, 1).toUpperCase();
el("avatar-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = await uploadMedia(file);
  if (!url) return toast("Upload failed", false);
  await updateAvatar(url);
  void toast("Avatar updated ✓");
  location.reload();
});
el("email-change").addEventListener("click", async () =>
  toast(
    (await changeEmail(el("new-email").value)).ok ? "Confirmation sent to the new address ✓" : "Request failed",
    true,
  ),
);
el("del-req").addEventListener("click", async () =>
  toast(
    (await deleteAccount(el("del-pw").value)).ok ? "Deletion email sent — check your inbox" : "Wrong password?",
    true,
  ),
);

async function renderWishlist() {
  const rows = await myWishlist();
  el("wishlist").innerHTML =
    rows.length === 0
      ? '<p class="s2-quiet">Nothing saved yet — tap ❤️ on a product.</p>'
      : rows
          .map(
            (w) => `<div class="s2-card"><div class="s2-row" style="justify-content:space-between">
        <a href="./product?slug=${encodeURIComponent(w.product)}">${w.product}</a>
        <button class="s2-btn s2-btn-plain s2-btn-danger s2-btn-s" type="button" data-unwish="${w.product}">Remove</button></div></div>`,
          )
          .join("");
}
el("wishlist").addEventListener("click", async (event) => {
  const product = event.target.closest?.("[data-unwish]")?.dataset?.unwish;
  if (product) {
    await toggleWishlist(product);
    void renderWishlist();
  }
});
await renderWishlist();
el("sign-out").addEventListener("click", () => {
  signOut();
  location.href = "./";
});

// 2FA: the totpURI becomes a scannable wa-qr-code + a wa-copy-button secret.
el("tf-enable").addEventListener("click", async () => {
  const response = await enable2fa(el("tf-pw").value);
  if (!response.ok) return toast("Wrong password?", false);
  const { totpURI } = await response.json();
  const secret = new URL(totpURI).searchParams.get("secret");
  el("tf-qr").value = totpURI;
  el("tf-secret").textContent = secret;
  el("tf-copy").value = secret;
  el("tf-confirm").classList.remove("s2-hidden");
});
const confirmTotp = async () => {
  if ((await confirm2fa(el("tf-code").value)).ok) {
    void toast("Two-factor enabled ✓");
    location.reload();
  } else void toast("Wrong code", false);
};
el("tf-verify").addEventListener("click", confirmTotp);
el("tf-code").addEventListener("wa-change", confirmTotp);
el("pw-change").addEventListener("click", async () =>
  toast(
    (await changePassword(el("pw-cur").value, el("pw-next").value)).ok ? "Password changed ✓" : "Change failed",
    true,
  ),
);

if (await proActive()) {
  el("pro-state").textContent = "✓ active";
  el("sub").classList.add("s2-hidden");
  el("portal").classList.remove("s2-hidden");
}
el("sub").addEventListener("click", async () => {
  const { url } = await subscribe();
  if (url) location.href = url;
});
el("portal").addEventListener("click", async () => {
  const { url } = await billingPortal();
  if (url) location.href = url;
  else void toast("No billing history yet", false);
});

el("mint").addEventListener("click", async () => {
  const minted = await mintKey();
  if (!minted.ok) return toast(`Mint failed — ${minted.title ?? "try again"}`, false);
  el("minted").textContent = minted.plaintext;
  el("minted-copy").value = minted.plaintext;
  el("minted-row").classList.remove("s2-hidden");
  void toast("Key minted — copy it now, it is shown once.");
});

async function renderOrders() {
  const orders = await myOrders();
  el("orders").innerHTML =
    orders.length === 0
      ? '<p class="s2-quiet">No orders yet.</p>'
      : orders
          .map(
            (order) => `
      <div class="s2-card">
        <div class="s2-row" style="justify-content:space-between">
          <span>${order.items.map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}</span>
          <span class="s2-row"><span class="s2-price">${money(order.total_cents)}</span>
            <span class="s2-tag ${["paid", "delivered", "shipped", "fulfilled"].includes(order.status) ? "s2-tag-success" : ""}">${order.status}</span></span>
        </div>
        <div class="s2-row" style="margin-block-start:0.4rem">
        ${(order.deliveries ?? [])
          .flatMap((d) => d.artifacts)
          .map((artifact) =>
            artifact.kind === "download"
              ? `<a class="s2-btn s2-btn-outline s2-btn-s" href="${config.endpoint}${artifact.claim}" target="_blank"><iconify-icon icon="lucide:download" inline></iconify-icon> ${artifact.label}</button>`
              : artifact.kind === "tracking"
                ? `<span class="s2-tag">📦 ${artifact.label}${artifact.code ? " — " + artifact.code : ""}</wa-badge>`
                : `<small class="s2-quiet">${artifact.label}</small>`,
          )
          .join(" ")}
        </div>
      </div>`,
          )
          .join("");
}
await renderOrders();
