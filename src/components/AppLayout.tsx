import { Link, Outlet, ScrollRestoration } from "react-router";
import AppLogo from "./AppLogo";
import BetaBadge from "./BetaBadge";
import HeaderNav from "./HeaderNav";
import LegalLinks from "./LegalLinks";
import Wordmark from "./Wordmark";

// The frame around every page, signed in or not. The header stays at the top
// while the page scrolls; toasts (z-50) stay above it. The footer sits at the
// end of the page, or at the bottom of the screen on short pages. Pages that
// fill the width need w-full, as this is a flex column.
const AppLayout = () => (
  <div className="min-h-dvh flex flex-col bg-gray-950 text-gray-100">
    {/* Opens each new page at the top, and restores the position on Back. */}
    <ScrollRestoration />
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
      <Link
        to="/"
        className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
      >
        <AppLogo className="size-7 shrink-0" />
        <Wordmark />
        <BetaBadge />
      </Link>
      <HeaderNav />
    </header>
    <div className="flex-1 flex flex-col">
      <Outlet />
    </div>
    <footer className="pb-8">
      <LegalLinks />
    </footer>
  </div>
);

export default AppLayout;
