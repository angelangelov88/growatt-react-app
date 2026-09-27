// Checks the database and encryption guarantees against the real Supabase project.
// Creates two throwaway users, tries to cross between them, then deletes them.
// Run: pnpm dlx tsx --env-file=.env scripts/security-check.ts
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sql, withUser, automationUserIds } from "../api/_lib/db";
import { encryptSecret, decryptSecret } from "../api/_lib/crypto";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY)
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failures++;
  console.log(ok ? "✅" : "❌", name);
};
const rejects = async (fn: () => unknown) => {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
};

const createTestUser = async (label: string) => {
  const { data, error } = await admin.auth.admin.createUser({
    email: `security-check-${label}-${randomBytes(4).toString("hex")}@example.com`,
    password: `${randomBytes(24).toString("base64")}aA1!`,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
};

const main = async () => {
  const a = await createTestUser("a");
  const b = await createTestUser("b");

  try {
    // User A saves settings, a credential and an audit row.
    const secret = encryptSecret('{"password":"secret-A"}', a, "growatt");
    await withUser(a, async (tx) => {
      await tx`insert into private.user_settings (user_id, automation_enabled) values (${a}, true)`;
      await tx`insert into private.user_credentials
      (user_id, provider, ciphertext, iv, auth_tag, key_version, identifier, verified_at)
      values (${a}, 'growatt', ${Buffer.from(secret.ciphertext)}, ${Buffer.from(secret.iv)},
              ${Buffer.from(secret.authTag)}, ${secret.keyVersion}, 'SERIAL-A', now())`;
      await tx`insert into private.audit_log (user_id, action) values (${a}, 'security-check')`;
    });

    // User B can't see, change or impersonate A.
    await withUser(b, async (tx) => {
      const creds = await tx`select * from private.user_credentials`;
      check("B sees none of A's credentials", creds.length === 0);
      const settings = await tx`select * from private.user_settings`;
      check("B sees none of A's settings", settings.length === 0);
      const audit = await tx`select * from private.audit_log`;
      check("B sees none of A's audit rows", audit.length === 0);
      const updated =
        await tx`update private.user_settings set automation_enabled = false where user_id = ${a}`;
      check("B can't update A's settings", updated.count === 0);
      const deleted =
        await tx`delete from private.user_credentials where user_id = ${a}`;
      check("B can't delete A's credentials", deleted.count === 0);
    });
    check(
      "B can't insert rows as A",
      await rejects(() =>
        withUser(
          b,
          (tx) =>
            tx`insert into private.audit_log (user_id, action) values (${a}, 'forged')`,
        ),
      ),
    );

    // A reads their own row back and decrypts it.
    const [row] = await withUser(
      a,
      (tx) =>
        tx<
          {
            ciphertext: Buffer;
            iv: Buffer;
            auth_tag: Buffer;
            key_version: number;
          }[]
        >`select ciphertext, iv, auth_tag, key_version from private.user_credentials`,
    );
    const stored = {
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.auth_tag,
      keyVersion: row.key_version,
    };
    check(
      "A decrypts their own secret",
      decryptSecret(stored, a, "growatt") === '{"password":"secret-A"}',
    );
    check(
      "the database holds no plaintext",
      !row.ciphertext.toString("utf8").includes("secret-A"),
    );

    // Tampering or moving the ciphertext makes decryption fail.
    const flipped = Buffer.from(stored.ciphertext);
    flipped[0] ^= 1;
    check(
      "tampered ciphertext is rejected",
      await rejects(() =>
        decryptSecret({ ...stored, ciphertext: flipped }, a, "growatt"),
      ),
    );
    check(
      "A's secret can't be decrypted as B's",
      await rejects(() => decryptSecret(stored, b, "growatt")),
    );
    check(
      "a Growatt secret can't be decrypted as Octopus",
      await rejects(() => decryptSecret(stored, a, "octopus")),
    );
    check(
      "each encryption uses a new IV",
      !Buffer.from(encryptSecret("x", a, "growatt").iv).equals(
        Buffer.from(encryptSecret("x", a, "growatt").iv),
      ),
    );

    const ids = await automationUserIds();
    check(
      "cron sees A (automation on) but not B",
      ids.includes(a) && !ids.includes(b),
    );
  } finally {
    // Deleting the users cascades to all their rows.
    await admin.auth.admin.deleteUser(a);
    await admin.auth.admin.deleteUser(b);
  }

  const left = await withUser(
    a,
    (tx) => tx`select 1 from private.user_credentials`,
  );
  check("deleting a user deletes their credentials", left.length === 0);

  await sql.end();
  console.log(
    failures === 0 ? "\nAll checks passed" : `\n${String(failures)} failed`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
};

void main();
