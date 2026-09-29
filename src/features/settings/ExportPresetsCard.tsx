import FormAlert from "../../components/FormAlert";
import Spinner from "../../components/Spinner";
import ExportPresetsForm from "./ExportPresetsForm";
import useSettings from "./useSettings";

// The two Grid First preset buttons on the dashboard.
const ExportPresetsCard = () => {
  const settings = useSettings();

  const renderBody = () => {
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <ExportPresetsForm saved={settings.data} />;
  };

  return (
    <section
      aria-labelledby="export-presets-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <h2
        id="export-presets-heading"
        className="text-base font-semibold text-white mb-1"
      >
        Grid First presets
      </h2>
      <p className="text-sm text-gray-400 mb-5">
        The two preset buttons on the dashboard&apos;s Grid First card fill it
        in with these. Nothing changes on your inverter until you press Apply
        there.
      </p>
      {renderBody()}
    </section>
  );
};

export default ExportPresetsCard;
