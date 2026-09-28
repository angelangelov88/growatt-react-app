import type { VercelRequest } from "@vercel/node";

// The addresses this deployment is served from. Production and vercel dev use
// APP_ORIGIN (the custom domain, or http://localhost:3000). Preview deployments
// have no fixed address, so they also accept the ones Vercel sets for them:
// VERCEL_URL (this deployment) and VERCEL_BRANCH_URL (the branch's latest).
// These come from Vercel, never from the request, so a caller can't add one.
const { APP_ORIGIN, VERCEL_ENV, VERCEL_URL, VERCEL_BRANCH_URL } = process.env;

const previewOrigins =
  VERCEL_ENV === "preview"
    ? [VERCEL_BRANCH_URL, VERCEL_URL]
        .filter((host): host is string => !!host)
        .map((host) => `https://${host}`)
    : [];

const origins = [APP_ORIGIN, ...previewOrigins].filter(
  (origin): origin is string => !!origin,
);
if (origins.length === 0)
  throw new Error("APP_ORIGIN must be set (outside preview deployments)");

// The main address: APP_ORIGIN, or the branch's address on a preview.
const appOrigin = origins[0];

const isAppOrigin = (origin: string | undefined) =>
  origin !== undefined && origins.includes(origin);

// The address this request came in on, if it's one of ours; otherwise the main
// one. For redirects that must come back to the same host as its cookies.
const requestOrigin = (req: VercelRequest) => {
  const origin = `https://${req.headers.host ?? ""}`;
  return isAppOrigin(origin) ? origin : appOrigin;
};

export { appOrigin, isAppOrigin, requestOrigin };
