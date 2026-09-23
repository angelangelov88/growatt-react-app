import type { VercelRequest, VercelResponse } from "@vercel/node";

const TARGET = "https://server.growatt.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.query.path as string) ?? "";
  const url = `${TARGET}/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers["content-type"] as string ?? "application/x-www-form-urlencoded",
  };
  if (req.headers.cookie) headers["Cookie"] = req.headers.cookie;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "POST" ? new URLSearchParams(req.body).toString() : undefined,
  });

  const setCookie = upstream.headers.getSetCookie?.() ?? [];
  setCookie.forEach((c) => res.appendHeader("Set-Cookie", c));
  res.status(upstream.status).send(await upstream.text());
}
