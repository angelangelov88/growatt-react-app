import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import type { MfaEnrollment } from "../../types/Api";
import useAuth from "../auth/useAuth";
import MfaSetup from "./MfaSetup";
import MfaTurnOff from "./MfaTurnOff";

// Two-step login with an authenticator app: shows whether it's on, and sets
// it up or turns it off.
const SecurityCard = () => {
  const { me } = useAuth();
  const { showToast } = useToast();
  const [isTurningOff, setIsTurningOff] = useState(false);
  const enroll = useMutation({
    mutationFn: () =>
      apiRequest<MfaEnrollment>("auth/mfa", {
        method: "POST",
        body: { action: "enroll" },
      }),
  });
  const isOn = me?.mfaEnrolled ?? false;

  // reset() also forgets the setup key, so it doesn't stay in memory.
  const handleSetUpDone = () => {
    enroll.reset();
    showToast("Authenticator app turned on", "success");
  };
  const handleTurnOffDone = () => {
    setIsTurningOff(false);
    showToast(
      "Authenticator app turned off. You can delete its entry from the app",
      "success",
    );
  };

  const renderBody = () => {
    if (enroll.data)
      return (
        <MfaSetup
          enrollment={enroll.data}
          onDone={handleSetUpDone}
          onCancel={() => {
            enroll.reset();
          }}
        />
      );
    if (isTurningOff)
      return (
        <MfaTurnOff
          onDone={handleTurnOffDone}
          onCancel={() => {
            setIsTurningOff(false);
          }}
        />
      );
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            {isOn
              ? "Each time you log in, you also enter a code from your app."
              : "With an authenticator app, a stolen password isn't enough to get into your account."}
          </p>
          <button
            onClick={() => {
              if (isOn) setIsTurningOff(true);
              else enroll.mutate();
            }}
            disabled={enroll.isPending}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isOn ? "Turn off" : enroll.isPending ? "Starting…" : "Set up"}
          </button>
        </div>
        {enroll.error && <FormAlert message={enroll.error.message} />}
      </div>
    );
  };

  return (
    <section
      aria-labelledby="security-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <h2
          id="security-heading"
          className="text-base font-semibold text-white"
        >
          Authenticator app
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isOn
              ? "bg-emerald-950 text-emerald-300"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          {isOn ? "On" : "Off"}
        </span>
      </div>
      {renderBody()}
    </section>
  );
};

export default SecurityCard;
