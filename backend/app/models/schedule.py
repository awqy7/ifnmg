import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Schedule(Base):
    """Slot da grade de horários do aluno."""
    __tablename__ = "schedules"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Seg, 1=Ter, ..., 5=Sab
    start_time = Column(String(5), nullable=False)   # "07:00"
    end_time = Column(String(5), nullable=False)     # "08:40"
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    course_name = Column(String(500))  # Nome manual, caso não vinculado
    room = Column(String(100), nullable=True)
    color = Column(String(7), default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="schedules")


class Notification(Base):
    """Notificação gerada pelo sistema."""
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50))  # new_activity, deadline, grade, forum, daily
    related_id = Column(String, nullable=True)  # ID da atividade/curso relacionado
    related_url = Column(String(1000), nullable=True)
    is_read = Column(Boolean, default=False)
    sent_push = Column(Boolean, default=False)
    sent_telegram = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class ChatSession(Base):
    """Sessão de chat com IA."""
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    title = Column(String(500), default="Nova conversa")
    ai_provider = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Mensagem individual do chat."""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(10), nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class FlashcardDeck(Base):
    """Baralho de flashcards."""
    __tablename__ = "flashcard_decks"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")


class Flashcard(Base):
    """Flashcard individual."""
    __tablename__ = "flashcards"

    id = Column(String, primary_key=True, default=gen_uuid)
    deck_id = Column(String, ForeignKey("flashcard_decks.id"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    difficulty = Column(Integer, default=0)  # 0=novo, 1=fácil, 2=médio, 3=difícil
    next_review = Column(DateTime, default=datetime.utcnow)
    review_count = Column(Integer, default=0)

    deck = relationship("FlashcardDeck", back_populates="cards")


class DailyBriefing(Base):
    """Resumo diário gerado pela IA."""
    __tablename__ = "daily_briefings"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)  # "2024-08-24"
    content = Column(Text, nullable=False)  # Markdown gerado pela IA
    courses_today = Column(JSON)  # Lista de cursos do dia
    created_at = Column(DateTime, default=datetime.utcnow)
