from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app import auth

router = APIRouter(tags=["me"])


class Me(BaseModel):
    name: str
    email: str


@router.get("/api/me", response_model=Me)
def me(claims: Annotated[auth.Claims, Depends(auth.current_user)]) -> Me:
    try:
        info = auth.fetch_userinfo(claims["token"])
    except OSError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Identity provider unavailable") from exc
    return Me(name=info.get("name", ""), email=info.get("email", ""))
