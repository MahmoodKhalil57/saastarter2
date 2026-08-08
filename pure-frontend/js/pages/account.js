import { changePassword, confirm2fa, enable2fa, getSession, signOut, updateProfile } from "../api.js";
import { billingPortal, mintKey, money, myOrders, proActive, subscribe } from "../store.js";
import { config } from "../config.js";
import { toast } from "../ui.js";

const el = (id) => document.getElementById(id);
const user = await getSession();
if (!user) location.href = "./login.html";
el("guest-hint").classList.toggle("d-none", !user?.isAnonymous);
el("who").textContent = user?.email ?? "";
el("prof-name").value = user?.name ?? "";
el("tf-state").textContent = user?.twoFactorEnabled ? "✓ on" : "";
if (user?.twoFactorEnabled) el("tf-setup").classList.add("d-none");

el("prof-save").onclick = async () => toast((await updateProfile(el("prof-name").value)).ok ? "Saved ✓" : "Failed", true);
el("sign-out").onclick = () => { signOut(); location.href = "./index.html"; };

el("tf-enable").onclick = async () => {
  const response = await enable2fa(el("tf-pw").value);
  if (!response.ok) return toast("Wrong password?", false);
  const { totpURI } = await response.json();
  el("tf-secret").textContent = new URL(totpURI).searchParams.get("secret");
  el("tf-confirm").classList.remove("d-none");
};
el("tf-verify").onclick = async () => {
  if ((await confirm2fa(el("tf-code").value)).ok) { toast("Two-factor enabled ✓"); location.reload(); }
  else toast("Wrong code", false);
};
el("pw-change").onclick = async () =>
  toast((await changePassword(el("pw-cur").value, el("pw-next").value)).ok ? "Password changed ✓" : "Change failed", true);

if (await proActive()) {
  el("pro-state").textContent = "✓ active";
  el("sub").classList.add("d-none");
  el("portal").classList.remove("d-none");
}
el("sub").onclick = async () => { const { url } = await subscribe(); if (url) location.href = url; };
el("portal").onclick = async () => { const { url } = await billingPortal(); if (url) location.href = url; else toast("No billing history yet", false); };

el("mint").onclick = async () => {
  const minted = await mintKey();
  if (!minted.ok) return toast(`Mint failed — ${minted.title ?? "try again"}`, false);
  el("minted").textContent = minted.plaintext;
  el("minted").classList.remove("d-none");
  toast("Key minted — copy it now, it is shown once.");
};

async function renderOrders() {
  const orders = await myOrders();
  el("orders").innerHTML = orders.length === 0
    ? '<p class="text-body-secondary">No orders yet.</p>'
    : orders.map((order) => `
      <div class="card"><div class="card-body py-2">
        <div class="d-flex justify-content-between">
          <span>${order.items.map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}</span>
          <span class="d-flex gap-3"><span>${money(order.total_cents)}</span><span class="${["paid","delivered","shipped","fulfilled"].includes(order.status) ? "text-success" : "text-body-secondary"}">${order.status}</span></span>
        </div>
        ${(order.deliveries ?? []).flatMap((d) => d.artifacts).map((artifact) =>
          artifact.kind === "download"
            ? `<a class="btn btn-sm btn-outline-primary artifact-btn mt-1" target="_blank" href="${config.endpoint}${artifact.claim}">⬇ ${artifact.label}</a>`
            : artifact.kind === "tracking"
              ? `<span class="badge text-bg-secondary mt-1">📦 ${artifact.label}${artifact.code ? " — " + artifact.code : ""}</span>`
              : `<small class="text-body-secondary d-block mt-1">${artifact.label}</small>`).join(" ")}
      </div></div>`).join("");
}
await renderOrders();
