import { createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  credentialsSchema,
  providerSchema,
} from "../src/lib/credentialSchemas";
import { checkAccount, obtainToken } from "../src/lib/octopusApi";
import type { Credentials, CredentialsBody } from "../src/types/Api";
import type { Provider, Tx } from "../src/types/Server";
import { audit } from "./_lib/audit";
import { checkOrigin } from "./_lib/csrf";
import { withUser } from "./_lib/db";
import { allowMethods, sendError } from "./_lib/http";
import { requireUser } from "./_lib/session";
import { requireStepUp } from "./_lib/stepUp";
import { growattClientFor, sealSecret } from "./_lib/userConfig";

// Failed checks allowed per user per hour, so this endpoint can't be used to
// guess other people's Growatt or Octopus logins.
const MAX_FAILED_CHECKS_PER_HOUR = 5;

type Problem = { code: string; message: string };

const md5 = (text: string) => createHash("md5").update(text).digest("hex");

// What's saved, never the secrets.
const readStatus = async (tx: Tx): Promise<Credentials> => {
  const rows = await tx<
    { provider: Provider; identifier: string; verified_at: Date }[]
  >`select provider, identifier, verified_at from private.user_credentials`;
  const find = (provider: Provider) => {
    const row = rows.find((r) => r.provider === provider);
    return row && { id: row.identifier, at: row.verified_at.toISOString() };
  };
  const growatt = find("growatt");
  const octopus = find("octopus");
  return {
    growatt: growatt ? { serial: growatt.id, verifiedAt: growatt.at } : null,
    octopus: octopus ? { account: octopus.id, verifiedAt: octopus.at } : null,
  };
};

// Tries the credentials for real (read-only). Returns what went wrong, or null.
const check = async (body: CredentialsBody): Promise<Problem | null> => {
  if (body.provider === "growatt") {
    const client = growattClientFor({
      user: body.user,
      passwordMd5: md5(body.password),
    });
    try {
      await client.login();
    } catch {
      return {
        code: "growatt_login_failed",
        message: "Growatt didn't accept that username and password",
      };
    }
    try {
      await client.fetchChargePeriods(body.serial);
    } catch {
      return {
        code: "growatt_serial_failed",
        message: `Logged in, but couldn't read inverter ${body.serial}. Check the serial number and that the inverter is online`,
      };
    }
    return null;
  }
  let token: string;
  try {
    token = await obtainToken(body.apiKey);
  } catch {
    return {
      code: "octopus_key_failed",
      message: "Octopus didn't accept that API key",
    };
  }
  try {
    await checkAccount(token, body.account);
  } catch {
    return {
      code: "octopus_account_failed",
      message: `That API key can't see account ${body.account}`,
    };
  }
  return null;
};

// Encrypts and saves checked credentials, replacing any the user had.
const save = async (tx: Tx, userId: string, body: CredentialsBody) => {
  const [identifier, sealed] =
    body.provider === "growatt"
      ? [
          body.serial,
          sealSecret(userId, "growatt", {
            user: body.user,
            passwordMd5: md5(body.password),
          }),
        ]
      : [body.account, sealSecret(userId, "octopus", { apiKey: body.apiKey })];
  await tx`
    insert into private.user_credentials
      (user_id, provider, ciphertext, iv, auth_tag, key_version, identifier, verified_at)
    values (${userId}, ${body.provider}, ${Buffer.from(sealed.ciphertext)},
      ${Buffer.from(sealed.iv)}, ${Buffer.from(sealed.authTag)},
      ${sealed.keyVersion}, ${identifier}, now())
    on conflict (user_id, provider) do update set
      ciphertext = excluded.ciphertext, iv = excluded.iv,
      auth_tag = excluded.auth_tag, key_version = excluded.key_version,
      identifier = excluded.identifier, verified_at = excluded.verified_at`;
  return identifier;
};

// GET → Credentials.
// PUT CredentialsBody → Credentials. Needs a recent step-up; checks the
//   credentials with Growatt or Octopus before saving them encrypted.
// DELETE ?provider=growatt|octopus → Credentials.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (
    !allowMethods(req, res, ["GET", "PUT", "DELETE"]) ||
    !checkOrigin(req, res)
  )
    return;
  const user = await requireUser(req, res);
  if (!user) return;
  const { userId } = user;

  if (req.method === "GET") {
    res.json(await withUser(userId, readStatus));
    return;
  }

  if (req.method === "DELETE") {
    const provider = providerSchema.safeParse(req.query.provider);
    if (!provider.success) {
      sendError(res, 400, "invalid_input", "Say which provider to remove");
      return;
    }
    const status = await withUser(userId, async (tx) => {
      const deleted = await tx`
        delete from private.user_credentials where provider = ${provider.data}`;
      if (deleted.count > 0)
        await audit(tx, req, userId, "credentials_deleted", {
          provider: provider.data,
        });
      return readStatus(tx);
    });
    res.json(status);
    return;
  }

  const body = credentialsSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  if (!(await requireStepUp(user, res))) return;

  const [{ failures }] = await withUser(
    userId,
    (tx) => tx<{ failures: number }[]>`
      select count(*)::int as failures from private.audit_log
      where action = 'credentials_check_failed'
        and created_at > now() - interval '1 hour'`,
  );
  if (failures >= MAX_FAILED_CHECKS_PER_HOUR) {
    sendError(res, 429, "rate_limited", "Too many attempts, try again later");
    return;
  }

  const problem = await check(body.data);
  if (problem) {
    await withUser(userId, (tx) =>
      audit(tx, req, userId, "credentials_check_failed", {
        provider: body.data.provider,
        reason: problem.code,
      }),
    );
    sendError(res, 400, problem.code, problem.message);
    return;
  }

  const status = await withUser(userId, async (tx) => {
    const identifier = await save(tx, userId, body.data);
    await audit(tx, req, userId, "credentials_saved", {
      provider: body.data.provider,
      identifier,
    });
    return readStatus(tx);
  });
  res.json(status);
};

export default handler;
