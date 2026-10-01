import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import FormAlert from "../../components/FormAlert";
import { apiRequest } from "../../lib/apiClient";
import type { AccountExport } from "../../types/Api";
import DeleteAccountForm from "./DeleteAccountForm";

// Saves the export as a file, through a temporary link.
const download = (data: AccountExport) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kelpwatt-data-${data.exportedAt.slice(0, 10)}.json`;
  link.click();
  // After the click has started the download.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

// Your data: download everything stored about you, or delete the account.
const DangerZoneCard = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const exportData = useMutation({
    mutationFn: () => apiRequest<AccountExport>("account"),
    onSuccess: download,
    // Forgotten once downloaded, rather than kept in the query cache.
    gcTime: 0,
  });

  return (
    <section
      aria-labelledby="data-heading"
      className="rounded-2xl bg-gray-900 border border-red-900/60 p-6"
    >
      <h2
        id="data-heading"
        className="text-base font-semibold text-strong mb-4"
      >
        Your data
      </h2>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              Download everything stored about you: your account, settings,
              which logins are saved (never the secrets) and the activity log.
              You can also read the log on the{" "}
              <Link to="/activity" className="text-violet-400 hover:underline">
                Activity page
              </Link>
              .
            </p>
            <button
              onClick={() => {
                exportData.mutate();
              }}
              disabled={exportData.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {exportData.isPending ? "Preparing…" : "Download"}
            </button>
          </div>
          {exportData.error && <FormAlert message={exportData.error.message} />}
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-800 pt-6">
          <h3 className="text-sm font-semibold text-red-300">Delete account</h3>
          <p className="text-sm text-gray-400">
            Deletes your login, your saved Growatt and Octopus details, your
            settings and the activity log, and stops automation. Your Growatt
            and Octopus accounts themselves aren&apos;t touched. This can&apos;t
            be undone.
          </p>
          {isDeleting ? (
            <DeleteAccountForm
              onCancel={() => {
                setIsDeleting(false);
              }}
            />
          ) : (
            <button
              onClick={() => {
                setIsDeleting(true);
              }}
              className="self-start px-3 py-1.5 rounded-xl text-sm font-medium text-red-300 border border-red-900 hover:bg-red-950 transition-colors"
            >
              Delete account…
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default DangerZoneCard;
