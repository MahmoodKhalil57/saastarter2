import type { AepUiClient } from "hono-aep-ui";
import { config } from "./config";
import { authHeader } from "./auth";

/**
 * An AepUiClient over the project's hosted collections — the generated
 * admin's data layer (site.md §3). Cross-origin + bearer-authed; the
 * baas contract is standard AEP, so this is a thin fetch mapping.
 */

const base = `${config.endpoint}/v1/projects/${config.project}`;
const headers = () => ({ ...authHeader(), "Content-Type": "application/json" });

const query = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value != null) search.set(key, value);
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const adminClient: AepUiClient = {
  async get(path, params) {
    const response = await fetch(`${base}/${path}${query({ read_mask: params?.readMask })}`, {
      headers: authHeader(),
    });
    return response.json();
  },
  async list(collection, params) {
    const response = await fetch(
      `${base}/${collection}${query({
        filter: params?.filter,
        order_by: params?.orderBy,
        max_page_size: params?.maxPageSize?.toString(),
        page_token: params?.pageToken,
        read_mask: params?.readMask,
        show_deleted: params?.showDeleted ? "true" : undefined,
      })}`,
      { headers: authHeader() },
    );
    return response.json() as Promise<{ results: unknown[]; next_page_token: string }>;
  },
  async create(collection, data, params) {
    const response = await fetch(`${base}/${collection}${query({ id: params?.id })}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`create ${collection} → ${response.status}`);
    return response.json();
  },
  async update(path, patch) {
    const response = await fetch(`${base}/${path}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error(`update ${path} → ${response.status}`);
    return response.json();
  },
  async delete(path, params) {
    await fetch(`${base}/${path}${query({ force: params?.force ? "true" : undefined })}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },
  async call(path, verb, body) {
    const response = await fetch(`${base}/${path}:${verb}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) throw new Error(`${path}:${verb} → ${response.status}`);
    return response.json();
  },
};

export const projectDocUrl = `${base}/openapi.json`;
