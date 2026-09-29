import type { z } from "zod";
import type {
  deleteAccountSchema,
  loginSchema,
  mfaSchema,
  newPasswordSchema,
  resetRequestSchema,
  signupSchema,
} from "../lib/authSchemas";
import type {
  credentialsSchema,
  providerSchema,
} from "../lib/credentialSchemas";
import type { periodsSchema } from "../lib/growattSchemas";
import type { joinSchema } from "../lib/octopusSchemas";
import type { settingsSchema } from "../lib/settingsSchema";
import type { ChargePlan, Dispatch, PowerDownSession } from "./Octopus";

// Shared by the api/ functions and the app.

// The JSON body of every error response.
type ApiError = {
  code: string;
  message: string;
};

type LoginBody = z.infer<typeof loginSchema>;
type SignupBody = z.infer<typeof signupSchema>;
type MfaBody = z.infer<typeof mfaSchema>;
// POST and PUT /api/auth/password.
type ResetRequestBody = z.infer<typeof resetRequestSchema>;
type NewPasswordBody = z.infer<typeof newPasswordSchema>;
// PUT /api/credentials. Sent once to be checked and saved; never sent back.
type CredentialsBody = z.infer<typeof credentialsSchema>;

// GET /api/auth/me
type Me = {
  email: string | null;
  // aal2 once the user has passed an MFA check in this session.
  aal: "aal1" | "aal2";
  mfaEnrolled: boolean;
  // False for Google users until they add one.
  hasPassword: boolean;
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

// GET /api/octopus/slots
type OctopusSlots = { plannedDispatches: Dispatch[] };

// GET /api/octopus/sessions. SavingSessionsData, with the dates as ISO strings.
type SessionJson = Omit<PowerDownSession, "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};
type SavingSessions = {
  region: number | null;
  events: SessionJson[];
  joined: SessionJson[];
};

// POST /api/octopus/join
type JoinBody = z.infer<typeof joinSchema>;

// GET and PUT /api/settings.
type Settings = z.infer<typeof settingsSchema>;

// GET /api/automation: what automatic charging last did. Times are ISO
// strings, null until it first happens.
type AutomationStatus = {
  // When the last check finished.
  checkedAt: string | null;
  // Why the last check failed, or null if it worked.
  error: { code: string; message: string } | null;
  // A saved login was refused, so scheduled checks wait for new details or
  // Check now.
  paused: boolean;
  // The charge times the inverter was last set to or found with, e.g.
  // "01:00-05:00, 18:00-19:00"; "" for none.
  slots: string | null;
  // When automatic charging last changed the inverter.
  appliedAt: string | null;
};

// POST /api/automation (Check now). busy: another check was already running.
// plan: what the inverter now has, when the check got that far.
type CheckNowResult = {
  result: "applied" | "unchanged" | "failed" | "busy";
  plan: ChargePlan | null;
  status: AutomationStatus;
};

// DELETE /api/account.
type DeleteAccountBody = z.infer<typeof deleteAccountSchema>;

// GET /api/account: everything stored about the user (UK GDPR access request).
// Never any secrets.
type AccountExport = {
  exportedAt: string;
  account: {
    id: string;
    email: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    // "email", "google".
    signInMethods: string[];
    mfaEnrolled: boolean;
  };
  settings: Settings;
  automation: AutomationStatus;
  credentials: Credentials;
  auditLog: {
    at: string;
    action: string;
    details: unknown;
    ip: string | null;
  }[];
};

type Provider = z.infer<typeof providerSchema>;

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
  ResetRequestBody,
  NewPasswordBody,
  CredentialsBody,
  Me,
  MfaEnrollment,
  Provider,
  Credentials,
  Settings,
  AutomationStatus,
  CheckNowResult,
  PeriodsBody,
  OctopusSlots,
  SessionJson,
  SavingSessions,
  JoinBody,
  AccountExport,
  DeleteAccountBody,
};
