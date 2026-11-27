"""Applies the SQL files in migrations/ that are not yet recorded, in name order.

Run with `python -m app.migrate`.
"""

from pathlib import Path

import psycopg

from app.db import connect

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def migrate(conn: psycopg.Connection, directory: Path = MIGRATIONS_DIR) -> list[str]:
    applied_now: list[str] = []
    with conn.transaction():
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        conn.execute("LOCK TABLE schema_migrations IN EXCLUSIVE MODE")
        done = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations")}
        for path in sorted(directory.glob("*.sql")):
            if path.name in done:
                continue
            conn.execute(path.read_text())
            conn.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (path.name,))
            applied_now.append(path.name)
    return applied_now


def main() -> None:
    with connect() as conn:
        applied = migrate(conn)
    print("Applied: " + ", ".join(applied) if applied else "Nothing to apply.")


if __name__ == "__main__":
    main()
