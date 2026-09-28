import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

// Browser code runs on the user's machine: it must never pull in the server's
// modules, Supabase or the database client. They'd end up in the public bundle.
// Type imports are fine: they're removed at build time.
const SERVER_ONLY = {
  group: ["**/api/**", "@supabase/*", "postgres", "node:*"],
  caseSensitive: true,
  allowTypeImports: true,
  message:
    "Server only: the browser talks to the server through src/lib/apiClient.ts.",
};

// Code that runs on the server (api/, and the parts of src/ it imports).
const REACT_FREE = [
  {
    group: ["react", "react-dom", "react-router", "@tanstack/*"],
    message: "No React or UI here: this code runs on the server.",
  },
  {
    group: ["**/components/**", "**/features/**", "**/contexts/**"],
    message: "No React or UI here: this code runs on the server.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      "*.config.{js,mjs,cjs}",
      "scripts/.tmp-*",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The codebase uses `type` for object shapes.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    // Declaration files extend library types, which needs `interface` merging.
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/consistent-type-definitions": "off" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": ["error", { patterns: [SERVER_ONLY] }],
    },
  },
  {
    // Shared with the server, so no React or UI either. This replaces the rule
    // above for these files, so it repeats SERVER_ONLY.
    files: [
      "src/lib/**/*.ts",
      "src/types/Growatt.ts",
      "src/types/Octopus.ts",
      "src/types/GraphQL.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [SERVER_ONLY, ...REACT_FREE] },
      ],
    },
  },
  {
    // The server can use src/lib and src/types, never the UI.
    files: ["api/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: REACT_FREE }],
    },
  },
  {
    files: ["scripts/**/*.{ts,mts}", "api/**/*.ts", "vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
  // Last, so formatting is left to Prettier.
  prettier,
);
