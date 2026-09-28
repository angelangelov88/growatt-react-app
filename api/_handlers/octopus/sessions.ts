import { fetchSavingSessions } from "../../../src/lib/savingSessions";
import type { Handler } from "../../../src/types/Server";
import { allowMethods, sendError } from "../../_lib/http";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// GET → SavingSessions: Power Down events, and the ones the user joined.
const handler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  const octopus = await connectOctopus(user.userId, res);
  if (!octopus) return;
  try {
    // Dates go out as ISO strings.
    res.json(await fetchSavingSessions(octopus.token, octopus.account));
  } catch (err) {
    console.error("octopus sessions failed:", octopusMessage(err));
    sendError(res, 502, "octopus_failed", octopusMessage(err));
  }
};

export default handler;
