import secrets
from pathlib import Path
from typing import Optional, List
from pydantic_settings import BaseSettings
from cryptography.fernet import Fernet

BASE_DIR = Path(__file__).resolve().parent.parent


def _get_or_create_secret_key() -> str:
    """Lê SECRET_KEY de arquivo persistente ou gera uma nova e salva."""
    key_file = BASE_DIR / ".secret_key"
    if key_file.exists():
        saved = key_file.read_text().strip()
        if saved:
            return saved
    new_key = secrets.token_hex(32)
    key_file.write_text(new_key)
    key_file.chmod(0o600)
    return new_key


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = ""
    ENCRYPTION_KEY: Optional[str] = None

    # Database
    DATABASE_URL: str = "sqlite:///./ifnmg_assistente.db"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

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

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"

    def model_post_init(self, __context):
        if not self.SECRET_KEY:
            object.__setattr__(self, 'SECRET_KEY', _get_or_create_secret_key())

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    def get_fernet(self) -> Fernet:
        """Retorna instância do Fernet para criptografia."""
        key_file = BASE_DIR / "encryption.key"
        if self.ENCRYPTION_KEY:
            return Fernet(self.ENCRYPTION_KEY.encode())
        if key_file.exists():
            return Fernet(key_file.read_bytes())
        key = Fernet.generate_key()
        key_file.write_bytes(key)
        key_file.chmod(0o600)
        return Fernet(key)


settings = Settings()
