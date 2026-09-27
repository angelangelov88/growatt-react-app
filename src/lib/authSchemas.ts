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

export { signupSchema, loginSchema };
