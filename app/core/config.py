import uuid
import zoneinfo
from dataclasses import field
from enum import StrEnum

from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(StrEnum):
    LOCAL = "local"
    DEV = "dev"
    PROD = "prod"


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")

    ENV: Env = Env.LOCAL
    SECRET_KEY: str = f"default-secret-key{uuid.uuid4().hex}"
    TIMEZONE: zoneinfo.ZoneInfo = field(default_factory=lambda: zoneinfo.ZoneInfo("Asia/Seoul"))

    COOKIE_DOMAIN: str = "localhost"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 14 * 24 * 60
    JWT_LEEWAY: int = 5

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    TASK_RESULT_TTL: int = 3600

    # OAuth
    KAKAO_CLIENT_ID: str = ""
    KAKAO_CLIENT_SECRET: str = ""
    KAKAO_REDIRECT_URI: str = "http://localhost/oauth/callback/kakao"
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""
    NAVER_REDIRECT_URI: str = "http://localhost/oauth/callback/naver"

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost"]
