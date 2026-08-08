import { Link, NavLink, Outlet } from "react-router";
import { useSession } from "./auth";
import { cartCount, useCart } from "./cart";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground";

export function Layout() {
  const { user } = useSession();
  const { cart } = useCart();
  const count = cartCount(cart);
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4">
      <header className="flex items-center justify-between py-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          saastarter2
        </Link>
        <nav className="flex gap-5 text-sm">
          <NavLink to="/" end className={navLinkClass}>Store</NavLink>
          <NavLink to="/products" className={navLinkClass}>Products</NavLink>
          <NavLink to="/changelog" className={navLinkClass}>Changelog</NavLink>
          <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
          <NavLink to="/cart" className={navLinkClass}>
            Cart{count > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">{count}</span>}
          </NavLink>
          <NavLink to={user ? "/account" : "/login"} className={navLinkClass}>
            {user ? "Account" : "Sign in"}
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-xs text-muted-foreground">
        This shop sells its own source · static on GitHub Pages · backend on Cloudflare Workers · one git repo
      </footer>
    </div>
  );
}
