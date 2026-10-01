// Colours follow the theme (light or dark, set on <html data-theme>). Classes
// are written for the dark theme: gray, and the accents' light and dark ends,
// are CSS variables (src/index.css) that the light theme mirrors, so
// text-gray-400 is light grey in dark and dark grey in light. Accent 500–700
// (solid buttons with white text) and neutral, slate and zinc don't change.
// text-strong is the brightest text: white in dark, near black in light.
const fromVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const shades = (color, steps) =>
  Object.fromEntries(steps.map((s) => [s, fromVar(`${color}-${s}`)]));

const GRAY = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ACCENT = [200, 300, 400, 800, 900, 950];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        strong: fromVar("strong"),
        gray: shades("gray", GRAY),
        violet: shades("violet", ACCENT),
        red: shades("red", ACCENT),
        emerald: shades("emerald", ACCENT),
        amber: shades("amber", ACCENT),
        blue: shades("blue", ACCENT),
      },
    },
  },
  plugins: [],
};
