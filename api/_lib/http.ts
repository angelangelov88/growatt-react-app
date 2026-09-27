import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiError } from "../../src/types/Api";

// Every error has the same shape, and never includes internal details.
const sendError = (
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
) => {
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

export { sendError, allowMethods };
