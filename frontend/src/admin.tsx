import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { AepUiProvider, shadcnKit } from "hono-aep-ui";
import { adminClient, projectDocUrl } from "./admin-client";
import { useSession } from "./auth";

/**
 * The white-label admin (site.md §3): the SAME contract-driven admin the
 * dashboard uses (hono-aep-ui AdminPages), mounted inside this static SPA
 * behind the pool session and restyled by the project's own theme through
 * the base contract. Its data layer is the bearer-authed project client;
 * its model is the per-project OpenAPI document.
 */

const adminKit = shadcnKit({});

export function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (user === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (user === null) return <Navigate to="/login" replace />;
  return (
    <AepUiProvider config={{ components: adminKit, client: adminClient, docUrl: projectDocUrl }}>
      {children}
    </AepUiProvider>
  );
}
