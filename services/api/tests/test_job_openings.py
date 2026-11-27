import pytest

VALID = {
    "title": "Payroll specialist",
    "department": "Finance",
    "location": "Berlin",
    "employment_type": "Full time",
}


def listed(client, headers):
    return client.get("/job-openings", headers=headers).json()


def test_create_appears_in_list_and_is_open(client, hr_admin):  # AC1, AC11
    r = client.post("/job-openings", json=VALID, headers=hr_admin)
    assert r.status_code == 201
    assert r.json()["status"] == "open"
    assert [o["title"] for o in listed(client, hr_admin)] == [VALID["title"]]


def test_create_rejects_status_in_body(client, hr_admin):  # AC11
    r = client.post("/job-openings", json={**VALID, "status": "closed"}, headers=hr_admin)
    assert r.status_code == 422


def test_edit_details_shows_in_list(client, hr_admin):  # AC2
    created = client.post("/job-openings", json=VALID, headers=hr_admin).json()
    r = client.patch(
        f"/job-openings/{created['id']}", json={"location": "Munich"}, headers=hr_admin
    )
    assert r.status_code == 200
    assert listed(client, hr_admin)[0]["location"] == "Munich"
    r = client.patch(f"/job-openings/{created['id']}", json={"status": "closed"}, headers=hr_admin)
    assert r.status_code == 422


def test_edit_rejects_empty_required_field(client, hr_admin, repo):
    repo.seed(id=1)
    r = client.patch("/job-openings/1", json={"title": " "}, headers=hr_admin)
    assert r.status_code == 422


def test_unknown_id_is_404(client, hr_admin):
    assert client.patch("/job-openings/9", json={"title": "x"}, headers=hr_admin).status_code == 404
    assert client.post("/job-openings/9/open", headers=hr_admin).status_code == 404
    assert client.post("/job-openings/9/close", headers=hr_admin).status_code == 404


def test_open_closed_opening(client, hr_admin, repo):  # AC3
    repo.seed(status="closed", id=1)
    r = client.post("/job-openings/1/open", headers=hr_admin)
    assert r.json()["status"] == "open"
    assert listed(client, hr_admin)[0]["status"] == "open"


@pytest.mark.parametrize("stage", ["Hired", "Rejected", "Withdrawn"])
def test_close_when_all_finished(client, hr_admin, repo, stage):  # AC4
    repo.seed(id=1, candidates=[stage])
    assert client.post("/job-openings/1/close", headers=hr_admin).json()["status"] == "closed"
    assert listed(client, hr_admin)[0]["status"] == "closed"


@pytest.mark.parametrize("stage", ["Applied", "Screening", "Interview", "Offer"])
def test_close_refused_with_candidate_in_progress(client, hr_admin, repo, stage):  # AC5
    repo.seed(id=1, candidates=["Hired", stage])
    r = client.post("/job-openings/1/close", headers=hr_admin)
    assert r.status_code == 409
    assert r.json()["detail"] == {"code": "candidates_in_progress", "in_progress": 1}
    assert listed(client, hr_admin)[0]["status"] == "open"


def test_counts_include_all_stages(client, hr_admin, repo):  # AC6
    repo.seed(id=1, candidates=["Applied", "Rejected", "Withdrawn", "Hired"])
    row = listed(client, hr_admin)[0]
    assert row["candidate_count"] == 4
    assert row["in_progress_count"] == 1
    assert row["reference"] == "JO-1"


def test_zero_candidates(client, hr_admin, repo):  # AC7
    repo.seed(id=1)
    assert listed(client, hr_admin)[0]["candidate_count"] == 0


def test_close_with_no_candidates(client, hr_admin, repo):  # AC12
    repo.seed(id=1, candidates=[])
    assert client.post("/job-openings/1/close", headers=hr_admin).json()["status"] == "closed"


@pytest.mark.parametrize(
    "call",
    [
        lambda c, h: c.post("/job-openings", json=VALID, headers=h),
        lambda c, h: c.patch("/job-openings/1", json={"title": "x"}, headers=h),
        lambda c, h: c.post("/job-openings/1/open", headers=h),
        lambda c, h: c.post("/job-openings/1/close", headers=h),
    ],
)
def test_non_hr_refused(client, plain_user, repo, call):  # AC8
    repo.seed(id=1, candidates=[])
    assert call(client, plain_user).status_code == 403
    assert repo.list()[0].status == "open"
    assert repo.list()[0].title == "Seeded"
    assert len(repo.list()) == 1


def test_non_hr_sees_nothing(client, plain_user, repo):  # AC9
    repo.seed(id=1)
    r = client.get("/job-openings", headers=plain_user)
    assert r.status_code == 403
    assert "title" not in r.text


@pytest.mark.parametrize("field", ["title", "department", "location", "employment_type"])
@pytest.mark.parametrize("value", ["", "   "])
def test_required_field_empty(client, hr_admin, field, value):  # AC10
    r = client.post("/job-openings", json={**VALID, field: value}, headers=hr_admin)
    assert r.status_code == 422
    assert r.json()["detail"][0]["loc"][-1] == field
    assert listed(client, hr_admin) == []
