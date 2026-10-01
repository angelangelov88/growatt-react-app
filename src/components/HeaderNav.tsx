import { Link } from "react-router";
import useAuth from "../features/auth/useAuth";
import useLogout from "../features/auth/useLogout";
import AccountMenu from "./AccountMenu";

const LINK = "text-sm text-gray-300 hover:text-strong shrink-0";
const BUTTON =
  "px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0";

// The right side of the header: account links when signed in, log in and
// sign up when not. Empty while the app is still finding out.
const HeaderNav = () => {
  const { me, status } = useAuth();
  const logout = useLogout();

  if (status === "signedOut")
    return (
      <nav aria-label="Account" className="flex items-center gap-4">
        <Link to="/login" className={LINK}>
          Log in
        </Link>
        <Link to="/signup" className={BUTTON}>
          Sign up
        </Link>
      </nav>
    );
  if (status !== "signedIn" && status !== "needsMfa") return null;

  const handleLogout = () => {
    logout.mutate();
  };
  const logoutButton = (
    <button
      onClick={handleLogout}
      disabled={logout.isPending}
      className={BUTTON}
    >
      {logout.isPending ? "Logging out…" : "Log out"}
    </button>
  );

  if (status === "needsMfa")
    return (
      <nav aria-label="Account" className="flex items-center">
        {logoutButton}
      </nav>
    );

  // Below sm the links don't fit next to the logo, so they go in a menu.
  return (
    <nav aria-label="Account" className="min-w-0">
      <div className="hidden sm:flex items-center gap-4 min-w-0">
        {me?.email && (
          <span className="text-sm text-gray-400 truncate">{me.email}</span>
        )}
        <Link to="/" className={LINK}>
          Dashboard
        </Link>
        <Link to="/activity" className={LINK}>
          Activity
        </Link>
        <Link to="/settings" className={LINK}>
          Settings
        </Link>
        {logoutButton}
      </div>
      <div className="sm:hidden">
        <AccountMenu
          email={me?.email}
          onLogout={handleLogout}
          isLoggingOut={logout.isPending}
        />
      </div>
    </nav>
  );
};

export default HeaderNav;
