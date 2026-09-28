import type { ApiError } from "../types/Api";

// The app's only way to reach the server. Sends the session cookie (same
// origin only) and turns every failure into an ApiRequestError, whose message
// is safe to show.

class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ApiError).code === "string" &&
  typeof (value as ApiError).message === "string";

// "in 5 minutes", from a Retry-After header in seconds.
const describeWait = (retryAfter: string | null) => {
  const seconds = Number(retryAfter);
  if (!retryAfter || !Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return "in a minute";
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "in a minute" : `in ${String(minutes)} minutes`;
};

const readJson = async (res: Response): Promise<unknown> => {
  if (!res.headers.get("content-type")?.includes("application/json"))
    return null;
  return res.json().catch(() => null);
};

// Calls /api/<path>. Resolves to the JSON body, or undefined for an empty
// reply (204). body, if given, is sent as JSON.
const apiRequest = async <T = undefined>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(
      0,
      "network",
      "Couldn't reach the server, check your connection",
    );
  }
  const json = await readJson(res);
  if (res.ok) return json as T;
  if (res.status === 429) {
    const wait = describeWait(res.headers.get("Retry-After"));
    throw new ApiRequestError(
      429,
      "rate_limited",
      wait
        ? `Too many attempts, try again ${wait}`
        : "Too many attempts, try again later",
    );
  }
  if (isApiError(json))
    throw new ApiRequestError(res.status, json.code, json.message);
  throw new ApiRequestError(
    res.status,
    "server_error",
    "Something went wrong, try again",
  );
};

export { ApiRequestError, apiRequest };
