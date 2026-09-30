import type { BatterySoc } from "../../../src/types/Api";
import type { Handler } from "../../../src/types/Server";
import { checkOrigin } from "../../_lib/csrf";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { loadGrowatt } from "../../_lib/userConfig";
import { growattMessage } from "./periods";

// GET → BatterySoc: how full the battery is now, for Export until battery %.
// Growatt's copy, which it updates about every 5 minutes.
const handler: Handler = async (req, res) => {
  if (!allowMethods(req, res, ["GET"]) || !checkOrigin(req, res)) return;
  const user = await requireUser(req, res);
  if (!user) return;
  if (!(await rateLimit(res, "growattRead", user.userId))) return;
  const growatt = await loadGrowatt(user.userId);
  if (!growatt) {
    sendError(
      res,
      409,
      "growatt_not_set_up",
      "Add your Growatt details in Settings first",
    );
    return;
  }
  const { client, serial } = growatt;
  try {
    await client.login();
  } catch {
    sendError(
      res,
      502,
      "growatt_login_failed",
      "Couldn't log in to Growatt. If you changed your Growatt password, update it in Settings",
    );
    return;
  }
  try {
    const body: BatterySoc = { soc: await client.fetchBatterySoc(serial) };
    res.json(body);
  } catch (err) {
    console.error("growatt battery read failed:", growattMessage(err));
    sendError(res, 502, "growatt_failed", growattMessage(err));
  }
};

export default handler;
