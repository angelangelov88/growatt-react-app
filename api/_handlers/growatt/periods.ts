import { periodsSchema } from "../../../src/lib/growattSchemas";
import type { PeriodsBody } from "../../../src/types/Api";
import type { SlotParam } from "../../../src/types/Growatt";
import type { Handler } from "../../../src/types/Server";
import { audit } from "../../_lib/audit";
import { checkOrigin } from "../../_lib/csrf";
import { withUser } from "../../_lib/db";
import { allowMethods, sendError } from "../../_lib/http";
import { rateLimit } from "../../_lib/rateLimit";
import { requireUser } from "../../_lib/session";
import { loadGrowatt } from "../../_lib/userConfig";

type Kind = "charge" | "discharge";

// Growatt's and our own error messages are fine to show; an HTML error page isn't.
const growattMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";
  return message && !message.startsWith("Unexpected response")
    ? message.slice(0, 200)
    : "The inverter didn't respond, try again";
};

const toSlotParam = ({ start, end }: PeriodsBody["slots"][number]) => ({
  startHour: start.slice(0, 2),
  startMin: start.slice(3, 5),
  endHour: end.slice(0, 2),
  endMin: end.slice(3, 5),
});

// /api/growatt/charge (Battery First) and /api/growatt/discharge (Grid First).
// GET → ChargePeriods, read from the inverter (takes 5–15s).
// PUT PeriodsBody → 204. Writes them; every attempt is recorded in audit_log.
const periodsHandler =
  (kind: Kind): Handler =>
  async (req, res) => {
    if (!allowMethods(req, res, ["GET", "PUT"]) || !checkOrigin(req, res))
      return;
    const user = await requireUser(req, res);
    if (!user) return;
    const limit = req.method === "PUT" ? "growattWrite" : "growattRead";
    if (!(await rateLimit(res, limit, user.userId))) return;

    let body: PeriodsBody | null = null;
    if (req.method === "PUT") {
      const parsed = periodsSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(
          res,
          400,
          "invalid_input",
          parsed.error.issues[0]?.message ?? "Invalid input",
        );
        return;
      }
      body = parsed.data;
    }

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

    if (!body) {
      try {
        res.json(
          kind === "charge"
            ? await client.fetchChargePeriods(serial)
            : await client.fetchDischargePeriods(serial),
        );
      } catch (err) {
        console.error(`growatt ${kind} read failed:`, growattMessage(err));
        sendError(res, 502, "growatt_failed", growattMessage(err));
      }
      return;
    }

    const { powerRate, stopSOC, slots } = body;
    const p: SlotParam[] = Array.from({ length: 6 }, (_, i) => {
      const slot = slots.at(i);
      return slot ? toSlotParam(slot) : null;
    });
    const write =
      kind === "charge" ? client.setChargePeriods : client.setDischargePeriods;
    let failure: unknown = null;
    try {
      await write(
        serial,
        String(powerRate),
        String(stopSOC),
        p[0],
        p[1],
        p[2],
        p[3],
        p[4],
        p[5],
      );
    } catch (err) {
      failure = err ?? new Error("Write failed");
    }
    await withUser(user.userId, (tx) =>
      audit(tx, req, user.userId, "growatt_write", {
        kind,
        ok: !failure,
        powerRate,
        stopSOC,
        slots: slots.map((s) => `${s.start}-${s.end}`).join(", "),
      }),
    );
    if (failure) {
      console.error(`growatt ${kind} write failed:`, growattMessage(failure));
      sendError(res, 502, "growatt_failed", growattMessage(failure));
      return;
    }
    res.status(204).end();
  };

export { growattMessage, periodsHandler };
