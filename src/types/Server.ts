import type postgres from "postgres";
import type { JwtPayload, SupabaseClient } from "@supabase/supabase-js";

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

// The JSON body of every error response.
type ApiError = {
  code: string;
  message: string;
};

export type { Tx, Provider, EncryptedSecret, SessionUser, ApiError };
