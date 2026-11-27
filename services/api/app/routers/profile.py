from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.profile_store import ProfileStore, get_store
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter(tags=["profile"])


@router.get("/me/profile", response_model=ProfileOut)
def read_profile(
    user: CurrentUser = Depends(get_current_user),
    store: ProfileStore = Depends(get_store),
) -> ProfileOut:
    stored = store.get(user.user_id) or store.create(user.user_id, user.name, user.email)
    return ProfileOut(**asdict(stored), roles=user.roles)


@router.put("/me/profile", response_model=ProfileOut)
def save_profile(
    body: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    store: ProfileStore = Depends(get_store),
) -> ProfileOut:
    stored = store.update(user.user_id, body)
    return ProfileOut(**asdict(stored), roles=user.roles)
