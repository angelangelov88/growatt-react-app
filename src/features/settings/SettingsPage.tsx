import AutomationCard from "./AutomationCard";
import CredentialsCard from "./CredentialsCard";
import DangerZoneCard from "./DangerZoneCard";
import PasswordCard from "./PasswordCard";
import SecurityCard from "./SecurityCard";

const SettingsPage = () => (
  <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
    <h1 className="text-xl font-semibold text-white">Settings</h1>
    <CredentialsCard />
    <AutomationCard />
    <PasswordCard />
    <SecurityCard />
    <DangerZoneCard />
  </main>
);

export default SettingsPage;
