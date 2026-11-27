# comp_application_api

FastAPI service backed by PostgreSQL, managed with uv (Python 3.12).

- Run: `uv run uvicorn app.main:app --reload`
- Test: `uv run pytest`
- Build: `sh scripts/build.sh`

Configure the database with `DATABASE_URL`.

## Authentication settings

Every route except `/health` needs an Auth0 access token (`Authorization: Bearer`). Settings:

- `AUTH0_DOMAIN` (default empty): Auth0 tenant domain; empty means every token is rejected.
- `AUTH0_AUDIENCE` (default empty): expected token audience.
- `AUTH0_ROLES_CLAIM` (default `https://bnts.example/roles`): claim holding the user's role, one of `wfc_admin`, `fundraising_consultant`, `org_admin`, `org_staff`.

`GET /me` returns the signed-in user's `sub` and `role`.
