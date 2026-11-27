from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import psycopg

from app.config import settings
from app.schemas.profile import ProfileUpdate


@dataclass
class StoredProfile:
    name: str
    email: str
    seat: str | None = None
    cabin: str | None = None
    diet: str | None = None


class ProfileStore(Protocol):
    def get(self, user_id: str) -> StoredProfile | None: ...

    def create(self, user_id: str, name: str, email: str) -> StoredProfile: ...

    def update(self, user_id: str, data: ProfileUpdate) -> StoredProfile: ...


class InMemoryProfileStore:
    def __init__(self) -> None:
        self._rows: dict[str, StoredProfile] = {}

    def get(self, user_id: str) -> StoredProfile | None:
        return self._rows.get(user_id)

    def create(self, user_id: str, name: str, email: str) -> StoredProfile:
        return self._rows.setdefault(user_id, StoredProfile(name=name, email=email))

    def update(self, user_id: str, data: ProfileUpdate) -> StoredProfile:
        row = StoredProfile(**data.model_dump())
        self._rows[user_id] = row
        return row


_COLUMNS = "name, email, seat, cabin, diet"
_MIGRATION = Path(__file__).resolve().parent.parent / "migrations" / "001_traveller_profiles.sql"
_schema_ready: set[str] = set()


def _connect(database_url: str) -> psycopg.Connection:
    """Open a connection, applying the idempotent profile migration once per process."""
    if database_url not in _schema_ready:
        with psycopg.connect(database_url) as conn:
            conn.execute(_MIGRATION.read_text())
        _schema_ready.add(database_url)
    return psycopg.connect(database_url)


class PostgresProfileStore:
    def __init__(self, database_url: str) -> None:
        self._url = database_url

    def get(self, user_id: str) -> StoredProfile | None:
        with _connect(self._url) as conn:
            row = conn.execute(
                f"SELECT {_COLUMNS} FROM traveller_profiles WHERE user_id = %s", (user_id,)
            ).fetchone()
        return StoredProfile(*row) if row else None

    def create(self, user_id: str, name: str, email: str) -> StoredProfile:
        with _connect(self._url) as conn:
            conn.execute(
                "INSERT INTO traveller_profiles (user_id, name, email) VALUES (%s, %s, %s) "
                "ON CONFLICT (user_id) DO NOTHING",
                (user_id, name, email),
            )
            row = conn.execute(
                f"SELECT {_COLUMNS} FROM traveller_profiles WHERE user_id = %s", (user_id,)
            ).fetchone()
        return StoredProfile(*row)

    def update(self, user_id: str, data: ProfileUpdate) -> StoredProfile:
        with _connect(self._url) as conn:
            row = conn.execute(
                "INSERT INTO traveller_profiles (user_id, name, email, seat, cabin, diet) "
                "VALUES (%s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, "
                "email = EXCLUDED.email, seat = EXCLUDED.seat, cabin = EXCLUDED.cabin, "
                "diet = EXCLUDED.diet, updated_at = now() "
                f"RETURNING {_COLUMNS}",
                (user_id, data.name, data.email, data.seat, data.cabin, data.diet),
            ).fetchone()
        return StoredProfile(*row)


def get_store() -> ProfileStore:
    return PostgresProfileStore(settings.database_url)
