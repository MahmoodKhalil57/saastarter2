// The STORE ADMIN (application plane). The commerce panes (stats, orders)
// are bespoke; every COLLECTION tab is GENERATED from the project's own
// openapi.json (x-aep-ui) by the vendored hono-aep-bootstrap-ui renderer,
// composed per site.admin in the project document — so the panel is
// configured in hono-aep-baas-config, not coded here. One-write-surface
// law holds: every action is the public API under the sk_ key's policies.
import { base, config } from "../config.js";
import { money } from "../store.js";
import { toast } from "../ui.js";
import { loadAdminModel, tableHtml, formHtml, readForm } from "../vendor/hono-aep-bootstrap-ui.js";

const KEY = "baas.owner-key";
const el = (id) => document.getElementById(id);
const ownerKey = () => localStorage.getItem(KEY);
const auth = () => ({ Authorization: `Bearer ${ownerKey()}` });
const json = { "Content-Type": "application/json" };
const api = (path, init = {}) => fetch(`${base}${path}`, { ...init, headers: { ...json, ...auth(), ...(init.headers ?? {}) } });
const locale = () => el("admin-locale").value || "en";

// --- gate --------------------------------------------------------------------
async function verifyKey(key) {
  // The project document read is owner-gated — the cleanest key probe,
  // and unlock() needs the doc (site.admin) anyway.
  const probe = await fetch(base, { headers: { Authorization: `Bearer ${key}` } });
  return probe.ok;
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

async function unlock() {
  el("gate").classList.add("d-none");
  el("studio").classList.remove("d-none");
  const [project, model] = await Promise.all([
    api("").then((r) => r.json()).catch(() => ({})),
    loadAdminModel(`${base}/openapi.json`),
  ]);
  const admin = project.site?.admin ?? { commerce: true, collections: ["products", "discounts"] };
  const locales = project.site?.locales?.supported ?? ["en"];
  el("admin-locale").innerHTML = locales.map((code) => `<option>${code}</option>`).join("");
  if (!admin.commerce) document.querySelectorAll("[data-commerce]").forEach((n) => n.remove());
  for (const entry of admin.collections ?? []) mountCollection(model, entry);
  if (admin.commerce) { void renderStats(); void renderOrders(); }
}
el("admin-locale") && (el("admin-locale").onchange = () => {
  document.querySelectorAll("[data-collection]").forEach((pane) => void pane.refresh?.());
});
if (ownerKey() && (await verifyKey(ownerKey()))) void unlock();

// --- generated collection tabs ----------------------------------------------
function mountCollection(model, entry) {
  const conf = typeof entry === "string" ? { slug: entry } : entry;
  const resource = model.byPlural(conf.slug);
  if (!resource) return console.warn(`admin: no ${conf.slug} in the contract`);
  const media = conf.media ?? [];
  const paneId = `tab-c-${conf.slug}`;

  el("admin-tabs").insertAdjacentHTML("beforeend",
    `<li class="nav-item"><button class="nav-link text-capitalize" data-bs-toggle="tab" data-bs-target="#${paneId}">${conf.slug}</button></li>`);
  el("admin-panes").insertAdjacentHTML("beforeend", `
    <div class="tab-pane fade" id="${paneId}" data-collection="${conf.slug}">
      <div data-list class="mb-4"></div>
      <div class="card"><div class="card-body vstack gap-2">
        <div class="d-flex justify-content-between align-items-center">
          <h6 data-form-title class="mb-0">New ${resource.name}</h6>
          <button data-new class="btn btn-sm btn-link p-0 d-none">+ new instead</button>
        </div>
        <input data-id-input class="form-control form-control-sm font-monospace" placeholder="id (e.g. slug)" style="max-inline-size:16rem">
        <div data-form></div>
        <button data-save class="btn btn-primary btn-sm align-self-start"><iconify-icon icon="lucide:check" inline></iconify-icon> Save ${resource.name}</button>
      </div></div>
    </div>`);

  const pane = el(paneId);
  const idInput = pane.querySelector("[data-id-input]");
  let editing = ""; // id under edit; empty = create

  const renderForm = (row = {}) => {
    pane.querySelector("[data-form]").innerHTML = formHtml(resource, row, { mediaFields: media, locale: locale() });
    pane.querySelector("[data-form-title]").textContent = editing ? `Edit: ${editing}` : `New ${resource.name}`;
    pane.querySelector("[data-new]").classList.toggle("d-none", !editing);
    idInput.value = editing;
    idInput.disabled = !!editing;
  };

  pane.refresh = async () => {
    const { results } = await (await api(`/${conf.slug}?locale=all`)).json().catch(() => ({ results: [] }));
    pane.querySelector("[data-list]").innerHTML = tableHtml(resource, results ?? [], { locale: locale() });
    if (!editing) renderForm();
  };

  pane.addEventListener("click", async (event) => {
    const edit = event.target.closest?.("[data-edit]");
    const del = event.target.closest?.("[data-del]");
    if (edit) {
      editing = edit.dataset.edit;
      renderForm(await (await api(`/${conf.slug}/${editing}?locale=${locale()}`)).json());
    } else if (del) {
      if (!confirm(`Delete ${conf.slug}/${del.dataset.del}?`)) return;
      const response = await api(`/${conf.slug}/${del.dataset.del}`, { method: "DELETE" });
      toast(response.ok ? "Deleted ✓" : `Refused (${response.status})`, response.ok);
      void pane.refresh();
    }
  });
  pane.querySelector("[data-new]").onclick = () => { editing = ""; renderForm(); };
  pane.addEventListener("change", async (event) => {
    const field = event.target.dataset?.media;
    if (!field) return; // media upload: file → media:upload → blob id into the hidden input
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${base}/media:upload`, { method: "POST", headers: auth(), body: form });
    if (!response.ok) return toast("Upload failed", false);
    pane.querySelector(`#af-${field}`).value = (await response.json()).results[0].path.split("/")[1];
    pane.querySelector(`[data-media-state="${field}"]`).textContent = `uploaded ✓ (${file.name})`;
  });

  pane.querySelector("[data-save]").onclick = async () => {
    let wire;
    try { wire = readForm(resource, pane, { mediaFields: media }); }
    catch (thrown) { return toast(thrown.message, false); }
    const id = editing || idInput.value.trim() || (conf.idField ? String(wire[conf.idField] ?? "") : "");
    if (!id) return toast("An id is required (fill the id box).", false);
    const response = editing
      ? await api(`/${conf.slug}/${id}?locale=${locale()}`, { method: "PATCH", body: JSON.stringify(wire) })
      : await api(`/${conf.slug}?id=${encodeURIComponent(id)}&locale=${locale()}`, { method: "POST", body: JSON.stringify(wire) });
    toast(response.ok ? `${resource.name} saved ✓` : `Save failed (${response.status})`, response.ok);
    if (response.ok) { editing = ""; void pane.refresh(); }
  };

  void pane.refresh();
}

// --- commerce: stats ---------------------------------------------------------
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

// --- commerce: orders + fulfillment ------------------------------------------
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
