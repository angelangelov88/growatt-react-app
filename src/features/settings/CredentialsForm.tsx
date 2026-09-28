import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import CodeField from "../../components/CodeField";
import FormAlert from "../../components/FormAlert";
import PasswordField from "../../components/PasswordField";
import SubmitButton from "../../components/SubmitButton";
import TextField from "../../components/TextField";
import { ApiRequestError, apiRequest } from "../../lib/apiClient";
import { currentPassword, mfaSchema } from "../../lib/authSchemas";
import { credentialsSchema } from "../../lib/credentialSchemas";
import { fieldErrors } from "../../lib/fieldErrors";
import type { Credentials, CredentialsBody, MfaBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import type { CredentialsFormProps } from "../../types/Settings";
import GoogleButton from "../auth/GoogleButton";
import useAuth, { ME_KEY } from "../auth/useAuth";
import { PROVIDERS } from "./providers";
import { CREDENTIALS_KEY } from "./useCredentials";

const stepUpSchema = z.object({ currentPassword });

// Every field starts empty rather than missing, so the checks give their own
// messages ("Enter your Growatt username") instead of zod's generic one.
const EMPTY = {
  growatt: { user: "", password: "", serial: "" },
  octopus: { apiKey: "", account: "" },
};

// Adding or replacing a Growatt login or an Octopus API key. The server checks
// them with Growatt or Octopus before saving, and wants proof it's really the
// user, in the same ways as changing the password.
const CredentialsForm = ({
  provider,
  onDone,
  onCancel,
}: CredentialsFormProps) => {
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const hasMfa = me?.mfaEnrolled ?? false;
  const needsCurrent = (me?.hasPassword ?? false) && !hasMfa;
  const { name, secret } = PROVIDERS[provider];

  const [values, setValues] = useState<Record<string, string>>(EMPTY[provider]);
  // The user's password for this app, to confirm it's them.
  const [myPassword, setMyPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: async ({
      body,
      verify,
    }: {
      body: CredentialsBody;
      verify?: MfaBody;
    }) => {
      if (verify)
        await apiRequest("auth/mfa", { method: "POST", body: verify });
      return apiRequest<Credentials>("credentials", { method: "PUT", body });
    },
    onSuccess: async (status) => {
      queryClient.setQueryData(CREDENTIALS_KEY, status);
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      onDone(`${secret} saved`);
    },
    // Forgotten as soon as the form closes, so the secrets it was sent aren't
    // kept in the query cache.
    gcTime: 0,
  });
  // A Google user whose login is over 5 minutes old: they log in again.
  const needsGoogle =
    save.error instanceof ApiRequestError &&
    save.error.code === "reauth_required";

  const field = (key: string) => ({
    value: values[key],
    onChange: (e: { target: { value: string } }) => {
      setValues((old) => ({ ...old, [key]: e.target.value }));
    },
    error: errors[key],
    disabled: save.isPending,
    // Not the app's own login, so password managers shouldn't fill it in.
    autoComplete: "off",
    spellCheck: false,
    required: true,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bodyCheck = credentialsSchema.safeParse({ ...values, provider });
    const stepUpCheck = needsCurrent
      ? stepUpSchema.safeParse({ currentPassword: myPassword })
      : null;
    const codeCheck = hasMfa
      ? mfaSchema.safeParse({ action: "verify", code: code.trim() })
      : null;
    setErrors({
      ...(bodyCheck.success ? {} : fieldErrors(bodyCheck.error)),
      ...(stepUpCheck && !stepUpCheck.success
        ? fieldErrors(stepUpCheck.error)
        : {}),
      ...(codeCheck && !codeCheck.success ? fieldErrors(codeCheck.error) : {}),
    });
    if (
      !bodyCheck.success ||
      (stepUpCheck && !stepUpCheck.success) ||
      (codeCheck && !codeCheck.success)
    )
      return;
    save.mutate({
      body: {
        ...bodyCheck.data,
        currentPassword: stepUpCheck?.data.currentPassword,
      },
      verify: codeCheck?.data,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 max-w-sm"
    >
      {needsGoogle ? (
        <div className="flex flex-col gap-3">
          <FormAlert
            message={`For your security, log in with Google again first. You'll come back here, and enter your ${name} details again.`}
          />
          <GoogleButton next="settings" label="Log in with Google again" />
        </div>
      ) : (
        save.error && <FormAlert message={save.error.message} />
      )}
      {provider === "growatt" ? (
        <>
          <TextField
            id="growatt-user"
            label="Growatt username"
            hint="The one you use for the ShinePhone app or server.growatt.com"
            autoFocus
            {...field("user")}
          />
          <PasswordField
            id="growatt-password"
            label="Growatt password"
            {...field("password")}
          />
          <TextField
            id="growatt-serial"
            label="Inverter serial number"
            hint="In the ShinePhone app, or on the sticker on the inverter"
            autoCapitalize="characters"
            {...field("serial")}
          />
        </>
      ) : (
        <>
          <PasswordField
            id="octopus-key"
            label="Octopus API key"
            hint="In your Octopus account, under Personal details → API access. It starts with sk_live_"
            autoFocus
            {...field("apiKey")}
          />
          <TextField
            id="octopus-account"
            label="Account number"
            hint="On your bills, like A-1234ABCD"
            autoCapitalize="characters"
            {...field("account")}
          />
        </>
      )}
      {needsCurrent && (
        <>
          {/* Tells password managers which account the password is for. */}
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={me?.email ?? ""}
            readOnly
            hidden
          />
          <PasswordField
            id="current-password"
            label="Your password for this app"
            hint="To confirm it's you"
            autoComplete="current-password"
            value={myPassword}
            onChange={(e) => {
              setMyPassword(e.target.value);
            }}
            error={errors.currentPassword}
            disabled={save.isPending}
            required
          />
        </>
      )}
      {hasMfa && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-gray-400">
            To confirm it&apos;s you, enter a code from your authenticator app.
          </p>
          <CodeField
            value={code}
            onChange={setCode}
            error={errors.code}
            disabled={save.isPending}
          />
        </div>
      )}
      <SubmitButton
        label="Check and save"
        pendingLabel={`Checking with ${name}…`}
        isPending={save.isPending}
      />
      <button
        type="button"
        onClick={onCancel}
        disabled={save.isPending}
        className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
};

export default CredentialsForm;
