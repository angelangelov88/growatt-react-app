import Spinner from "./Spinner";
import type { NotReadYetProps } from "../types/Common";

// The placeholder a card shows before its data is loaded, and while loading it.
const NotReadYet = ({
  isReading,
  loadingMessage,
  emptyMessage,
  hint,
}: NotReadYetProps) => (
  <div className="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center">
    {isReading ? (
      <p className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Spinner />
        {loadingMessage}
      </p>
    ) : (
      <>
        <p className="text-sm text-gray-300">{emptyMessage}</p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </>
    )}
  </div>
);

export default NotReadYet;
