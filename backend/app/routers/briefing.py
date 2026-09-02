"""Rotas e montagem do briefing acadêmico diário."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, DailyBriefing, Activity, Course, Material
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service, AIProvider
from app.services.crypto_service import crypto_service
from app.services.datetime_utils import utc_iso, utc_now_naive
from app.services.ai_quota import consume_ai_request

router = APIRouter(prefix="/api/briefing", tags=["Briefing Diário"])
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def _local_now() -> datetime:
    return datetime.now(SAO_PAULO)


def _load_context(db: Session, current_user: User) -> dict:
    """Carrega uma única vez os fatos usados pela IA e pela interface estruturada."""
    local_now = _local_now()
    enrolled_courses = db.query(Course).filter(
        Course.user_id == current_user.id,
        Course.is_active == True,
    ).order_by(Course.name).limit(20).all()

    pending_rows = db.query(Activity, Course.name.label("course_name")).outerjoin(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.user_id == current_user.id,
        Activity.status.in_(["pending", "late"]),
    ).order_by(Activity.due_date.asc().nullslast()).limit(20).all()

    manual_rows = db.query(Activity, Course.name.label("course_name")).outerjoin(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.user_id == current_user.id,
        Activity.status == "manual_completed",
        Activity.removed_at == None,
    ).order_by(Activity.manual_completed_at.desc()).limit(10).all()

    materials = db.query(Material, Course.name.label("course_name")).join(
        Course, Material.course_id == Course.id
    ).filter(
        Material.user_id == current_user.id,
        Material.is_active == True,
    ).order_by(
        Material.updated_at.desc()
    ).limit(8).all()

    courses = [{"id": course.id, "name": course.name} for course in enrolled_courses]
    pending = [
        {
            "id": activity.id,
            "course_id": activity.course_id,
            "title": activity.title,
            "course_name": course_name or "Disciplina",
            "description": activity.description[:500] if activity.description else None,
            "due_date": activity.due_date,
            "status": activity.status,
            "type": activity.activity_type or "assign",
        }
        for activity, course_name in pending_rows
    ]
    recent_materials = [
        {
            "id": material.id,
            "title": material.title,
            "course_name": course_name or "Disciplina",
            "created_at": material.updated_at or material.created_at,
        }
        for material, course_name in materials
    ]
    awaiting_confirmation = [
        {
            "id": activity.id,
            "title": activity.title,
            "course_name": course_name or "Disciplina",
            "manual_completed_at": activity.manual_completed_at,
            "note": activity.manual_completion_note,
        }
        for activity, course_name in manual_rows
    ]
    return {
        "now": local_now,
        "courses": courses,
        "pending": pending,
        "recent_materials": recent_materials,
        "awaiting_confirmation": awaiting_confirmation,
    }


def _fallback_summary(user: User, context: dict) -> str:
    first_name = user.name.split()[0] if user.name else "Estudante"
    course_count = len(context["courses"])
    pending = context["pending"]
    late = sum(1 for item in pending if item["status"] == "late")
    if pending:
        focus = pending[0]
        urgency = "regularize primeiro" if focus["status"] == "late" else "comece por"
        return (
            f"{first_name}, seu foco de hoje está em {focus['course_name']}: {urgency} "
            f"{focus['title']}. Você acompanha {course_count} disciplina(s), {len(pending)} pendência(s)"
            f"{f' e {late} atrasada(s)' if late else ''}."
        )
    if course_count:
        return f"{first_name}, suas {course_count} disciplina(s) estão sem pendências registradas. Aproveite para revisar o conteúdo mais recente."
    return f"{first_name}, não há pendências registradas. É um bom momento para revisar os materiais mais recentes."


def build_briefing_snapshot(
    db: Session,
    current_user: User,
    briefing: DailyBriefing | None = None,
    context: dict | None = None,
) -> dict:
    """Resposta factual e acionável. Funciona instantaneamente mesmo sem IA."""
    context = context or _load_context(db, current_user)
    local_now = context["now"]
    date_str = local_now.strftime("%Y-%m-%d")
    if briefing is None:
        briefing = db.query(DailyBriefing).filter(
            DailyBriefing.user_id == current_user.id,
            DailyBriefing.date == date_str,
        ).order_by(DailyBriefing.created_at.desc()).first()

    pending = context["pending"]
    late_count = sum(1 for item in pending if item["status"] == "late")
    utc_now = utc_now_naive()
    due_24h = sum(
        1 for item in pending
        if item["due_date"] and utc_now <= item["due_date"] <= utc_now + timedelta(hours=24)
    )

    def serialize_activity(item: dict) -> dict:
        due = item["due_date"]
        return {
            **{k: value for k, value in item.items() if k != "due_date"},
            "due_date": utc_iso(due),
            "hours_remaining": round((due - utc_now).total_seconds() / 3600, 1) if due else None,
        }

    top_priority = serialize_activity(pending[0]) if pending else None
    timeline = [
        {
            "kind": "deadline",
            "id": item["id"],
            "title": item["title"],
            "time": utc_iso(item["due_date"]),
            "subtitle": item["course_name"],
            "status": item["status"],
        }
        for item in pending[:4] if item["due_date"]
    ]

    study_plan = []
    for index, item in enumerate(pending[:3]):
        study_plan.append({
            "id": item["id"],
            "label": f"{'Regularizar' if item['status'] == 'late' else 'Avançar em'} {item['title']}",
            "course_name": item["course_name"],
            "minutes": 40 if index == 0 else 25,
        })
    if not study_plan and context["recent_materials"]:
        material = context["recent_materials"][0]
        study_plan.append({
            "id": material["id"],
            "label": f"Revisar {material['title']}",
            "course_name": material["course_name"],
            "minutes": 25,
        })

    is_stale = bool(
        briefing
        and current_user.moodle_last_sync
        and briefing.created_at
        and briefing.created_at < current_user.moodle_last_sync
    )
    return {
        "id": briefing.id if briefing else None,
        "date": date_str,
        "content": briefing.content if briefing and briefing.content else _fallback_summary(current_user, context),
        "courses": context["courses"],
        "created_at": utc_iso(briefing.created_at) if briefing else None,
        "is_ai_generated": bool(briefing),
        "is_stale": is_stale,
        "metrics": {
            "courses": len(context["courses"]),
            "pending": len(pending),
            "late": late_count,
            "due_24h": due_24h,
            "awaiting_confirmation": len(context.get("awaiting_confirmation", [])),
        },
        "top_priority": top_priority,
        "urgent_activities": [serialize_activity(item) for item in pending[:5]],
        "timeline": timeline,
        "study_plan": study_plan,
        "awaiting_confirmation": [
            {
                **{k: value for k, value in item.items() if k != "manual_completed_at"},
                "manual_completed_at": utc_iso(item["manual_completed_at"]),
            }
            for item in context.get("awaiting_confirmation", [])[:5]
        ],
        "recent_materials": [
            {
                **{k: value for k, value in item.items() if k != "created_at"},
                "created_at": utc_iso(item["created_at"]),
            }
            for item in context["recent_materials"][:4]
        ],
    }


async def _generate_user_briefing(db: Session, current_user: User) -> DailyBriefing:
    context = _load_context(db, current_user)
    date_str = context["now"].strftime("%Y-%m-%d")
    pending_data = [
        {
            **item,
            "due_date": item["due_date"].strftime("%d/%m/%Y %H:%M") if item["due_date"] else None,
        }
        for item in context["pending"]
    ]
    material_data = [
        {"title": item["title"], "course_name": item["course_name"]}
        for item in context["recent_materials"]
    ]

    try:
        provider = AIProvider(current_user.ai_provider or "groq")
    except ValueError:
        provider = AIProvider.GROQ
    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
            custom_keys.pop("moodle_token", None)
        except Exception:
            pass

    content = await ai_service.generate_daily_briefing(
        user_name=current_user.name.split()[0] if current_user.name else "Aluno",
        enrolled_courses=context["courses"],
        pending_activities=pending_data,
        recent_materials=material_data,
        provider=provider,
        custom_api_keys=custom_keys,
    )
    briefing = db.query(DailyBriefing).filter(
        DailyBriefing.user_id == current_user.id,
        DailyBriefing.date == date_str,
    ).order_by(DailyBriefing.created_at.desc()).first()
    if not briefing:
        briefing = DailyBriefing(
            user_id=current_user.id,
            date=date_str,
            content=content,
            courses_today=context["courses"],
        )
        db.add(briefing)
    else:
        briefing.content = content
        briefing.courses_today = context["courses"]
        briefing.created_at = utc_now_naive()
    db.commit()
    db.refresh(briefing)
    return briefing


@router.get("/today")
async def get_today_briefing(
    generate_if_missing: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    date_str = _local_now().strftime("%Y-%m-%d")
    briefing = db.query(DailyBriefing).filter(
        DailyBriefing.user_id == current_user.id,
        DailyBriefing.date == date_str,
    ).order_by(DailyBriefing.created_at.desc()).first()
    invalid = bool(
        briefing and (
            not briefing.content
            or len(briefing.content.strip()) < 30
            or "Seu painel está pronto" in briefing.content
            or "<think>" in briefing.content
        )
    )
    if generate_if_missing and (not briefing or invalid):
        consume_ai_request(db, current_user.id, "daily_briefing")
        briefing = await _generate_user_briefing(db, current_user)
    return build_briefing_snapshot(db, current_user, briefing=briefing)


@router.post("/generate")
async def generate_briefing_now(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consume_ai_request(db, current_user.id, "daily_briefing")
    briefing = await _generate_user_briefing(db, current_user)
    result = build_briefing_snapshot(db, current_user, briefing=briefing)
    result["message"] = "Briefing atualizado com sucesso!"
    return result
