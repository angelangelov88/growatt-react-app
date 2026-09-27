import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendError } from "./http";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Blocks cross-site writes: browsers always send Origin on POST/PUT/DELETE,
// and another site can't fake it. SameSite=Lax cookies are the first line;
// this is the second. Returns false (and responds 403) when blocked.
const checkOrigin = (req: VercelRequest, res: VercelResponse) => {
  if (SAFE_METHODS.has(req.method ?? "GET")) return true;
  const expected = process.env.APP_ORIGIN;
  if (expected && req.headers.origin === expected) return true;
  sendError(res, 403, "bad_origin", "Request blocked");
  return false;
};

export { checkOrigin };
