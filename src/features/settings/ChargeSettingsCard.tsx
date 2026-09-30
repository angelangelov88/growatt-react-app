import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import ChargeSettingsForm from "./ChargeSettingsForm";
import useSettings from "./useSettings";

// How the inverter charges from the grid. Used by automatic charging and by
// the green button on the dashboard's Octopus card, so only with Octopus.
const ChargeSettingsCard = () => {
  const { me } = useAuth();
  const settings = useSettings();

  const renderBody = () => {
    if (!(me?.hasOctopus ?? false))
      return (
        <p className="text-sm text-gray-400">
          These are used with your Octopus slots. Add your Octopus details below
          to use them.
        </p>
      );
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <ChargeSettingsForm saved={settings.data} />;
  };

  return (
    <section
      aria-labelledby="charge-settings-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="charge-settings-heading"
          className="text-base font-semibold text-white"
        >
          Battery First settings
        </h2>
        <InfoTip label="Battery First settings">
          <p>
            How the inverter charges from the grid in Battery First. Used by
            automatic charging and by the green button on the dashboard&apos;s
            Octopus card.
          </p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default ChargeSettingsCard;
