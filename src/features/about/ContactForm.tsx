import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import SubmitButton from "../../components/SubmitButton";
import TextAreaField from "../../components/TextAreaField";
import TextField from "../../components/TextField";
import { apiRequest } from "../../lib/apiClient";
import { contactSchema } from "../../lib/contactSchema";
import { fieldErrors } from "../../lib/fieldErrors";
import type { ContactBody } from "../../types/Api";
import type { FieldErrors } from "../../types/Common";
import useAuth from "../auth/useAuth";

// Sends a message to the operator's inbox (POST /api/contact). The email is
// filled in for signed-in users.
const ContactForm = () => {
  const { me } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // The bot trap: people never see it, so it stays empty.
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const emailValue = email ?? me?.email ?? "";

  const send = useMutation({
    mutationFn: (body: ContactBody) =>
      apiRequest<{ message: string }>("contact", { method: "POST", body }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = contactSchema.safeParse({
      name,
      email: emailValue,
      message,
      website,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    send.mutate(parsed.data);
  };

  if (send.isSuccess)
    return (
      <div className="flex flex-col gap-3">
        <FormAlert message={send.data.message} tone="success" />
        <p>I&apos;ll reply to {emailValue}.</p>
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative flex flex-col gap-4 rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      {send.error && <FormAlert message={send.error.message} />}
      <TextField
        id="contact-name"
        label="Name"
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        error={errors.name}
        disabled={send.isPending}
        required
      />
      <TextField
        id="contact-email"
        label="Email"
        type="email"
        autoComplete="email"
        value={emailValue}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        hint="So I can reply"
        error={errors.email}
        disabled={send.isPending}
        required
      />
      <TextAreaField
        id="contact-message"
        label="Message"
        rows={6}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        hint="Never include passwords or API keys. I'll never need them"
        error={errors.message}
        disabled={send.isPending}
        required
      />
      {/* Off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0">
        <label htmlFor="contact-website">Leave this empty</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
          }}
        />
      </div>
      <SubmitButton
        label="Send message"
        pendingLabel="Sending…"
        isPending={send.isPending}
      />
    </form>
  );
};

export default ContactForm;
