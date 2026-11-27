from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "comp_application_api"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/app"
    auth_issuer: str = ""
    auth_audience: str = ""
    auth_jwks_url: str = ""
    auth_roles_claim: str = "https://travel.example/roles"


settings = Settings()
