import { z } from "zod";

// Shared by /api/settings and the settings form.

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");

// A whole-number percentage, as the inverter takes it.
const percentSchema = z
  .int("Use a whole number")
  .min(1, "At least 1%")
  .max(100, "At most 100%");

const settingsSchema = z
  .object({
    // Charge every night in a fixed window of the user's own. Off: only
    // Octopus slots are charged in.
    windowEnabled: z.boolean(),
    // That overnight window, UK time. Kept while windowEnabled is off.
    chargeStart: timeSchema,
    chargeEnd: timeSchema,
    // Percent of the inverter's maximum power used for AC charging.
    powerRate: percentSchema,
    // Stop charging from the grid at this battery level, in percent.
    stopSOC: percentSchema,
    // Let the scheduled job apply Octopus slots to the inverter.
    automationEnabled: z.boolean(),
  })
  // It may cross midnight (end before start), e.g. 23:30–05:30.
  .refine((s) => !s.windowEnabled || s.chargeStart !== s.chargeEnd, {
    message: "The window can't start and end at the same time",
    path: ["chargeEnd"],
  });

// The dashboard's Export to grid dropdowns go in 5% steps.
const stepSchema = percentSchema.multipleOf(5, "Use steps of 5%");

// One of the Export to grid preset buttons: what it fills the form with.
const exportPresetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Give it a name")
      .max(20, "At most 20 characters"),
    start: timeSchema,
    end: timeSchema,
    // Discharge power, percent of the inverter's maximum.
    powerRate: stepSchema,
    // Stop exporting at this battery level, in percent.
    stopSOC: stepSchema,
  })
  .refine((p) => p.start < p.end, {
    message: "It must end after it starts, before midnight",
    path: ["end"],
  });

// PUT /api/settings?part=export
const exportPresetsSchema = z.object({
  high: exportPresetSchema,
  low: exportPresetSchema,
});

// Until the user saves their own.
const defaultSettings: z.infer<typeof settingsSchema> = {
  windowEnabled: true,
  chargeStart: "23:30",
  chargeEnd: "05:30",
  powerRate: 35,
  stopSOC: 95,
  automationEnabled: false,
};

const defaultExportPresets: z.infer<typeof exportPresetsSchema> = {
  high: {
    name: "High Export",
    start: "18:00",
    end: "19:00",
    powerRate: 95,
    stopSOC: 20,
  },
  low: {
    name: "Low Export",
    start: "20:00",
    end: "22:15",
    powerRate: 60,
    stopSOC: 15,
  },
};

export {
  timeSchema,
  percentSchema,
  settingsSchema,
  exportPresetsSchema,
  defaultSettings,
  defaultExportPresets,
};
