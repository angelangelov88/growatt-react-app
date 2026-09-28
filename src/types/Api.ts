import type { z } from "zod";
import type { loginSchema, mfaSchema, signupSchema } from "../lib/authSchemas";
import type { credentialsSchema } from "../lib/credentialSchemas";
import type { periodsSchema } from "../lib/growattSchemas";
import type { settingsSchema } from "../lib/settingsSchema";

// Shared by the api/ functions and the app.

// The JSON body of every error response.
type ApiError = {
  code: string;
  message: string;
};

type LoginBody = z.infer<typeof loginSchema>;
type SignupBody = z.infer<typeof signupSchema>;
type MfaBody = z.infer<typeof mfaSchema>;
// PUT /api/credentials. Sent once to be checked and saved; never sent back.
type CredentialsBody = z.infer<typeof credentialsSchema>;

// GET /api/auth/me
type Me = {
  email: string | null;
  // aal2 once the user has passed an MFA check in this session.
  aal: "aal1" | "aal2";
  mfaEnrolled: boolean;
  hasGrowatt: boolean;
  hasOctopus: boolean;
};

// POST /api/auth/mfa { action: "enroll" }. Shown once, to add the app.
type MfaEnrollment = {
  // A data: URL of an SVG QR code, for an <img>.
  qrCode: string;
  // The same secret as text, for typing in by hand.
  secret: string;
};

// PUT /api/growatt/charge and /api/growatt/discharge. GET returns the
// ChargePeriods type from Growatt.ts.
type PeriodsBody = z.infer<typeof periodsSchema>;

// GET and PUT /api/settings.
type Settings = z.infer<typeof settingsSchema>;

// GET /api/credentials, and the reply to PUT and DELETE. Never the secrets.
type Credentials = {
  growatt: { serial: string; verifiedAt: string } | null;
  octopus: { account: string; verifiedAt: string } | null;
};

export type {
  ApiError,
  LoginBody,
  SignupBody,
  MfaBody,
  CredentialsBody,
  Me,
  MfaEnrollment,
  Credentials,
  Settings,
  PeriodsBody,
};
