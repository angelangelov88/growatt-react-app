import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../contexts/ToastContext";

const triggerUpdate = async () => {
  if (import.meta.env.DEV) {
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
  const { showToast } = useToast();
  const mutation = useMutation({ mutationFn: triggerUpdate });

  useEffect(() => {
    if (mutation.isError) showToast(`Trigger failed: ${(mutation.error as Error).message}`, "error");
  }, [mutation.isError]);

  useEffect(() => {
    if (mutation.isSuccess) showToast("Automation triggered — check GitHub Actions for progress", "success");
  }, [mutation.isSuccess]);

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Automation</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manually trigger the Octopus → Growatt sync</p>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || mutation.isSuccess}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? "Triggering…" : mutation.isSuccess ? "Triggered ✓" : "Run Now"}
        </button>
      </div>
    </div>
  );
};

export default TriggerUpdate;
