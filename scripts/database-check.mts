// Checks that the database can only be reached through our API. Supabase's
// public (publishable) key must not reach any table or function, and every
// table must have RLS on with no access for anon or authenticated. Read-only.
// Prints only table and function names, which are in the migrations anyway.
// Connects as ci_check (0005_ci_check.sql), which can read Postgres's catalog
// and nothing else. Run: pnpm check:database (CI runs it too).
import postgres from "postgres";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, CI_DATABASE_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !CI_DATABASE_URL)
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and CI_DATABASE_URL must be set",
  );

// Supabase's API roles: the publishable key acts as anon, a signed-in user as
// authenticated. Neither may touch our data. current_user is ci_check, whose
// password is in GitHub's secrets, so it mustn't either.
const ROLES = ["anon", "authenticated", "current_user"] as const;
const TABLE_PRIVILEGES =
  "SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER";

type Access = Record<(typeof ROLES)[number], boolean>;

let failures = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failures++;
  console.log(ok ? "✅" : "❌", name);
};

// Any reply but a 2xx means refused. A network error throws, so a dead
// connection can't pass as "refused".
const refused = async (
  path: string,
  headers: Record<string, string>,
  body?: string,
) => {
  const res = await fetch(`${SUPABASE_URL}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  return !res.ok;
};

const main = async () => {
  const sql = postgres(CI_DATABASE_URL, {
    prepare: false,
    max: 1,
    ssl: "require",
  });
  try {
    // Looked up by oid: ci_check can't use the private schema, so names in it
    // wouldn't resolve.
    const [schema] = await sql<Access[]>`
      select has_schema_privilege('anon', n.oid, 'USAGE') as anon,
        has_schema_privilege('authenticated', n.oid, 'USAGE') as authenticated,
        has_schema_privilege(current_user, n.oid, 'USAGE') as current_user
      from pg_namespace n where n.nspname = 'private'`;
    const tables = await sql<
      ({
        schema: string;
        name: string;
        rls: boolean;
        forced: boolean;
      } & Access)[]
    >`select n.nspname as schema, c.relname as name,
        c.relrowsecurity as rls, c.relforcerowsecurity as forced,
        has_table_privilege('anon', c.oid, ${TABLE_PRIVILEGES}) as anon,
        has_table_privilege('authenticated', c.oid, ${TABLE_PRIVILEGES}) as authenticated,
        has_table_privilege(current_user, c.oid, ${TABLE_PRIVILEGES}) as current_user
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
      order by 1, 2`;
    const functions = await sql<({ name: string } & Access)[]>`
      select p.proname as name,
        bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon,
        bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as authenticated,
        bool_or(has_function_privilege(current_user, p.oid, 'EXECUTE')) as current_user
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' group by 1 order by 1`;
    const privateTables = tables.filter((t) => t.schema === "private");
    const as = (role: string) =>
      role === "current_user" ? "this login (ci_check)" : role;

    // Anything in public would be served by the Data API if it were turned on.
    check(
      "nothing in the public schema",
      tables.every((t) => t.schema !== "public"),
    );
    check("found the private tables", privateTables.length > 0);
    check("found the private functions", functions.length > 0);

    for (const role of ROLES)
      check(`${as(role)} can't use the private schema`, !schema[role]);

    for (const table of privateTables) {
      check(
        `private.${table.name}: RLS on and forced`,
        table.rls && table.forced,
      );
      for (const role of ROLES)
        check(`private.${table.name}: no access for ${as(role)}`, !table[role]);
    }

    for (const fn of functions)
      for (const role of ROLES)
        check(`private.${fn.name}(): ${as(role)} can't run it`, !fn[role]);

    // The same, from the outside: Supabase's REST API with the public key.
    const settings = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(15_000),
    });
    check("the public key is valid (so the refusals below count)", settings.ok);
    for (const { name } of privateTables)
      for (const schema of ["public", "private"])
        check(
          `REST refuses ${name} (${schema} profile)`,
          await refused(`rest/v1/${name}?select=*&limit=1`, {
            "Accept-Profile": schema,
          }),
        );
    for (const { name } of functions)
      check(
        `REST refuses rpc/${name}`,
        await refused(
          `rest/v1/rpc/${name}`,
          { "Content-Profile": "private" },
          "{}",
        ),
      );
  } finally {
    await sql.end();
  }

  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${String(failures)} failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
};

void main();
