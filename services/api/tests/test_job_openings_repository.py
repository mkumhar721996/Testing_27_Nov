"""Runs against a real PostgreSQL; skipped unless TEST_DATABASE_URL is set."""

import os

import psycopg
import pytest

from app.migrate import migrate
from app.repositories import job_openings as module
from app.repositories.job_openings import CloseRefused, PostgresJobOpeningRepository

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL is not set")

DETAILS = {
    "title": "Payroll specialist",
    "department": "Finance",
    "location": "Berlin",
    "employment_type": "Full time",
    "description": "",
}


@pytest.fixture
def repo(monkeypatch):
    from psycopg.rows import dict_row

    with psycopg.connect(URL, row_factory=dict_row, autocommit=True) as conn:
        conn.execute("DROP TABLE IF EXISTS candidates, job_openings, schema_migrations")
        migrate(conn)
    monkeypatch.setattr(module, "connect", lambda: psycopg.connect(URL, row_factory=dict_row))
    return PostgresJobOpeningRepository()


def add_candidates(opening_id, stages):
    with psycopg.connect(URL) as conn:
        for stage in stages:
            conn.execute(
                "INSERT INTO candidates (opening_id, stage) VALUES (%s, %s)", (opening_id, stage)
            )


def test_opening_without_candidates_counts_zero(repo):  # AC7
    repo.create(DETAILS)
    rows = repo.list()
    assert len(rows) == 1
    assert rows[0].candidate_count == 0


def test_counts_include_every_stage(repo):  # AC6
    opening = repo.create(DETAILS)
    add_candidates(opening.id, ["Applied", "Rejected", "Withdrawn", "Hired"])
    row = repo.list()[0]
    assert (row.candidate_count, row.in_progress_count) == (4, 1)


def test_close_refused_then_allowed(repo):  # AC4, AC5
    opening = repo.create(DETAILS)
    add_candidates(opening.id, ["Hired", "Interview"])
    with pytest.raises(CloseRefused):
        repo.close(opening.id)
    assert repo.list()[0].status == "open"
    with psycopg.connect(URL) as conn:
        conn.execute("UPDATE candidates SET stage = 'Rejected'")
    assert repo.close(opening.id).status == "closed"
    assert repo.set_open(opening.id).status == "open"


def test_update_details(repo):  # AC2
    opening = repo.create(DETAILS)
    assert repo.update(opening.id, {"location": "Munich"}).location == "Munich"
    assert repo.update(999, {"location": "x"}) is None
