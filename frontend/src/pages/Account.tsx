import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { signOut, useSession } from "../auth";
import { entitlements } from "../store";

export function AccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [owned, setOwned] = useState<string[] | null>(null);
  useEffect(() => {
    if (user) void entitlements().then(setOwned);
  }, [user]);

  if (user === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (user === null) { navigate("/login"); return null; }
  const hasPro = (owned ?? []).includes("pro");

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-16">
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">License:</span>
            {owned === null ? <span>…</span> : hasPro ? (
              <Badge>{(owned ?? []).includes("lifetime") ? "Lifetime" : "Pro"}</Badge>
            ) : <Badge variant="outline">Free</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin")}>Open admin</Button>
            <Button variant="ghost" onClick={() => { signOut(); navigate("/"); }}>Sign out</Button>
          </div>
        </CardContent>
      </Card>

      {/* The self-aware unlock: owning Pro reveals the source. */}
      <Card className={hasPro ? "border-primary ring-1 ring-primary/30" : "opacity-70"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Your source {hasPro ? "🔓" : "🔒"}</CardTitle>
          <CardDescription>
            {hasPro
              ? "You own it — the entitlement you bought unlocked this panel."
              : "Buy Pro to unlock. This lock is a real entitlement check, not a paywall image."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPro ? (
            <a className="inline-flex" href="https://github.com/MahmoodKhalil57/saastarter2" target="_blank" rel="noreferrer">
              <Button>Get the repository →</Button>
            </a>
          ) : (
            <Button onClick={() => navigate("/#pricing")}>See pricing</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
