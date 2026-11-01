# ESPED Resort frontend

React 19, TypeScript, and Vite frontend for ESPED Resort, connected to the LavaLust REST API with JWT bearer tokens.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- LavaLust backend running locally for API-backed pages

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_API_URL` to the backend base URL.
   - Local example: `VITE_API_URL=http://127.0.0.1:3000`
   - Use your own backend host/path if it differs.
3. Install dependencies and start Vite:

   ```sh
   npm install
   npm run dev
   ```

Vite proxies `/api/v1` to `VITE_API_URL` during development. Production requests use `VITE_API_URL` with `/api/v1` appended. If the backend is mounted under a URL path, include that path in `VITE_API_URL`. Do not put secrets in `VITE_*` variables: Vite exposes them to browser code.

## Common commands

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Source layout

- `src/app/`: app composition, providers, route definitions, and app-level data orchestration.
- `src/features/`: feature-owned pages and API modules (`auth`, `booking`, `admin`, and `public-site`).
- `src/components/`: reusable feature-agnostic UI and layouts.
- `src/hooks/`: shared React hooks.
- `src/lib/`: shared API client and integration helpers.
- `src/assets/`: images and other imported assets.

Feature internals should stay private. Import another feature only through its `index.ts` public exports. Shared components, hooks, and libraries must not import from features. Use the `@/` alias for imports rooted at `src/`.

## API and authentication

All HTTP requests use `src/lib/api.ts`. Feature endpoints belong in their feature's `api/` module; app-level data loading belongs in `src/app/useAppData.ts`. The API client keeps JWT access and refresh tokens in memory and retries an authorized request after a successful refresh. Backend authorization remains authoritative.

The backend must provide the API routes and enforce authorization. When frontend and backend are deployed on different origins in production, configure the backend's CORS allowlist for the frontend domain.

## Tests and collaboration

Application code uses TypeScript (`.ts` and `.tsx`). Run `npm run typecheck` to validate types; production builds run type-checking before Vite bundles the app. Unit tests live beside the code they cover and run with Vitest via `npm test`. Pull requests should run lint, tests, and a production build; the GitHub Actions workflow does this for pushes and pull requests.

Use focused branches such as `feature/booking-calendar` or `fix/service-search`. Keep changes within the feature folder when possible. Coordinate edits to `src/app/`, `src/components/`, `src/lib/`, `vite.config.js`, and `package.json`, since these are shared integration points. Use Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

Add repository-specific owners to `CODEOWNERS` once the team has agreed on GitHub usernames; this project does not assign placeholder reviewers.
