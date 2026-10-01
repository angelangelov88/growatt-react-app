import useTheme from "../contexts/useTheme";

// The header's quick switch between light and dark, signed in or not: a moon
// in dark, a sun in light. Settings → Appearance also has System.
const ThemeToggle = () => {
  const { resolved, setPreference } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        setPreference(next);
      }}
      className="shrink-0 rounded-xl p-2 text-gray-300 hover:bg-gray-800 hover:text-strong transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        {resolved === "dark" ? (
          <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
};

export default ThemeToggle;
