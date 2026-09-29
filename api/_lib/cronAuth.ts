import { createHash, timingSafeEqual } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

// True when the request carries Authorization: Bearer <CRON_SECRET>. Compares
// hashes so the check takes the same time whatever the header holds.
const isCronRequest = (req: VercelRequest) => {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization;
  if (!secret || typeof header !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
};

export { isCronRequest };
