from app.repositories.job_openings import ACTIVE_STAGES, CloseRefused, JobOpeningRecord


class InMemoryJobOpeningRepository:
    def __init__(self):
        self.rows: dict[int, dict] = {}
        self._next = 1

    def seed(self, id=None, status="open", candidates=(), **details):
        id = id or self._next
        self._next = max(self._next, id) + 1
        self.rows[id] = {
            "id": id,
            "title": "Seeded",
            "department": "Finance",
            "location": "Berlin",
            "employment_type": "Full time",
            "description": "",
            "status": status,
            "stages": list(candidates),
            **details,
        }

    def _record(self, row) -> JobOpeningRecord:
        in_progress = sum(1 for s in row["stages"] if s in ACTIVE_STAGES)
        data = {k: v for k, v in row.items() if k != "stages"}
        return JobOpeningRecord(
            **data, candidate_count=len(row["stages"]), in_progress_count=in_progress
        )

    def list(self):
        return [self._record(r) for r in sorted(self.rows.values(), key=lambda r: -r["id"])]

    def create(self, details):
        self.seed(status="open", **details)
        return self._record(self.rows[self._next - 1])

    def update(self, id, details):
        if id not in self.rows:
            return None
        self.rows[id].update(details)
        return self._record(self.rows[id])

    def set_open(self, id):
        if id not in self.rows:
            return None
        self.rows[id]["status"] = "open"
        return self._record(self.rows[id])

    def close(self, id):
        row = self.rows.get(id)
        if row is None:
            return None
        in_progress = sum(1 for s in row["stages"] if s in ACTIVE_STAGES)
        if in_progress:
            raise CloseRefused(in_progress)
        row["status"] = "closed"
        return self._record(row)
