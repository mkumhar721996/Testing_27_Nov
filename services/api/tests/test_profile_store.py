from app import profile_store
from app.profile_store import PostgresProfileStore


class FakeConn:
    def __init__(self, log):
        self.log = log

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.log.append(sql)
        return self

    def fetchone(self):
        return ("A", "a@b.co", None, None, None)


def test_schema_is_created_once_before_first_query(monkeypatch):
    log: list[str] = []
    monkeypatch.setattr(profile_store.psycopg, "connect", lambda url: FakeConn(log))
    monkeypatch.setattr(profile_store, "_schema_ready", set())
    store = PostgresProfileStore("postgresql://fake")
    store.get("u1")
    store.get("u1")
    creates = [s for s in log if "CREATE TABLE IF NOT EXISTS traveller_profiles" in s]
    assert len(creates) == 1
    assert "CREATE TABLE" in log[0]
