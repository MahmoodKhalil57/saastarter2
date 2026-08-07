import type { ComponentProps, ReactNode } from "react";
import { AepUiProvider, defaults, shadcnKit } from "hono-aep-ui";

/**
 * THE BASE COMPONENT CONTRACT (suite law 3), consumer side.
 *
 * Every component in hono-aep-ui — widgets, generated forms/tables, the
 * whole vocabulary — resolves its base primitives (Button, Input, Card,
 * Dialog, …) through live bindings, never its own copies. Overriding a
 * component HERE therefore propagates to every surface that uses it —
 * this app's pages included (they import { Button } from "hono-aep-ui",
 * the same live binding).
 *
 * Two override styles:
 * - decorate the default:   wrap `defaults.Button` (below);
 * - replace it wholesale:   pass any canonical shadcn export or a
 *   ui.shadcn.com registry drop-in (8bitcn, magicui, …).
 * Delete an override and the vendored default is back.
 */

function BrandButton(props: ComponentProps<typeof defaults.Button>) {
  return (
    <defaults.Button
      {...props}
      className={`ring-1 ring-primary/30 ring-offset-1 ${(props as { className?: string }).className ?? ""}`}
    />
  );
}

const kit = shadcnKit({ Button: BrandButton });

export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <AepUiProvider
      // client feeds the data composites (AutoForm/AutoTable); this app
      // doesn't mount any yet — wire a real client when it does.
      config={{ components: kit, client: null as never }}
    >
      {children}
    </AepUiProvider>
  );
}
