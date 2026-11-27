import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth
from app.config import settings
from app.main import app

ROLES_CLAIM = "https://bnts.example/roles"
ISSUER = "https://tenant.example/"
AUDIENCE = "https://api.example"


@pytest.fixture(scope="module")
def private_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def client(private_key, monkeypatch):
    class StubSigningKey:
        key = private_key.public_key()

    class StubJwkClient:
        def get_signing_key_from_jwt(self, token):
            return StubSigningKey()

    monkeypatch.setattr(settings, "auth0_domain", "tenant.example")
    monkeypatch.setattr(settings, "auth0_audience", AUDIENCE)
    monkeypatch.setattr(settings, "auth0_roles_claim", ROLES_CLAIM)
    monkeypatch.setattr(auth, "_jwk_client", lambda: StubJwkClient())
    return TestClient(app)


@pytest.fixture
def make_token(private_key):
    def make(role="org_admin", exp_in=3600, aud=AUDIENCE):
        claims = {
            "sub": "auth0|u1",
            "iss": ISSUER,
            "aud": aud,
            "exp": int(time.time()) + exp_in,
            ROLES_CLAIM: [role] if role else [],
        }
        return jwt.encode(claims, private_key, algorithm="RS256")

    return make


def test_me_returns_sub_and_role(client, make_token):
    for role in ("wfc_admin", "fundraising_consultant", "org_admin", "org_staff"):
        r = client.get("/me", headers={"Authorization": f"Bearer {make_token(role=role)}"})
        assert r.status_code == 200
        assert r.json() == {"sub": "auth0|u1", "role": role}


def test_health_stays_open(client):
    assert client.get("/health").status_code == 200


def test_expired_and_missing_token_are_401(client, make_token):
    r = client.get("/me", headers={"Authorization": f"Bearer {make_token(exp_in=-60)}"})
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"
    assert client.get("/me").status_code == 401


def test_wrong_audience_is_401(client, make_token):
    r = client.get("/me", headers={"Authorization": f"Bearer {make_token(aud='other')}"})
    assert r.status_code == 401


def test_malformed_token_is_401(client):
    r = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_token_signed_with_another_key_is_401(client):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    claims = {"sub": "auth0|u1", "iss": ISSUER, "aud": AUDIENCE, "exp": int(time.time()) + 60}
    forged = jwt.encode({**claims, ROLES_CLAIM: ["wfc_admin"]}, other, algorithm="RS256")
    assert client.get("/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_wrong_issuer_is_401(client, private_key):
    claims = {
        "sub": "auth0|u1",
        "iss": "https://evil.example/",
        "aud": AUDIENCE,
        "exp": int(time.time()) + 60,
        ROLES_CLAIM: ["org_admin"],
    }
    token = jwt.encode(claims, private_key, algorithm="RS256")
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_unconfigured_domain_fails_closed(client, make_token, monkeypatch):
    monkeypatch.setattr(settings, "auth0_domain", "")
    r = client.get("/me", headers={"Authorization": f"Bearer {make_token()}"})
    assert r.status_code == 401


def test_token_with_no_roles_is_403(client, make_token):
    r = client.get("/me", headers={"Authorization": f"Bearer {make_token(role=None)}"})
    assert r.status_code == 403


def test_non_bearer_scheme_is_401(client, make_token):
    r = client.get("/me", headers={"Authorization": f"Basic {make_token()}"})
    assert r.status_code == 401


def test_token_without_a_known_role_is_403(client, make_token):
    r = client.get("/me", headers={"Authorization": f"Bearer {make_token(role='intruder')}"})
    assert r.status_code == 403
