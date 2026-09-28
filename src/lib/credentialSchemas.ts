import { z } from "zod";

// Shared by /api/credentials and the settings form.

const providerSchema = z.enum(["growatt", "octopus"]);

const growattCredentialsSchema = z.object({
  provider: z.literal("growatt"),
  user: z.string().trim().min(1, "Enter your Growatt username").max(100),
  password: z.string().min(1, "Enter your Growatt password").max(100),
  serial: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,20}$/, "Check the inverter serial number"),
});

const octopusCredentialsSchema = z.object({
  provider: z.literal("octopus"),
  apiKey: z
    .string()
    .trim()
    .regex(
      /^sk_live_[A-Za-z0-9]{16,64}$/,
      "Octopus API keys start with sk_live_",
    ),
  account: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^A-[0-9A-F]{8}$/, "Account numbers look like A-1234ABCD"),
});

const credentialsSchema = z.discriminatedUnion("provider", [
  growattCredentialsSchema,
  octopusCredentialsSchema,
]);

export { providerSchema, credentialsSchema };
