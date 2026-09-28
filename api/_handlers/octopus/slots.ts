import { fetchPlannedDispatches } from "../../../src/lib/octopusApi";
import type { OctopusSlots } from "../../../src/types/Api";
import type { Handler } from "../../../src/types/Server";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { connectOctopus, octopusMessage } from "./connect";

// GET → OctopusSlots: Intelligent Octopus's planned charging slots.
const handler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await rateLimit(res, "octopusRead", user.userId))) return;
  const octopus = await connectOctopus(user.userId, res);
  if (!octopus) return;
  try {
    const slots: OctopusSlots = {
      plannedDispatches: await fetchPlannedDispatches(
        octopus.token,
        octopus.account,
      ),
    };
    res.json(slots);
  } catch (err) {
    console.error("octopus slots failed:", octopusMessage(err));
    sendError(res, 502, "octopus_failed", octopusMessage(err));
  }
};

export default handler;
