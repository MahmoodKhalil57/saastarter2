import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, CardContent } from "hono-aep-ui";
import { postReview, reviewsFor, type Review } from "../store";
import { useSession } from "../auth";

const Stars = ({ n }: { n: number }) => (
  <span aria-label={`${n} of 5`} className="text-amber-500">{"★".repeat(n)}<span className="text-muted-foreground">{"★".repeat(5 - n)}</span></span>
);

/** Product reviews — backed entirely by the `reviews` hosted collection.
 *  No review table, no API, no moderation code in the app: public list +
 *  authenticated create + owner edit are the collection's declared policy. */
export function ProductReviews({ product }: { product: string }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => void reviewsFor(product).then(setReviews);
  useEffect(refresh, [product]);

  const submit = async () => {
    setBusy(true);
    const r = await postReview({ product, rating, title, body, author_name: user?.name ?? "Anonymous" });
    setBusy(false);
    if ("needsAuth" in r) return navigate(`/login?next=/products/${product}`);
    setTitle(""); setBody(""); setRating(5); refresh();
  };

  const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-12 border-t pt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reviews</h2>
        {reviews && reviews.length > 0 && (
          <span className="text-sm text-muted-foreground"><Stars n={Math.round(avg)} /> {avg.toFixed(1)} · {reviews.length}</span>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {reviews === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
        ) : (
          reviews.map((r) => (
            <Card key={r.path ?? `${r.created_by}-${r.title}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.title || "Review"}</span>
                  <Stars n={r.rating} />
                </div>
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                <p className="mt-2 text-xs text-muted-foreground">— {r.author_name || "Anonymous"}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-3 py-5">
          <h3 className="font-medium">Write a review</h3>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-500" : "text-muted-foreground/40"}`} aria-label={`${n} star`}>★</button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <Button disabled={busy || (!title && !body)} onClick={submit}>{busy ? "…" : "Post review"}</Button>
        </CardContent>
      </Card>
    </section>
  );
}
