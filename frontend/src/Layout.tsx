import { Link, NavLink, Outlet } from "react-router";
import { useSession } from "./auth";
import { cartCount, useCart } from "./cart";
import { useTheme } from "./theme";
import { getLocale, setLocale } from "./locale";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground";

export function Layout() {
  const { user } = useSession();
  const { cart } = useCart();
  const count = cartCount(cart);
  const { dark, toggle } = useTheme();
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
          <NavLink to={user && !user.isAnonymous ? "/account" : "/login"} className={navLinkClass}>
            {user && !user.isAnonymous
              ? user.image
                ? <span className="inline-flex items-center gap-1.5"><img src={user.image} alt="" className="h-5 w-5 rounded-full border object-cover" />Account</span>
                : "Account"
              : "Sign in"}
          </NavLink>
          <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="text-muted-foreground hover:text-foreground">
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            onClick={() => setLocale(getLocale() === "en" ? "ar" : "en")}
            aria-label="Switch language"
            title={getLocale() === "en" ? "التبديل إلى العربية" : "Switch to English"}
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            {getLocale() === "en" ? "ع" : "EN"}
          </button>
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
