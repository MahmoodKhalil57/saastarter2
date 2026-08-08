import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge, Button, Card, CardContent } from "hono-aep-ui";
import { buy, entitlements, money, product, type CatalogProduct } from "../store";
import { useSession } from "../auth";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [p, setP] = useState<CatalogProduct | null | undefined>(undefined);
  const [owned, setOwned] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void product(slug!).then(setP); void entitlements().then(setOwned); }, [slug, user]);

  if (p === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (p === null) return <p className="text-muted-foreground">Not found. <Link to="/products" className="underline">Back to catalog</Link></p>;

  // The saastarter2 product itself maps to the Lifetime license; others are add-ons.
  const buyable = p.slug === "saastarter2" ? "lifetime" : p.slug === "billing-kit" ? "pro" : null;
  const owns = buyable && owned.includes(buyable);

  const purchase = async () => {
    if (!buyable) return;
    setBusy(true); const r = await buy(buyable); setBusy(false);
    if (r.needsAuth) return navigate("/login?buy=" + buyable);
    if (r.redirect) return void (window.location.href = r.redirect);
    if (r.owned) void entitlements().then(setOwned);
  };

  return (
    <div className="grid gap-8 pb-16 pt-6 md:grid-cols-2">
      <Card className="flex aspect-square items-center justify-center bg-muted/30">
        <CardContent className="text-center">
          <div className="text-6xl">{p.category === "starter" ? "🛍️" : p.category === "theme" ? "🎨" : p.category === "plugin" ? "🔌" : "🧩"}</div>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{p.category}</p>
        </CardContent>
      </Card>
      <div className="space-y-5">
        <div>
          {p.featured && <Badge variant="secondary" className="mb-2">Featured</Badge>}
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{p.tagline}</p>
        </div>
        <p className="leading-relaxed">{p.description}</p>
        <div className="text-3xl font-bold">{p.price_cents ? money(p.price_cents) : "Free"}</div>
        {buyable ? (
          <Button size="lg" disabled={busy || !!owns} onClick={purchase}>
            {owns ? "You own this ✓" : busy ? "…" : user ? "Buy now" : "Sign in to buy"}
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled>Included with Pro</Button>
        )}
        {owns && <p className="text-sm">Unlocked — <Link to="/account" className="text-primary underline">get your source →</Link></p>}
        <p className="text-xs text-muted-foreground">This product is row <code>{p.path}</code> in a public hosted collection.</p>
      </div>
    </div>
  );
}
