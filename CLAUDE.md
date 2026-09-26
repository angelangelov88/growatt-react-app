# CLAUDE.md

## Project Overview

React 18 + TypeScript app built with Vite, styled with Tailwind CSS. It controls a Growatt inverter (`tcpSet.do` calls in `src/lib/growattApi.ts`) and reads Octopus Energy data (GraphQL over `fetch`). Data fetching uses TanStack Query v5. `scripts/update-growatt.ts` runs in a GitHub Action and reuses the React-free modules in `src/lib/`, so keep them free of React and browser-only globals (ESLint blocks React, TanStack Query, component and context imports there).

## Coding Style

### Components

- Functional components only, no class components.
- **One component per file.** A component file contains only that component's JSX. Child or helper components go in their own files and are imported.
- Extract component logic into a custom hook only when it is large or reused; small components can keep their logic inline.
- Always destructure props.

### Functions and exports

- Use arrow functions for all declarations: `const myFunc = () => {}`. No `function` declarations.
- **All exports go at the end of the file**, including default exports. No inline `export const` / `export default function`.

  ```ts
  const helperOne = () => {};
  const helperTwo = () => {};
  const MyComponent = () => {};

  export { helperOne, helperTwo };
  export default MyComponent;
  ```

### Types

- **All `type` and `interface` declarations live in `src/types/`**, grouped by feature (`Growatt.ts`, `GrowattForm.ts`, `Octopus.ts`, `Toast.ts`, `GraphQL.ts`, `Common.ts`). This includes component props (named `<Component>Props`) and types used by only one file. Import them with `import type`.
- Types imported by the GitHub Action (`Growatt.ts`, `Octopus.ts`, `GraphQL.ts`) must stay free of React.
- Exception: `src/vite-env.d.ts` stays where it is, because Vite needs it there.

### Hooks

- Custom hooks are prefixed with `use` and are camelCase.
- Use `useMemo` / `useCallback` only when there's a real need (an expensive calculation, or a value passed to a memoised child or used as an effect dependency). Don't memoise by default.

### Imports

- Import hooks and types by name from `'react'`: `import { useState } from 'react';`, not `React.useState`.
- ES module imports only, never CommonJS `require`.

### Example

```tsx
import classNames from "classnames";
import type { ActionButtonProps } from "../types/Common";

const ActionButton = ({ label, isEnabled, onAction }: ActionButtonProps) => (
  <button
    onClick={onAction}
    className={classNames("px-3 py-1.5 rounded-xl", {
      "bg-blue-600": isEnabled,
      "bg-gray-700 opacity-40": !isEnabled,
    })}
  >
    {label}
  </button>
);

export default ActionButton;
```

## Naming Conventions

- Component files: PascalCase (`MyComponent.tsx`).
- Utility and hook files: camelCase (`chargePlan.ts`, `useGrowatt.ts`).
- Folder names: camelCase.
- Constants: UPPER_SNAKE_CASE (`QUEUE_GAP_MS`).
- Event handlers: camelCase prefixed with `handle` (`handleJoin`).
- Test files: component name + `.test.ts` (`MyComponent.test.ts`).

## Folder Structure

- `src/components/` — shared components used across features (`Spinner.tsx`, `TriggerUpdate.tsx`).
- `src/features/<feature>/` — a feature's components and hooks (`growatt/`, `octopus/`).
- `src/lib/` — React-free modules shared with the GitHub Action: API clients and domain logic (`growattApi.ts`, `chargePlan.ts`, `savingSessions.ts`).
- `src/contexts/` — React Context providers.
- `src/types/` — all TypeScript types and interfaces, one file per feature.
- `scripts/` — Node scripts run by GitHub Actions.

## Styling

- Tailwind CSS for all styling; global rules live in `src/index.css`.
- Use the `classNames` utility (`classnames` package; add it when first needed) for conditional classes. A simple ternary is fine for a single either/or class.

## State and Data

- React Context (in `src/contexts/`) and TanStack Query for state and data fetching.
- Suggest TanStack Query patterns (`queryOptions`, `useQuery`, `useMutation`) for any new data fetching.

## Error Handling and Type Safety

- Error boundaries at route/app level and around critical features, with fallback UI and error logging.
- Strict TypeScript (enabled in tsconfig). Avoid `any`; write type guards for runtime checks.
- API errors (Growatt and Octopus GraphQL): check `errors` in responses, handle network failures, show user-friendly messages, and type the responses.

## Accessibility

- Semantic HTML, proper ARIA labels, correct heading hierarchy, proper focus management.
- All interactive elements focusable, sensible tab order, focus trapped in modals, keyboard shortcuts where useful.
- WCAG 2.1 colour contrast, text alternatives, support for zoom and text resizing, visible focus indicators.

## Formatting and Linting

- Prettier formats the code using its defaults (`.prettierrc` is empty): double quotes, semicolons, trailing commas, 80-character lines, 2-space indent.
- ESLint (`eslint.config.mjs`) uses the recommended JS rules, typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, `react-hooks` (including the React Compiler rules) and `react-refresh`. `eslint-config-prettier` turns off style rules so the two don't conflict.
- Write code that passes ESLint. Don't add `eslint-disable` comments without explaining why on the same line.
- After editing, format and lint only the files you changed, so unrelated files don't pick up diffs:
  `npx prettier --write <files> && npx eslint <files>`
- Before finishing, type-check: `npx tsc --noEmit -p . && npx tsc --noEmit -p scripts && npx tsc --noEmit -p api`.
- Scripts: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`.
- Use pnpm, not npm. Don't commit build output (`dist/`).

## Working with Claude Code

- Keep conversations lean. When a piece of work is finished (a feature built, a bug fixed, a question answered) and the conversation has grown long, suggest running `/compact` before starting the next task.
- Also suggest `/compact` when returning to a conversation after a long break, since the prompt cache will have expired.
- Claude cannot run `/compact` itself — only suggest it, in one short line.
