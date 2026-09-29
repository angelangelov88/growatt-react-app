import { Link } from "react-router";
import { OCTOPUS_BENEFITS, PROVIDERS } from "../settings/providers";

// For users with Growatt only: a quiet pointer to what Octopus adds.
const OctopusHint = () => (
  <p className="text-sm text-gray-400 text-center">
    On an Octopus tariff?{" "}
    <Link to="/settings" className="text-violet-400 hover:underline">
      Add your {PROVIDERS.octopus.secret}
    </Link>{" "}
    {OCTOPUS_BENEFITS}.
  </p>
);

export default OctopusHint;
