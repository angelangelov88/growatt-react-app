import Spinner from "../Spinner";

const NotReadYet = ({
  isReading,
  hint,
}: {
  isReading: boolean;
  hint: string;
}) => (
  <div className="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center">
    {isReading ? (
      <p className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Spinner />
        Loading settings from your inverter…
      </p>
    ) : (
      <>
        <p className="text-sm text-gray-300">Settings not loaded yet</p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </>
    )}
  </div>
);

export default NotReadYet;
