import AutomationCard from "./AutomationCard";
import CredentialsCard from "./CredentialsCard";
import PasswordCard from "./PasswordCard";
import SecurityCard from "./SecurityCard";

const SettingsPage = () => (
  <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
    <h1 className="text-xl font-semibold text-white">Settings</h1>
    <CredentialsCard />
    <AutomationCard />
    <PasswordCard />
    <SecurityCard />
  </main>
);

export default SettingsPage;
