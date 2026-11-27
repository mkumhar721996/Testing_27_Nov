from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field

Required = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
EmploymentType = Literal["Full time", "Part time", "Contract"]


class JobOpeningCreate(BaseModel):
    # extra="forbid": status is never set by the client, a new opening is always open.
    model_config = ConfigDict(extra="forbid")

    title: Required
    department: Required
    location: Required
    employment_type: EmploymentType
    description: str = ""


class JobOpeningUpdate(BaseModel):
    """Details only; status changes through the open and close actions."""

    model_config = ConfigDict(extra="forbid")

    title: Required | None = None
    department: Required | None = None
    location: Required | None = None
    employment_type: EmploymentType | None = None
    description: str | None = None


class JobOpeningOut(BaseModel):
    id: int
    title: str
    department: str
    location: str
    employment_type: str
    description: str
    status: Literal["open", "closed"]
    candidate_count: int = Field(ge=0)
    in_progress_count: int = Field(ge=0)

    @computed_field
    @property
    def reference(self) -> str:
        return f"JO-{self.id}"
