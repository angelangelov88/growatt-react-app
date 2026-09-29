import { z } from "zod";
import type { Handler } from "../../../src/types/Server";
import { checkUser } from "../../_lib/automation";
import { isCronRequest } from "../../_lib/cronAuth";
import { allowMethods, sendError } from "../../_lib/http";

const bodySchema = z.object({ userId: z.uuid() });

// POST { userId } with Authorization: Bearer <CRON_SECRET> → { result }. One
// automation check for one user. Supabase's pg_cron sends one of these per
// user every 5 minutes (private.schedule_automation), so each gets its own
// function and its own 60 seconds.
const cronUserHandler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!isCronRequest(req)) {
    sendError(res, 401, "unauthorized", "Unauthorized");
    return;
  }
  const body = bodySchema.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "invalid_input", "Invalid input");
    return;
  }
  const { result } = await checkUser(body.data.userId, "schedule");
  res.json({ result });
};

export { cronUserHandler };
