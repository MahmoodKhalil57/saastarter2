// VENDORED COPY — resync from customPackages/hono-aep-bootstrap-ui/src/index.js (spec: spec/bootstrap-ui.md).
/**
 * hono-aep-bootstrap-ui v1 — the no-build admin renderer.
 * Renders an AEP contract (x-aep-resource + x-aep-ui) as Bootstrap 5
 * HTML. Dependency-free browser ES module; the caller owns fetch/auth
 * and event wiring. Spec: spec/bootstrap-ui.md. Vendored by copying
 * this file verbatim.
 */

const SERVER_OWNED = new Set(["path", "create_time", "update_time", "created_by"]);

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- model ----------
export function adminModelFromDocument(doc) {
  const resources = [];
  for (const [name, schema] of Object.entries(doc.components?.schemas ?? {})) {
    const meta = schema["x-aep-resource"];
    const ui = schema["x-aep-ui"];
    if (!meta || !ui) continue;
    const fields = (ui.fields ?? []).map((row) => {
      const property = schema.properties?.[row.name] ?? {};
      return {
        name: row.name,
        label: row.label ?? row.name,
        widget: row.widget ?? "text",
        required: !!row.required,
        readOnly: !!row.readOnly || SERVER_OWNED.has(row.name),
        options: row.options,
        localized: !!property["x-i18n"]?.localized,
        order: row.order ?? 0,
        description: row.description,
      };
    });
    fields.sort((a, b) => a.order - b.order);
    resources.push({ name, plural: meta.plural ?? name, titleField: ui.titleField ?? "path", fields });
  }
  return {
    title: doc.info?.title ?? "",
    resources,
    byPlural: (plural) => resources.find((resource) => resource.plural === plural),
  };
}

export async function loadAdminModel(docUrl, fetchImpl = fetch) {
  const response = await fetchImpl(docUrl);
  if (!response.ok) throw new Error(`openapi.json: ${response.status}`);
  return adminModelFromDocument(await response.json());
}

// ---------- cells ----------
const localeText = (value, locale) =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value[locale] ?? Object.values(value)[0] ?? ""
    : value;

export function cellHtml(field, value, locale = "en") {
  if (value === undefined || value === null || value === "") return "—";
  if (field.localized) return escapeHtml(localeText(value, locale));
  if (field.widget === "money") return `$${(Number(value) / 100).toFixed(2)}`;
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (field.widget === "datetime") return escapeHtml(String(value).split("T")[0]);
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return `<code>${escapeHtml(text.length > 40 ? `${text.slice(0, 40)}…` : text)}</code>`;
  }
  return escapeHtml(value);
}

export const rowId = (resource, row) =>
  (typeof row.path === "string" && row.path.split("/").pop()) || row.id || localeText(row[resource.titleField], "en");

// ---------- table ----------
const columnFields = (resource) => {
  const visible = resource.fields.filter(
    (field) => !field.readOnly && (field.widget !== "json" || field.localized),
  );
  const picked = visible.slice(0, 6);
  const updated = resource.fields.find((field) => field.name === "update_time");
  if (updated) picked.push(updated);
  return picked;
};

export function tableHtml(resource, rows, { locale = "en" } = {}) {
  const columns = columnFields(resource);
  const head = columns.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("");
  const body = (rows ?? [])
    .map((row) => {
      const id = escapeHtml(rowId(resource, row));
      const cells = columns.map((field) => `<td>${cellHtml(field, row[field.name], locale)}</td>`).join("");
      return `<tr data-id="${id}">${cells}<td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-secondary py-0" data-edit="${id}">edit</button>
        <button class="btn btn-sm btn-outline-danger py-0" data-del="${id}">delete</button>
      </td></tr>`;
    })
    .join("");
  return `<div class="table-responsive"><table class="table table-sm align-middle mb-0">
    <thead><tr>${head}<th></th></tr></thead>
    <tbody>${body || `<tr><td colspan="${columns.length + 1}" class="text-body-secondary small">Nothing yet.</td></tr>`}</tbody>
  </table></div>`;
}

// ---------- form ----------
const writableFields = (resource) => resource.fields.filter((field) => !field.readOnly);

export function formHtml(resource, initial = {}, { idPrefix = "af", mediaFields = [], locale = "en" } = {}) {
  return writableFields(resource)
    .map((field) => {
      const id = `${idPrefix}-${field.name}`;
      const value = localeText(initial[field.name], locale);
      const label = `<label class="form-label small mb-1" for="${id}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>`;
      let control;
      if (mediaFields.includes(field.name)) {
        control =
          `<input type="hidden" id="${id}" value="${escapeHtml(value ?? "")}">` +
          `<input type="file" class="form-control form-control-sm" data-media="${field.name}">` +
          `<span class="form-text" data-media-state="${field.name}">${value ? "file attached" : ""}</span>`;
      } else if (field.options) {
        const items = field.options
          .map((option) => `<option${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`)
          .join("");
        control = `<select class="form-select form-select-sm" id="${id}">${items}</select>`;
      } else if (field.widget === "checkbox") {
        return `<div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="${id}"${value ? " checked" : ""}>
          <label class="form-check-label small" for="${id}">${escapeHtml(field.label)}</label>
        </div>`;
      } else if (field.widget === "money" || field.widget === "number") {
        control = `<input type="number" class="form-control form-control-sm" id="${id}" value="${escapeHtml(value ?? "")}">`;
      } else if (field.localized) {
        control = `<textarea class="form-control form-control-sm" rows="2" id="${id}">${escapeHtml(value ?? "")}</textarea>`;
      } else if (field.widget === "json") {
        const text = initial[field.name] === undefined ? "" : JSON.stringify(initial[field.name], null, 2);
        control = `<textarea class="form-control form-control-sm font-monospace" rows="4" id="${id}" spellcheck="false">${escapeHtml(text)}</textarea>`;
      } else {
        control = `<input type="text" class="form-control form-control-sm" id="${id}" value="${escapeHtml(value ?? "")}">`;
      }
      return `<div class="mb-2">${label}${control}</div>`;
    })
    .join("");
}

// ---------- coercion (pure — readForm is DOM sugar) ----------
export function wireValues(resource, raw, { mediaFields = [] } = {}) {
  const wire = {};
  for (const field of writableFields(resource)) {
    const value = raw[field.name];
    if (field.widget === "checkbox") {
      wire[field.name] = !!value;
      continue;
    }
    if (value === undefined || value === "") {
      if (field.required && !mediaFields.includes(field.name)) throw new Error(`${field.name}: required`);
      continue;
    }
    if (field.widget === "money" || field.widget === "number") wire[field.name] = Number(value);
    else if (field.widget === "json" && !field.localized) {
      try {
        wire[field.name] = JSON.parse(value);
      } catch {
        throw new Error(`${field.name}: invalid JSON`);
      }
    } else wire[field.name] = value;
  }
  return wire;
}

export function readForm(resource, root, { idPrefix = "af", mediaFields = [] } = {}) {
  const raw = {};
  for (const field of writableFields(resource)) {
    const node = root.querySelector(`#${idPrefix}-${field.name}`);
    if (!node) continue;
    raw[field.name] = field.widget === "checkbox" ? node.checked : node.value;
  }
  return wireValues(resource, raw, { mediaFields });
}
