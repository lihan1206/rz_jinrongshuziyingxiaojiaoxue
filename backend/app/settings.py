from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppCfg(BaseSettings):
    app_title: str = "金融数字营销教学实训系统"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/finance_marketing_lab"
    secret_key: str = "finance-marketing-secret"
    token_expire_minutes: int = 720
    storage_dir: str = str(Path(__file__).resolve().parents[1] / "uploads")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_cfg() -> AppCfg:
    return AppCfg()

