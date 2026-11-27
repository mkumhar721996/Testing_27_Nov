import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth
from app.config import settings
from app.main import app

client = TestClient(app)

DOMAIN = "tenant.example.com"
AUDIENCE = "https://api.example.com"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_token(**overrides) -> str:
    claims = {
        "iss": f"https://{DOMAIN}/",
        "aud": AUDIENCE,
        "sub": "auth0|1",
        "exp": int(time.time()) + 600,
    }
    claims.update(overrides)
    return jwt.encode(claims, KEY, algorithm="RS256")


@pytest.fixture(autouse=True)
def auth0(monkeypatch):
    monkeypatch.setattr(settings, "auth0_domain", DOMAIN)
    monkeypatch.setattr(settings, "auth0_audience", AUDIENCE)
    monkeypatch.setattr(auth, "signing_key", lambda token: KEY.public_key())
    monkeypatch.setattr(
        auth,
        "fetch_userinfo",
        lambda token: {"name": "Amara Okafor", "email": "amara.okafor@example.com"},
    )


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_no_token_is_unauthorised():
    assert client.get("/api/me").status_code == 401


def test_valid_token_returns_name_and_email():
    r = client.get("/api/me", headers=bearer(make_token()))
    assert r.status_code == 200
    assert r.json() == {"name": "Amara Okafor", "email": "amara.okafor@example.com"}


def test_expired_token_is_unauthorised():
    token = make_token(exp=int(time.time()) - 60)
    assert client.get("/api/me", headers=bearer(token)).status_code == 401


def test_wrong_audience_is_unauthorised():
    token = make_token(aud="https://other.example.com")
    assert client.get("/api/me", headers=bearer(token)).status_code == 401


def test_wrong_issuer_is_unauthorised():
    token = make_token(iss="https://evil.example.com/")
    assert client.get("/api/me", headers=bearer(token)).status_code == 401


def test_unconfigured_auth0_is_unauthorised(monkeypatch):
    monkeypatch.setattr(settings, "auth0_domain", "")
    assert client.get("/api/me", headers=bearer(make_token())).status_code == 401
