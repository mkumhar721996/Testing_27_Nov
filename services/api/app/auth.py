from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel

from app.config import settings

_bearer = HTTPBearer(auto_error=False)

ROLES = ("wfc_admin", "fundraising_consultant", "org_admin", "org_staff")


class CurrentUser(BaseModel):
    sub: str
    role: str


@lru_cache
def _jwks_client(domain: str) -> PyJWKClient:
    return PyJWKClient(f"https://{domain}/.well-known/jwks.json")


def _jwk_client() -> PyJWKClient:
    return _jwks_client(settings.auth0_domain)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentUser:
    if credentials is None or not settings.auth0_domain:
        raise _unauthorized()
    token = credentials.credentials
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=f"https://{settings.auth0_domain}/",
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError:
        raise _unauthorized() from None

    roles = claims.get(settings.auth0_roles_claim) or []
    role = next((r for r in ROLES if r in roles), None)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permitted role")
    return CurrentUser(sub=claims["sub"], role=role)
