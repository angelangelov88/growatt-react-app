import { z } from "zod";

// Shared by /api/octopus/join and the Power Down card.
const joinSchema = z.object({
  // A Power Down event's code, as /api/octopus/sessions lists it.
  eventCode: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Unknown session"),
});

export { joinSchema };
