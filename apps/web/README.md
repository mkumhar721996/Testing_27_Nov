# web (comp_web_app)

Next.js + TypeScript + Tailwind CSS app. Package manager: pnpm.

- `pnpm dev` – dev server
- `pnpm build` – production build
- `pnpm test` – unit tests (vitest)
- `pnpm e2e` – Playwright e2e (builds and serves the app itself; browsers must be preinstalled)

## Sign-in settings

Sign-in goes through Auth0. Set these before sign-in can work (see `.env.example`; never commit values):

- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`: the Auth0 application.
- `AUTH0_SECRET`: key that encrypts the session cookie.
- `APP_BASE_URL`: the public URL of this app. Auth0 needs `{APP_BASE_URL}/auth/callback` as a callback URL and `{APP_BASE_URL}/signin` as an Allowed Logout URL.
- `AUTH0_AUDIENCE`: the audience of the Application API in Auth0.
- `API_BASE_URL`: base URL of the Application API.
- `SESSION_INACTIVITY_SECONDS` (default 1800) and `SESSION_ABSOLUTE_SECONDS` (default 28800): session lengths; the session renews while the user is active.
