import { Link } from "react-router";
import AppLogo from "../../components/AppLogo";
import LegalLinks from "../../components/LegalLinks";
import type { LegalPageProps } from "../../types/Legal";
import { LAST_UPDATED } from "./legalInfo";

// The frame around the privacy and terms pages. Open to everyone, signed in or
// not, so it doesn't use AppLayout.
const LegalPage = ({ title, children }: LegalPageProps) => (
  <div className="min-h-screen bg-gray-950 text-gray-100">
    <header className="border-b border-gray-800 px-6 py-4">
      <Link
        to="/"
        className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
      >
        <AppLogo className="size-7 shrink-0" />
        Energy Dashboard
      </Link>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8 text-sm text-gray-300 leading-relaxed">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-gray-500">Last updated {LAST_UPDATED}</p>
      </div>
      {children}
    </main>
    <footer className="pb-8">
      <LegalLinks />
    </footer>
  </div>
);

export default LegalPage;
