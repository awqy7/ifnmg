import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.services.datetime_utils import utc_now_naive


def gen_uuid():
    return str(uuid.uuid4())


class Course(Base):
    """Disciplina/Curso do Moodle."""
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("user_id", "moodle_id", name="uq_courses_user_moodle"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    moodle_id = Column(Integer, nullable=False)
    name = Column(String(500), nullable=False)
    short_name = Column(String(100))
    teacher = Column(String(200))
    color = Column(String(7), default="#6366f1")  # Cor hex para UI
    progress = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    raw_data = Column(JSON)  # Dados extras do Moodle
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    activities = relationship("Activity", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")


class Activity(Base):
    """Tarefa, quiz, fórum ou outra atividade do Moodle."""
    __tablename__ = "activities"
    __table_args__ = (UniqueConstraint("course_id", "moodle_id", name="uq_activities_course_moodle"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    moodle_id = Column(String)
    title = Column(String(500), nullable=False)
    activity_type = Column(String(50))  # assignment, quiz, forum, resource, url, page
    description = Column(Text)
    due_date = Column(DateTime, nullable=True)
    # `status` é o estado efetivo usado pela interface. As origens oficial e
    # manual ficam separadas para não apresentar uma confirmação do aluno como
    # se fosse uma entrega reconhecida pelo Virtual2.
    status = Column(String(20), default="pending")  # pending, late, manual_completed, submitted, closed
    moodle_status = Column(String(30), default="unknown")
    moodle_submission_at = Column(DateTime, nullable=True)
    manual_completed_at = Column(DateTime, nullable=True)
    manual_completion_reason = Column(String(50), nullable=True)
    manual_completion_note = Column(String(500), nullable=True)
    is_group_activity = Column(Boolean, default=False)
    last_seen_at = Column(DateTime, default=utc_now_naive)
    removed_at = Column(DateTime, nullable=True)
    url = Column(String(1000))
    is_new = Column(Boolean, default=True)  # Para notificações
    notified = Column(Boolean, default=False)
    notified_thresholds = Column(JSON, default=dict)  # {"7d": true, "3d": false...} lembretes já enviados
    raw_data = Column(JSON)
    first_seen = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    course = relationship("Course", back_populates="activities")


class Material(Base):
    """Material/recurso de um curso."""
    __tablename__ = "materials"
    __table_args__ = (UniqueConstraint("course_id", "moodle_id", name="uq_materials_course_moodle"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    moodle_id = Column(String)
    title = Column(String(500), nullable=False)
    material_type = Column(String(50))  # pdf, video, page, link, file
    url = Column(String(1000))
    source_files = Column(JSON, default=list)  # Arquivos Moodle sem token; autenticação é adicionada sob demanda
    content_text = Column(Text, nullable=True)  # Texto extraído (para IA)
    topic_name = Column(String(500))  # Nome do tópico/semana
    topic_number = Column(Integer)
    file_size = Column(Integer, nullable=True)
    is_new = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    course = relationship("Course", back_populates="materials")


class MaterialSyncMeta(Base):
    """Fingerprint de extração para sincronização incremental de materiais."""
    __tablename__ = "material_sync_meta"

    material_id = Column(String, ForeignKey("materials.id", ondelete="CASCADE"), primary_key=True)
    fingerprint = Column(String(64), nullable=False)
    extraction_attempted = Column(Boolean, default=False, nullable=False)
    extracted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)
