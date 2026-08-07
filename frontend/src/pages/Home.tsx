import { useNavigate } from "react-router";
import { Button, Card, CardContent, CardHeader, CardTitle } from "hono-aep-ui";

const FEATURES = [
  ["Backend in git", "Collections, forms, and pages declared in hono-aep-baas-config/ — synced, never clicked together."],
  ["Zero servers", "This site is static files on GitHub Pages; the API is hosted mizan-gpp."],
  ["AEP everywhere", "Every resource follows the same contract — filters, transitions, ETags, OpenAPI, MCP."],
] as const;

export function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Build the backend in git.</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          A beginner-friendly static site — react-router + shadcn — with a real API,
          blog, and contact form behind it. No server to run, ever.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={() => navigate("/blog")}>Read the blog</Button>
          <Button variant="outline" onClick={() => navigate("/contact")}>
            Say hello
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(([title, body]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
