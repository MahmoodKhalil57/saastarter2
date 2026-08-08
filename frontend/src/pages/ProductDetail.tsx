import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge, Button, Card, CardContent } from "hono-aep-ui";
import { addToCart, money, product, track, type CatalogProduct } from "../store";
import { useSession } from "../auth";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [p, setP] = useState<CatalogProduct | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    void product(slug!).then((prod) => {
      setP(prod);
      if (prod) void track("product_viewed", { product_id: prod.slug, name: prod.name, price_cents: prod.price_cents, category: prod.category });
    });
  }, [slug]);

  if (p === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (p === null) return <p className="text-muted-foreground">Not found. <Link to="/products" className="underline">Back to catalog</Link></p>;

  const add = async () => {
    setBusy(true);
    const r = await addToCart(p.slug);
    setBusy(false);
    if ("needsAuth" in r) return navigate("/login?next=/products/" + p.slug);
    setAdded(true);
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
        <div className="flex items-center gap-3">
          <Button size="lg" disabled={busy} onClick={add}>
            {busy ? "…" : user ? "Add to cart" : "Sign in to add"}
          </Button>
          {added && <Button size="lg" variant="outline" onClick={() => navigate("/cart")}>View cart →</Button>}
        </div>
        {added && <p className="text-sm text-muted-foreground">Added ✓ — the cart total is derived server-side from live prices.</p>}
        <p className="text-xs text-muted-foreground">This product is row <code>{p.path}</code> in a public hosted collection.</p>
      </div>
    </div>
  );
}
