# comp_application_api

FastAPI service backed by PostgreSQL, managed with uv (Python 3.12).

- Run: `uv run uvicorn app.main:app --reload`
- Test: `uv run pytest`
- Build: `sh scripts/build.sh`

Configure the database with `DATABASE_URL`.
