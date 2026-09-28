import { z } from "zod";

// Shared by /api/settings and the settings form.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

const settingsSchema = z
  .object({
    // The fixed overnight charge window, UK time.
    chargeStart: time,
    chargeEnd: time,
    // Let the scheduled job apply Octopus slots to the inverter.
    automationEnabled: z.boolean(),
  })
  // HH:MM strings sort like times. The charge plan can't cross midnight yet.
  .refine((s) => s.chargeStart < s.chargeEnd, {
    message: "The window must end after it starts, before midnight",
    path: ["chargeEnd"],
  });

// Until the user saves their own. Matches the window in chargePlan.ts.
const defaultSettings: z.infer<typeof settingsSchema> = {
  chargeStart: "01:00",
  chargeEnd: "05:00",
  automationEnabled: false,
};

export { settingsSchema, defaultSettings };
