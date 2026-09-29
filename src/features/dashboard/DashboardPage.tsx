import useAuth from "../auth/useAuth";
import Growatt from "../growatt/Growatt";
import Octopus from "../octopus/Octopus";
import OctopusHint from "./OctopusHint";
import SetupNotice from "./SetupNotice";

// Each card needs the user's saved logins: Octopus for the slots and Power Down
// sessions, Growatt for the inverter. Growatt alone is enough to use the app.
const DashboardPage = () => {
  const { me } = useAuth();
  const hasGrowatt = me?.hasGrowatt ?? false;
  const hasOctopus = me?.hasOctopus ?? false;

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="sr-only">Dashboard</h1>
      {!hasGrowatt && <SetupNotice hasOctopus={hasOctopus} />}
      {hasOctopus && <Octopus canApply={hasGrowatt} />}
      {hasGrowatt && <Growatt showSessions={hasOctopus} />}
      {hasGrowatt && !hasOctopus && <OctopusHint />}
    </main>
  );
};

export default DashboardPage;
