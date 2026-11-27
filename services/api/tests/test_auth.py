import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth
from app.main import app
from app.profile_store import InMemoryProfileStore, get_store

ISSUER = "https://tenant.example.com/"
AUDIENCE = "fake-audience"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth.settings, "auth_issuer", ISSUER)
    monkeypatch.setattr(auth.settings, "auth_audience", AUDIENCE)
    monkeypatch.setattr(auth, "signing_key_for", lambda token: KEY.public_key())
    store = InMemoryProfileStore()
    app.dependency_overrides[get_store] = lambda: store
    yield TestClient(app)
    app.dependency_overrides.clear()


def token(**overrides):
    claims = {
        "sub": "auth0|1",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": int(time.time()) + 600,
        "name": "Amara Okafor",
        "email": "amara.okafor@example.com",
        "roles": ["Traveller", "Admin"],
        **overrides,
    }
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, KEY, algorithm="RS256")


def bearer(**overrides):
    return {"Authorization": f"Bearer {token(**overrides)}"}


def test_valid_token_returns_profile_with_roles(client):
    body = client.get("/me/profile", headers=bearer()).json()
    assert body["name"] == "Amara Okafor"
    assert body["roles"] == ["Traveller", "Admin"]


def test_missing_token_rejected(client):
    assert client.get("/me/profile").status_code == 401


@pytest.mark.parametrize(
    "overrides",
    [{"aud": "other"}, {"iss": "https://evil.example.com/"}, {"exp": 1}, {"sub": None}],
)
def test_bad_claims_rejected(client, overrides):
    assert client.get("/me/profile", headers=bearer(**overrides)).status_code == 401


def test_tampered_signature_rejected(client):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode({"sub": "x", "iss": ISSUER, "aud": AUDIENCE}, other, algorithm="RS256")
    r = client.get("/me/profile", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_unconfigured_issuer_rejects_everything(client, monkeypatch):
    monkeypatch.setattr(auth.settings, "auth_issuer", "")
    assert client.get("/me/profile", headers=bearer()).status_code == 401


def test_missing_name_claim_does_not_break_read(client):
    r = client.get("/me/profile", headers=bearer(name=None))
    assert r.status_code == 200


def test_cors_allows_web_origin(client):
    r = client.options(
        "/me/profile",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "PUT"},
    )
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
