import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth
from app.auth import Principal, get_principal, get_signing_key_resolver, require_role
from app.config import settings

ISSUER = "https://issuer.test/"
AUDIENCE = "test-audience"
CLAIM = "https://travel.example/roles"

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class _SigningKey:
    def __init__(self, key):
        self.key = key


calls: list[str] = []


def _resolver(token: str):
    calls.append(token)
    return _SigningKey(KEY.public_key())


def make_token(roles=None, *, key=KEY, iss=ISSUER, aud=AUDIENCE, exp_in=300, sub="user-1"):
    claims = {"sub": sub, "iss": iss, "aud": aud, "exp": int(time.time()) + exp_in}
    if roles is not None:
        claims[CLAIM] = roles
    return jwt.encode(claims, key, algorithm="RS256")


def bearer(**kwargs):
    return {"Authorization": f"Bearer {make_token(**kwargs)}"}


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setattr(settings, "auth_issuer", ISSUER)
    monkeypatch.setattr(settings, "auth_audience", AUDIENCE)
    monkeypatch.setattr(settings, "auth_jwks_url", "https://issuer.test/jwks.json")
    monkeypatch.setattr(settings, "auth_roles_claim", CLAIM)
    calls.clear()


@pytest.fixture
def client():
    app = FastAPI()

    @app.get("/_admin_probe")
    def admin_probe(principal: Principal = Depends(require_role("admin"))):
        return {"subject": principal.subject}

    @app.get("/_traveller_probe")
    def traveller_probe(principal: Principal = Depends(require_role("traveller"))):
        return {"roles": sorted(principal.roles)}

    app.dependency_overrides[get_signing_key_resolver] = lambda: _resolver
    return TestClient(app)


def test_non_admin_is_refused_with_403(client):
    assert client.get("/_admin_probe", headers=bearer(roles=["traveller"])).status_code == 403


def test_missing_token_is_401(client):
    r = client.get("/_admin_probe")
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_admin_is_accepted(client):
    assert (
        client.get("/_admin_probe", headers=bearer(roles=["traveller", "admin"])).status_code == 200
    )


@pytest.mark.parametrize("roles", [["traveller"], ["traveller", "admin"], None, []])
def test_every_account_is_a_traveller(client, roles):
    r = client.get("/_traveller_probe", headers=bearer(roles=roles))
    assert r.status_code == 200
    assert "traveller" in r.json()["roles"]


def test_unknown_roles_are_dropped(client):
    r = client.get("/_traveller_probe", headers=bearer(roles=["superuser", "admin"]))
    assert r.json()["roles"] == ["admin", "traveller"]


def test_non_list_claim_gives_traveller_only(client):
    r = client.get("/_traveller_probe", headers=bearer(roles="admin"))
    assert r.json()["roles"] == ["traveller"]


@pytest.mark.parametrize(
    "kwargs",
    [
        {"exp_in": -10},
        {"iss": "https://evil.test/"},
        {"aud": "other"},
        {"key": OTHER_KEY},
    ],
)
def test_invalid_tokens_are_401(client, kwargs):
    r = client.get("/_admin_probe", headers=bearer(roles=["admin"], **kwargs))
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_alg_none_is_401(client):
    token = jwt.encode(
        {"sub": "x", "iss": ISSUER, "aud": AUDIENCE, "exp": int(time.time()) + 300, CLAIM: ["admin"]},
        None,
        algorithm="none",
    )
    r = client.get("/_admin_probe", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_malformed_token_is_401(client):
    r = client.get("/_admin_probe", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_role_comes_only_from_token(client):
    token = make_token(roles=["traveller", "admin"])
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/_admin_probe", headers=headers).status_code == 200
    assert client.get("/_admin_probe", headers=headers).status_code == 200
    assert calls == [token, token]


def test_reissued_token_without_admin_is_403(client):
    assert client.get("/_admin_probe", headers=bearer(roles=["traveller", "admin"])).status_code == 200
    assert client.get("/_admin_probe", headers=bearer(roles=["traveller"])).status_code == 403


@pytest.mark.parametrize("field", ["auth_issuer", "auth_audience", "auth_jwks_url"])
def test_unset_configuration_fails_closed(client, monkeypatch, field):
    monkeypatch.setattr(settings, field, "")
    r = client.get("/_traveller_probe", headers=bearer(roles=["traveller", "admin"]))
    assert r.status_code == 401


def test_default_resolver_uses_jwks_url(monkeypatch):
    seen = {}

    class FakeClient:
        def __init__(self, url):
            seen["url"] = url

        def get_signing_key_from_jwt(self, token):
            return "key"

    monkeypatch.setattr(auth.jwt, "PyJWKClient", FakeClient)
    assert get_signing_key_resolver()("t") == "key"
    assert seen["url"] == "https://issuer.test/jwks.json"


def test_get_principal_is_exported():
    assert callable(get_principal)
