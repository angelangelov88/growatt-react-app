import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Handler } from "../../src/types/Server";
import { sendError } from "./http";

// Builds one Vercel function that serves several endpoints, picked by the last
// part of the path: /api/auth/login runs handlers.login. Read from the URL
// rather than req.query, so a ?action= query parameter can't change it.
const createRouter =
  (handlers: Record<string, Handler>) =>
  async (req: VercelRequest, res: VercelResponse) => {
    // No reply from these endpoints should be cached; handlers can override it.
    res.setHeader("Cache-Control", "private, no-store");
    const name = new URL(req.url ?? "/", "http://localhost").pathname
      .split("/")
      .at(-1);
    const handler =
      name && Object.hasOwn(handlers, name) ? handlers[name] : undefined;
    if (!handler) {
      sendError(res, 404, "not_found", "Not found");
      return;
    }
    await handler(req, res);
  };

export { createRouter };
