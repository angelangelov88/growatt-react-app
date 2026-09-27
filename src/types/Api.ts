import type { z } from "zod";
import type { loginSchema, signupSchema } from "../lib/authSchemas";

// Shared by the api/ functions and the app.

// The JSON body of every error response.
type ApiError = {
  code: string;
  message: string;
};

type LoginBody = z.infer<typeof loginSchema>;
type SignupBody = z.infer<typeof signupSchema>;

// GET /api/auth/me
type Me = {
  email: string | null;
  // aal2 once the user has passed an MFA check in this session.
  aal: "aal1" | "aal2";
  mfaEnrolled: boolean;
  hasGrowatt: boolean;
  hasOctopus: boolean;
};

export type { ApiError, LoginBody, SignupBody, Me };
