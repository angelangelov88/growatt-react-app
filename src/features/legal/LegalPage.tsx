import type { LegalPageProps } from "../../types/Legal";
import { LAST_UPDATED } from "./legalInfo";

// The content of the privacy, terms, about and contact pages. Open to
// everyone, signed in or not; AppLayout adds the header and footer.
const LegalPage = ({ title, children, showUpdated = true }: LegalPageProps) => (
  <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8 text-sm text-gray-300 leading-relaxed">
    <div>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      {showUpdated && (
        <p className="mt-1 text-gray-500">Last updated {LAST_UPDATED}</p>
      )}
    </div>
    {children}
  </main>
);

export default LegalPage;
