import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Button, Card, CardContent } from "hono-aep-ui";
import { buy, catalog, entitlements, money, type Catalog } from "../store";
import { useSession } from "../auth";

const FEATURES = [
  ["eCommerce", "Products, cart, checkout, and order management out of the box — the storefront you're in."],
  ["Admin Panel", "Manage users, products, orders, and content from one place — mounted in this app."],
  ["Authentication", "Sign-up, sessions, password reset, verified delete — bearer-first for static hosts."],
  ["Payments", "One-time and subscription payments with full Stripe integration and entitlement gating."],
  ["i18n-ready", "Static site, dynamic content — declared in git, editable in three surfaces."],
  ["SEO + performance", "Sitemap, robots, llms.txt, JSON-LD, an installable PWA — reified at build."],
] as const;

const TIERS: { key: string | null; name: string; price: string; tagline: string; perks: string[]; popular?: boolean; cta: string }[] = [
  { key: null, name: "Frontend Lite", price: "Free", tagline: "Marketing site + SEO foundations.", perks: ["Landing, about, FAQ, blog, contact", "SEO + performance setup", "All UI components", "1 year of updates"], cta: "It's this page" },
  { key: null, name: "Frontend Pro", price: "Free", tagline: "Auth UI, dark/light, i18n, RTL.", perks: ["Everything in Frontend Lite", "Auth pages + sessions UI", "Theme toggle", "i18n + RTL"], cta: "Sign in to try" },
  { key: "pro", name: "Backend + Frontend", price: "$49", tagline: "Admin, products, checkout, database.", perks: ["Everything in Frontend Pro", "Admin dashboard", "Products, cart, checkout", "Hosted collections + auth pools"], popular: true, cta: "Get B+F" },
  { key: "lifetime", name: "Full Stack Pro", price: "$149", tagline: "Stripe payments + full eCommerce, forever.", perks: ["Everything in B+F", "Stripe payments", "Order management", "Lifetime updates + all templates"], cta: "Get Full Stack" },
] as const;

const TESTIMONIALS = [
  ["Saved me 3 months of development time. The code quality is exceptional.", "Alex Chen", "Founder, LaunchPad"],
  ["Best template I've used — and it literally sells itself, so I trusted it instantly.", "Emily Park", "Indie Maker"],
  ["The auth and Stripe setup alone saved me weeks. Then I realized the demo IS the product.", "Lisa Zhang", "Engineer, StartupX"],
] as const;

const FAQS = [
  ["Is this really the product?", "Yes — the repo you buy builds this exact site. The commit that added this FAQ ships in it."],
  ["Frontend or full-stack?", "Both. The two free tiers are the static frontend; the paid tiers unlock the hosted backend (collections, auth, billing)."],
  ["Do I need a server?", "No. The frontend is static (GitHub Pages); the backend is a Cloudflare Worker you deploy with one command."],
  ["Is the payment real?", "A real Stripe checkout in test mode — card 4242 4242 4242 4242 completes it and unlocks Pro instantly."],
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { void catalog().then(setCat); void entitlements().then(setOwned); }, [user]);

  const purchase = async (key: string) => {
    setBusy(key);
    const r = await buy(key); setBusy(null);
    if (r.needsAuth) return navigate("/login?buy=" + key);
    if (r.redirect) return void (window.location.href = r.redirect);
    if (r.owned) void entitlements().then(setOwned);
  };

  return (
    <div className="space-y-28 pb-20">
      {/* HERO */}
      <section className="relative flex flex-col items-center pt-20 text-center">
        <p className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">The self-aware SaaS template</p>
        <h1 className="text-balance text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
          Ship fast.<br /><span className="text-muted-foreground/50">Stay minimal.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">
          Auth, payments, eCommerce, admin panel — everything wired up. Just add your idea.
          This whole shop runs on the template it sells.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Get Started →</Button>
          <Button size="lg" variant="ghost" onClick={() => navigate("/products")}>See what's included</Button>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section className="border-y py-6">
        <p className="mb-4 text-center text-xs uppercase tracking-widest text-muted-foreground">Built with</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground/70">
          {["react-router", "shadcn/ui", "Cloudflare Workers", "D1", "Workers AI", "Stripe", "hono-aep", "AEP"].map((n) => <span key={n}>{n}</span>)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="space-y-10">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight">Everything <span className="text-muted-foreground/50">you need.</span></h2>
          <p className="mt-2 text-muted-foreground">A curated set of features that work together — and demo themselves.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <Card key={t}><CardContent className="space-y-1.5 pt-6"><div className="font-semibold">{t}</div><p className="text-sm text-muted-foreground">{d}</p></CardContent></Card>
          ))}
        </div>
      </section>

      {/* BENTO — the meta proof */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2 sm:row-span-2 bg-muted/30">
          <CardContent className="flex h-full flex-col justify-center gap-3 py-10">
            <Badge variant="secondary" className="w-fit">The meta bit</Badge>
            <h3 className="text-2xl font-semibold tracking-tight">Every feature demoed on itself.</h3>
            <p className="max-w-md text-muted-foreground">The storefront runs the storefront engine. The checkout charges for the checkout. Buying Pro unlocks the source using the entitlement system you just paid for.</p>
            <Button className="w-fit" variant="outline" onClick={() => navigate("/products")}>Browse the catalog →</Button>
          </CardContent>
        </Card>
        <Card><CardContent className="py-8"><div className="text-3xl font-bold">18</div><p className="text-sm text-muted-foreground">hosted kinds, each declared in git</p></CardContent></Card>
        <Card><CardContent className="py-8"><div className="text-3xl font-bold">$0</div><p className="text-sm text-muted-foreground">frontend hosting (static on Pages)</p></CardContent></Card>
      </section>

      {/* PRICING */}
      <section id="pricing" className="space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight">Choose your tier.</h2>
          <p className="mt-2 text-muted-foreground">Frontend or full-stack. Test mode — card 4242 4242 4242 4242.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const owns = tier.key && owned.includes(tier.key);
            return (
              <Card key={tier.name} className={tier.popular ? "border-primary ring-1 ring-primary/30" : ""}>
                <CardContent className="flex h-full flex-col gap-4 pt-6">
                  {tier.popular && <Badge className="w-fit">Most Popular</Badge>}
                  <div>
                    <div className="font-semibold">{tier.name}</div>
                    <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                  </div>
                  <div className="text-2xl font-bold">{cat && tier.key ? money(Object.values(cat.products[tier.key]?.prices ?? {})[0]?.amountCents ?? 0) : tier.price}</div>
                  <ul className="flex-1 space-y-1 text-sm">{tier.perks.map((p) => <li key={p} className="flex gap-1.5 text-muted-foreground"><span className="text-primary">✓</span>{p}</li>)}</ul>
                  <Button variant={tier.popular ? "default" : "outline"} disabled={!!owns || busy === tier.key}
                    onClick={() => tier.key ? purchase(tier.key) : navigate(tier.name.includes("Pro") ? "/login" : "/products")}>
                    {owns ? "Owned ✓" : busy === tier.key ? "…" : tier.key ? (user ? tier.cta : "Sign in to buy") : tier.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="space-y-8">
        <h2 className="text-center text-4xl font-bold tracking-tight">Developers <span className="text-muted-foreground/50">love it.</span></h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map(([quote, name, role]) => (
            <Card key={name}><CardContent className="space-y-4 pt-6"><p className="text-sm">"{quote}"</p><div><div className="text-sm font-medium">{name}</div><div className="text-xs text-muted-foreground">{role}</div></div></CardContent></Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl space-y-3">
        <h2 className="text-center text-4xl font-bold tracking-tight">Questions.</h2>
        {FAQS.map(([q, a]) => (
          <Card key={q}><CardContent className="space-y-1 pt-5"><div className="font-medium">{q}</div><p className="text-sm text-muted-foreground">{a}</p></CardContent></Card>
        ))}
      </section>

      {/* FINAL CTA */}
      <section className="rounded-2xl border bg-primary/5 p-12 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Start shipping <span className="text-muted-foreground/50">today.</span></h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">14-day money-back guarantee. The template that sells itself is one checkout away.</p>
        <Button size="lg" className="mt-6" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Get saastarter2</Button>
      </section>
    </div>
  );
}
