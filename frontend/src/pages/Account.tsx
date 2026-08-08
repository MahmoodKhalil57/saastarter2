import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { authHeader, signOut, useSession } from "../auth";
import { entitlements } from "../store";
import { config } from "../config";

const TABS = ["overview", "billing", "orders", "developer"] as const;
type Tab = (typeof TABS)[number];

export function AccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const [owned, setOwned] = useState<string[]>([]);
  const [orders, setOrders] = useState<{ path: string; metadata?: { type?: string }; ok?: boolean; response?: unknown }[] | null>(null);
  const [devKey, setDevKey] = useState<string | null>(null);

  useEffect(() => { if (user) void entitlements().then(setOwned); }, [user]);
  useEffect(() => {
    if (user && tab === "orders")
      void fetch(`${config.endpoint}/v1/projects/${config.project}/operations`, { headers: authHeader() })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((b: { results: typeof orders }) => setOrders(b.results ?? []));
  }, [user, tab]);

  if (user === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (user === null) { navigate("/login"); return null; }
  const hasPro = owned.includes("pro");

  return (
    <div className="grid gap-8 pb-16 pt-6 md:grid-cols-[10rem_1fr]">
      <nav className="flex gap-2 md:flex-col">
        {TABS.map((t) => (
          <button key={t} onClick={() => setParams({ tab: t })}
            className={`rounded-lg px-3 py-1.5 text-left text-sm capitalize ${t === tab ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </nav>
      <div className="space-y-6">
        {tab === "overview" && (
          <>
            <Card>
              <CardHeader><CardTitle>Overview</CardTitle><CardDescription>{user.email}</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">License:</span>
                  {hasPro ? <Badge>{owned.includes("lifetime") ? "Lifetime" : "Pro"}</Badge> : <Badge variant="outline">Free</Badge>}</div>
                <div className="flex gap-2"><Button variant="outline" onClick={() => navigate("/admin")}>Open admin</Button>
                  <Button variant="ghost" onClick={() => { signOut(); navigate("/"); }}>Sign out</Button></div>
              </CardContent>
            </Card>
            <Card className={hasPro ? "border-primary ring-1 ring-primary/30" : "opacity-70"}>
              <CardHeader><CardTitle className="flex items-center gap-2">Your source {hasPro ? "🔓" : "🔒"}</CardTitle>
                <CardDescription>{hasPro ? "You own it — the entitlement you bought unlocked this." : "Buy Pro to unlock. A real entitlement check, not a paywall image."}</CardDescription></CardHeader>
              <CardContent>{hasPro
                ? <a href="https://github.com/MahmoodKhalil57/saastarter2" target="_blank" rel="noreferrer"><Button>Get the repository →</Button></a>
                : <Button onClick={() => navigate("/#pricing")}>See pricing</Button>}</CardContent>
            </Card>
          </>
        )}
        {tab === "billing" && (
          <Card><CardHeader><CardTitle>Billing</CardTitle><CardDescription>Test mode — Stripe.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Plan: {hasPro ? (owned.includes("lifetime") ? "Lifetime license" : "Pro license") : "Free"}</p>
              <p>Entitlements: {owned.length ? owned.join(", ") : "none"}</p>
              {!hasPro && <Button className="mt-2" onClick={() => navigate("/#pricing")}>Upgrade</Button>}
            </CardContent></Card>
        )}
        {tab === "orders" && (
          <Card><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Delivery operations on your account (AEP-151).</CardDescription></CardHeader>
            <CardContent>{orders === null ? <p className="text-sm text-muted-foreground">Loading…</p> : orders.length === 0
              ? <p className="text-sm text-muted-foreground">No operations yet.</p>
              : <ul className="space-y-1 text-sm">{orders.slice(0, 10).map((o) => <li key={o.path} className="flex justify-between border-b py-1 last:border-0"><span>{o.metadata?.type ?? "operation"}</span><span className={o.ok ? "text-primary" : "text-muted-foreground"}>{o.ok ? "done" : "…"}</span></li>)}</ul>}
            </CardContent></Card>
        )}
        {tab === "developer" && (
          <Card><CardHeader><CardTitle>Developer</CardTitle><CardDescription>Mint an API key for this project's contract.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={async () => {
                const r = await fetch(`${config.endpoint}/v1/keys:mint`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: "{}" });
                if (r.ok) setDevKey(((await r.json()) as { plaintext?: string }).plaintext ?? null);
              }}>Mint key</Button>
              {devKey && <code className="block break-all rounded bg-muted p-2 text-xs">{devKey}</code>}
              <p className="text-xs text-muted-foreground">Your contract: <a className="underline" href={`${config.endpoint}/v1/projects/${config.project}/openapi.json`} target="_blank" rel="noreferrer">openapi.json</a> · <code>/v1/projects/{config.project}/mcp</code></p>
            </CardContent></Card>
        )}
      </div>
    </div>
  );
}
