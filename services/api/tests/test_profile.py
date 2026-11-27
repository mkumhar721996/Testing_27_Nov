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


def test_put_requires_authentication():
    app.dependency_overrides.clear()
    assert TestClient(app).put("/me/profile", json=VALID).status_code == 401


@pytest.mark.parametrize("name", ["   ", "\t"])
def test_whitespace_only_name_rejected(client, name):
    assert client.put("/me/profile", json={**VALID, "name": name}).status_code == 422


@pytest.mark.parametrize(
    "email", ["plain", "a@b", "@b.co", "a@.co ", "a b@c.co", "a@@b.co", "a@b .co"]
)
def test_malformed_email_rejected(client, email):
    assert client.put("/me/profile", json={**VALID, "email": email}).status_code == 422


def test_name_and_email_are_trimmed(client):
    body = client.put("/me/profile", json={"name": "  Amara  ", "email": " a@b.co "}).json()
    assert body["name"] == "Amara" and body["email"] == "a@b.co"


def test_clearing_a_preference_persists(client):
    client.put("/me/profile", json={**VALID, "cabin": "First"})
    client.put("/me/profile", json={**VALID, "cabin": None})
    assert client.get("/me/profile").json()["cabin"] is None


def test_missing_required_field_rejected(client):
    assert client.put("/me/profile", json={"name": "A"}).status_code == 422


def test_unknown_field_rejected(client):
    assert client.put("/me/profile", json={**VALID, "currency": "EUR"}).status_code == 422


def test_all_preferences_saved_together(client):
    body = client.put(
        "/me/profile", json={**VALID, "seat": "Aisle", "cabin": "Economy", "diet": "Halal"}
    ).json()
    assert (body["seat"], body["cabin"], body["diet"]) == ("Aisle", "Economy", "Halal")


def test_profiles_are_per_user():
    store = InMemoryProfileStore()
    app.dependency_overrides[get_store] = lambda: store
    try:
        for uid, name in (("u1", "One"), ("u2", "Two")):
            user = CurrentUser(user_id=uid, name=name, email=f"{uid}@b.co", roles=["Traveller"])
            app.dependency_overrides[get_current_user] = lambda user=user: user
            TestClient(app).put("/me/profile", json={"name": name, "email": f"{uid}@b.co"})
        assert TestClient(app).get("/me/profile").json()["name"] == "Two"
        user1 = CurrentUser(user_id="u1", name="One", email="u1@b.co", roles=[])
        app.dependency_overrides[get_current_user] = lambda: user1
        assert TestClient(app).get("/me/profile").json()["name"] == "One"
    finally:
        app.dependency_overrides.clear()
