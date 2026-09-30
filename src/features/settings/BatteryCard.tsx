import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import BatteryForm from "./BatteryForm";
import useSettings from "./useSettings";

// Battery size and max discharge power, for the dashboard's Export until
// battery % card. Growatt doesn't give either.
const BatteryCard = () => {
  const settings = useSettings();

  const renderBody = () => {
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <BatteryForm saved={settings.data} />;
  };

  return (
    <section
      aria-labelledby="battery-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <h2 id="battery-heading" className="text-base font-semibold text-white">
          Your battery
        </h2>
        <InfoTip label="Your battery">
          <p>
            <b>Battery size</b> is on your battery&apos;s spec sheet, as usable
            capacity. If you have more than one battery, add them up.
          </p>
          <p>
            <b>Max discharge power:</b> export at 100% and look at the battery
            discharge power in the Growatt app. At 95%, divide what it shows by
            0.95.
          </p>
        </InfoTip>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        The dashboard&apos;s Export until battery % card uses these to work out
        when your battery reaches the level you pick.
      </p>
      {renderBody()}
    </section>
  );
};

export default BatteryCard;
