import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { authHeader, signOut, useSession } from "../auth";
import { money, myOrders, owned as ownedProducts, type Order } from "../store";
import { config } from "../config";

const TABS = ["overview", "billing", "orders", "developer"] as const;
type Tab = (typeof TABS)[number];

export function AccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const [owns, setOwns] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [devKey, setDevKey] = useState<string | null>(null);

  useEffect(() => { if (user) void ownedProducts().then(setOwns); }, [user]);
  useEffect(() => { if (user && tab === "orders") void myOrders().then(setOrders); }, [user, tab]);

  if (user === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (user === null) { navigate("/login"); return null; }
  // Owning the template itself unlocks the source; add-ons make you a customer.
  const hasSource = owns.has("saastarter2");
  const isCustomer = owns.size > 0;
  const license = hasSource ? "Lifetime" : isCustomer ? "Add-ons" : "Free";

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
                  {isCustomer ? <Badge>{license}</Badge> : <Badge variant="outline">Free</Badge>}</div>
                <div className="flex gap-2"><Button variant="outline" onClick={() => navigate("/admin")}>Open admin</Button>
                  <Button variant="ghost" onClick={() => { signOut(); navigate("/"); }}>Sign out</Button></div>
              </CardContent>
            </Card>
            <Card className={hasSource ? "border-primary ring-1 ring-primary/30" : "opacity-70"}>
              <CardHeader><CardTitle className="flex items-center gap-2">Your source {hasSource ? "🔓" : "🔒"}</CardTitle>
                <CardDescription>{hasSource ? "You own it — a paid order for this template unlocked the repo (owns:saastarter2)." : "Buy the template to unlock. A real order check, not a paywall image."}</CardDescription></CardHeader>
              <CardContent>{hasSource
                ? <a href="https://github.com/MahmoodKhalil57/saastarter2" target="_blank" rel="noreferrer"><Button>Get the repository →</Button></a>
                : <Button onClick={() => navigate("/products/saastarter2")}>Buy the template</Button>}</CardContent>
            </Card>
          </>
        )}
        {tab === "billing" && (
          <Card><CardHeader><CardTitle>Billing</CardTitle><CardDescription>Test mode — Stripe.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>License: {license}</p>
              <p>Owns: {owns.size ? [...owns].join(", ") : "nothing yet"}</p>
              {!isCustomer && <Button className="mt-2" onClick={() => navigate("/products")}>Browse products</Button>}
            </CardContent></Card>
        )}
        {tab === "orders" && (
          <Card><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Your commerce orders (baas/commerce.md) — snapshot totals, newest first.</CardDescription></CardHeader>
            <CardContent>{orders === null ? <p className="text-sm text-muted-foreground">Loading…</p> : orders.length === 0
              ? <p className="text-sm text-muted-foreground">No orders yet.</p>
              : <ul className="space-y-1 text-sm">{orders.slice(0, 10).map((o) => <li key={o.id} className="flex justify-between border-b py-1 last:border-0"><span>{o.items.map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}</span><span className="flex gap-3"><span>{money(o.total_cents)}</span><span className={o.status === "paid" ? "text-primary" : "text-muted-foreground"}>{o.status}</span></span></li>)}</ul>}
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
