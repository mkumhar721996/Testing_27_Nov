from typing import Protocol

from pydantic import BaseModel

from app.db import connect

ACTIVE_STAGES = ("Applied", "Screening", "Interview", "Offer")


class JobOpeningRecord(BaseModel):
    id: int
    title: str
    department: str
    location: str
    employment_type: str
    description: str
    status: str
    candidate_count: int
    in_progress_count: int


class CloseRefused(Exception):
    def __init__(self, in_progress: int):
        super().__init__(f"{in_progress} candidates in progress")
        self.in_progress = in_progress


class JobOpeningRepository(Protocol):
    def list(self) -> list[JobOpeningRecord]: ...
    def create(self, details: dict) -> JobOpeningRecord: ...
    def update(self, id: int, details: dict) -> JobOpeningRecord | None: ...
    def set_open(self, id: int) -> JobOpeningRecord | None: ...
    def close(self, id: int) -> JobOpeningRecord | None:
        """Raises CloseRefused while any candidate is in an active stage."""
        ...


# One row per opening; counts every candidate stage, 0 when there are none.
_SELECT = """
SELECT o.id, o.title, o.department, o.location, o.employment_type, o.description, o.status,
       count(c.id) AS candidate_count,
       count(c.id) FILTER (WHERE c.stage = ANY(%(active)s)) AS in_progress_count
FROM job_openings o
LEFT JOIN candidates c ON c.opening_id = o.id
"""
_GROUP = " GROUP BY o.id"


class PostgresJobOpeningRepository:
    def _one(self, conn, id: int) -> JobOpeningRecord | None:
        row = conn.execute(
            _SELECT + " WHERE o.id = %(id)s" + _GROUP, {"id": id, "active": list(ACTIVE_STAGES)}
        ).fetchone()
        return JobOpeningRecord(**row) if row else None

    def list(self) -> list[JobOpeningRecord]:
        with connect() as conn:
            rows = conn.execute(
                _SELECT + _GROUP + " ORDER BY o.id DESC", {"active": list(ACTIVE_STAGES)}
            ).fetchall()
        return [JobOpeningRecord(**r) for r in rows]

    def create(self, details: dict) -> JobOpeningRecord:
        with connect() as conn:
            row = conn.execute(
                "INSERT INTO job_openings (title, department, location, employment_type, description)"
                " VALUES (%(title)s, %(department)s, %(location)s, %(employment_type)s,"
                " %(description)s) RETURNING id",
                details,
            ).fetchone()
            return self._one(conn, row["id"])

    def update(self, id: int, details: dict) -> JobOpeningRecord | None:
        with connect() as conn:
            if details:
                # Column names come from the schema model's fixed fields, never from the client.
                assignments = ", ".join(f"{k} = %({k})s" for k in details)
                updated = conn.execute(
                    f"UPDATE job_openings SET {assignments}, updated_at = now()"
                    " WHERE id = %(id)s RETURNING id",
                    {**details, "id": id},
                ).fetchone()
                if updated is None:
                    return None
            return self._one(conn, id)

    def set_open(self, id: int) -> JobOpeningRecord | None:
        with connect() as conn:
            conn.execute(
                "UPDATE job_openings SET status = 'open', updated_at = now() WHERE id = %s", (id,)
            )
            return self._one(conn, id)

    def close(self, id: int) -> JobOpeningRecord | None:
        with connect() as conn:
            locked = conn.execute(
                "SELECT id FROM job_openings WHERE id = %s FOR UPDATE", (id,)
            ).fetchone()
            if locked is None:
                return None
            in_progress = conn.execute(
                "SELECT count(*) AS n FROM candidates WHERE opening_id = %s AND stage = ANY(%s)",
                (id, list(ACTIVE_STAGES)),
            ).fetchone()["n"]
            if in_progress:
                raise CloseRefused(in_progress)
            conn.execute(
                "UPDATE job_openings SET status = 'closed', updated_at = now() WHERE id = %s",
                (id,),
            )
            return self._one(conn, id)


def get_job_opening_repository() -> JobOpeningRepository:
    return PostgresJobOpeningRepository()
