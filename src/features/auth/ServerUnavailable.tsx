import type { ServerUnavailableProps } from "../../types/Auth";
import AuthCard from "./AuthCard";

// Shown when the app can't find out whether the user is logged in.
const ServerUnavailable = ({ onRetry, isRetrying }: ServerUnavailableProps) => (
  <AuthCard title="Couldn't reach the server">
    <p className="text-sm text-gray-400 mb-4">
      Check your connection and try again.
    </p>
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {isRetrying ? "Trying…" : "Try again"}
    </button>
  </AuthCard>
);

export default ServerUnavailable;
