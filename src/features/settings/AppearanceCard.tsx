import { useRef } from "react";
import type { KeyboardEvent } from "react";
import useTheme from "../../contexts/useTheme";
import { THEME_OPTIONS } from "../theme/theme";

// Light, dark or the device's setting. Changes straight away; saved to the
// account so other devices use it too.
const AppearanceCard = () => {
  const { preference, setPreference } = useTheme();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move the choice, as in any radio group.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const current = THEME_OPTIONS.findIndex((o) => o.value === preference);
    const next = (current + step + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    setPreference(THEME_OPTIONS[next].value);
    optionRefs.current[next]?.focus();
  };

  return (
    <section
      aria-labelledby="appearance-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <h2
        id="appearance-heading"
        className="text-base font-semibold text-strong mb-4"
      >
        Appearance
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <span id="theme-label" className="text-sm text-gray-200">
            Theme
          </span>
          <span id="theme-hint" className="text-sm text-gray-400">
            System follows your phone or computer&apos;s setting.
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="theme-label"
          aria-describedby="theme-hint"
          onKeyDown={handleKeyDown}
          className="inline-flex shrink-0 self-start gap-1 rounded-xl bg-gray-800 p-1 sm:self-auto"
        >
          {THEME_OPTIONS.map(({ value, label }, index) => {
            const isChecked = value === preference;
            return (
              <button
                key={value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isChecked}
                tabIndex={isChecked ? 0 : -1}
                onClick={() => {
                  setPreference(value);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                  isChecked
                    ? "bg-violet-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-strong"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AppearanceCard;
