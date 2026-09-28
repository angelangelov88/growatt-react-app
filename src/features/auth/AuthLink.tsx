import { Link } from "react-router";
import type { AuthLinkProps } from "../../types/Auth";

// A link between the login and sign-up pages. While a form is being sent it
// stays visible but can't be followed: an <a> without href can't be clicked or
// tabbed to.
const AuthLink = ({ to, disabled = false, children }: AuthLinkProps) =>
  disabled ? (
    <a
      aria-disabled="true"
      className="text-violet-400 opacity-40 cursor-not-allowed"
    >
      {children}
    </a>
  ) : (
    <Link to={to} className="text-violet-400 hover:underline">
      {children}
    </Link>
  );

export default AuthLink;
