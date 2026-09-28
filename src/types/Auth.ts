import type { ReactNode } from "react";

// Where the user is in logging in, from GET /api/auth/me.
// needsMfa: logged in with a password or Google, but they have an
// authenticator app and haven't entered its code yet.
type AuthStatus = "loading" | "error" | "signedOut" | "needsMfa" | "signedIn";

type AuthRouteProps = { allow: AuthStatus[] };

type AuthCardProps = { title: string; children: ReactNode };

type AuthLinkProps = { to: string; disabled?: boolean; children: ReactNode };

type GoogleButtonProps = { disabled?: boolean };

type ServerUnavailableProps = { onRetry: () => void; isRetrying: boolean };

export type {
  AuthStatus,
  AuthRouteProps,
  AuthCardProps,
  AuthLinkProps,
  GoogleButtonProps,
  ServerUnavailableProps,
};
