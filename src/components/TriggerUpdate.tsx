import { useMutation } from "@tanstack/react-query";

const triggerUpdate = async () => {
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
