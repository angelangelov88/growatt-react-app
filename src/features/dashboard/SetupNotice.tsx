import { Link } from "react-router";
import type { SetupNoticeProps } from "../../types/Dashboard";
import { OCTOPUS_BENEFITS, PROVIDERS } from "../settings/providers";

// Shown until the user has saved their Growatt login, which the app needs.
// Octopus is optional, so it's only suggested.
const SetupNotice = ({ hasOctopus }: SetupNoticeProps) => (
  <section
    aria-labelledby="setup-heading"
    className="rounded-2xl bg-gray-900 border border-violet-800/60 p-6 flex flex-col gap-4"
  >
    <h2 id="setup-heading" className="text-base font-semibold text-white">
      Finish setting up
    </h2>
    <ul className="flex flex-col gap-2 text-sm text-gray-400">
      <li>
        <span className="font-medium text-gray-200">
          Add your {PROVIDERS.growatt.secret}.
        </span>{" "}
        {PROVIDERS.growatt.neededFor}.
      </li>
      {!hasOctopus && (
        <li>
          <span className="font-medium text-gray-200">Optional:</span> add your{" "}
          {PROVIDERS.octopus.secret} {OCTOPUS_BENEFITS}.
        </li>
      )}
    </ul>
    <Link
      to="/settings"
      className="self-start px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
    >
      Go to Settings
    </Link>
  </section>
);

export default SetupNotice;
