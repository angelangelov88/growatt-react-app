import type { VercelResponse } from "@vercel/node";
import { OctopusError, obtainToken } from "../../../src/lib/octopusApi";
import { sendError } from "../../_lib/http";
import { loadOctopus } from "../../_lib/userConfig";

// Octopus's own error messages are fine to show; timeouts and HTML error pages aren't.
const octopusMessage = (err: unknown) =>
  err instanceof OctopusError
    ? err.message.slice(0, 200)
    : "Octopus didn't respond, try again";

// The user's account number and a fresh Kraken token. On failure, sends the
// error and returns null.
const connectOctopus = async (userId: string, res: VercelResponse) => {
  const octopus = await loadOctopus(userId);
  if (!octopus) {
    sendError(
      res,
      409,
      "octopus_not_set_up",
      "Add your Octopus details in Settings first",
    );
    return null;
  }
  try {
    return {
      account: octopus.account,
      token: await obtainToken(octopus.apiKey),
    };
  } catch (err) {
    if (err instanceof OctopusError)
      sendError(
        res,
        502,
        "octopus_key_failed",
        "Octopus didn't accept your saved API key. If you replaced it, update it in Settings",
      );
    else sendError(res, 502, "octopus_failed", octopusMessage(err));
    return null;
  }
};

export { connectOctopus, octopusMessage };
