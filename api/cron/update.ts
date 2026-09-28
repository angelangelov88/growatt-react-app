import { createHash, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CronSummary } from "../../src/types/Server";
import { runAutomation } from "../_lib/automation";
import { automationUserIds } from "../_lib/db";
import { allowMethods, sendError } from "../_lib/http";

// Each user takes 25–35s, mostly the inverter's gaps between commands.
export const maxDuration = 60;

// Users run in parallel, each with their own Growatt client. With many users,
// this should fan out to one request per user instead.
const CONCURRENCY = 5;

// Compares hashes so the check takes the same time whatever the header holds.
const isAuthorized = (req: VercelRequest) => {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization;
  if (!secret || typeof header !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
};

// GET with Authorization: Bearer <CRON_SECRET> → CronSummary. Applies Octopus
// slots to the inverter of every user with automatic charging on. Called by the
// GitHub workflow on its schedule (GET, like Vercel Cron, so either can call it).
export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!allowMethods(req, res, ["GET"])) return;
  if (!isAuthorized(req)) {
    sendError(res, 401, "unauthorized", "Unauthorized");
    return;
  }

  const userIds = await automationUserIds();
  const summary: CronSummary = {
    users: userIds.length,
    applied: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
  };
  let next = 0;
  const worker = async () => {
    while (next < userIds.length) {
      summary[await runAutomation(userIds[next++])]++;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, userIds.length) }, worker),
  );
  res.json(summary);
};
