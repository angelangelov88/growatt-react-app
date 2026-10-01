import AppLogo from "../../components/AppLogo";
import type { AuthCardProps } from "../../types/Auth";

// The card on the login, sign-up and MFA pages. AppLayout adds the header,
// with the name, and the footer.
const AuthCard = ({ title, children }: AuthCardProps) => (
  <main className="flex-1 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center gap-3 mb-6 text-center">
        <AppLogo className="size-12" />
        {/* Where the name comes from, for first-time visitors (see the README). */}
        <p className="text-sm text-gray-400 max-w-xs">
          Kelp grows fast by the sea; watts are power. Your Growatt battery,
          charged when Octopus power is cheapest.
        </p>
      </div>
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <h1 className="text-base font-semibold text-strong mb-5">{title}</h1>
        {children}
      </div>
    </div>
  </main>
);

export default AuthCard;
