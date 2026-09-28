import type { AuthCardProps } from "../../types/Auth";

// The frame around the login, sign-up and MFA pages.
const AuthCard = ({ title, children }: AuthCardProps) => (
  <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm">
      <p className="text-center text-lg font-semibold tracking-tight text-white mb-6">
        ⚡ Energy Dashboard
      </p>
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
        <h1 className="text-base font-semibold text-white mb-5">{title}</h1>
        {children}
      </div>
    </div>
  </main>
);

export default AuthCard;
