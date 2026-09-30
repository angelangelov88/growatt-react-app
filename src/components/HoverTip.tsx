import { useId } from "react";
import type { HoverTipProps } from "../types/Common";

// A short note on hover, e.g. why a button is disabled. Hidden when tip is
// null. children gets the id for the button's aria-describedby, so screen
// readers read the note too. It sits at the right edge of the nearest
// positioned parent (e.g. a card header), not the button, so it stays on
// screen when the buttons wrap on a phone.
const HoverTip = ({ tip, children }: HoverTipProps) => {
  const id = useId();
  return (
    <span className="group">
      {children(tip ? id : undefined)}
      {tip && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        >
          {tip}
        </span>
      )}
    </span>
  );
};

export default HoverTip;
