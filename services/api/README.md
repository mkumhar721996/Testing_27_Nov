# comp_application_api

FastAPI service backed by PostgreSQL, managed with uv (Python 3.12).

- Run: `uv run uvicorn app.main:app --reload`
- Test: `uv run pytest`
- Build: `sh scripts/build.sh`

Configure the database with `DATABASE_URL`.

## Authentication

Every route except `/health` needs a bearer JWT issued by the identity provider; the API only
validates it. Job openings need the HR admin role.

| Variable | Meaning | Default |
| --- | --- | --- |
| `AUTH_ISSUER` | expected `iss` claim | unset (every token is rejected) |
| `AUTH_AUDIENCE` | expected `aud` claim | unset (every token is rejected) |
| `AUTH_JWKS_URL` | URL of the provider's signing keys | unset (every token is rejected) |
| `AUTH_ROLES_CLAIM` | claim holding the list of role names | `https://hr.example/roles` |
| `HR_ADMIN_ROLE` | role name that grants HR admin access | `hr_admin` |

## Database migrations

SQL files in `migrations/` are applied in name order and recorded in `schema_migrations`.
Run `uv run python -m app.migrate` against `DATABASE_URL` before deploying new code.

Set `TEST_DATABASE_URL` to also run `tests/test_job_openings_repository.py` against a real
PostgreSQL (it drops and recreates the job openings tables there). Without it those tests are skipped.

`contracts/openapi.json` is the API contract the Web App calls.
