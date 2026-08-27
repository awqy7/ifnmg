"""
Rotas para disciplinas (Courses) e Materiais do IFNMG Assistente.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Course, Material, Activity
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/courses", tags=["Disciplinas"])


@router.get("")
async def list_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas as disciplinas do usuário com contagem de pendências."""
    courses = db.query(Course).filter(
        Course.user_id == current_user.id,
        Course.is_active == True,
    ).order_by(Course.name).all()

    result = []
    for c in courses:
        pending_count = db.query(func.count(Activity.id)).filter(
            Activity.course_id == c.id,
            Activity.user_id == current_user.id,
            Activity.status.in_(["pending", "late"]),
        ).scalar() or 0

        result.append({
            "id": c.id,
            "moodle_id": c.moodle_id,
            "name": c.name,
            "short_name": c.short_name or "",
            "teacher": c.teacher or "Professor IFNMG",
            "color": c.color or "#6366f1",
            "progress": c.progress or 0,
            "pending_activities": pending_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })
    return result


@router.get("/{course_id}")
async def get_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna detalhes de uma disciplina específica."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.user_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    pending_count = db.query(func.count(Activity.id)).filter(
        Activity.course_id == course.id,
        Activity.user_id == current_user.id,
        Activity.status.in_(["pending", "late"]),
    ).scalar() or 0

    return {
        "id": course.id,
        "moodle_id": course.moodle_id,
        "name": course.name,
        "short_name": course.short_name or "",
        "teacher": course.teacher or "Professor IFNMG",
        "color": course.color or "#6366f1",
        "progress": course.progress or 0,
        "pending_activities": pending_count,
    }


@router.get("/{course_id}/materials")
async def get_course_materials(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todos os materiais de uma disciplina."""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.user_id == current_user.id,
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    materials = db.query(Material).filter(
        Material.course_id == course_id,
        Material.user_id == current_user.id,
    ).order_by(Material.topic_number.asc().nullslast(), Material.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "moodle_id": m.moodle_id,
            "title": m.title,
            "type": m.material_type,
            "url": m.url,
            "topic_name": m.topic_name or "Geral",
            "topic_number": m.topic_number,
            "file_size": m.file_size,
            "has_text": bool(m.content_text),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in materials
    ]
