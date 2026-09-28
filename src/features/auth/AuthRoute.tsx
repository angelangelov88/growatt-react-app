import { Navigate, Outlet } from "react-router";
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

// Shows its child routes only to users in one of the allowed states, and sends
// everyone else to their page. Only for showing the right page: the server
// checks the session on every request.
const AuthRoute = ({ allow }: AuthRouteProps) => {
  const { status, retry, isRetrying } = useAuth();
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
  if (!allow.includes(status)) return <Navigate to={HOME[status]} replace />;
  return <Outlet />;
};

export default AuthRoute;
