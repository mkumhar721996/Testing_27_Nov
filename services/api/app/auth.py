from dataclasses import dataclass

from fastapi import HTTPException, Request, status


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    name: str
    email: str
    roles: list[str]


def get_current_user(request: Request) -> CurrentUser:
    """Authenticated identity from the Identity Provider's Bearer JWT (ADR-0005, ADR-0007).

    Token signature validation is owned by the sign-in item; until it lands every request is
    rejected, which is the safe default. Tests override this dependency.
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
