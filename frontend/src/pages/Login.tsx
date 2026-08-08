import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "hono-aep-ui";
import { requestReset, signInWith2fa, signUp, verify2fa } from "../auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "sign-in") {
      const result = await signInWith2fa(email, password);
      setBusy(false);
      if (!result.ok) return setError("Wrong email or password.");
      if (result.twoFactor) return setChallenge(result.twoFactor); // TOTP step
    } else {
      const response = await signUp(email, password, name || email);
      setBusy(false);
      if (!response.ok) {
        setError(((await response.json()) as { message?: string }).message ?? "Something went wrong.");
        return;
      }
    }
    navigate(new URLSearchParams(location.search).get("next") ?? "/account");
  };

  if (challenge) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Two-factor code</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setError(null);
            const ok = await verify2fa(code, challenge);
            setBusy(false);
            if (!ok) return setError("Wrong code — try again.");
            navigate(new URLSearchParams(location.search).get("next") ?? "/account");
          }}>
            <Input inputMode="numeric" autoFocus placeholder="123456" value={code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>{busy ? "…" : "Verify"}</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

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
