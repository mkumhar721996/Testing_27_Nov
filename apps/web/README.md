# web (comp_web_app)

Next.js + TypeScript + Tailwind CSS app. Package manager: pnpm.

- `pnpm dev` – dev server
- `pnpm build` – production build
- `pnpm test` – unit tests (vitest)
- `pnpm e2e` – Playwright e2e (builds and serves the app itself; browsers must be preinstalled)

## Configuration

- `NEXT_PUBLIC_API_BASE_URL` – base URL of the Application API (for example `http://localhost:8000`).

The job openings page is at `/job-openings`. Run the API migrations first
(`uv run python -m app.migrate` in `services/api`), then deploy the API, then the Web App.
