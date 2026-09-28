import { Link, Outlet } from "react-router";
import useAuth from "../features/auth/useAuth";
import useLogout from "../features/auth/useLogout";
import AppLogo from "./AppLogo";
import LegalLinks from "./LegalLinks";
import Wordmark from "./Wordmark";

// The frame around every page for a logged-in user.
const AppLayout = () => {
  const { me } = useAuth();
  const logout = useLogout();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Stays at the top while the page scrolls; toasts (z-50) stay above. */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
        >
          <AppLogo className="size-7 shrink-0" />
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4 min-w-0">
          {me?.email && (
            <span className="text-sm text-gray-400 truncate">{me.email}</span>
          )}
          <Link
            to="/settings"
            className="text-sm text-gray-300 hover:text-white shrink-0"
          >
            Settings
          </Link>
          <button
            onClick={() => {
              logout.mutate();
            }}
            disabled={logout.isPending}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {logout.isPending ? "Logging out…" : "Log out"}
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="pb-8">
        <LegalLinks />
      </footer>
    </div>
  );
};

export default AppLayout;
