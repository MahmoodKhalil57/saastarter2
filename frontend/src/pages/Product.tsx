import { useNavigate } from "react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "hono-aep-ui";

const STACK = [
  ["hono-aep", "The AEP framework — resources, policies, transitions, OpenAPI, MCP."],
  ["Hosted collections (JIT)", "Declare a schema at runtime; it serves immediately over the contract."],
  ["Auth pools", "Per-project end users: sessions, reset, verified delete — bearer-first for static origins."],
  ["Billing (entitlements)", "Stripe checkout → a verified webhook grants entitlements that gate features."],
  ["Flags + Search + Notifications + Jobs + Webhooks", "The full suite of hosted kinds, each declared in git."],
] as const;

export function ProductPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-10 pb-16">
      <div className="space-y-3 pt-8">
        <Badge variant="secondary">The product</Badge>
        <h1 className="text-4xl font-bold tracking-tight">saastarter2 — the template that ships itself.</h1>
        <p className="max-w-2xl text-muted-foreground">
          A complete commerce starter: static react-router + shadcn frontend, an
          AEP-compliant backend on the edge, and every hosted kind wired in. It's
          not a mockup of a store — it's the store you're standing in.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>What's in the box</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {STACK.map(([name, desc]) => (
            <div key={name} className="flex flex-col gap-0.5 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-4">
              <div className="min-w-52 font-medium">{name}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={() => navigate("/#pricing")}>See pricing</Button>
        <Button variant="outline" onClick={() => navigate("/changelog")}>Read the changelog</Button>
      </div>
    </div>
  );
}
