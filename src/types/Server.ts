import type postgres from "postgres";
import type { JwtPayload, SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Types for the Vercel functions in api/. Server-only: never imported by the app.

type Tx = postgres.TransactionSql;

type Provider = "growatt" | "octopus";

type EncryptedSecret = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  keyVersion: number;
};

// The logged-in user for one request, from a verified access token.
type SessionUser = {
  userId: string;
  claims: JwtPayload;
  supabase: SupabaseClient;
};

// A Google login in progress, kept in an httpOnly cookie between
// /api/auth/google and /api/auth/callback. next: a name from
// AFTER_GOOGLE_PAGES, or "" for home.
type GoogleLogin = {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
};

// One endpoint. Several share a Vercel function through a router, because the
// Hobby plan allows at most 12 functions per deployment.
type Handler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void> | void;

// What private.audit_log records.
type AuditAction =
  | "mfa_enrolled"
  | "mfa_removed"
  | "password_changed"
  | "account_exported"
  | "credentials_saved"
  | "credentials_deleted"
  | "credentials_check_failed"
  | "settings_saved"
  | "growatt_write"
  | "octopus_join"
  | "automation_run";

// What the scheduled job did for one user. skipped: automation was turned off
// after the job listed the users.
type AutomationResult = "applied" | "unchanged" | "skipped" | "failed";

// The /api/cron/update reply. Counts only: GitHub Actions logs are public.
type CronSummary = { users: number } & Record<AutomationResult, number>;

export type {
  Tx,
  Provider,
  EncryptedSecret,
  SessionUser,
  GoogleLogin,
  Handler,
  AuditAction,
  AutomationResult,
  CronSummary,
};
