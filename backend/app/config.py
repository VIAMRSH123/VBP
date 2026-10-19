from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 480

    database_url: str = "sqlite:///./lakehouse.db"

    # APScheduler runs in-process, so it must be off wherever the app runs as a
    # serverless function (the Vercel demo) or inside a build script.
    enable_scheduler: bool = True

    wasender_api_key: str = ""
    wasender_webhook_secret: str = ""  # removed together with the inbound webhook (phase 7)

    # SAP Business One Service Layer. sap_mode: off (default, nothing syncs) | mock | live.
    sap_mode: str = "off"
    sap_base_url: str = ""  # e.g. https://sap-host:50000/b1s/v1  (v2 for OData v4)
    sap_company_db: str = ""
    sap_username: str = ""
    sap_password: str = ""
    sap_verify_tls: bool = True
    sap_ca_bundle: str = ""  # path to a PEM for self-signed on-prem certificates
    sap_timeout_seconds: int = 30
    sap_page_size: int = 200
    sap_sync_interval_minutes: int = 15
    sap_stock_interval_minutes: int = 10
    sap_backfill_days: int = 365
    sap_warehouse_capacity_field: str = "U_Capacity"  # user-defined field on Warehouses
    sap_default_country_code: str = "91"
    sap_notify_max_per_run: int = 5
    sap_order_means_won: bool = True
    sap_direct_orders_create_leads: bool = False

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
    def sap_mode_normalized(self) -> str:
        mode = (self.sap_mode or "off").strip().lower()
        return mode if mode in ("off", "mock", "live") else "off"

    @property
    def sap_enabled(self) -> bool:
        return self.sap_mode_normalized in ("mock", "live")

    @property
    def use_real_sap(self) -> bool:
        return self.sap_mode_normalized == "live" and bool(
            self.sap_base_url and self.sap_company_db and self.sap_username and self.sap_password
        )

    @property
    def sap_external_system(self) -> str:
        return "sap_b1_mock" if self.sap_mode_normalized == "mock" else "sap_b1"

    @property
    def use_real_quip(self) -> bool:
        return bool(self.quip_api_token)


@lru_cache
def get_settings() -> Settings:
    return Settings()
