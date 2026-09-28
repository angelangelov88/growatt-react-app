import useAuth from "../auth/useAuth";
import Growatt from "../growatt/Growatt";
import Octopus from "../octopus/Octopus";
import type { Provider } from "../../types/Api";
import SetupNotice from "./SetupNotice";

// Each card needs the user's saved logins: Octopus for the slots and Power Down
// sessions, Growatt for the inverter.
const DashboardPage = () => {
  const { me } = useAuth();
  const hasGrowatt = me?.hasGrowatt ?? false;
  const hasOctopus = me?.hasOctopus ?? false;
  const missing: Provider[] = [
    ...(hasGrowatt ? [] : ["growatt" as const]),
    ...(hasOctopus ? [] : ["octopus" as const]),
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="sr-only">Dashboard</h1>
      {missing.length > 0 && <SetupNotice missing={missing} />}
      {hasOctopus && <Octopus canApply={hasGrowatt} />}
      {hasGrowatt && <Growatt showSessions={hasOctopus} />}
    </main>
  );
};

export default DashboardPage;
