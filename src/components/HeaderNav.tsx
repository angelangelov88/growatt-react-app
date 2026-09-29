import { Link } from "react-router";
import useAuth from "../features/auth/useAuth";
import useLogout from "../features/auth/useLogout";

const LINK = "text-sm text-gray-300 hover:text-white shrink-0";
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

  return (
    <nav aria-label="Account" className="flex items-center gap-4 min-w-0">
      {status === "signedIn" && (
        <>
          {me?.email && (
            <span className="text-sm text-gray-400 truncate">{me.email}</span>
          )}
          <Link to="/settings" className={LINK}>
            Settings
          </Link>
        </>
      )}
      <button
        onClick={() => {
          logout.mutate();
        }}
        disabled={logout.isPending}
        className={BUTTON}
      >
        {logout.isPending ? "Logging out…" : "Log out"}
      </button>
    </nav>
  );
};

export default HeaderNav;
