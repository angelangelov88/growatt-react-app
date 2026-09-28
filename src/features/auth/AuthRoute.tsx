import { Navigate, Outlet, useLocation } from "react-router";
import Spinner from "../../components/Spinner";
import type { AuthRouteProps, AuthStatus } from "../../types/Auth";
import ServerUnavailable from "./ServerUnavailable";
import useAuth from "./useAuth";

// Where each kind of user belongs.
const HOME: Record<Exclude<AuthStatus, "loading" | "error">, string> = {
  signedOut: "/login",
  needsMfa: "/mfa",
  signedIn: "/",
};

// The page a signed-in user asked for before being sent to log in or enter
// their code. Kept in the history state, not the URL, so a link can't choose
// where the app goes after login.
const returnPathOf = (state: unknown) =>
  typeof state === "object" &&
  state !== null &&
  "from" in state &&
  typeof state.from === "string"
    ? state.from
    : undefined;

// Shows its child routes only to users in one of the allowed states, and sends
// everyone else to their page. Only for showing the right page: the server
// checks the session on every request.
const AuthRoute = ({ allow }: AuthRouteProps) => {
  const { status, retry, isRetrying } = useAuth();
  const location = useLocation();
  if (status === "loading")
    return (
      <div
        role="status"
        className="min-h-screen bg-gray-950 flex items-center justify-center gap-2 text-sm text-gray-400"
      >
        <Spinner />
        Loading…
      </div>
    );
  if (status === "error")
    return <ServerUnavailable onRetry={retry} isRetrying={isRetrying} />;
  if (allow.includes(status)) return <Outlet />;

  // Remember the signed-in page the user asked for, and carry it through login
  // and the MFA code: e.g. the reset-password link for a user with MFA, or a
  // bookmarked page after the session expired. Dropped by "Use a different
  // account" on the code page.
  const returnPath = allow.includes("signedIn")
    ? location.pathname + location.search
    : status === "signedOut"
      ? undefined
      : returnPathOf(location.state);
  if (status === "signedIn")
    return <Navigate to={returnPath ?? HOME.signedIn} replace />;
  return (
    <Navigate
      to={HOME[status]}
      state={returnPath ? { from: returnPath } : undefined}
      replace
    />
  );
};

export default AuthRoute;
