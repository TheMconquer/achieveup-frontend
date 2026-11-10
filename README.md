# AchieveUp Frontend

AchieveUp turns Canvas quiz results into skill tracking. Instructors define the skills a course teaches and map quiz questions to them. Students then see their mastery of each skill and earn badges, instead of only seeing a grade.

This repository is the React single-page app. The API lives in [knowgap-backend](../knowgap-backend), a Python (Quart) service backed by MongoDB.

- **Live app:** https://achieveupapp.com
- **Repository:** https://github.com/TheMconquer/achieveup-frontend

## Features

### Instructors
- **Dashboard** (`/instructor-dashboard`): course overview from Canvas, student counts and setup progress.
- **Skill matrices** (`/skill-matrix`): build one or more skill matrices per course, with AI-suggested skills from the course description. Supports deep links such as `/skill-matrix?courseId=123`.
- **Skill assignment** (`/skill-assignment`): map Canvas quiz questions to skills by hand or with AI-assisted question analysis.
- **Student progress** (`/progress`): per-student skill breakdowns, risk levels and earned badges.
- **Skill videos** (`/skill-videos`): curate YouTube videos for each skill.

### Students
- **Dashboard** (`/student-dashboard`): mastery rings, course overview and recent badges.
- **Courses** (`/courses`, `/courses/:courseId`): skill mastery for each enrolled course.
- **Skills** (`/skills`): every attempted skill across courses.
- **Badges** (`/badges`): earned badges, with an optional public share link.
- **Skill videos** (`/my-skill-videos`): videos the instructor picked for each skill, with helpful/not helpful voting.

### Shared
- **Sign up and log in** with a Canvas API token. The backend works out whether the user is a student or an instructor from the token, so there is no role picker.
- **Settings** (`/settings`): profile, password and Canvas token management.
- **Public badge pages** (`/badges/share/:shareId`): open to anyone with the link, marked `noindex`.
- Light and dark themes, a responsive layout and accessibility support (route announcements, focus-managed dialogs).

## Tech stack

React 18, TypeScript (strict), Create React App (`react-scripts` 5), React Router v6, Tailwind CSS with `clsx`, React Hook Form, Axios, Recharts, `react-hot-toast`, `lucide-react`, plus Jest and React Testing Library for tests.

## Getting started

### Prerequisites
- Node.js 18 or newer (CI uses Node 20)
- A running [knowgap-backend](../knowgap-backend). By default the app calls `http://localhost:5001`, the backend's local port.

### Install and run

```bash
npm install
```

```bash
npm start
```

The app opens at http://localhost:3000.

### Environment variables

Create a `.env.local` file in this folder when you need to override the defaults:

```env
# Backend base URL (default: http://localhost:5001)
REACT_APP_API_URL=http://localhost:5001
```

On Netlify, set `REACT_APP_API_URL` in the site's environment settings. It is deliberately left out of `netlify.toml` so it can't override the dashboard value.

### Docker

```bash
docker build -t achieveup-frontend .
```

```bash
docker run -p 3000:3000 achieveup-frontend
```

The image runs the development server (`npm start`), not a production build.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server on port 3000 |
| `npm run build` | Create a production build in `build/` |
| `npm test` | Run tests in watch mode |
| `npm run test:ci` | Run all tests once |
| `npm run format` | Format `src/` with Prettier |
| `npm run format:check` | Check formatting without changing files |
| `npx tsc --noEmit` | Type-check the project |

## Project structure

```
src/
  components/
    common/                  shared building blocks (Button, Card, Input, RequireRole, ...)
    Layout/                  app shell and navigation (desktop sidebar, mobile nav, menus)
    SkillMatrixCreator/      instructor skill matrix builder
    SkillAssignmentInterface/ question-to-skill mapping
    BadgesDashboard/         badge views
    StudentPortal/           student dashboard widgets
  pages/                     one file per route
  contexts/                  AuthContext (JWT session) and ThemeContext
  hooks/                     shared React hooks
  services/api.ts            every HTTP call, grouped by domain
  types/index.ts             shared types
  utils/                     helpers (skill tiers, password policy, error handling, ...)
  integration/               multi-component integration tests
```

Routes are defined in `src/App.tsx`. Pages are lazy-loaded, and `RequireRole` keeps each role on its own routes. Visiting `/` sends a signed-in user to their own dashboard.

The session JWT is kept in `localStorage` and attached to every request by `services/api.ts`. A 401 response clears it and signs the user out.

## Testing and CI

Tests sit next to the code they cover (`*.test.tsx`), and there are integration tests in `src/integration/`. GitHub Actions (`.github/workflows/test.yml`) runs `npm run test:ci` and `npx tsc --noEmit` on every push and pull request.

## Deployment

Netlify builds the site with `npm run build` and publishes `build/` (see `netlify.toml`). The config also:
- rewrites all paths to `index.html` so client-side routing works
- caches `/static/*` assets for a year
- sets security headers (`X-Frame-Options`, `frame-ancestors`, `nosniff`, referrer policy)
- adds `noindex` to shared badge pages

## Contributing

Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before writing code. It covers structure, naming, styling, data fetching, forms, errors and testing conventions. Run the tests, the type check and `npm run format:check` before opening a pull request.

## License

This project is part of the UCF Senior Design program. All rights reserved.
