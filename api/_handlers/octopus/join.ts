import { joinSchema } from "../../../src/lib/octopusSchemas";
import { joinSession } from "../../../src/lib/savingSessions";
import type { Handler } from "../../../src/types/Server";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// POST JoinBody → 204. Signs the account up for one Power Down session. Every
// attempt is recorded in audit_log.
const handler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const body = joinSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { eventCode } = body.data;
  const octopus = await connectOctopus(user.userId, res);
  if (!octopus) return;

  let failure: unknown = null;
  try {
    await joinSession(octopus.token, octopus.account, eventCode);
  } catch (err) {
    failure = err ?? new Error("Join failed");
  }
  await withUser(user.userId, (tx) =>
    audit(tx, req, user.userId, "octopus_join", { eventCode, ok: !failure }),
  );
  if (failure) {
    console.error("octopus join failed:", octopusMessage(failure));
    sendError(res, 502, "octopus_failed", octopusMessage(failure));
    return;
  }
  res.status(204).end();
};

export default handler;
