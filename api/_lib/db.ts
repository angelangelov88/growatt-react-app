import postgres from "postgres";
import type { Tx } from "../../src/types/Server";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// A small pool per function instance; Supabase's transaction pooler does the
// real pooling. prepare: false because the pooler doesn't support prepared statements.
const sql = postgres(url, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  ssl: "require",
});

// Runs fn in a transaction scoped to one user. RLS only lets it see and change
// that user's rows, even if a query forgets "where user_id = ...".
const withUser = async <T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> =>
  (await sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  })) as T;

// Only for the cron job: the ids of users with automation on.
const automationUserIds = async () =>
  (
    await sql<
      { id: string }[]
    >`select id from private.automation_user_ids() as id`
  ).map((r) => r.id);

// Only for the cron job: deletes audit rows older than 12 months (the privacy
// notice promises this). Returns how many went.
const pruneAuditLog = async () => {
  const [row] = await sql<
    { count: string }[]
  >`select private.prune_audit_log() as count`;
  return Number(row.count);
};

export { sql, withUser, automationUserIds, pruneAuditLog };
