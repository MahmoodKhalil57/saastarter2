// The STORE ADMIN (application plane: products, orders, discounts, stats).
// Definitions belong to the platform's hosted /studio. In the pure idiom: every action below is the PUBLIC API under the sk_ key's
// policies (sync.md §1's one-write-surface law; nothing here is a
// backdoor). The key lives in this browser's localStorage only.
import { base, config } from "../config.js";
import { money } from "../store.js";
import { toast } from "../ui.js";

const KEY = "baas.owner-key";
const el = (id) => document.getElementById(id);
const ownerKey = () => localStorage.getItem(KEY);
const auth = () => ({ Authorization: `Bearer ${ownerKey()}` });
const json = { "Content-Type": "application/json" };
const api = (path, init = {}) => fetch(`${base}${path}`, { ...init, headers: { ...json, ...auth(), ...(init.headers ?? {}) } });

// --- gate --------------------------------------------------------------------
async function verifyKey(key) {
  const probe = await fetch(`${base}/commerce/stats`, { headers: { Authorization: `Bearer ${key}` } });
  return probe.ok;
}
async function unlock() {
  el("gate").classList.add("d-none");
  el("studio").classList.remove("d-none");
  await Promise.all([renderStats(), renderOrders(), renderProducts(), renderDiscounts()]);
}
el("unlock").onclick = async () => {
  const key = el("key-input").value.trim();
  if (!(await verifyKey(key))) {
    el("gate-error").textContent = "That key was refused (owner keys only).";
    return el("gate-error").classList.remove("d-none");
  }
  localStorage.setItem(KEY, key);
  void unlock();
};
el("lock").onclick = () => { localStorage.removeItem(KEY); location.reload(); };
if (ownerKey() && (await verifyKey(ownerKey()))) void unlock();

// --- stats -------------------------------------------------------------------
async function renderStats() {
  const stats = await (await api("/commerce/stats")).json();
  const cards = [
    ["Orders", stats.orders], ["Revenue", money(stats.revenue_cents)],
    ...Object.entries(stats.by_status ?? {}).map(([status, count]) => [status, count]),
  ];
  el("stat-cards").innerHTML = cards.map(([label, value]) => `
    <div class="col-6 col-md-3"><div class="card"><div class="card-body py-2">
      <p class="s2-kicker mb-1">${label}</p><div class="s2-price fs-4">${value}</div>
    </div></div></div>`).join("");
  const max = Math.max(1, ...(stats.top_products ?? []).map((p) => p.units));
  el("top-products").innerHTML = (stats.top_products ?? []).map((p, at) => `
    <div class="d-flex align-items-center gap-2 small">
      <span style="min-inline-size:9rem">${p.name}</span>
      <div class="flex-grow-1 rounded" style="background:var(--s2-chart-${(at % 5) + 1});block-size:1rem;max-inline-size:${(p.units / max) * 100}%"></div>
      <span class="s2-mono">${p.units} · ${money(p.revenue_cents)}</span>
    </div>`).join("") || '<p class="text-body-secondary small">No paid orders yet.</p>';
}

// --- orders + fulfillment ----------------------------------------------------
const NEXT = { paid: ["fulfilled", "cancelled"], fulfilled: ["shipped"], shipped: ["delivered"], pending: ["cancelled"] };
async function renderOrders() {
  const { orders } = await (await api("/commerce/orders?all=1")).json();
  el("orders-list").innerHTML = (orders ?? []).map((order) => `
    <div class="card"><div class="card-body py-2">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
        <span class="small">${(order.items ?? []).map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}
          <span class="text-body-tertiary">· ${order.customer.split(":").pop().slice(0, 6)}…</span></span>
        <span class="d-flex gap-2 align-items-center">
          <span class="s2-price small">${money(order.total_cents)}</span>
          <span class="badge text-bg-secondary s2-tier-badge">${order.status}</span>
          ${(NEXT[order.status] ?? []).map((to) =>
            `<button class="btn btn-sm btn-outline-primary py-0" data-advance="${order.id}" data-to="${to}">${to}</button>`).join("")}
        </span>
      </div>
    </div></div>`).join("") || '<p class="text-body-secondary small">No orders yet.</p>';
}
el("orders-list").addEventListener("click", async (event) => {
  const button = event.target.closest?.("[data-advance]");
  if (!button) return;
  const response = await api(`/commerce/orders/${button.dataset.advance}:advance`, { method: "POST", body: JSON.stringify({ to: button.dataset.to }) });
  toast(response.ok ? `Order → ${button.dataset.to} ✓` : (await response.json()).title ?? "Refused", response.ok);
  void renderOrders(); void renderStats();
});

// --- products ----------------------------------------------------------------
let productFile = "";
async function renderProducts() {
  const { results } = await (await fetch(`${base}/products?locale=all`)).json();
  el("products-list").innerHTML = (results ?? []).map((p) => `
    <div class="card"><div class="card-body py-2 d-flex justify-content-between align-items-center">
      <span class="small"><strong>${typeof p.name === "object" ? p.name.en : p.name}</strong>
        <span class="text-body-tertiary">· ${p.slug} · ${p.category ?? ""}${p.file ? " · 📎" : ""}</span></span>
      <span class="d-flex gap-2 align-items-center"><span class="s2-price small">${money(p.price_cents ?? 0)}</span>
        <button class="btn btn-sm btn-outline-secondary py-0" data-edit="${p.slug}">edit</button></span>
    </div></div>`).join("");
}
el("products-list").addEventListener("click", async (event) => {
  const slug = event.target.closest?.("[data-edit]")?.dataset?.edit;
  if (!slug) return;
  const locale = el("p-locale").value;
  const row = await (await fetch(`${base}/products/${slug}?locale=${locale}`)).json();
  el("product-form-title").textContent = `Edit: ${slug}`;
  el("p-slug").value = row.slug; el("p-slug").disabled = true;
  el("p-name").value = row.name ?? ""; el("p-price").value = row.price_cents ?? "";
  el("p-tagline").value = row.tagline ?? ""; el("p-desc").value = row.description ?? "";
  el("p-category").value = row.category ?? "starter"; el("p-featured").checked = !!row.featured;
  productFile = row.file ?? ""; el("p-file-state").textContent = productFile ? "file attached" : "";
});
el("p-file").onchange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${base}/media:upload`, { method: "POST", headers: auth(), body: form });
  if (!response.ok) return toast("Upload failed", false);
  productFile = (await response.json()).results[0].path.split("/")[1];
  el("p-file-state").textContent = `uploaded ✓ (${file.name})`;
};
el("p-save").onclick = async () => {
  const slug = el("p-slug").value.trim();
  if (!slug) return toast("Slug required", false);
  const locale = el("p-locale").value;
  // PATCH under ?locale merges the flat tagline/description into the maps;
  // create uses POST ?id. The locale layer does the merging (localization.md §3).
  const body = {
    name: el("p-name").value, slug, price_cents: Number(el("p-price").value || 0),
    tagline: el("p-tagline").value, description: el("p-desc").value,
    category: el("p-category").value, featured: el("p-featured").checked,
    ...(productFile ? { file: productFile } : {}),
  };
  const exists = (await fetch(`${base}/products/${slug}`)).ok;
  const response = exists
    ? await api(`/products/${slug}?locale=${locale}`, { method: "PATCH", body: JSON.stringify(body) })
    : await api(`/products?id=${slug}&locale=${locale}`, { method: "POST", body: JSON.stringify(body) });
  toast(response.ok ? "Product saved ✓" : `Save failed (${response.status})`, response.ok);
  el("p-slug").disabled = false; el("product-form-title").textContent = "New product";
  void renderProducts();
};

// --- discounts ---------------------------------------------------------------
async function renderDiscounts() {
  const { results } = await (await fetch(`${base}/discounts`)).json().catch(() => ({ results: [] }));
  el("discounts-list").innerHTML = (results ?? []).map((d) => `
    <div class="card"><div class="card-body py-2 d-flex justify-content-between small">
      <span><strong class="s2-mono">${d.path.split("/").pop()}</strong> — ${d.kind} ${d.value}${d.kind === "percent" ? "%" : "¢"}${d.min_cents ? ` · min ${money(d.min_cents)}` : ""}</span>
      <span class="text-body-secondary">used ${d.used ?? 0}${d.max_uses ? `/${d.max_uses}` : ""}</span>
    </div></div>`).join("") || '<p class="text-body-secondary small">No discounts yet.</p>';
}
el("d-save").onclick = async () => {
  const code = el("d-code").value.trim().toUpperCase();
  if (!code) return toast("Code required", false);
  const response = await api(`/discounts?id=${code}`, {
    method: "POST",
    body: JSON.stringify({ kind: el("d-kind").value, value: Number(el("d-value").value || 0), ...(el("d-min").value ? { min_cents: Number(el("d-min").value) } : {}) }),
  });
  toast(response.ok ? `${code} created ✓` : `Failed (${response.status})`, response.ok);
  void renderDiscounts();
};

