import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkOrigin } from "../_lib/csrf";
import { allowMethods } from "../_lib/http";
import { createSupabase } from "../_lib/session";

// POST → 204. Revokes this session's refresh token and clears the cookies.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");
  await createSupabase(req, res).auth.signOut({ scope: "local" });
  res.status(204).end();
};

export default handler;
