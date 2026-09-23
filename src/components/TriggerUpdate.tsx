import { useMutation } from "@tanstack/react-query";

const triggerUpdate = async () => {
  if (import.meta.env.DEV) {
    // In dev, call GitHub API directly (no serverless function available)
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    if (!token || !repo) throw new Error("Missing VITE_GITHUB_TOKEN or VITE_GITHUB_REPO in .env");
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/update-growatt.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return;
  }
  const res = await fetch("/api/trigger", { method: "POST" });
  if (!res.ok && res.status !== 204) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Failed with status ${res.status}`);
  }
};

const TriggerUpdate = () => {
  const mutation = useMutation({ mutationFn: triggerUpdate });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Automation</h2>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || mutation.isSuccess}
        className="bg-purple-400 p-2 rounded-lg disabled:opacity-50"
      >
        {mutation.isPending
          ? "Triggering..."
          : mutation.isSuccess
            ? "Triggered ✓"
            : "Run Update Now"}
      </button>
      {mutation.isError && (
        <p className="text-red-500 mt-2">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-gray-500 mt-2 text-sm">
          Check GitHub Actions for progress
        </p>
      )}
    </div>
  );
};

export default TriggerUpdate;
