"""
Rotas para Boletim e Notas (Grades) agrupadas por disciplina.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Course, Grade
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/grades", tags=["Notas"])


@router.get("")
async def list_grades(
    course_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna as notas do aluno agrupadas por disciplina, com média calculada.
    """
    courses_query = db.query(Course).filter(
        Course.user_id == current_user.id,
        Course.is_active == True,
    )
    if course_id:
        courses_query = courses_query.filter(Course.id == course_id)

    courses = courses_query.order_by(Course.name).all()

    result = []
    for c in courses:
        grades = db.query(Grade).filter(
            Grade.course_id == c.id,
            Grade.user_id == current_user.id,
        ).order_by(Grade.item_name).all()

        if not grades and not course_id:
            # Se não tem notas nesta matéria e listou todas, pode incluir vazia ou com lista vazia
            pass

        grade_items = []
        total_grade = 0.0
        total_max = 0.0
        valid_items_count = 0

        for g in grades:
            grade_items.append({
                "id": g.id,
                "item_name": g.item_name,
                "grade": g.grade,
                "max_grade": g.max_grade,
                "percentage": g.percentage,
                "feedback": g.feedback,
                "graded_at": g.graded_at.isoformat() if g.graded_at else None,
            })
            if g.grade is not None:
                total_grade += g.grade
                if g.max_grade:
                    total_max += g.max_grade
                valid_items_count += 1

        average = None
        if total_max > 0:
            average = round((total_grade / total_max) * 100, 1)
        elif valid_items_count > 0:
            average = round(total_grade / valid_items_count, 1)

        result.append({
            "course_id": c.id,
            "course_name": c.name,
            "course_color": c.color or "#6366f1",
            "average": average,
            "grades": grade_items,
        })

    return result
