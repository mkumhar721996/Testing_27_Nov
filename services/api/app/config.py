from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "comp_application_api"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/app"

    # Token validation (tokens are issued by the identity provider, never here).
    # With issuer, audience or JWKS URL unset, every token is rejected.
    auth_issuer: str = ""
    auth_audience: str = ""
    auth_jwks_url: str = ""
    auth_roles_claim: str = "https://hr.example/roles"
    hr_admin_role: str = "hr_admin"


settings = Settings()
