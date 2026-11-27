def test_missing_token_is_401(client):
    assert client.get("/job-openings").status_code == 401


def test_expired_token_is_401(client, make_token):
    token = make_token(roles=["hr_admin"], expires_in=-60)
    r = client.get("/job-openings", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_token_signed_with_other_key_is_401(client, make_token, other_key):
    token = make_token(roles=["hr_admin"], key=other_key)
    r = client.get("/job-openings", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_health_stays_open(client):
    assert client.get("/health").status_code == 200
