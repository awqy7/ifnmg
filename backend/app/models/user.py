import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Credenciais do Moodle (criptografadas)
    moodle_username_enc = Column(Text, nullable=True)
    moodle_password_enc = Column(Text, nullable=True)
    moodle_session_cookies = Column(Text, nullable=True)  # JSON criptografado
    moodle_connected = Column(Boolean, default=False)
    moodle_last_sync = Column(DateTime, nullable=True)

    # Config de IA
    ai_provider = Column(String(50), default="groq")
    ai_api_keys_enc = Column(Text, nullable=True)  # JSON criptografado {provider: key}

    # Config de notificações
    notification_settings = Column(JSON, default=lambda: {
        "new_activity": True,
        "deadline_7d": True,
        "deadline_3d": True,
        "deadline_1d": True,
        "deadline_6h": True,
        "grade_released": True,
        "forum_post": True,
        "daily_briefing": True,
        "quiet_start": "22:00",
        "quiet_end": "07:00",
    })

    # Push subscription (Web Push)
    push_subscription = Column(Text, nullable=True)  # JSON

    # Telegram
    telegram_chat_id = Column(String, nullable=True)

    # Preferências
    theme = Column(String(10), default="dark")

    # Relacionamentos
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user", cascade="all, delete-orphan")
