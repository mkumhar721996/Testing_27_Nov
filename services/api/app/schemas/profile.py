import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

Seat = Literal["Window", "Aisle", "Middle"]
Cabin = Literal["Economy", "Premium economy", "Business", "First"]
Diet = Literal["Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Dairy-free"]

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str
    email: str
    seat: Seat | None = None
    cabin: Cabin | None = None
    diet: Diet | None = None

    @field_validator("name")
    @classmethod
    def name_required(cls, value: str) -> str:
        if not value:
            raise ValueError("name is required")
        return value

    @field_validator("email")
    @classmethod
    def email_valid(cls, value: str) -> str:
        if not EMAIL_PATTERN.match(value):
            raise ValueError("email is not valid")
        return value


class ProfileOut(ProfileUpdate):
    roles: list[str]
