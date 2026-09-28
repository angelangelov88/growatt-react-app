import { isIP } from "node:net";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiError } from "../../src/types/Api";

// Every error has the same shape, and never includes internal details. Errors
// can come before requireUser (bad origin, rate limit), so they set no-store
// here: Vercel's default for function replies lets caches keep them.
const sendError = (
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
) => {
  res.setHeader("Cache-Control", "private, no-store");
  const body: ApiError = { code, message };
  res.status(status).json(body);
};

// Responds 405 unless the request uses one of the given methods.
const allowMethods = (
  req: VercelRequest,
  res: VercelResponse,
  methods: string[],
) => {
  if (methods.includes(req.method ?? "")) return true;
  res.setHeader("Allow", methods.join(", "));
  sendError(res, 405, "method_not_allowed", "Method not allowed");
  return false;
};

// Vercel sets x-real-ip to the caller's address, and callers can't override it.
const clientIp = (req: VercelRequest) => {
  const ip = req.headers["x-real-ip"];
  return typeof ip === "string" && isIP(ip) ? ip : null;
};

export { sendError, allowMethods, clientIp };
