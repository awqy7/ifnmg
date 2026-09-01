from pathlib import Path
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    # App
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str
    ENCRYPTION_KEY: str

    # Database
    DATABASE_URL: str

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ALLOWED_ORIGIN_REGEX: str = r"^https://ifnmg(-[a-z0-9-]+)?\.vercel\.app$"

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"

    # AI Providers
    DEFAULT_AI_PROVIDER: str = "groq"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Web Push
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: str = "admin@ifnmg-assistente.app"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # Moodle
    MOODLE_BASE_URL: str = "https://virtual2.ifnmg.edu.br"
    SCRAPER_INTERVAL_MINUTES: int = 30

    # Security
    BCRYPT_ROUNDS: int = 12
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_SYNC_PER_HOUR: int = 10
    AI_REQUESTS_PER_DAY: int = 200

    def model_post_init(self, __context):
        if not self.SECRET_KEY:
            raise RuntimeError("SECRET_KEY é obrigatória. Defina no arquivo .env ou variável de ambiente.")
        if not self.ENCRYPTION_KEY:
            raise RuntimeError("ENCRYPTION_KEY é obrigatória. Defina no arquivo .env ou variável de ambiente.")
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL é obrigatória. Defina no arquivo .env ou variável de ambiente.")
        if self.APP_ENV == "production" and self.DEBUG:
            raise RuntimeError("DEBUG deve ser false em produção.")

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    def get_fernet(self) -> Fernet:
        return Fernet(self.ENCRYPTION_KEY.encode())


settings = Settings()
