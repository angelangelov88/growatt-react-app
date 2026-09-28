import FormAlert from "../../components/FormAlert";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import AutomationSwitch from "./AutomationSwitch";
import ChargeSettingsForm from "./ChargeSettingsForm";
import useSettings from "./useSettings";

// Automatic charging: the switch, and the charge settings it uses.
const AutomationCard = () => {
  const { me } = useAuth();
  const settings = useSettings();
  const canTurnOn = (me?.hasGrowatt ?? false) && (me?.hasOctopus ?? false);

  const renderBody = () => {
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return (
      <div className="flex flex-col gap-6">
        <AutomationSwitch saved={settings.data} canTurnOn={canTurnOn} />
        <ChargeSettingsForm saved={settings.data} />
      </div>
    );
  };

  return (
    <section
      aria-labelledby="automation-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <h2
        id="automation-heading"
        className="text-base font-semibold text-white mb-4"
      >
        Automatic charging
      </h2>
      {renderBody()}
    </section>
  );
};

export default AutomationCard;
