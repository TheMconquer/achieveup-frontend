# Frontend Style Guide

Conventions for the AchieveUp frontend. Based on what the codebase already does most consistently, not invented from scratch. Follow this for new code and for files you're already touching. Don't reformat unrelated files just to match it.

## Stack

React 18 + TypeScript (strict), Tailwind CSS + `clsx`, React Router v6, React Hook Form, Axios (via `src/services/api.ts`), `react-hot-toast`, `lucide-react`, Jest + React Testing Library.

Don't add a second library that overlaps one already here (another HTTP client, icon set, form lib) without discussing it first.

## Structure

```
src/
  components/
    common/            reusable primitives (Button, Card, Input)
    ComponentName/
      ComponentName.tsx
      ComponentName.test.tsx
  pages/               one file per route
  contexts/
  services/api.ts      all HTTP calls, grouped by domain
  types/index.ts        shared types + shared prop types
  utils/
```

Local-only prop types (nothing else uses them) can live in the component file instead of `types/index.ts`.

## Formatting

Enforced by Prettier (`.prettierrc`). Run `npm run format` before committing, or set up format-on-save (Prettier extension + `"editor.formatOnSave": true`).

| Rule | Value |
|---|---|
| Quotes | Single (`'like this'`) |
| Semicolons | Required |
| Indentation | 2 spaces |
| Trailing commas | Multiline literals only (ES5-valid) |
| Line width | 100 characters |

If this table and `.prettierrc` ever disagree, `.prettierrc` is what actually runs — update both when changing a rule.

`npm run format:check` runs in CI-friendly mode without writing changes.

## TypeScript

- No new `any`. Existing `any` (Canvas payloads, catch blocks) isn't being cleaned up retroactively, but don't add more.
- `catch (error: any)` is the existing pattern when you need to read `error.response?.data`. Fine to keep using it.
- `interface` for object/props shapes, `type` for unions.
- Shared/API types go in `types/index.ts`; component-local prop types stay next to the component.

## Components

```tsx
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
  ...
};

export default Button;
```

- Functional components, `React.FC<Props>`, default export matching the filename.
- Destructure props with inline defaults, not `defaultProps`.
- One component per file; small unexported helpers used only by their parent are the exception.
- New components: split around ~300–400 lines or a dozen+ `useState` calls. Existing large components (there are a couple) aren't being split retroactively — don't touch them for style reasons alone.

## Naming

| What | Convention | Example |
|---|---|---|
| Component file/folder | PascalCase | `SkillMatrixCreator/SkillMatrixCreator.tsx` |
| Util/service file | camelCase | `passwordPolicy.ts` |
| Component, interface | PascalCase | `Button`, `ButtonProps` |
| Variable, function | camelCase | `selectedCourse` |
| Boolean | `is`/`has`/`show` | `isSubmitting`, `hasCanvasToken` |
| Handler prop | `onX` | `onMatrixCreated` |
| Handler impl | `handleX` | `handleSubmit` |
| API module | `xAPI` | `authAPI`, `badgeAPI` |
| Constant | `UPPER_SNAKE_CASE` | `PASSWORD_MIN_LENGTH` |

## Styling

- Tailwind utility classes in JSX. No new CSS files, no CSS-in-JS.
- `clsx` for conditional classes and merging a passed-in `className`.
- Use the project's tokens (`ucf-gold`, `ucf-black`, `ucf-grey`, `primary-{50-900}`, `secondary-{50-900}`) over raw hex. Stock Tailwind colors (`red-600`, `gray-200`) are fine when there's no project token for that case — e.g. error text.
- Keep the standard focus/disabled treatment on interactive elements: `focus:outline-none focus:ring-2 focus:ring-offset-2`, `disabled:opacity-50 disabled:cursor-not-allowed`.
- Need another button/card-like primitive? Add a variant to `Button`/`Card` before writing a new component.

## State & data fetching

- `useState` for local state, `useEffect` for fetch-on-mount.
- Cross-cutting state (auth, current user) goes through Context, following `AuthContext`: a context + a `useX()` hook that throws outside its provider.
- All HTTP goes through `services/api.ts`. Don't call `axios`/`fetch` from a component — add a method to the relevant `xAPI` object (or a new one), typed `Promise<AxiosResponse<T>>`.
- Standard async shape:

```tsx
const doThing = async () => {
  try {
    setLoading(true);
    const response = await someAPI.someCall(payload);
    // update state from response.data
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Fallback error message.');
  } finally {
    setLoading(false);
  }
};
```

- Separate loading flags per independent async action (`loading`, `savingEdit`, `suggestionsLoading`) rather than one shared flag.

## Forms

- `react-hook-form` for anything beyond one or two fields: `useForm<XFormInputs>()`, with a local `XFormInputs` interface next to the component.
- Validation inline in `register()`; error rendered directly below the field:

```tsx
{errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
```

- Password rules live in `utils/passwordPolicy.ts` (`passwordRules` for RHF, `validatePassword` for manual checks) — reuse, don't redefine.
- Disable submit and show loading state while `isSubmitting`.

## Errors & feedback

- User-facing messages: `toast.success` / `toast.error`, not `alert()`.
- Prefer the backend's message with a fallback: `error.response?.data?.message || 'fallback'`.
- `console.error` for debugging failures is fine. Don't add new `console.log` for routine flow — there's already more of this than there should be; remove ones you pass by if you're already in the file.

## Testing

- Co-located: `Button.tsx` → `Button.test.tsx`.
- React Testing Library, query by role/text/label, not class names or internal state.
- `describe('ComponentName', ...)` per component, arrange/act/assert per test.
- Mock at the `services/api` boundary, not `axios` internals.
- New components and non-trivial utils get at least a basic render/interaction test.

## Imports

Order: external libs → contexts/services → types → local components.

```tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { skillMatrixAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SkillMatrix } from '../../types';
import Button from '../common/Button';
```

Relative imports (`../../types`) — no path alias configured.

## Tooling

- ESLint: `react-app` / `react-app/jest` (CRA default) plus two added rules (`package.json` → `eslintConfig`):
  - `no-console` — warn (`console.warn` / `console.error` still allowed)
  - `@typescript-eslint/no-explicit-any` — warn
  
  Runs automatically on `npm start` / `npm run build`. Same note as above: `package.json` is the source of truth if this list drifts.
- Prettier: config in `.prettierrc`. `npm run format` to write, `npm run format:check` to check without writing.
- Existing files aren't Prettier-formatted yet. Reformatting the whole `src/` tree should be one isolated commit, not mixed into feature work.
