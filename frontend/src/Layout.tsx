import { Link, NavLink, Outlet } from "react-router";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground";

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          saastarter2
        </Link>
        <nav className="flex gap-5 text-sm">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/blog" className={navLinkClass}>
            Blog
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-xs text-muted-foreground">
        Static site on GitHub Pages · backend by mizan-gpp · declared in git
      </footer>
    </div>
  );
}
