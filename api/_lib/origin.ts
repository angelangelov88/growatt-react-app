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

// vercel dev only: this computer on the home network (localhost, 10.x, 172.16–31.x
// or 192.168.x), so a phone on the same Wi-Fi can use `pnpm start:host` without
// changing APP_ORIGIN. vercel dev leaves VERCEL_ENV unset in functions; deployed,
// VERCEL is always "1" and NODE_ENV is production.
const isLocalDev =
  !process.env.VERCEL && process.env.NODE_ENV === "development";
const LOCAL_NETWORK =
  /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}):\d{1,5}$/;

const isAppOrigin = (origin: string | undefined) =>
  origin !== undefined &&
  (origins.includes(origin) || (isLocalDev && LOCAL_NETWORK.test(origin)));

// The address this request came in on, if it's one of ours; otherwise the main
// one. For redirects that must come back to the same host as its cookies.
const requestOrigin = (req: VercelRequest) => {
  const origin = `https://${req.headers.host ?? ""}`;
  return isAppOrigin(origin) ? origin : appOrigin;
};

export { appOrigin, isAppOrigin, requestOrigin };
