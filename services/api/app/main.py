from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, profile

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_methods=["GET", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router)
app.include_router(profile.router)
