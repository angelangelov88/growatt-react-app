import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HELLO_EMAIL } from "../src/lib/contactInfo";
import { contactSchema } from "../src/lib/contactSchema";
import { checkOrigin } from "./_lib/csrf";
import { allowMethods, sendError } from "./_lib/http";
import { countHit, limitByIp } from "./_lib/rateLimit";

const FAILED = `Your message couldn't be sent. Try again later, or email ${HELLO_EMAIL}`;
const SENT = "Thanks, your message is on its way";

// POST { name, email, message } → 202. Emails the message to HELLO_EMAIL
// through Resend's API, with Reply-To set to the sender so a reply goes
// straight to them. Nothing is stored, and the message and address are never
// logged. Open to everyone, signed in or not.
const handler = async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST"]) || !checkOrigin(req, res)) return;
  const body = contactSchema.safeParse(req.body);
  if (!body.success) {
    sendError(
      res,
      400,
      "invalid_input",
      body.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }
  const { name, email, message, website } = body.data;
  // A bot filled the hidden field: pretend it worked, so it doesn't try again.
  if (website) {
    res.status(202).json({ message: SENT });
    return;
  }
  if (!(await limitByIp(req, res, "contact"))) return;
  if ((await countHit("contactAll", "all")) > 0) {
    sendError(res, 429, "rate_limited", FAILED);
    return;
  }

  const { RESEND_API_KEY, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM) {
    console.error("contact form: RESEND_API_KEY or CONTACT_FROM is not set");
    sendError(res, 503, "email_unavailable", FAILED);
    return;
  }
  // Plain text only, so nothing in the message can run as HTML in the inbox.
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [HELLO_EMAIL],
      reply_to: email,
      subject: "Kelpwatt contact form",
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!sent?.ok) {
    console.error("contact form: Resend failed:", sent?.status ?? "no reply");
    sendError(res, 502, "email_failed", FAILED);
    return;
  }
  res.status(202).json({ message: SENT });
};

export default handler;
