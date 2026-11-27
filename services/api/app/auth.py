"""Validation of Auth0 access tokens. The API never issues tokens (ADR-0005)."""

import json
import urllib.request
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings

Claims = dict[str, Any]

bearer = HTTPBearer(auto_error=False)


def _unauthorised() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


@lru_cache
def _jwks_client(domain: str) -> PyJWKClient:
    return PyJWKClient(f"https://{domain}/.well-known/jwks.json", cache_keys=True)


def signing_key(token: str) -> Any:
    return _jwks_client(settings.auth0_domain).get_signing_key_from_jwt(token).key


def fetch_userinfo(token: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"https://{settings.auth0_domain}/userinfo",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)


def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Claims:
    if creds is None or not settings.auth0_domain or not settings.auth0_audience:
        raise _unauthorised()
    try:
        claims = jwt.decode(
            creds.credentials,
            signing_key(creds.credentials),
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=f"https://{settings.auth0_domain}/",
            options={"require": ["exp", "iss", "aud"]},
        )
    except (jwt.PyJWTError, OSError) as exc:
        raise _unauthorised() from exc
    claims["token"] = creds.credentials
    return claims
