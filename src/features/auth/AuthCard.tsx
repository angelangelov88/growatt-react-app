import AppLogo from "../../components/AppLogo";
import BetaBadge from "../../components/BetaBadge";
import LegalLinks from "../../components/LegalLinks";
import Wordmark from "../../components/Wordmark";
import type { AuthCardProps } from "../../types/Auth";

// The frame around the login, sign-up and MFA pages.
const AuthCard = ({ title, children }: AuthCardProps) => (
  <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-3 mb-6 text-center">
        <p className="flex flex-col items-center gap-3 text-lg font-semibold tracking-tight text-white">
          <AppLogo className="size-12" />
          <span className="flex items-center gap-2.5">
            <Wordmark />
            <BetaBadge />
          </span>
        </p>
        {/* Where the name comes from, for first-time visitors (see the README). */}
        <p className="text-sm text-gray-400 max-w-xs">
          Kelp grows fast by the sea; watts are power. Your Growatt battery,
          charged when Octopus power is cheapest.
        </p>
      </div>
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <h1 className="text-base font-semibold text-white mb-5">{title}</h1>
        {children}
      </div>
      <div className="mt-6">
        <LegalLinks />
      </div>
    </div>
  </main>
);

export default AuthCard;
