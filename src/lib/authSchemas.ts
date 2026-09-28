import { z } from "zod";

// Shared by the api/ functions and the app's forms. Keep in step with
// Supabase → Authentication → Email: minimum length and required characters.

const email = z.email().max(254);

// 72 is the most bcrypt (used by Supabase) reads; anything longer is ignored.
const newPassword = z
  .string()
  .min(10, "At least 10 characters")
  .max(72, "At most 72 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^a-zA-Z0-9]/, "Add a symbol");

const signupSchema = z.object({ email, password: newPassword });

// Login doesn't re-check the rules: they may have changed since sign-up.
const loginSchema = z.object({ email, password: z.string().min(1).max(72) });

// Forgot password: where to send the reset link.
const resetRequestSchema = z.object({ email });

// Proves who it is, for users with a password and no MFA, in place of a
// recent login. Also used by PUT /api/credentials.
const currentPassword = z
  .string()
  .min(1, "Enter your current password")
  .max(72);

// PUT /api/auth/password: a new password, after the reset link or from
// Settings.
const newPasswordSchema = z.object({
  password: newPassword,
  currentPassword: currentPassword.optional(),
});

// Settings' change password form, for users with a password and no MFA.
const changePasswordSchema = z.object({
  currentPassword,
  password: newPassword,
});

// DELETE /api/account. currentPassword as for the password change; nothing
// else, the account goes as a whole.
const deleteAccountSchema = z.object({
  currentPassword: currentPassword.optional(),
});

// The 6-digit code from an authenticator app.
const totpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

const mfaSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll") }),
  z.object({ action: z.literal("verify"), code: totpCode }),
]);

export {
  signupSchema,
  loginSchema,
  resetRequestSchema,
  newPasswordSchema,
  changePasswordSchema,
  mfaSchema,
  deleteAccountSchema,
  currentPassword,
};
