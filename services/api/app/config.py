from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "comp_application_api"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/app"
    auth0_domain: str = ""
    auth0_audience: str = ""
    auth0_roles_claim: str = "https://bnts.example/roles"


settings = Settings()
