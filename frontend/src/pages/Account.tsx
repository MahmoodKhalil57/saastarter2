import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { authHeader, changeEmail, changePassword, deleteAccount, signOut, updateProfile, useSession } from "../auth";
import { money, myOrders, myWishlist, owned as ownedProducts, proActive, subscribe, toggleWishlist, type Order, type WishlistItem } from "../store";
import { config } from "../config";

const TABS = ["overview", "settings", "security", "billing", "orders", "wishlist", "developer"] as const;
type Tab = (typeof TABS)[number];

export function AccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const [owns, setOwns] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[] | null>(null);
  const [devKey, setDevKey] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [pro, setPro] = useState(false);
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 5000); };
  useEffect(() => { if (user) void proActive().then(setPro); }, [user]);

  useEffect(() => { if (user) void ownedProducts().then(setOwns); }, [user]);
  useEffect(() => { if (user && tab === "orders") void myOrders().then(setOrders); }, [user, tab]);
  useEffect(() => { if (user && tab === "wishlist") void myWishlist().then(setWishlist); }, [user, tab]);

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
        {flash && <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">{flash}</div>}
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
        {tab === "settings" && (
          <>
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Signed in as {user.email}</CardDescription></CardHeader>
              <CardContent>
                <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") ?? ""); if (!name) return; const r = await updateProfile(name); say(r.ok ? "Name updated ✓" : "Update failed"); }}>
                  <input name="name" defaultValue={user.name} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                  <Button type="submit">Save</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Change email</CardTitle><CardDescription>A confirmation link goes to the NEW address — the change lands only after you click it.</CardDescription></CardHeader>
              <CardContent>
                <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("email") ?? ""); if (!v) return; const r = await changeEmail(v); say(r.ok ? "Confirmation sent to the new address ✓" : "Request failed"); }}>
                  <input name="email" type="email" placeholder="new@email.com" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                  <Button type="submit" variant="outline">Send confirmation</Button>
                </form>
              </CardContent>
            </Card>
            <Card className="border-destructive/40">
              <CardHeader><CardTitle>Delete account</CardTitle><CardDescription>Emails a confirmation link; the account is anonymized in place (a server-side veto blocks hard deletes).</CardDescription></CardHeader>
              <CardContent>
                <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("pw") ?? ""); if (!v) return; const r = await deleteAccount(v); say(r.ok ? "Deletion email sent — check your inbox" : "Wrong password?"); }}>
                  <input name="pw" type="password" placeholder="Current password" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                  <Button type="submit" variant="destructive">Request deletion</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
        {tab === "security" && (
          <Card>
            <CardHeader><CardTitle>Change password</CardTitle><CardDescription>Other sessions are signed out on success.</CardDescription></CardHeader>
            <CardContent>
              <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const r = await changePassword(String(f.get("cur") ?? ""), String(f.get("next") ?? "")); say(r.ok ? "Password changed ✓" : "Change failed — check the current password"); if (r.ok) (e.target as HTMLFormElement).reset(); }}>
                <input name="cur" type="password" required placeholder="Current password" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                <input name="next" type="password" required minLength={8} placeholder="New password (8+ chars)" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                <Button type="submit">Change password</Button>
              </form>
            </CardContent>
          </Card>
        )}
        {tab === "billing" && (
          <>
            <Card><CardHeader><CardTitle>Billing</CardTitle><CardDescription>Test mode — Stripe.</CardDescription></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>License: {license}</p>
                <p>Owns: {owns.size ? [...owns].join(", ") : "nothing yet"}</p>
                {!isCustomer && <Button className="mt-2" onClick={() => navigate("/products")}>Browse products</Button>}
              </CardContent></Card>
            <Card className={pro ? "border-primary ring-1 ring-primary/30" : ""}>
              <CardHeader><CardTitle>Pro subscription {pro ? "✓" : ""}</CardTitle>
                <CardDescription>{pro
                  ? "Active — the pro entitlement is granted and renews on every invoice (revoked on cancellation)."
                  : "$9/mo — a real Stripe subscription (recurring checkout); the webhook lifecycle grants, renews, and revokes the pro entitlement."}</CardDescription></CardHeader>
              <CardContent>
                {pro
                  ? <p className="text-sm text-muted-foreground">Entitlement-gated features (like advanced export) are on for this account.</p>
                  : <Button onClick={async () => { const r = await subscribe(); if (r.needsAuth) return navigate("/login?next=/account"); if (r.redirect) window.location.href = r.redirect; }}>Subscribe — $9/mo</Button>}
              </CardContent>
            </Card>
          </>
        )}
        {tab === "orders" && (
          <Card><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Your commerce orders (baas/commerce.md) — snapshot totals, newest first.</CardDescription></CardHeader>
            <CardContent>{orders === null ? <p className="text-sm text-muted-foreground">Loading…</p> : orders.length === 0
              ? <p className="text-sm text-muted-foreground">No orders yet.</p>
              : <ul className="space-y-1 text-sm">{orders.slice(0, 10).map((o) => <li key={o.id} className="flex justify-between border-b py-1 last:border-0"><span>{o.items.map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}</span><span className="flex gap-3"><span>{money(o.total_cents)}</span><span className={o.status === "paid" ? "text-primary" : "text-muted-foreground"}>{o.status}</span></span></li>)}</ul>}
            </CardContent></Card>
        )}
        {tab === "wishlist" && (
          <Card><CardHeader><CardTitle>Wishlist</CardTitle><CardDescription>Owner-private hosted collection — only you can list your rows.</CardDescription></CardHeader>
            <CardContent>{wishlist === null ? <p className="text-sm text-muted-foreground">Loading…</p> : wishlist.length === 0
              ? <p className="text-sm text-muted-foreground">Nothing saved yet — tap ❤️ on a product.</p>
              : <ul className="space-y-1 text-sm">{wishlist.map((w) => <li key={w.path} className="flex justify-between border-b py-1.5 last:border-0">
                  <button className="text-primary underline" onClick={() => navigate(`/products/${w.product}`)}>{w.product}</button>
                  <button className="text-muted-foreground hover:text-destructive" onClick={async () => { await toggleWishlist(w.product); void myWishlist().then(setWishlist); }}>Remove</button>
                </li>)}</ul>}
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
