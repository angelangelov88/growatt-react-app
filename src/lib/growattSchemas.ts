import { z } from "zod";
import { percentSchema, timeSchema } from "./settingsSchema";

// Shared by /api/growatt/* and the Battery First / Grid First forms. Every
// value ends up as a Growatt parameter, so each one is checked strictly.

// A slot may cross midnight (end before start).
const slotSchema = z.object({ start: timeSchema, end: timeSchema });

const periodsSchema = z
  .object({
    powerRate: percentSchema,
    stopSOC: percentSchema,
    // Enabled slots in order; the rest are turned off. None turns them all off.
    slots: z.array(slotSchema).max(6, "The inverter has 6 slots"),
    // Grid First only: the Export until battery % button. It isn't kept for
    // Export every day, and the 5-minute check turns it off once it ends.
    oneOff: z.literal(true).optional(),
  })
  // One slot that doesn't cross midnight, so it ends today.
  .refine(
    (p) =>
      !p.oneOff || (p.slots.length === 1 && p.slots[0].start < p.slots[0].end),
    { message: "A one-off export is one slot, ending today", path: ["slots"] },
  );

export { periodsSchema };
