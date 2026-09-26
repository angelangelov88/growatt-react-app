# CLAUDE.md

## Project Overview

React 18 + TypeScript app built with Vite, styled with Tailwind CSS. It controls a Growatt inverter (`tcpSet.do` calls in `growattApi.ts`) and reads Octopus Energy data (GraphQL over `fetch`). Data fetching uses TanStack Query v5. `scripts/update-growatt.ts` runs in a GitHub Action and reuses the React-free modules, so keep `*Api.ts`, `chargePlan.ts` and `savingSessions.ts` free of React and browser-only globals.

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

### Hooks

- Custom hooks are prefixed with `use` and are camelCase.
- All variables and state returned from hooks are wrapped in `useMemo`.

### Imports

- Import hooks and types by name from `'react'`: `import { useState } from 'react';`, not `React.useState`.
- ES module imports only, never CommonJS `require`.

### Example

```tsx
import classNames from "classnames";

type Props = {
  label: string;
  isEnabled: boolean;
  onAction: () => void;
};

const ActionButton = ({ label, isEnabled, onAction }: Props) => (
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

- `src/components/` — shared components (`Spinner.tsx`, `TriggerUpdate.tsx`).
- `src/components/<feature>/` — a feature's components, hooks and API modules (`growatt/`, `octopus/`).
- `src/contexts/` — React Context providers.
- `src/types/` — shared TypeScript types.
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

## Working with Claude Code

- Keep conversations lean. When a piece of work is finished (a feature built, a bug fixed, a question answered) and the conversation has grown long, suggest running `/compact` before starting the next task.
- Also suggest `/compact` when returning to a conversation after a long break, since the prompt cache will have expired.
- Claude cannot run `/compact` itself — only suggest it, in one short line.
