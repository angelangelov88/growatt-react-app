import { z } from "zod";
import { percentSchema, timeSchema } from "./settingsSchema";

// Shared by /api/growatt/* and the Battery First / Grid First forms. Every
// value ends up as a Growatt parameter, so each one is checked strictly.

// A slot may cross midnight (end before start).
const slotSchema = z.object({ start: timeSchema, end: timeSchema });

const periodsSchema = z.object({
  powerRate: percentSchema,
  stopSOC: percentSchema,
  // Enabled slots in order; the rest are turned off. None turns them all off.
  slots: z.array(slotSchema).max(6, "The inverter has 6 slots"),
});

export { periodsSchema };
