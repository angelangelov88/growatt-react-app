import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import { GROWATT_RESET } from "../../lib/dailyExport";
import useAuth from "../auth/useAuth";
import DailyExportSwitch from "./DailyExportSwitch";
import useSettings from "./useSettings";

// Export every day. Growatt clears export times each night, so the 5-minute
// check puts back the ones last applied on the dashboard. Only with Growatt.
const DailyExportCard = () => {
  const { me } = useAuth();
  const settings = useSettings();

  const renderBody = () => {
    if (!(me?.hasGrowatt ?? false))
      return (
        <p className="text-sm text-gray-400">
          Add your Growatt details below to use this.
        </p>
      );
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <DailyExportSwitch saved={settings.data} />;
  };

  return (
    <section
      aria-labelledby="daily-export-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="daily-export-heading"
          className="text-base font-semibold text-white"
        >
          Export to grid settings
        </h2>
        <InfoTip label="Export to grid settings">
          <p>
            Growatt clears your inverter&apos;s export times every night at{" "}
            {GROWATT_RESET}. With <b>Export every day</b> on, we check a few
            minutes later and put back the ones you last applied on the
            dashboard&apos;s Export to grid card.
          </p>
          <p>
            When you turn it on, we keep the export times already on your
            inverter. A slot across {GROWATT_RESET} pauses for about 5 minutes.
          </p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default DailyExportCard;
