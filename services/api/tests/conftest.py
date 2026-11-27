import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.auth import get_signing_key_resolver
from app.config import settings
from app.main import app
from app.repositories.job_openings import get_job_opening_repository
from tests.fakes import InMemoryJobOpeningRepository

ISSUER = "https://issuer.test/"
AUDIENCE = "test-audience"


@pytest.fixture(scope="session")
def signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="session")
def other_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def make_token(signing_key):
    def make(roles=None, key=None, expires_in=300):
        claims = {
            "sub": "user-1",
            "iss": ISSUER,
            "aud": AUDIENCE,
            "exp": int(time.time()) + expires_in,
            settings.auth_roles_claim: roles or [],
        }
        return jwt.encode(claims, key or signing_key, algorithm="RS256")

    return make


@pytest.fixture
def repo():
    return InMemoryJobOpeningRepository()


@pytest.fixture
def client(monkeypatch, signing_key, repo):
    monkeypatch.setattr(settings, "auth_issuer", ISSUER)
    monkeypatch.setattr(settings, "auth_audience", AUDIENCE)
    app.dependency_overrides[get_signing_key_resolver] = lambda: (
        lambda token: signing_key.public_key()
    )
    app.dependency_overrides[get_job_opening_repository] = lambda: repo
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def hr_admin(make_token):
    return {"Authorization": f"Bearer {make_token(roles=['hr_admin'])}"}


@pytest.fixture
def plain_user(make_token):
    return {"Authorization": f"Bearer {make_token(roles=['employee'])}"}
