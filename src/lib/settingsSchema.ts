import { z } from "zod";

// Shared by /api/settings and the settings form.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

const settingsSchema = z
  .object({
    // The fixed overnight charge window, UK time.
    chargeStart: time,
    chargeEnd: time,
    // Percent of the inverter's maximum power used for AC charging.
    powerRate: z.int().min(1, "At least 1%").max(100, "At most 100%"),
    // Stop charging from the grid at this battery level, in percent.
    stopSOC: z.int().min(1, "At least 1%").max(100, "At most 100%"),
    // Let the scheduled job apply Octopus slots to the inverter.
    automationEnabled: z.boolean(),
  })
  // HH:MM strings sort like times. The charge plan can't cross midnight yet.
  .refine((s) => s.chargeStart < s.chargeEnd, {
    message: "The window must end after it starts, before midnight",
    path: ["chargeEnd"],
  });

// Until the user saves their own. Matches the values in chargePlan.ts.
const defaultSettings: z.infer<typeof settingsSchema> = {
  chargeStart: "01:00",
  chargeEnd: "05:00",
  powerRate: 35,
  stopSOC: 95,
  automationEnabled: false,
};

export { settingsSchema, defaultSettings };
