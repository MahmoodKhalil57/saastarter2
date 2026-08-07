import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from "hono-aep-ui";
import { config } from "../config";

/**
 * The founding constraint, kept on purpose: this is a PLAIN form POST to
 * /submit/{key} — no JavaScript in the submit path. `_redirect` brings
 * the browser back here; `_botcheck` is the honeypot.
 */
export function ContactPage() {
  const thanks =
    typeof window !== "undefined" && window.location.search.includes("sent=1");
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Contact</CardTitle>
        <CardDescription>
          {thanks ? "Thanks — your message is in. We emailed you a confirmation." : "We read everything."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={`${config.endpoint}/submit/${config.contactFormKey}`} method="POST" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" name="_replyto" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-message">Message</Label>
            <Textarea id="c-message" name="message" rows={5} required />
          </div>
          <input type="hidden" name="_redirect" value={`${window.location.origin}${window.location.pathname}?sent=1`} />
          <input className="absolute -left-[9999px]" name="_botcheck" tabIndex={-1} autoComplete="off" />
          <Button type="submit" className="w-full">
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
