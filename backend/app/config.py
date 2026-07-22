from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 480

    database_url: str = "sqlite:///./lakehouse.db"

    wasender_api_key: str = ""
    wasender_webhook_secret: str = ""  # compared against the X-Webhook-Signature header on inbound webhooks

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5"

    databricks_host: str = ""
    databricks_token: str = ""
    databricks_sql_warehouse: str = ""

    quip_api_token: str = ""

    redis_url: str = ""
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def use_real_claude(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def use_real_whatsapp(self) -> bool:
        return bool(self.wasender_api_key)

    @property
    def use_real_quip(self) -> bool:
        return bool(self.quip_api_token)


@lru_cache
def get_settings() -> Settings:
    return Settings()
