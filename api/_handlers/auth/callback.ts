import type { VercelRequest, VercelResponse } from "@vercel/node";
import { allowMethods } from "../../_lib/http";
import { createSupabase } from "../../_lib/session";

// GET ?code=... after Google. Swaps the code (plus the PKCE verifier cookie)
// for a session. Always lands on "/", never on a URL from the query.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "private, no-store");
  const { code } = req.query;
  if (typeof code !== "string") {
    res.redirect(302, "/login?error=sign_in_cancelled");
    return;
  }
  const { error } = await createSupabase(req, res).auth.exchangeCodeForSession(
    code,
  );
  if (error) {
    res.redirect(302, "/login?error=sign_in_failed");
    return;
  }
  res.redirect(302, "/");
};

export default handler;
