import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { authHeader, changeEmail, changePassword, confirm2fa, deleteAccount, enable2fa, signOut, updateAvatar, updateProfile, useSession } from "../auth";
import { billingPortal, money, myOrders, myWishlist, owned as ownedProducts, proActive, subscribe, toggleWishlist, uploadMedia, type Order, type WishlistItem } from "../store";
import { config } from "../config";

const TABS = ["overview", "settings", "security", "billing", "orders", "wishlist", "developer"] as const;
type Tab = (typeof TABS)[number];

export function AccountPage() {
  const navigate = useNavigate();
  const { user, refresh } = useSession();
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
            {user.isAnonymous && (
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader><CardTitle>You're browsing as a guest</CardTitle>
                  <CardDescription>Your cart and orders live on this guest session. Create an account and they come with you — the upgrade re-parents everything (commerce.md §3a).</CardDescription></CardHeader>
                <CardContent><Button onClick={() => navigate("/login")}>Create an account</Button></CardContent>
              </Card>
            )}
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
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {user.image
                    ? <img src={user.image} alt="" className="h-14 w-14 rounded-full border object-cover" />
                    : <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-lg font-semibold">{(user.name || "?").slice(0, 1).toUpperCase()}</div>}
                  <label className="cursor-pointer text-sm text-primary underline">
                    Change avatar
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const up = await uploadMedia(file); // per-project media (R2/fs behind the seam)
                      if ("url" in up) { await updateAvatar(up.url); refresh(); say("Avatar updated ✓"); }
                      else say("error" in up ? up.error : "Sign in first");
                    }} />
                  </label>
                </div>
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
          <>
          <Card className={user.twoFactorEnabled ? "border-primary ring-1 ring-primary/30" : ""}>
            <CardHeader><CardTitle>Two-factor authentication {user.twoFactorEnabled ? "✓" : ""}</CardTitle>
              <CardDescription>{user.twoFactorEnabled
                ? "On — sign-in requires a code from your authenticator app."
                : "Real server-side TOTP (RFC 6238) — the original template only stubbed this."}</CardDescription></CardHeader>
            <CardContent>
              {user.twoFactorEnabled ? (
                <p className="text-sm text-muted-foreground">Enabled for {user.email}.</p>
              ) : (
                <TwoFactorSetup onDone={() => { refresh(); say("Two-factor enabled ✓"); }} />
              )}
            </CardContent>
          </Card>
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
          </>
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
                {pro ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Entitlement-gated features (like advanced export) are on for this account.</p>
                    <Button variant="outline" onClick={async () => { const r = await billingPortal(); if (r.url) window.location.href = r.url; else say("No billing history to manage yet."); }}>Manage subscription</Button>
                  </div>
                ) : <Button onClick={async () => { const r = await subscribe(); if (r.needsAuth) return navigate("/login?next=/account"); if (r.redirect) window.location.href = r.redirect; }}>Subscribe — $9/mo</Button>}
              </CardContent>
            </Card>
          </>
        )}
        {tab === "orders" && (
          <Card><CardHeader><CardTitle>Orders</CardTitle><CardDescription>Your commerce orders (baas/commerce.md) — snapshot totals, newest first.</CardDescription></CardHeader>
            <CardContent>{orders === null ? <p className="text-sm text-muted-foreground">Loading…</p> : orders.length === 0
              ? <p className="text-sm text-muted-foreground">No orders yet.</p>
              : <ul className="space-y-2 text-sm">{orders.slice(0, 10).map((o) => (
                  <li key={o.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span>{o.items.map((i) => `${i.quantity}× ${i.name ?? i.product_id}`).join(", ")}</span>
                      <span className="flex gap-3"><span>{money(o.total_cents)}</span><span className={["paid","delivered","shipped","fulfilled"].includes(o.status) ? "text-primary" : "text-muted-foreground"}>{o.status}</span></span>
                    </div>
                    {(o.deliveries ?? []).flatMap((d) => d.artifacts).map((a, at) =>
                      a.kind === "download"
                        ? <a key={at} className="mt-1 inline-block rounded-md border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10" href={`${config.endpoint}/v1${a.claim.startsWith("/v1") ? a.claim.slice(3) : a.claim}`} target="_blank" rel="noreferrer">⬇ {a.label}</a>
                        : a.kind === "tracking"
                          ? <span key={at} className="mt-1 mr-2 inline-block text-xs text-muted-foreground">📦 {a.label}{a.code ? ` — ${a.code}` : ""}</span>
                          : <span key={at} className="mt-1 mr-2 inline-block text-xs text-muted-foreground">{a.label}</span>
                    )}
                  </li>
                ))}</ul>}
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
          <Card><CardHeader><CardTitle>Developer</CardTitle><CardDescription>Mint an sk_ API key bound to YOUR account — it acts exactly as your session does (your orders, wishlist, cart) against this project's API and MCP endpoint. Shown once; treat it as a secret.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={async () => {
                const r = await fetch(`${config.endpoint}/v1/projects/${config.project}/keys:mint`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: "{}" });
                if (r.ok) { setDevKey(((await r.json()) as { plaintext?: string }).plaintext ?? null); say("Key minted — copy it now, it is shown once."); }
                else say(`Mint failed (${r.status}) — ${((await r.json().catch(() => ({}))) as { title?: string }).title ?? "try again"}`);
              }}>Mint key</Button>
              {devKey && <code className="block break-all rounded bg-muted p-2 text-xs">{devKey}</code>}
              {devKey && <p className="text-xs text-muted-foreground">Try it: <code>curl -H "Authorization: Bearer {devKey.slice(0, 12)}…" {config.endpoint}/v1/projects/{config.project}/commerce/orders</code></p>}
              <p className="text-xs text-muted-foreground">Your contract: <a className="underline" href={`${config.endpoint}/v1/projects/${config.project}/openapi.json`} target="_blank" rel="noreferrer">openapi.json</a> · <code>/v1/projects/{config.project}/mcp</code></p>
            </CardContent></Card>
        )}
      </div>
    </div>
  );
}

/** Enable-TOTP flow: password → secret (add to authenticator) → confirm code. */
function TwoFactorSetup({ onDone }: { onDone: () => void }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  return secret ? (
    <div className="space-y-3">
      <p className="text-sm">Add this secret to your authenticator app, then confirm with a code:</p>
      <code className="block break-all rounded bg-muted p-2 text-xs">{secret}</code>
      {uri && <p className="break-all text-xs text-muted-foreground">{uri}</p>}
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "");
        if (await confirm2fa(code)) onDone(); else setError("Wrong code — try again.");
      }}>
        <input name="code" inputMode="numeric" placeholder="123456" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <Button type="submit">Confirm</Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  ) : (
    <form className="flex gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const pw = String(new FormData(e.currentTarget).get("pw") ?? "");
      const r = await enable2fa(pw);
      if (r.secret) { setSecret(r.secret); setUri(r.totpURI ?? null); setError(""); }
      else setError("Wrong password?");
    }}>
      <input name="pw" type="password" placeholder="Current password" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
      <Button type="submit" variant="outline">Enable 2FA</Button>
      {error && <p className="self-center text-sm text-destructive">{error}</p>}
    </form>
  );
}
