from collections.abc import Callable
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

bearer = HTTPBearer(auto_error=False)

SigningKeyResolver = Callable[[str], Any]


class CurrentUser(BaseModel):
    subject: str
    roles: list[str]


@lru_cache
def _jwk_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url)


def get_signing_key_resolver() -> SigningKeyResolver:
    """Returns a function mapping a token to its public signing key."""

    def resolve(token: str) -> Any:
        return _jwk_client(settings.auth_jwks_url).get_signing_key_from_jwt(token).key

    return resolve


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    resolve_key: SigningKeyResolver = Depends(get_signing_key_resolver),
) -> CurrentUser:
    if credentials is None or not settings.auth_issuer or not settings.auth_audience:
        raise _unauthorized()
    try:
        claims = jwt.decode(
            credentials.credentials,
            resolve_key(credentials.credentials),
            algorithms=["RS256"],
            issuer=settings.auth_issuer,
            audience=settings.auth_audience,
            options={"require": ["exp", "sub"]},
        )
    except (jwt.PyJWTError, ValueError):
        raise _unauthorized() from None
    roles = claims.get(settings.auth_roles_claim, [])
    return CurrentUser(subject=claims["sub"], roles=roles if isinstance(roles, list) else [])


def require_hr_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if settings.hr_admin_role not in user.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR admin role required")
    return user
