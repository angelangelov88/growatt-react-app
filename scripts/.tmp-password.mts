import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "/private/tmp/claude-503/-Users-angelangelov-Documents-GitHub-console/2cc97520-7e7d-45f6-9fff-0652bb4d410d/scratchpad/pw/node_modules/playwright-core/index.mjs";

const BASE = "http://localhost:3000";
const SHOTS =
  "/private/tmp/claude-503/-Users-angelangelov-Documents-GitHub-console/2cc97520-7e7d-45f6-9fff-0652bb4d410d/scratchpad";
const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};

const base32 = (s: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
};
const totp = (secret: string) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
};
const nextStep = async () => {
  await new Promise((r) => setTimeout(r, 30000 - (Date.now() % 30000) + 500));
};

const PASSWORD = "Start-Pass-123!";
const NEW_PASSWORD = "Fresh-Pass-456?";
const userIds: string[] = [];
const makeUser = async (password?: string) => {
  const email = `ui-${randomBytes(6).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    ...(password ? { password } : {}),
    email_confirm: true,
  });
  if (error) throw error;
  userIds.push(data.user.id);
  return email;
};
const origin = { Origin: BASE };

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  // --- Password user, no MFA ---
  const plain = await makeUser(PASSWORD);
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: plain, password: PASSWORD },
    });
    const me = (await (await page.request.get(`${BASE}/api/auth/me`)).json()) as {
      hasPassword: boolean;
    };
    check("me: password user has a password", me.hasPassword === true);

    await page.goto(`${BASE}/settings`);
    await page.getByRole("button", { name: "Change password" }).click();
    check(
      "asks for the current password",
      await page.getByLabel("Current password", { exact: true }).isVisible(),
    );
    check("no code field without MFA", (await page.locator("#code").count()) === 0);

    await page.getByRole("button", { name: "Change password" }).click();
    check(
      "empty form shows both field errors",
      (await page.locator("#current-password-error").isVisible()) &&
        (await page.locator("#new-password-error").isVisible()),
    );

    await page.getByLabel("Current password", { exact: true }).fill("Wrong-Pass-000!");
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByText("Your current password is wrong").waitFor();
    check("wrong current password is refused", true);
    check("and the user stays logged in", page.url() === `${BASE}/settings`);
    await page.screenshot({ path: `${SHOTS}/pw-change-wrong.png` });

    await page.getByLabel("Current password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByText("Password changed").waitFor();
    check("password changed, toast shown", true);
    check(
      "form closes",
      await page.getByRole("button", { name: "Change password" }).isVisible(),
    );

    const old = await page.request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: plain, password: PASSWORD },
    });
    check("old password fails", old.status() === 401, String(old.status()));
    const fresh = await page.request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: plain, password: NEW_PASSWORD },
    });
    check("new password works", fresh.status() === 204, String(fresh.status()));
    await context.close();
  }

  // --- No password yet (like a Google user), logged in with a magic link ---
  const noPass = await makeUser();
  {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: noPass,
    });
    if (error) throw error;
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(
      `${BASE}/api/auth/confirm?token_hash=${data.properties.hashed_token}&type=email`,
    );
    await page.waitForURL(`${BASE}/`);
    const me = (await (await page.request.get(`${BASE}/api/auth/me`)).json()) as {
      hasPassword: boolean;
    };
    check("me: user without a password", me.hasPassword === false);

    await page.goto(`${BASE}/settings`);
    await page.getByText("You log in with Google").waitFor();
    check("explains Google sign-in keeps working", await page.getByText("Google sign-in keeps working").isVisible());
    await page.screenshot({ path: `${SHOTS}/pw-add-card.png` });

    // A login over 5 minutes old: the server's answer is faked here.
    await page.getByRole("button", { name: "Add a password" }).click();
    check(
      "no current password field",
      (await page.getByLabel("Current password", { exact: true }).count()) === 0,
    );
    await page.route(`${BASE}/api/auth/password`, (route) =>
      route.fulfill({
        status: 403,
        json: { code: "reauth_required", message: "Log in again to continue" },
      }),
    );
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Add password" }).click();
    const google = page.getByRole("link", { name: "Log in with Google again" });
    await google.waitFor();
    check(
      "stale login offers Google, coming back to settings",
      (await google.getAttribute("href")) === "/api/auth/google?next=settings",
    );
    await page.screenshot({ path: `${SHOTS}/pw-add-google.png` });
    await page.unroute(`${BASE}/api/auth/password`);

    await page.getByRole("button", { name: "Add password" }).click();
    await page.getByText("Password added").waitFor();
    check("password added, toast shown", true);
    await page.getByRole("button", { name: "Change password" }).waitFor();
    check("card now offers Change password", true);

    const login = await page.request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: noPass, password: NEW_PASSWORD },
    });
    check("can now log in with the password", login.status() === 204, String(login.status()));
    await context.close();
  }

  // --- The Google return cookie ---
  {
    const context = await browser.newContext();
    const { request } = context;
    const start = await request.get(`${BASE}/api/auth/google?next=settings`, {
      maxRedirects: 0,
    });
    const cookies = start.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value);
    const after = cookies.find((c) => c.startsWith("after_google="));
    check(
      "?next=settings sets an httpOnly return cookie",
      !!after && after.startsWith("after_google=settings") && /HttpOnly/i.test(after) && /Path=\/api\/auth/i.test(after),
    );
    const evil = await request.get(`${BASE}/api/auth/google?next=https://evil.example`, {
      maxRedirects: 0,
    });
    check(
      "unknown next is ignored",
      !evil.headersArray().some((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("after_google=")),
    );
    const back = await request.get(`${BASE}/api/auth/callback`, { maxRedirects: 0 });
    const cleared = back.headersArray().some(
      (h) => h.name.toLowerCase() === "set-cookie" && /^after_google=;.*Max-Age=0/i.test(h.value),
    );
    check("callback clears the cookie", cleared);
    check(
      "callback without a code still goes to login",
      back.headers().location === "/login?error=sign_in_cancelled",
      back.headers().location,
    );
    await context.close();
  }

  // --- MFA user ---
  const mfa = await makeUser(PASSWORD);
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { request } = context;
    await request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: mfa, password: PASSWORD },
    });
    const enroll = await request.post(`${BASE}/api/auth/mfa`, {
      headers: origin,
      data: { action: "enroll" },
    });
    const { secret } = (await enroll.json()) as { secret: string };
    await request.post(`${BASE}/api/auth/mfa`, {
      headers: origin,
      data: { action: "verify", code: totp(secret) },
    });

    // The current password doesn't replace the code for MFA users.
    const other = await browser.newContext();
    await other.request.post(`${BASE}/api/auth/login`, {
      headers: origin,
      data: { email: mfa, password: PASSWORD },
    });
    const put = await other.request.put(`${BASE}/api/auth/password`, {
      headers: origin,
      data: { password: NEW_PASSWORD, currentPassword: PASSWORD },
    });
    const putBody = (await put.json()) as { code: string };
    check(
      "MFA user: current password without the code is refused",
      put.status() === 403 && putBody.code === "mfa_required",
      `${String(put.status())} ${putBody.code}`,
    );
    await other.close();
    await request.post(`${BASE}/api/auth/logout`, { headers: origin });

    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(mfa);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(`${BASE}/mfa`);
    await nextStep();
    await page.locator("#code").fill(totp(secret));
    await page.waitForURL(`${BASE}/`);

    await page.goto(`${BASE}/settings`);
    await page.getByRole("button", { name: "Change password" }).click();
    check(
      "MFA user: no current password, asks for a code",
      (await page.getByLabel("Current password", { exact: true }).count()) === 0 &&
        (await page.locator("#code").isVisible()),
    );
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.locator("#code").fill("000000");
    await page.getByText("That code didn't work").waitFor();
    check("wrong code is refused (auto-submitted)", true);
    await page.screenshot({ path: `${SHOTS}/pw-mfa.png` });
    await nextStep();
    await page.locator("#code").fill(totp(secret));
    await page.getByText("Password changed").waitFor();
    check("MFA user changes the password with a code", true);
    await context.close();
  }
} catch (err) {
  failed++;
  console.log("FAIL threw:", err instanceof Error ? err.message : err);
} finally {
  await browser.close();
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  console.log(`\n${passed} passed, ${failed} failed; ${userIds.length} test users deleted`);
}
