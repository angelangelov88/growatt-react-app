import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import { apiRequest } from "../../lib/apiClient";
import type { Credentials } from "../../types/Api";
import type { CredentialsRowProps } from "../../types/Settings";
import { ME_KEY } from "../auth/useAuth";
import CredentialsForm from "./CredentialsForm";
import { PROVIDERS } from "./providers";
import { CREDENTIALS_KEY } from "./useCredentials";

const verifiedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// One provider in the credentials card: saved or not, with Add, Replace and
// Remove. The secrets are write-only: once saved, only the serial or account
// number is shown.
const CredentialsRow = ({
  provider,
  saved,
  isEditing,
  onEdit,
  onDone,
  onCancel,
}: CredentialsRowProps) => {
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);
  const { name, secret, neededFor } = PROVIDERS[provider];
  const headingId = `${provider}-heading`;

  const remove = useMutation({
    mutationFn: () =>
      apiRequest<Credentials>(`credentials?provider=${provider}`, {
        method: "DELETE",
      }),
    onSuccess: async (status) => {
      queryClient.setQueryData(CREDENTIALS_KEY, status);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      setIsRemoving(false);
      onDone(`${secret} removed`);
    },
  });

  const renderBody = () => {
    if (isEditing)
      return (
        <CredentialsForm
          provider={provider}
          onDone={onDone}
          onCancel={onCancel}
        />
      );
    if (isRemoving && saved)
      return (
        <div className="flex flex-col gap-3">
          {remove.error && <FormAlert message={remove.error.message} />}
          <p className="text-sm text-gray-400">
            Remove your {secret}? {neededFor}, and automation turns off.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                remove.mutate();
              }}
              disabled={remove.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {remove.isPending ? "Removing…" : "Remove"}
            </button>
            <button
              onClick={() => {
                remove.reset();
                setIsRemoving(false);
              }}
              disabled={remove.isPending}
              className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-400">
          {saved ? (
            <>
              {provider === "growatt" ? "Inverter" : "Account"}{" "}
              <span className="text-gray-200">{saved.identifier}</span>, checked{" "}
              {verifiedDate.format(new Date(saved.verifiedAt))}
            </>
          ) : (
            `${neededFor}.`
          )}
        </p>
        <div className="flex gap-2 shrink-0">
          {saved && (
            <button
              onClick={() => {
                setIsRemoving(true);
              }}
              aria-describedby={headingId}
              className="px-3 py-1.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={onEdit}
            aria-describedby={headingId}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {saved ? "Replace" : "Add"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h3 id={headingId} className="text-sm font-semibold text-white">
          {name}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            saved
              ? "bg-emerald-950 text-emerald-300"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          {saved ? "Saved" : "Not set up"}
        </span>
      </div>
      {renderBody()}
    </div>
  );
};

export default CredentialsRow;
