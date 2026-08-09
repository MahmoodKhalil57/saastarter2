import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The key ladder (spec/secrets.md §3.1 sibling contract): BAAS_KEY env →
 * .owner-creds.json (sk_key) in the target dir, then its parent (the
 * repo root, next to platform-creds.json). Lets `baas …` run with zero
 * env ceremony from a cloned repo.
 */
export function ownerKey(dir: string): string {
  if (process.env.BAAS_KEY) return process.env.BAAS_KEY;
  for (const candidate of [join(dir, ".owner-creds.json"), join(dir, "..", ".owner-creds.json")]) {
    try {
      const creds = JSON.parse(readFileSync(candidate, "utf8")) as { sk_key?: string };
      if (creds.sk_key) return creds.sk_key;
    } catch {
      /* try the next location */
    }
  }
  return "";
}

export function coordinates(dir: string): { endpoint: string; project: string } | null {
  for (const file of ["baas.json", "seed.json"]) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as { endpoint?: string; project?: string };
      if (parsed.endpoint && parsed.project) return { endpoint: parsed.endpoint, project: parsed.project };
    } catch {
      /* try the next manifest */
    }
  }
  return null;
}
