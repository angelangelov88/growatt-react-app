import { useState } from "react";
import useToast from "../../contexts/useToast";
import useAuth from "../auth/useAuth";
import PasswordForm from "./PasswordForm";

// The password used to log in with email: change it, or, for Google users,
// add one. Adding a password keeps Google sign-in working.
const PasswordCard = () => {
  const { me } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const hasPassword = me?.hasPassword ?? false;

  return (
    <section
      aria-labelledby="password-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <h2
        id="password-heading"
        className="text-base font-semibold text-white mb-4"
      >
        Password
      </h2>
      {isEditing ? (
        <PasswordForm
          onDone={(message) => {
            setIsEditing(false);
            showToast(message, "success");
          }}
          onCancel={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            {hasPassword
              ? "Changing your password logs out your other devices."
              : "You log in with Google. You can also add a password, so you can log in with your email if you can't use Google. Google sign-in keeps working."}
          </p>
          <button
            onClick={() => {
              setIsEditing(true);
            }}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors shrink-0"
          >
            {hasPassword ? "Change password" : "Add a password"}
          </button>
        </div>
      )}
    </section>
  );
};

export default PasswordCard;
