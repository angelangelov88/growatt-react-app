import type { VercelResponse } from "@vercel/node";
import type { ApiError } from "../../src/types/Server";

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

export { sendError };
