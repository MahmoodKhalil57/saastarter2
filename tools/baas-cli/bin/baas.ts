#!/usr/bin/env bun
import { coordinates, ownerKey } from "../src/creds";
import { loadPlatformCreds } from "../src/sync";

/**
 * The layer-3 CLI (spec/secrets.md §0 flow): sign up on the hosted baas,
 * create a project, keep .owner-creds.json + platform-creds.json at the
 * repo root — then this one command runs the whole maintenance loop:
 *
 *   baas sync  diff|push [--prune]|pull|fmt   --dir hono-aep-baas-config
 *   baas seed  diff|push [--prune]|pull|fmt   --dir hono-aep-baas-idempotent-seed
 *   baas secrets list|set NAME [value]|delete NAME  --dir hono-aep-baas-config
 *   baas validate --dir <repo>
 *
 * Keys resolve BAAS_KEY → .owner-creds.json (dir, then repo root);
 * `secrets set NAME` with no value reads platform-creds.json.
 */

const [command, ...rest] = process.argv.slice(2);
const dirOf = (): string => {
  const at = rest.indexOf("--dir");
  return at >= 0 ? rest[at + 1]! : ".";
};

const usage = (): never => {
  console.error("usage: baas <sync|seed|secrets|validate> … --dir <repo>  (see package README)");
  process.exit(2);
};

switch (command) {
  case "sync":
    await (await import("../src/sync")).main(rest);
    break;
  case "seed":
    await (await import("../src/seed")).main(rest);
    break;
  case "validate":
    await (await import("../src/validate")).main(rest);
    break;
  case "secrets": {
    const [verb, name, literal] = rest.filter((arg, at) => arg !== "--dir" && rest[at - 1] !== "--dir");
    const dir = dirOf();
    const coords = coordinates(dir);
    if (!coords) {
      console.error(`no baas.json/seed.json with endpoint+project in ${dir}`);
      process.exit(2);
    }
    const key = ownerKey(dir);
    if (!key) {
      console.error("No key: set BAAS_KEY or keep .owner-creds.json next to the config dir.");
      process.exit(1);
    }
    const call = (method: string, path: string, body?: unknown): Promise<Response> =>
      fetch(`${coords.endpoint}/v1/projects/${coords.project}/${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    if (verb === "list" || verb === undefined) {
      const response = await call("GET", "secrets");
      if (!response.ok) {
        console.error(`GET secrets → ${response.status}`);
        process.exit(1);
      }
      const { results } = (await response.json()) as { results: { name: string; digest: string }[] };
      for (const secret of results) console.log(`${secret.name}  sha256:${secret.digest}`);
      if (!results.length) console.log("(no secrets)");
    } else if (verb === "set" && name) {
      const value = literal ?? loadPlatformCreds(dir)[name];
      if (!value) {
        console.error(`no value: pass one, or add ${name} to platform-creds.json`);
        process.exit(2);
      }
      const response = await call("PUT", `secrets/${name}`, { value });
      if (!response.ok) {
        console.error(`PUT → ${response.status}: ${(await response.text()).slice(0, 200)}`);
        process.exit(1);
      }
      const { digest } = (await response.json()) as { digest: string };
      console.log(`${name}  sha256:${digest} ✓`);
    } else if (verb === "delete" && name) {
      const response = await call("DELETE", `secrets/${name}`);
      if (response.status !== 204 && !response.ok) {
        console.error(`DELETE → ${response.status}`);
        process.exit(1);
      }
      console.log(`${name} deleted`);
    } else usage();
    break;
  }
  default:
    usage();
}
