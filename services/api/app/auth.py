from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    name: str
    email: str
    roles: list[str]


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


@lru_cache
def _jwks_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{issuer.rstrip('/')}/.well-known/jwks.json")


def signing_key_for(token: str):
    return _jwks_client(settings.auth_issuer).get_signing_key_from_jwt(token).key


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Authenticated identity from the Identity Provider's Bearer JWT (ADR-0005, ADR-0007).

    The API only validates tokens: signature (RS256 via the issuer's JWKS), issuer, audience and
    expiry. With no issuer or audience configured every request is rejected.
    """
    if credentials is None or not settings.auth_issuer or not settings.auth_audience:
        raise _unauthorized()
    try:
        claims = jwt.decode(
            credentials.credentials,
            signing_key_for(credentials.credentials),
            algorithms=["RS256"],
            issuer=settings.auth_issuer,
            audience=settings.auth_audience,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        raise _unauthorized() from None
    roles = claims.get(settings.auth_roles_claim, [])
    return CurrentUser(
        user_id=claims["sub"],
        name=str(claims.get("name") or ""),
        email=str(claims.get("email") or ""),
        roles=[str(r) for r in roles] if isinstance(roles, list) else [],
    )
