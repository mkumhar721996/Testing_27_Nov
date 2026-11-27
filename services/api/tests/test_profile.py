import pytest
from fastapi.testclient import TestClient

from app.auth import CurrentUser, get_current_user
from app.main import app
from app.profile_store import InMemoryProfileStore, get_store

VALID = {"name": "Amara Okafor", "email": "amara.okafor@example.com"}


def make_client(roles=("Traveller",)):
    store = InMemoryProfileStore()
    user = CurrentUser(
        user_id="u1", name="Amara Okafor", email="amara.okafor@example.com", roles=list(roles)
    )
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app)


@pytest.fixture
def client():
    yield make_client()
    app.dependency_overrides.clear()


def test_requires_authentication():
    app.dependency_overrides.clear()
    assert TestClient(app).get("/me/profile").status_code == 401


def test_first_get_uses_token_name_and_email(client):
    body = client.get("/me/profile").json()
    assert body["name"] == "Amara Okafor"
    assert body["email"] == "amara.okafor@example.com"
    assert body["seat"] is None and body["cabin"] is None and body["diet"] is None


@pytest.mark.parametrize("field", ["name", "email"])
def test_blank_required_field_rejected_and_unchanged(client, field):
    client.get("/me/profile")
    r = client.put("/me/profile", json={**VALID, field: ""})
    assert r.status_code == 422
    assert client.get("/me/profile").json()[field] == VALID[field]


def test_invalid_email_rejected(client):
    assert client.put("/me/profile", json={**VALID, "email": "nope"}).status_code == 422


def test_empty_preferences_can_be_saved(client):
    assert client.put("/me/profile", json={"name": "A", "email": "a@b.co"}).status_code == 200


@pytest.mark.parametrize(
    "field,value", [("seat", "Aisle"), ("cabin", "Business"), ("diet", "Vegan")]
)
def test_preference_persists(client, field, value):
    assert client.put("/me/profile", json={**VALID, field: value}).status_code == 200
    assert client.get("/me/profile").json()[field] == value


@pytest.mark.parametrize("field", ["seat", "cabin", "diet"])
def test_free_text_preference_rejected(client, field):
    assert client.put("/me/profile", json={**VALID, field: "Anywhere"}).status_code == 422


def test_roles_listed_from_token():
    c = make_client(("Traveller", "Admin"))
    try:
        assert c.get("/me/profile").json()["roles"] == ["Traveller", "Admin"]
    finally:
        app.dependency_overrides.clear()


def test_roles_not_writable(client):
    r = client.put("/me/profile", json={**VALID, "roles": ["Admin"]})
    assert r.status_code == 422
    assert client.get("/me/profile").json()["roles"] == ["Traveller"]
