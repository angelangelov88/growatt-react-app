import type { VercelRequest, VercelResponse } from "@vercel/node";

export const maxDuration = 60;

const TARGET = "https://server.growatt.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.query.path as string) ?? "";
  const url = `${TARGET}/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers["content-type"] as string ?? "application/x-www-form-urlencoded",
  };
  const sessionCookie = req.headers["x-session-cookie"] as string | undefined;
  if (sessionCookie) headers["Cookie"] = sessionCookie;
  else if (req.headers.cookie) headers["Cookie"] = req.headers.cookie;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "POST" ? new URLSearchParams(req.body).toString() : undefined,
  });

  const setCookie = upstream.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    // Forward as both Set-Cookie (for browser) and x-set-cookie (readable by fetch)
    setCookie.forEach((c) => res.appendHeader("Set-Cookie", c));
    res.setHeader("x-set-cookie", setCookie.join(", "));
  }
  res.status(upstream.status).send(await upstream.text());
}
