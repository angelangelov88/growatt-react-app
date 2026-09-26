import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  const { GITHUB_TOKEN, GITHUB_REPO } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res
      .status(500)
      .json({ error: "Missing GITHUB_TOKEN or GITHUB_REPO env vars" });
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-growatt.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).json({ error: text });
  }

  res.status(204).end();
}
