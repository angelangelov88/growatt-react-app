import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import AutomationSwitch from "./AutomationSwitch";
import useSettings from "./useSettings";

// Automatic charging: the on/off switch.
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
    return <AutomationSwitch saved={settings.data} canTurnOn={canTurnOn} />;
  };

  return (
    <section
      aria-labelledby="automation-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="automation-heading"
          className="text-base font-semibold text-white"
        >
          Automatic charging
        </h2>
        <InfoTip label="Automatic charging">
          <p>
            When it&apos;s on, we check your Octopus slots every 5 minutes and
            set your battery charge times on your inverter for you.
          </p>
          <p>It uses your battery charging settings below.</p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default AutomationCard;
