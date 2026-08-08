import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge, Button, Card, CardContent } from "hono-aep-ui";
import { money, products, searchProducts, track, type CatalogProduct } from "../store";

const CATEGORIES = ["all", "starter", "plugin", "component", "theme"] as const;

export function ProductsPage() {
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");
  const [q, setQ] = useState("");
  // Debounced hybrid search (search kind): empty query = the full catalog.
  useEffect(() => {
    const query = q.trim();
    if (!query) { void products().then(setItems); return; }
    const t = setTimeout(() => {
      void searchProducts(query).then((r) => { setItems(r); void track("products_searched", { query, results: r.length }); });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const shown = useMemo(() => (items ?? []).filter((p) => cat === "all" || p.category === cat), [items, cat]);

  return (
    <div className="space-y-8 pb-16 pt-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">The catalog</h1>
        <p className="text-muted-foreground">Every product here is a row in a hosted collection — the same engine this store sells.</p>
      </div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search — hybrid lexical + semantic (try “payments”)"
        className="w-full max-w-md rounded-md border bg-background px-3 py-2 text-sm"
        aria-label="Search products"
      />
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={c === cat ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>
        ))}
      </div>
      {items === null ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <Link key={p.path} to={`/products/${p.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="flex h-full flex-col gap-2 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{p.name}</div>
                    {p.featured && <Badge variant="secondary">Featured</Badge>}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.price_cents ? money(p.price_cents) : "Free"}</span>
                    {p.category && <Badge variant="outline">{p.category}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
