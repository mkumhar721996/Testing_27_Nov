from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Literal, get_args

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

Role = Literal["traveller", "admin"]
KNOWN_ROLES: frozenset[str] = frozenset(get_args(Role))


@dataclass(frozen=True)
class Principal:
    subject: str
    roles: frozenset[Role]  # always contains "traveller"


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_signing_key_resolver() -> Callable[[str], Any]:
    return jwt.PyJWKClient(settings.auth_jwks_url).get_signing_key_from_jwt


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    resolver: Callable[[str], Any] = Depends(get_signing_key_resolver),
) -> Principal:
    if not (settings.auth_issuer and settings.auth_audience and settings.auth_jwks_url):
        raise _unauthorized()  # fail closed when unconfigured
    if credentials is None:
        raise _unauthorized()
    token = credentials.credentials
    try:
        key = resolver(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.auth_issuer,
            audience=settings.auth_audience,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except (jwt.PyJWTError, ValueError):
        raise _unauthorized() from None

    claimed = claims.get(settings.auth_roles_claim)
    held = {r for r in claimed if isinstance(r, str) and r in KNOWN_ROLES} if isinstance(claimed, list) else set()
    held.add("traveller")
    return Principal(subject=str(claims["sub"]), roles=frozenset(held))  # type: ignore[arg-type]


def require_role(role: Role) -> Callable[..., Principal]:
    def dependency(principal: Principal = Depends(get_principal)) -> Principal:
        if role not in principal.roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return principal

    return dependency
