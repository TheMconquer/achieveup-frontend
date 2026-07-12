# AchieveUp Frontend Style Guide

This guide documents the conventions we follow when writing frontend code for AchieveUp. It's based on patterns that are already dominant in the codebase, plus standard React/TypeScript best practices, so adopting it should not require rewriting existing code.

**Guiding rule:** when a file already follows a different (but reasonable) pattern, don't rewrite it just to match this guide. Follow this guide for new code and for files you're already touching for a real change. This is a living document — open a PR to change it if the team agrees something should be different.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Formatting](#formatting)
4. [TypeScript](#typescript)
5. [Components](#components)
6. [Naming Conventions](#naming-conventions)
7. [Styling (Tailwind)](#styling-tailwind)
8. [State & Data Fetching](#state--data-fetching)
9. [Forms](#forms)
10. [Error Handling & User Feedback](#error-handling--user-feedback)
11. [Testing](#testing)
12. [Imports](#imports)
13. [Recommended Tooling](#recommended-tooling)

---

## Tech Stack

- **React 18** with functional components and hooks (no class components)
- **TypeScript** in strict mode
- **Tailwind CSS** for styling, with `clsx` for conditional classes
- **React Router v6** for routing
- **React Hook Form** for form state and validation
- **Axios** for HTTP, wrapped in a typed service layer (`src/services/api.ts`)
- **react-hot-toast** for user-facing success/error messages
- **lucide-react** for icons
- **Jest + React Testing Library** for tests

Don't introduce a new library that overlaps with one already in `package.json` (e.g. a second HTTP client, a second icon set, a second form library) without discussing it with the team first — it adds bundle size and a second pattern to learn.

## Project Structure

```
src/
  components/
    ComponentName/
      ComponentName.tsx
      ComponentName.test.tsx
  pages/
    PageName.tsx
    PageName.test.tsx
  contexts/
    SomeContext.tsx
  services/
    api.ts
  types/
    index.ts
  utils/
    someUtil.ts
```

- **Reusable, presentational components** (`Button`, `Card`, `Input`) live in `src/components/common/`.
- **Feature components** (`SkillMatrixCreator`, `AnalyticsDashboard`, etc.) each get their own folder under `src/components/` named after the component, containing the `.tsx` file and its co-located `.test.tsx`.
- **Route-level components** live in `src/pages/`, one file per route, registered in `src/App.tsx`.
- **Shared TypeScript types/interfaces** go in `src/types/index.ts`. This includes API request/response shapes and shared component prop types (see `ButtonProps`, `CardProps`, etc.). Props that are truly local to one component (used nowhere else) can stay in that component's file instead of bloating the shared file — see [TypeScript](#typescript).
- **API calls** are grouped by domain as objects in `src/services/api.ts` (e.g. `authAPI`, `badgeAPI`, `skillMatrixAPI`) — see [State & Data Fetching](#state--data-fetching).
- **Non-component logic** shared across the app (validation rules, formatting helpers, constants) goes in `src/utils/`.

## Formatting

The codebase is already consistent on these points — keep it that way:

- **2-space indentation**, no tabs.
- **Single quotes** for strings (`'like this'`), not double quotes.
- **Semicolons** at the end of statements.
- **Trailing commas** in multiline object/array literals are fine and common — don't fight them.
- No unused imports or variables.

If you find a block that drifted from 2-space indentation (it happens, especially in larger files), fix the indentation of the lines you're already touching. Don't do a drive-by reformat of a whole file in an unrelated PR — it makes the diff hard to review.

See [Recommended Tooling](#recommended-tooling) for a Prettier config that would auto-enforce this.

## TypeScript

- **No new `any`.** The codebase has some existing `any` (usually on Canvas API payloads or catch-block errors), but don't add more when writing new code — define an interface or use `unknown` and narrow it.
- **Type `catch` blocks explicitly** when you need to read properties off the error, matching the existing pattern:
  ```ts
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Something went wrong.');
  }
  ```
- **Component props:**
  - If a prop type is used by more than one component, or represents an API shape, put it in `src/types/index.ts` (e.g. `ButtonProps`, `CardProps`).
  - If a prop type is local to a single component and nothing else needs it, define it in that component's file, above the component, e.g. `interface SkillMatrixCreatorProps { ... }`.
- **Prefer `interface` over `type`** for object/props shapes, to match the rest of the codebase. `type` is fine for unions (`'beginner' | 'intermediate' | 'advanced'`).
- Use TypeScript's inference where it's clear (`useState(false)`) and add explicit generics where it isn't (`useState<User | null>(null)`).

## Components

- **Functional components only**, typed with `React.FC`:
  ```tsx
  const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
    ...
  };

  export default Button;
  ```
- **Default export the component**, matching the filename. Named exports are for hooks/contexts/utilities (e.g. `export const useAuth = ...`).
- **Destructure props in the function signature** with defaults inline (`variant = 'primary'`), not via `defaultProps` or inside the function body.
- **One component per file.** Small presentational sub-pieces used only by one parent can live in the same file as an unexported helper component if it keeps things clearer, but anything reused elsewhere gets its own file.
- **Keep components focused.** As a soft guideline for *new* components: if a component is pushing past ~300–400 lines or has a dozen+ `useState` calls, look for a natural seam to split it into sub-components or pull logic into a custom hook. This is a "try to notice it while you're building" guideline, not a hard limit — plenty of existing components are larger, and that's not something to fix opportunistically.
- Custom hooks (when you extract one) go in a `useX.ts` file and are named `useX`.

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Component files/folders | PascalCase | `SkillMatrixCreator/SkillMatrixCreator.tsx` |
| Page files | PascalCase | `StudentProgress.tsx` |
| Utility/service files | camelCase | `passwordPolicy.ts`, `api.ts` |
| Components, interfaces, types | PascalCase | `Button`, `ButtonProps`, `SkillMatrix` |
| Variables, functions | camelCase | `selectedCourse`, `handleSubmit` |
| Booleans | `is`/`has`/`show` prefix | `isSubmitting`, `hasCanvasToken`, `showPassword` |
| Event handlers (props) | `onX` | `onClick`, `onMatrixCreated` |
| Event handlers (implementation) | `handleX` | `handleClick`, `handleSubmit` |
| API service objects | `xAPI` | `authAPI`, `badgeAPI`, `skillMatrixAPI` |
| Constants | UPPER_SNAKE_CASE | `PASSWORD_MIN_LENGTH`, `API_BASE_URL` |

## Styling (Tailwind)

- Style with **Tailwind utility classes directly in JSX**. Don't add new CSS files or `styled-components`-style CSS-in-JS.
- Use **`clsx`** to combine static and conditional classes, and to merge in a `className` prop passed from a parent:
  ```tsx
  className={clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    className
  )}
  ```
- Use the **project's design tokens** defined in `tailwind.config.js` instead of raw hex values or arbitrary values where one already exists:
  - Brand colors: `ucf-gold`, `ucf-black`, `ucf-grey`, `ucf-white`
  - Scales: `primary-{50-900}`, `secondary-{50-900}`
  - Only fall back to a stock Tailwind color (e.g. `red-600`, `gray-200`) when there's no project token for that use case — this is already the existing pattern (e.g. error text uses `text-red-600`).
- Common interactive elements should keep the existing focus/disabled treatment for accessibility and consistency: `focus:outline-none focus:ring-2 focus:ring-offset-2`, `disabled:opacity-50 disabled:cursor-not-allowed`.
- If you're building a new generic, reusable UI primitive (another button-like or card-like thing), check `src/components/common/` first — extend `Button`/`Card`/`Input` with a new `variant` rather than creating a parallel one-off component.

## State & Data Fetching

- **Local component state**: `useState`. **Side effects / data fetching on mount**: `useEffect` with an explicit dependency array.
- **Cross-cutting app state** (auth, current user) goes through React Context, following the `AuthContext` pattern: a context + a `useX()` hook that throws if used outside its provider.
- **All HTTP calls go through `src/services/api.ts`.** Don't call `axios` or `fetch` directly from a component. If an endpoint doesn't have a wrapper yet, add one to the relevant `xAPI` object (or create a new one for a new domain), typed with `Promise<AxiosResponse<T>>`.
- **Async handlers follow this shape**, matching the existing pattern in contexts and pages:
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
- Track loading state per meaningful operation (`loading`, `suggestionsLoading`, `savingEdit`, etc. — see `SkillMatrixCreator`) rather than one global flag, when a component has multiple independent async actions.

## Forms

- Use **`react-hook-form`**'s `useForm` + `register` for any form of more than one or two fields, matching `Login.tsx` / `Signup.tsx`:
  ```tsx
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>();
  ```
- Define a local `interface XFormInputs { ... }` for the form shape next to the component.
- Put validation rules inline in `register()` (`required`, `pattern`, `minLength`), and render the error right below the field:
  ```tsx
  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
  ```
- **Password rules are centralized** in `src/utils/passwordPolicy.ts` (`passwordRules` for `react-hook-form`, `validatePassword` for manual checks). Reuse these rather than redefining password validation elsewhere.
- Disable the submit button and show a loading state while `isSubmitting` is true.

## Error Handling & User Feedback

- **User-facing success/error messages go through `react-hot-toast`** (`toast.success(...)`, `toast.error(...)`), not `alert()` or silent failures.
- Prefer surfacing the backend's message when available, with a sensible fallback:
  ```tsx
  toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
  ```
- `console.error` is fine (and used throughout) for logging unexpected failures for debugging. **Avoid adding new `console.log` calls for routine/happy-path flow** (e.g. logging every request/response) — the codebase has a fair number of these from debugging sessions; try not to add more, and feel free to remove ones you find in code you're already editing for another reason.

## Testing

- Test files are **co-located** with the code they test: `Button.tsx` → `Button.test.tsx`, in the same folder.
- Use **React Testing Library** (`render`, `screen`, `fireEvent`) — query by role/text/label like a user would, not by implementation details (avoid querying by class name or internal state).
- Structure tests with `describe('ComponentName', () => { test('does X', () => { ... }) })`, one `describe` block per component/module.
- Follow **arrange → act → assert** inside each `test`, with a blank line separating the phases (matches existing tests).
- Mock API calls at the `services/api` boundary rather than mocking `axios` internals directly, so tests stay resilient to implementation changes in the service layer.
- New components and non-trivial utility functions should ship with at least a basic render/interaction test, matching the coverage level of `Button`, `Input`, and `Navigation`.

## Imports

Group and order imports as follows, matching existing files (a blank line between groups is optional but common):

1. React / external libraries (`react`, `react-router-dom`, `react-hook-form`, `lucide-react`, `react-hot-toast`, `clsx`)
2. Internal absolute-ish imports: contexts, services (`../../contexts/AuthContext`, `../../services/api`)
3. Types (`../../types`)
4. Local components (`../common/Button`, `../common/Card`)

```tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { skillMatrixAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SkillMatrix } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';
```

Use relative imports (`../../types`) as the codebase does today — there's no path alias configured.

## Recommended Tooling

The project currently only has CRA's default `eslintConfig` (`react-app`, `react-app/jest`) — there's no Prettier config yet, which is part of why formatting has drifted in a few places. This isn't required to adopt the guide above, but if the team wants to auto-enforce the [Formatting](#formatting) section, this is the config to add later (as its own PR, with a one-time formatting pass reviewed separately from feature work):

**`.prettierrc`**
```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Additions to `eslintConfig` in `package.json`** (on top of the existing `react-app` / `react-app/jest` extends):
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

Both rules above are set to `"warn"`, not `"error"`, on purpose — the goal is to nudge new code in the right direction without breaking the build over the `any`/`console.log` usage that already exists.
