import { useNavigate } from "react-router";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "hono-aep-ui";
import { signOut, useSession } from "../auth";

export function AccountPage() {
  const navigate = useNavigate();
  const { user } = useSession();

  if (user === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (user === null) {
    navigate("/login");
    return null;
  }
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Your account</CardTitle>
        <CardDescription>Signed in via the hosted auth pool (bearer session).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
        </dl>
        <Button variant="outline" onClick={() => { signOut(); navigate("/"); }}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
