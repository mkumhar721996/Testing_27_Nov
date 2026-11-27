from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_hr_admin
from app.repositories.job_openings import (
    CloseRefused,
    JobOpeningRecord,
    JobOpeningRepository,
    get_job_opening_repository,
)
from app.schemas.job_openings import JobOpeningCreate, JobOpeningOut, JobOpeningUpdate

router = APIRouter(
    prefix="/job-openings", tags=["job-openings"], dependencies=[Depends(require_hr_admin)]
)


def _found(record: JobOpeningRecord | None) -> JobOpeningOut:
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")
    return JobOpeningOut(**record.model_dump())


@router.get("", response_model=list[JobOpeningOut])
def list_job_openings(repo: JobOpeningRepository = Depends(get_job_opening_repository)):
    return [JobOpeningOut(**r.model_dump()) for r in repo.list()]


@router.post("", response_model=JobOpeningOut, status_code=status.HTTP_201_CREATED)
def create_job_opening(
    body: JobOpeningCreate, repo: JobOpeningRepository = Depends(get_job_opening_repository)
):
    return _found(repo.create(body.model_dump()))


@router.patch("/{opening_id}", response_model=JobOpeningOut)
def update_job_opening(
    opening_id: int,
    body: JobOpeningUpdate,
    repo: JobOpeningRepository = Depends(get_job_opening_repository),
):
    return _found(repo.update(opening_id, body.model_dump(exclude_none=True)))


@router.post("/{opening_id}/open", response_model=JobOpeningOut)
def open_job_opening(
    opening_id: int, repo: JobOpeningRepository = Depends(get_job_opening_repository)
):
    return _found(repo.set_open(opening_id))


@router.post("/{opening_id}/close", response_model=JobOpeningOut)
def close_job_opening(
    opening_id: int, repo: JobOpeningRepository = Depends(get_job_opening_repository)
):
    try:
        return _found(repo.close(opening_id))
    except CloseRefused as refused:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "candidates_in_progress", "in_progress": refused.in_progress},
        ) from None
