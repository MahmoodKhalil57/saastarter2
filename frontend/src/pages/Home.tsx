import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "hono-aep-ui";
import { buy, catalog, entitlements, money, type Catalog } from "../store";
import { useSession } from "../auth";

const FEATURES = [
  ["Hosted collections", "Declare any schema — blogs, products, orders — served as an AEP API instantly. This store's catalog is one."],
  ["End-user auth", "Sign-up, sessions, password reset, verified delete. The account you just made runs on it."],
  ["Stripe billing", "The button below is a real Stripe checkout. Entitlements gate features — that's how this page unlocks."],
  ["Semantic search", "Cloudflare-AI embeddings rank by meaning, not keywords."],
  ["White-label admin", "The generated CRUD admin, mounted in this very app."],
  ["Ships from git", "Backend declared in one repo, pushed to the edge. No servers."],
] as const;

const TIER_COPY: Record<string, { tagline: string; perks: string[]; highlight?: boolean }> = {
  pro: { tagline: "The whole template, yours to ship.", perks: ["Full source", "White-label admin", "Every hosted kind", "Deploy to Pages + Workers"] },
  lifetime: { tagline: "Pro, forever — plus whatever we build next.", perks: ["Everything in Pro", "All future templates", "Lifetime updates", "Founder's badge"], highlight: true },
};

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void catalog().then(setCat);
    void entitlements().then(setOwned);
  }, [user]);

  const purchase = async (product: string) => {
    setBusy(product);
    const result = await buy(product);
    setBusy(null);
    if (result.needsAuth) return navigate("/login?buy=" + product);
    if (result.redirect) return void (window.location.href = result.redirect);
    if (result.owned) void entitlements().then(setOwned);
  };

  return (
    <div className="space-y-24 pb-16">
      {/* Hero */}
      <section className="space-y-6 pt-10 text-center">
        <Badge variant="secondary" className="mx-auto">A self-aware commerce template</Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold tracking-tight">
          The e-commerce shop that sells its own source code.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          You are looking at the product. This page, the checkout, the account you can
          create — all built on the exact template on sale below. Buy it, and you own
          what runs it.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
            See pricing
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/product")}>
            What's inside
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Backend live on Cloudflare Workers · frontend static on GitHub Pages · one git repo.</p>
      </section>

      {/* The meta pitch */}
      <section className="rounded-2xl border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Every feature demoed on itself</h2>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Most templates show you screenshots. This one <em>is</em> the screenshot — the
          storefront runs the storefront engine, the checkout charges for the checkout,
          and buying Pro unlocks the source using the entitlement system you just paid for.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <Card key={title} className="text-left">
              <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Own the template</h2>
          <p className="mt-2 text-muted-foreground">One-time license. Test mode — use card 4242 4242 4242 4242.</p>
        </div>
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {cat &&
            Object.entries(cat.products).map(([key, product]) => {
              const price = Object.values(product.prices)[0]!;
              const copy = TIER_COPY[key] ?? { tagline: "", perks: product.grants };
              const isOwned = product.grants.every((g) => owned.includes(g));
              return (
                <Card key={key} className={copy.highlight ? "border-primary ring-1 ring-primary/30" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{product.name}</CardTitle>
                      {copy.highlight && <Badge>Best value</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{copy.tagline}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">
                      {money(price.amountCents, price.currency)}
                      <span className="text-sm font-normal text-muted-foreground"> once</span>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {copy.perks.map((p) => (
                        <li key={p} className="flex gap-2"><span className="text-primary">✓</span>{p}</li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={copy.highlight ? "default" : "outline"}
                      disabled={busy === key || isOwned}
                      onClick={() => purchase(key)}
                    >
                      {isOwned ? "You own this ✓" : busy === key ? "…" : user ? `Buy ${product.name}` : "Sign in to buy"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
        {owned.length > 0 && (
          <p className="text-center text-sm">
            You own it. <button className="text-primary underline" onClick={() => navigate("/account")}>Get your source →</button>
          </p>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Questions it asks itself</h2>
        {[
          ["Is this really the product?", "Yes. The repo you buy builds this exact site. The commit that added this FAQ is in it."],
          ["Do I need a server?", "No. The frontend is static (GitHub Pages); the backend is a Cloudflare Worker you deploy with one command."],
          ["Is the payment real?", "It's a real Stripe checkout in test mode — no money moves. Card 4242… completes it and unlocks Pro instantly."],
        ].map(([q, a]) => (
          <Card key={q}><CardHeader className="pb-2"><CardTitle className="text-base">{q}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{a}</CardContent></Card>
        ))}
      </section>
    </div>
  );
}
