<img src="public/icon-192.png" alt="" width="64" height="64">

# Kelpwatt

A web app that connects a **Growatt** solar/battery inverter to an **Octopus Energy** account. It shows the inverter's charge settings next to Octopus's planned charging times (Intelligent Octopus dispatches) and can apply those times to the inverter, by hand or automatically through the night. It also lists Octopus saving sessions ("Power Down") and lets you join them.

Live at **https://kelpwatt.angelov.uk**. Anyone can sign up; each user connects their own Growatt and Octopus accounts.

## About the name

**Kelpwatt** sits between the two services the app joins. Kelp is a seaweed that grows very fast, a nod to the sea (Octopus) and to growing (Growatt). Watt is the unit of power, and the end of Growatt's name. The name deliberately avoids using either company's name, because the app isn't made or endorsed by them.

The logo shows energy flowing into a battery (the violet arrow) and back out to the home or grid (the emerald arrow), like the app's Battery First and Grid First settings. The name uses the same two colours: "Kelp" in emerald, "watt" in violet.

## Features

- **Sign in** with Google, or email and password (email confirmation, password reset, optional authenticator-app MFA).
- **Dashboard:**
  - the inverter's Battery First (charge) and Grid First (discharge) slots, editable
  - Octopus's planned dispatches, with an Apply button that turns them into a charge plan (or, with automatic charging on, Check now and when it last ran)
  - saving sessions, with Join
- **Settings:**
  - Growatt and Octopus details (checked before saving, write-only)
  - automatic charging, with an optional charge window, power rate and stop SOC
  - password and MFA
  - data export and account deletion
- **Automatic charging:** every 5 minutes, each opted-in user's planned dispatches are checked and applied to their inverter when they change.
- **Privacy notice and terms** at `/privacy` and `/terms`.

## How it works

```
Browser (React)  ──cookies──▶  /api (Vercel functions, London)  ──▶  Supabase Auth
   no tokens,                   checks the session on every call  ──▶  Postgres (private schema)
   no secrets                                                     ──▶  Growatt server
                                                                  ──▶  Octopus GraphQL API
Supabase pg_cron (every 5 min) ──Bearer CRON_SECRET──▶ /api/cron/user, one request per user
```

- **The browser only talks to our `/api`.**
  - The session lives in httpOnly cookies.
  - There's no Supabase SDK, API key or third-party client in the bundle.
- **Supabase is used for sign-in only.**
  - All data is in Postgres, in a `private` schema that Supabase's Data API never exposes.
  - The server connects as a least-privilege `app_server` role.
  - Row-level security (RLS) limits each transaction to one user's rows.
- **Growatt and Octopus details are encrypted per user.**
  - They're encrypted with AES-256-GCM, with the key held in Vercel and never in the database.
  - They're decrypted only on the server, when a request needs them.
- **Security headers:** a strict Content-Security-Policy, HSTS and `nosniff` (`vercel.json`).

## Tech stack

- **Frontend:** React 18 + TypeScript, built with Vite, styled with Tailwind CSS. React Router 7 and TanStack Query 5. Zod checks form input.
- **API:** Vercel Node functions (`api/`), with `@supabase/ssr` for sessions, `postgres` for the database and zod for request bodies.
- **Services:** Supabase (auth and Postgres, London) and Resend (email).
- **Tooling:** pnpm, ESLint, Prettier, GitHub Actions.

## Project structure

```
api/                    Vercel functions (8 of the Hobby plan's 12)
  auth/[action].ts      login, signup, google, callback, confirm, logout, me, mfa, password
  growatt/[action].ts   charge / discharge (read and write the inverter)
  octopus/[action].ts   slots, sessions, join
  credentials.ts        save, check and remove Growatt / Octopus details
  settings.ts           charge window, power rate, stop SOC, automation
  automation.ts         automatic charging status, Check now
  account.ts            data export, account deletion
  cron/[action].ts      user (one user's scheduled check), update (everyone, by hand)
  _handlers/            the handlers behind the [action] routes (not routed)
  _lib/                 session, CSRF, rate limits, crypto, database, audit log…
src/
  features/             auth, dashboard, growatt, octopus, settings, legal
  components/           shared UI
  lib/                  React-free code shared with the server (Growatt/Octopus clients, charge planner, schemas)
  types/                all TypeScript types
supabase/migrations/    SQL migrations, applied by hand in order
scripts/                local and CI checks
.github/workflows/      CI and a manual automation run
```

Coding conventions and security rules for contributors are in [CLAUDE.md](CLAUDE.md).

## Running locally

**You need:**

- Node 22 or newer (CI uses 24)
- pnpm (`corepack enable` picks up the version in `package.json`)
- a Vercel account with access to the project
- the Supabase project and keys (see [Setting up from scratch](#setting-up-from-scratch))

```sh
pnpm install
cp .env.example .env     # then fill it in (see below)
npx vercel link          # once, to connect this folder to the Vercel project
pnpm dev:api             # app and API on http://localhost:3000
```

`pnpm dev:api` runs `vercel dev`, which serves the Vite app and the `/api` functions together. `pnpm start` runs Vite alone, without the API, so nothing past the login page works.

### Environment variables

All of them are **server-only**: they're read in `api/` and never reach the browser. Never add a `VITE_*` variable that holds a secret, because Vite builds those into the public JavaScript.

| Name                       | What it is                                                                                                                    | Where it's set                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`               | The app's address. Requests that change data must come from it.                                                               | `.env` (`http://localhost:3000`) and Vercel Production (`https://kelpwatt.angelov.uk`). Leave unset for previews. |
| `SUPABASE_URL`             | The Supabase project URL                                                                                                      | `.env`, Vercel, GitHub                                                                                            |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase's public key, used by the server for sign-in                                                                         | `.env`, Vercel, GitHub                                                                                            |
| `SUPABASE_SECRET_KEY`      | Supabase's admin key, only used to delete accounts (and in local test scripts)                                                | `.env`, Vercel                                                                                                    |
| `DATABASE_URL`             | Postgres as `app_server`, through the transaction pooler (port 6543)                                                          | `.env`, Vercel                                                                                                    |
| `CREDENTIALS_ENC_KEY_V1`   | Encrypts saved Growatt and Octopus details: `openssl rand -base64 32`. **Losing it means users must re-enter their details.** | `.env`, Vercel                                                                                                    |
| `GOOGLE_CLIENT_ID`         | The Google OAuth client's ID (step 2 below)                                                                                   | `.env`, Vercel                                                                                                    |
| `GOOGLE_CLIENT_SECRET`     | The Google OAuth client's secret                                                                                              | `.env`, Vercel                                                                                                    |
| `CRON_SECRET`              | Lets the schedule call `/api/cron/*`: `openssl rand -hex 32`                                                                  | `.env`, Vercel Production, Supabase Vault (`cron_secret`), GitHub                                                 |
| `CI_DATABASE_URL`          | Postgres as `ci_check`, only for `pnpm check:database`                                                                        | `.env`, GitHub                                                                                                    |

The local `.env` points at the **same Supabase project as production**. Test with throwaway accounts, and don't turn on automatic charging for a real inverter from a local run.

## Setting up from scratch

This is how production is set up, and what you'd repeat for a fresh copy.

### 1. Supabase

1. **Create the project** in region **London (eu-west-2)**, next to the Vercel functions (`lhr1`).
2. **Turn off the Data API:** Project Settings → Data API. The app never uses it.
3. **Authentication → Sign In / Providers:**
   - **Email:** on, with "Confirm email" on.
   - **Google:** on, with the client ID and secret from step 2 below. Supabase checks that the ID tokens the app hands it were issued to this client.
   - **Allow new users to sign up:** turn it off to make the app invite-only for now.
4. **Authentication settings:**
   - Access token (JWT) expiry: **900 seconds**.
   - Refresh token rotation: **on**, with reuse detection.
   - Minimum password length: **10**, requiring lowercase, uppercase, digits and symbols. This matches the sign-up form.
   - MFA: **TOTP (authenticator app) on**.
5. **Authentication → URL Configuration:**
   - **Site URL:** `https://kelpwatt.angelov.uk`. Every email link starts with it.
   - **Redirect URLs:** none needed. Google comes back to our own API, not to Supabase.
6. **Run the migrations:** open the SQL Editor and run each file in `supabase/migrations/` **in order**:

   | Migration              | What it does                                            |
   | ---------------------- | ------------------------------------------------------- |
   | `0001_init`            | Tables, RLS, the `app_server` role                      |
   | `0002_charge_limits`   | Power rate and stop SOC settings                        |
   | `0003_rate_limits`     | Rate limiting                                           |
   | `0004_has_password`    | Tells Google-only accounts apart from password accounts |
   | `0005_ci_check`        | The `ci_check` role                                     |
   | `0006_audit_retention` | Deletes audit log entries older than 12 months          |
   | `0007_automation`      | The 5-minute schedule, automation state, window toggle  |

   There's no migration tool. Each migration is applied by hand, once. Before `0007`, store `CRON_SECRET` in Vault (see [Automatic charging](#automatic-charging)).

7. **Set the passwords for `app_server` and `ci_check`.** Set them as SCRAM hashes, so the plain password never appears in Supabase's query history.
   - Generate a password and its hash locally:
     ```sh
     python3 - <<'EOF'
     import base64, hashlib, hmac, os, secrets
     pw, salt, n = secrets.token_urlsafe(32), os.urandom(16), 4096
     salted = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, n)
     key = lambda k: hmac.new(salted, k, "sha256").digest()
     b64 = lambda b: base64.b64encode(b).decode()
     print("password:", pw)
     print(f"SCRAM-SHA-256${n}:{b64(salt)}${b64(hashlib.sha256(key(b'Client Key')).digest())}:{b64(key(b'Server Key'))}")
     EOF
     ```
   - In the SQL Editor, run `alter role app_server password 'SCRAM-SHA-256$…';`. Then do the same for `ci_check` with a separate password.
   - Build each connection string from the **transaction pooler** address (Connect → Transaction pooler, port 6543). The user name is the role name followed by the project ref, e.g. `app_server.<project-ref>`. The `app_server` string goes in `DATABASE_URL`, and the `ci_check` one in `CI_DATABASE_URL`.

### 2. Google sign-in

The app talks to Google itself (`/api/auth/google` and `/api/auth/callback`, in `api/_lib/googleOAuth.ts`) and hands Google's ID token to Supabase, which checks it and starts the session. That way Google's account chooser says "continue to kelpwatt.angelov.uk", not Supabase's address.

1. In Google Cloud, go to APIs & Services → Credentials and create an **OAuth client ID** of type **Web application**.
2. **Authorised redirect URIs:** `https://kelpwatt.angelov.uk/api/auth/callback` and `http://localhost:3000/api/auth/callback`. They must match exactly, so Google sign-in doesn't work on preview deployments; use email login there.
3. Copy the client ID and secret into Supabase's Google provider, and into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (`.env` and Vercel).
4. **Google Auth Platform → Branding:** app name **Kelpwatt**, the logo (`public/icon-512.png`, resized to 120×120), home page `https://kelpwatt.angelov.uk`, privacy policy `https://kelpwatt.angelov.uk/privacy`, terms `https://kelpwatt.angelov.uk/terms`, and `angelov.uk` under **Authorised domains**. The domain must be verified in [Google Search Console](https://search.google.com/search-console) (a DNS TXT record). Then submit the branding for verification; until it's approved, Google may show the domain instead of the name and logo.
5. **Google Auth Platform → Audience:** while the app is in **Testing**, only the test users listed there can sign in. **Publish** the app to let anyone with a Google account sign in. The app only asks for the email address and basic profile, so Google doesn't need to review it.

### 3. Email (Resend)

Supabase's built-in email sender only allows a few emails an hour, so the app sends through Resend.

1. In Resend, verify a sending domain, e.g. `mail.angelov.uk`, by adding its DNS records (MX/SPF and DKIM).
2. In Supabase, go to Authentication → Emails → SMTP Settings and enter Resend's SMTP details. The sender is `no-reply@<your domain>`.
3. **Email templates:** each link must go to our API, not Supabase's default page, so it works on any device:

   | Template             | Link                                                                            |
   | -------------------- | ------------------------------------------------------------------------------- |
   | Confirm sign up      | `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email`        |
   | Reset password       | `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`     |
   | Change email address | `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email_change` |

### 4. Vercel

1. Import the repo as a Vercel project. The framework is Vite; the region (`lhr1`) and headers come from `vercel.json`.
2. Add the environment variables from the table above:
   - **Production:** all of them except `CI_DATABASE_URL`.
   - **Preview:** the same, minus `APP_ORIGIN` and `CRON_SECRET`. Previews work out their own address.
3. Add the custom domain and point its DNS at Vercel.
4. Merges to `main` deploy to production. Every other branch gets a preview deployment.

Previews share the production database and send email links to the production Site URL. Turn on Vercel's Deployment Protection so only you can open them.

### 5. GitHub

1. **Actions secrets:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `CI_DATABASE_URL` for CI, and `CRON_SECRET` for the manual automation run.
2. **Branch protection on `main`:**
   - require a pull request
   - require the `checks` and `database` jobs to pass
   - apply the rules to admins too
   - block force pushes and deletion

## Scripts

| Command                             | What it does                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:api`                      | App and API locally on port 3000 (`vercel dev`)                                                                                                                   |
| `pnpm start`                        | Vite only, without the API                                                                                                                                        |
| `pnpm build`                        | Type check and production build into `dist/`                                                                                                                      |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                                                                                                                            |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                                                                                          |
| `pnpm check:bundle`                 | After a build: fails if `dist/` holds a secret, a server setting's name or server-only code                                                                       |
| `pnpm check:database`               | Checks that no table or function can be reached except through our API: RLS forced everywhere, no access for Supabase's public roles, and REST refuses everything |

The type check covers all three projects:

```sh
npx tsc --noEmit -p . && npx tsc --noEmit -p scripts && npx tsc --noEmit -p api
```

Two more checks run against the real Supabase project. Each creates throwaway users and deletes them afterwards:

- `pnpm dlx tsx --env-file=.env scripts/security-check.ts` checks database isolation and encryption.
- `pnpm dlx tsx --env-file=.env scripts/session-check.ts` checks session cookies and the Origin check.

## CI

`.github/workflows/ci.yml` runs on **every pull request into `main`**, every Monday, and on demand (Actions → CI → Run workflow). The weekly run catches database changes made outside the migrations. It has two jobs:

- **`checks`:**
  - install from the lockfile
  - type check (app, scripts, api)
  - lint and formatting
  - build
  - `check:bundle`
- **`database`:** `check:database`, connected as `ci_check`. This role can only read Postgres's catalog, so its password can't reach user data. The job is skipped for pull requests from forks, because they don't get secrets.

The actions are pinned to commit SHAs. The repo and its Actions logs are public, so every script prints names and counts, never values.

## Automatic charging

Supabase's `pg_cron` runs `private.schedule_automation()` every 5 minutes. It sends one `POST /api/cron/user` per user with automatic charging on (skipping paused ones), in parallel through `pg_net`, so each user gets their own function and 60 seconds. The code is in `api/_lib/automation.ts`. Each check:

1. gets the user's planned dispatches from Octopus (1–2 seconds)
2. builds a charge plan: their own window, if turned on, plus the Octopus slots around it, with their power rate and stop SOC
3. compares it with the plan last seen on the inverter (`private.automation_state`). If it's the same and the inverter was read in the last 3 hours, it stops there, without contacting Growatt
4. otherwise reads the inverter and writes the plan if it differs

A "busy" mark (90 seconds) stops two checks for the same user running at once. If Growatt or Octopus refuses the saved login, the user's checks pause until they save new details or press Check now, so a wrong password isn't retried 288 times a day. Changes to the inverter are written to the audit log, and failures only when they start and stop.

**Check now** on the dashboard (`POST /api/automation`) runs the same check straight away and always reads the inverter. A manual change to Battery First, or saving settings or details, makes the next check read the inverter too.

A second job, `housekeeping`, runs daily at 03:17 UTC. It deletes audit log entries older than 12 months and `pg_cron`'s own run history older than 7 days.

**Setting it up** (once, before running `0007_automation`), in the SQL Editor:

```sql
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

Use the same value as `CRON_SECRET` in Vercel. Then run the migration. To see recent runs: `select * from cron.job_run_details order by start_time desc limit 20;`, and the replies: `select * from net._http_response order by created desc limit 20;`. To change the secret, update Vercel first, then `select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new value>');`.

To check everyone at once by hand: Actions → Update Growatt Charge Times → Run workflow (it calls `/api/cron/update`).

## Deploying

1. Work on a branch and open a pull request into `main`. Vercel builds a preview for it.
2. CI runs on the PR, and merging is blocked until both jobs pass.
3. Merge. Vercel deploys `main` to production.
4. If the PR adds a migration, run it in the Supabase SQL Editor **before merging**. New code may depend on it.

## Updating dependencies

Updates are done by hand, now and then. There's no Dependabot.

```sh
pnpm audit --prod   # known security issues in what the app ships
pnpm audit          # the same, including dev tools
pnpm outdated       # newer versions
```

Update on a branch: minor and patch versions together, and each major version on its own, after reading its changelog. Two upgrades are known to need work:

- **React 19:** the forms use `FormEvent`, which React 19 deprecates.
- **`@vitejs/plugin-react` 5:** it can't be loaded by the current `vite.config.ts`.

## Security

The main rules are listed in [CLAUDE.md](CLAUDE.md#security):

- no secrets in `VITE_*`
- every endpoint checks the session, the Origin and rate limits
- every table is in `private` with RLS forced
- nothing sensitive in logs

For a security problem, email **privacy@angelov.uk** rather than opening a public issue.

If a secret leaks:

| What leaked                                         | What to do                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_SECRET_KEY` or `SUPABASE_PUBLISHABLE_KEY` | Create a new key in Supabase (Project Settings → API Keys), update Vercel and GitHub, then delete the old key.                                   |
| `DATABASE_URL` or `CI_DATABASE_URL`                 | Set a new password for the role (step 1.7 above) and update the connection strings.                                                              |
| `CRON_SECRET`                                       | Generate a new one and update Vercel, Supabase Vault (`cron_secret`) and GitHub together.                                                        |
| `GOOGLE_CLIENT_SECRET`                              | Add a new secret to the OAuth client in Google Cloud, update Supabase's Google provider and Vercel, then disable and delete the old one.         |
| `CREDENTIALS_ENC_KEY_V1`                            | Add a `…_V2` key and re-encrypt the saved details with it (the stored rows record their key version), or ask users to enter their details again. |
| Everyone needs signing out                          | Revoke all sessions in Supabase.                                                                                                                 |

## Legal

The **privacy notice** (`/privacy`) and **terms** (`/terms`) live in `src/features/legal/`. The operator's name, contact address and "last updated" date are in `legalInfo.ts`.

If the app starts collecting new data, keeping it longer, or sending it to a new service, update the privacy notice in the same PR.

## Before opening sign-up to everyone

- [ ] Turn sign-up on in Supabase, if it's off.
- [ ] Publish the Google app (Google Auth Platform → Audience).
- [ ] Consider a CAPTCHA (Cloudflare Turnstile) on sign-up, login and password reset. The CSP will need `https://challenges.cloudflare.com` in `script-src` and `frame-src`.
- [ ] Email the user when their automatic charging pauses after a refused Growatt or Octopus login.
- [ ] Supabase Pro, for backups and no pausing, once there are real users.
- [ ] Check the ICO's data protection fee self-assessment.
- [ ] Set up `privacy@angelov.uk` so it reaches a real inbox.

Growatt's API isn't official, and every user's traffic comes from Vercel's addresses. Growatt could rate-limit or block it.
