import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "hono-aep-ui";
import { requestReset, signIn, signUp } from "../auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response =
      mode === "sign-in" ? await signIn(email, password) : await signUp(email, password, name || email);
    setBusy(false);
    if (!response.ok) {
      setError(((await response.json()) as { message?: string }).message ?? "Something went wrong.");
      return;
    }
    navigate("/account");
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>{mode === "sign-in" ? "Sign in" : "Create an account"}</CardTitle>
        <CardDescription>End-user access — powered by this project's hosted auth pool.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {mode === "sign-up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {note && <p className="text-sm text-muted-foreground">{note}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-xs">
          <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
            {mode === "sign-in" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
          {mode === "sign-in" && (
            <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={async () => { if (email) { await requestReset(email); setNote("If that email exists, a reset link is on its way."); } else setError("Enter your email first."); }}>
              Forgot password?
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
