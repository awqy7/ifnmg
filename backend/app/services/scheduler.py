"""
Scheduler de background jobs.
Sync completo do Moodle: API oficial (webservice) como fonte primária,
HTML scraper como fallback. Sincroniza cursos, atividades (com UPDATE),
materiais (com extração de texto p/ IA), notas, calendário e notificações
escalonadas de prazo.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

# Status de sync em memória (por usuário) para feedback no frontend
_sync_status: Dict[str, dict] = {}


def get_sync_status(user_id: str) -> dict:
    return _sync_status.get(user_id, {"running": False})


# ─────────────────────────────────────────────────────────────
# Upserts compartilhados
# ─────────────────────────────────────────────────────────────

def _compute_status(item: dict, existing_status: Optional[str], grade=None) -> str:
    """Define status da atividade: graded > submitted > late > pending."""
    if grade is not None:
        return "graded"
    if existing_status == "submitted":
        # mantém enviado manualmente pelo usuário
        return "submitted"
    if item.get("is_completed"):
        return "submitted"
    due = item.get("due_date")
    if isinstance(due, datetime):
        pass
    elif due:
        try:
            due = datetime.fromisoformat(str(due))
        except Exception:
            due = None
    else:
        due = None
    if due and due < datetime.utcnow():
        return "late"
    return "pending"


async def _upsert_activity(
    db: Session,
    user_id: str,
    course,
    act_data: dict,
    is_new_course: bool,
    ws=None,
    client=None,
):
    from app.models import Activity

    mid = str(act_data.get("moodle_id") or "")
    if not mid or not act_data.get("title"):
        return None

    due_date = None
    raw_due = act_data.get("due_date")
    if raw_due:
        if isinstance(raw_due, datetime):
            due_date = raw_due
        else:
            try:
                due_date = datetime.fromisoformat(str(raw_due))
            except Exception:
                due_date = None

    activity = db.query(Activity).filter(
        Activity.course_id == course.id,
        Activity.moodle_id == mid,
    ).first()

    created = False
    if not activity:
        activity = Activity(
            user_id=user_id,
            course_id=course.id,
            moodle_id=mid,
            title=act_data["title"],
            activity_type=act_data.get("type", "unknown"),
            description=act_data.get("description", ""),
            due_date=due_date,
            url=act_data.get("url", ""),
            is_new=True,
            notified=False,
            notified_thresholds={},
            # Os anexos da atividade são necessários para gerar o rascunho de
            # resposta sob demanda. Guardamos somente metadados/URLs, nunca o
            # conteúdo do arquivo.
            raw_data=dict(act_data),
        )
        db.add(activity)
        db.flush()
        created = True
    else:
        # UPDATE: mantém dados sempre atualizados com o Moodle
        activity.title = act_data["title"] or activity.title
        activity.activity_type = act_data.get("type") or activity.activity_type
        if act_data.get("description"):
            activity.description = act_data["description"]
        if due_date:
            activity.due_date = due_date
        if act_data.get("url"):
            activity.url = act_data["url"]
        if act_data.get("files"):
            raw_data = dict(activity.raw_data or {})
            raw_data["files"] = act_data["files"]
            activity.raw_data = raw_data
        # Atividade existente: não é nova
        activity.is_new = False

    # Extração automática de anexos de atividades (PDFs, etc) para a IA ter acesso imediato
    files_list = act_data.get("files") or []
    if not files_list and activity.raw_data and isinstance(activity.raw_data, dict):
        files_list = activity.raw_data.get("files") or []

    raw_data = dict(activity.raw_data or {})
    if files_list and not raw_data.get("content_text") and (ws or client):
        try:
            from app.services.material_extractor import extract_material_content
            extracted_parts = []
            for file_item in files_list[:6]:
                f_url = file_item.get("fileurl") or file_item.get("url")
                f_name = file_item.get("filename") or file_item.get("name", "")
                f_mime = file_item.get("mimetype", "")
                if f_url:
                    text_extracted = await extract_material_content(
                        ws=ws,
                        client=client,
                        fileurl=f_url,
                        filename=f_name,
                        mimetype=f_mime,
                    )
                    if text_extracted:
                        extracted_parts.append(f"[{f_name}]:\n{text_extracted}")
            if extracted_parts:
                raw_data["content_text"] = "\n\n".join(extracted_parts)[:25000]
                activity.raw_data = raw_data
        except Exception as e:
            logger.debug(f"Erro ao extrair anexo da atividade {mid}: {e}")

    # status recalculado (preserva 'graded' e 'submitted' manuais)
    new_status = _compute_status(
        {**act_data, "due_date": activity.due_date},
        activity.status,
        grade=activity.grade,
    )
    activity.status = new_status

    if created and new_status in ("pending", "late") and not is_new_course:
        activity.is_new = True
        activity.notified = False

    db.flush()
    return activity


async def _sync_materials(
    db: Session,
    user_id: str,
    course,
    materials_data: list,
    ws=None,
    client=None,
    extract_text: bool = True,
):
    """Cria/atualiza materiais do curso e extrai texto dos arquivos para a IA."""
    from app.models import Material
    from app.services.material_extractor import extract_material_content, extract_url_content

    synced = 0
    for mat_data in materials_data:
        mid = str(mat_data.get("moodle_id") or "")
        title = mat_data.get("title")
        if not title:
            continue

        files_meta = mat_data.get("files", []) or []

        # chave de dedupe por módulo
        mat_key = f"mod_{mid}" if mid else f"url_{mat_data.get('url', '')[:200]}"
        material = None
        try:
            material = db.query(Material).filter(
                Material.user_id == user_id,
                Material.moodle_id == mat_key,
            ).first()
        except Exception:
            material = None

        if not material:
            material = Material(
                user_id=user_id,
                course_id=course.id,
                moodle_id=mat_key,
                title=title[:500],
                material_type=mat_data.get("type", "resource"),
                url=mat_data.get("url", ""),
                topic_name=mat_data.get("topic_name"),
                topic_number=mat_data.get("topic_number"),
                is_new=True,
                content_text="",
            )
            db.add(material)
            db.flush()
        else:
            material.title = title[:500]
            if mat_data.get("topic_name"):
                material.topic_name = mat_data["topic_name"]
            material.topic_number = mat_data.get("topic_number")
            material.url = mat_data.get("url", "") or material.url

        # Extração de texto: só quando ainda não tem conteúdo
        if extract_text and not material.content_text:
            text_parts = []
            description = (mat_data.get("description") or "").strip()
            if description:
                text_parts.append(description)
            if files_meta:
                for fmeta in files_meta[:8]:  # cobre pastas/listas sem explodir memória
                    txt = await extract_material_content(
                        ws=ws,
                        client=client,
                        fileurl=fmeta.get("fileurl", ""),
                        filename=fmeta.get("filename", ""),
                        mimetype=fmeta.get("mimetype", ""),
                    )
                    if txt:
                        text_parts.append(txt)
                    if sum(len(t) for t in text_parts) > 14000:
                        break

            # Links e vídeos são abertos automaticamente. URLs do tipo
            # /mod/url/view.php podem redirecionar para YouTube ou outra página.
            material_type = (mat_data.get("type") or "").lower()
            if material.url and material_type in {"url", "video", "link", "lti"}:
                linked_text = await extract_url_content(client, material.url)
                if linked_text:
                    text_parts.append(linked_text)

            if text_parts:
                material.content_text = "\n\n".join(text_parts)[:15000]
                material.file_size = sum(f.get("filesize") or 0 for f in files_meta)

        synced += 1

    return synced


async def _upsert_grades(db: Session, user_id: str, course, grades_data: list):
    from app.models import Grade

    for gdata in grades_data:
        item_name = (gdata.get("item_name") or "").strip()
        if not item_name or item_name.lower() in ("total do curso", "course total"):
            continue
        existing = db.query(Grade).filter(
            Grade.course_id == course.id,
            Grade.item_name == item_name,
        ).first()

        changed = (
            existing is None
            or (gdata.get("grade") is not None and existing.grade != gdata.get("grade"))
        )

        if not existing:
            db.add(Grade(
                user_id=user_id,
                course_id=course.id,
                item_name=item_name,
                grade=gdata.get("grade"),
                max_grade=gdata.get("max_grade"),
                percentage=gdata.get("percentage"),
                feedback=gdata.get("feedback"),
                graded_at=datetime.utcnow(),
                notified=True,  # notas antigas não notificam
            ))
        elif changed and gdata.get("grade") is not None:
            existing.grade = gdata["grade"]
            existing.percentage = gdata.get("percentage")
            if gdata.get("feedback"):
                existing.feedback = gdata["feedback"]
            existing.notified = False  # dispara notificação de mudança
            existing.graded_at = datetime.utcnow()


def _normalize_ws_grade_items(items: list) -> list:
    out = []
    for gi in items:
        grademax = gi.get("grademax")
        graderaw = gi.get("graderaw")
        percentage = None
        if graderaw is not None and grademax:
            percentage = round((graderaw / grademax) * 100, 1)
        out.append({
            "item_name": gi.get("itemname") or "",
            "grade": float(graderaw) if graderaw is not None else None,
            "max_grade": float(grademax) if grademax else None,
            "percentage": percentage,
            "feedback": gi.get("feedback") or None,
        })
    return out


def _normalize_html_grades(grades_data: list) -> list:
    return [
        {
            "item_name": g.get("item_name"),
            "grade": g.get("grade"),
            "max_grade": g.get("max_grade"),
            "percentage": g.get("percentage"),
            "feedback": g.get("feedback"),
        }
        for g in grades_data
    ]


# ─────────────────────────────────────────────────────────────
# Sync principal
# ─────────────────────────────────────────────────────────────

async def sync_moodle_for_user(user_id: str):
    """Sincroniza TUDO do Moodle para um usuário. WS primeiro, HTML fallback."""
    from app.models import User, Course, Activity, CalendarEvent
    from app.services.moodle_auth import moodle_auth_service
    from app.services.crypto_service import crypto_service
    from app.services.notification_service import notification_service
    from app.services.moodle_webservice import MoodleWebService, collect_course_data
    from app.services.moodle_scraper import MoodleScraper

    _sync_status[user_id] = {
        "running": True,
        "started_at": datetime.utcnow().isoformat(),
        "courses_done": 0,
        "activities": 0,
        "materials": 0,
        "source": None,
        "error": None,
    }

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.moodle_username_enc or not user.moodle_password_enc:
            _sync_status[user_id]["running"] = False
            return

        username = crypto_service.decrypt(user.moodle_username_enc)
        password = crypto_service.decrypt(user.moodle_password_enc)

        # Renova sessão se preciso
        session_data = None
        if user.moodle_session_cookies:
            try:
                session_data = crypto_service.decrypt_json(user.moodle_session_cookies)
                if not await moodle_auth_service.validate_session(session_data):
                    session_data = None
            except Exception:
                session_data = None

        if not session_data:
            session_data = await moodle_auth_service.login(username, password)
            if not session_data:
                user.moodle_connected = False
                db.commit()
                logger.warning(f"Falha ao reconectar usuário {user_id} ao Moodle")
                _sync_status[user_id].update({"running": False, "error": "login"})
                return
            user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
            user.moodle_connected = True

        moodle_token = session_data.get("moodle_token") or await moodle_auth_service.get_moodle_token(username, password)

        # Guarda token p/ uso futuro
        if moodle_token:
            keys = {}
            if user.ai_api_keys_enc:
                try:
                    keys = crypto_service.decrypt_json(user.ai_api_keys_enc)
                except Exception:
                    keys = {}
            if keys.get("moodle_token") != moodle_token:
                keys["moodle_token"] = moodle_token
                user.ai_api_keys_enc = crypto_service.encrypt_json(keys)

        ws = MoodleWebService(settings.MOODLE_BASE_URL, moodle_token) if moodle_token else None
        client = moodle_auth_service.build_httpx_client(session_data)
        scraper = MoodleScraper(client, moodle_token)

        use_ws = False
        courses_data = []

        async with client:
            # ── Fonte primária: Web Services ──
            if ws:
                try:
                    courses_data = await ws.get_courses()
                    if courses_data:
                        use_ws = True
                        _sync_status[user_id]["source"] = "webservice"
                except Exception as e:
                    logger.warning(f"WS indisponível, caindo para HTML: {e}")

            # ── Fallback: multi-fonte HTML ──
            if not courses_data:
                courses_data = await scraper.get_courses()
                _sync_status[user_id]["source"] = "html"

            logger.info(f"Sync {user_id}: {len(courses_data)} cursos via {ws and use_ws and 'WS' or 'HTML'}")

            existing_course_ids = {
                c.moodle_id for c in db.query(Course).filter(Course.user_id == user_id).all()
            }

            new_activities_all = []

            for idx, course_data in enumerate(courses_data):
                moodle_id = course_data["moodle_id"]
                course = db.query(Course).filter(
                    Course.user_id == user_id,
                    Course.moodle_id == moodle_id,
                ).first()
                is_new_course = False

                if not course:
                    course = Course(
                        user_id=user_id,
                        moodle_id=moodle_id,
                        name=course_data["name"],
                        short_name=course_data.get("short_name", ""),
                        teacher=course_data.get("teacher"),
                        color=course_data.get("color", "#6366f1"),
                        progress=course_data.get("progress", 0),
                        raw_data=course_data.get("raw_data", {}),
                    )
                    db.add(course)
                    db.flush()
                    is_new_course = True
                else:
                    course.name = course_data["name"] or course.name
                    if course_data.get("teacher"):
                        course.teacher = course_data["teacher"]
                    if course_data.get("progress"):
                        course.progress = course_data["progress"]
                    course.updated_at = datetime.utcnow()

                # ── Conteúdo do curso ──
                content = None
                source = "html"
                if ws and use_ws:
                    try:
                        content = await collect_course_data(ws, moodle_id)
                        source = "ws"
                    except Exception as e:
                        logger.warning(f"[{course_data['name']}] WS falhou ({e}), usando HTML")

                if not content:
                    content = await scraper.get_course_content(moodle_id)

                teacher_from_page = content.get("teacher")
                if teacher_from_page and not course.teacher:
                    course.teacher = teacher_from_page

                # Atividades (cria OU atualiza + extrai anexos)
                for act_data in content.get("activities", []):
                    activity = await _upsert_activity(
                        db, user_id, course, act_data, is_new_course, ws=ws, client=client
                    )
                    if activity and activity.is_new and activity.status in ("pending", "late"):
                        existing_ids = {a.id for a in new_activities_all}
                        if activity.id not in existing_ids:
                            new_activities_all.append(activity)

                # Materiais (com extração de texto p/ IA)
                try:
                    n_mat = await _sync_materials(
                        db, user_id, course,
                        content.get("materials", []),
                        ws=ws if (use_ws and source == "ws") else None,
                        client=client,
                    )
                    _sync_status[user_id]["materials"] += n_mat
                except Exception as e:
                    logger.warning(f"[{course_data['name']}] materiais: {e}")

                # Notas
                try:
                    if ws and use_ws:
                        items = await ws.get_grade_items(moodle_id)
                        grades_data = _normalize_ws_grade_items(items)
                    else:
                        grades_data = _normalize_html_grades(await scraper.get_grades(moodle_id))
                    await _upsert_grades(db, user_id, course, grades_data)
                except Exception as e:
                    logger.warning(f"[{course_data['name']}] notas: {e}")

                db.commit()
                _sync_status[user_id]["courses_done"] = idx + 1
                _sync_status[user_id]["activities"] += len(content.get("activities", []))

            # Notifica novas atividades
            for act in new_activities_all:
                course = db.query(Course).get(act.course_id)
                try:
                    await notification_service.send_notification(
                        db=db,
                        user_id=user_id,
                        title=f"Nova atividade: {act.title}",
                        message=f"Nova atividade em {course.name if course else 'sua disciplina'}.",
                        notif_type="new_activity",
                        related_id=act.id,
                        related_url=act.url,
                        user=user,
                    )
                    act.is_new = False  # Marca como já notificado
                except Exception as e:
                    logger.warning(f"Notificação atividade: {e}")

            # Calendário
            try:
                events_data = []
                if ws and use_ws:
                    raw_events = await ws.get_calendar_events()
                    from app.services.moodle_webservice import ts_to_datetime
                    for ev in raw_events:
                        start = ts_to_datetime(ev.get("timestart"))
                        events_data.append({
                            "moodle_id": str(ev.get("id", "")),
                            "title": ev.get("name", ""),
                            "description": ev.get("description", "") or "",
                            "event_type": ev.get("eventtype", "event"),
                            "course_name": "",
                            "start_date": start.isoformat() if start else None,
                            "url": ev.get("url", "") or "",
                        })
                else:
                    events_data = await scraper.get_calendar_events()

                for ev_data in events_data:
                    mid = ev_data.get("moodle_id")
                    if not mid or not ev_data.get("title"):
                        continue
                    exists = db.query(CalendarEvent).filter(
                        CalendarEvent.user_id == user_id,
                        CalendarEvent.moodle_id == str(mid),
                    ).first()
                    if exists:
                        continue
                    start = None
                    if ev_data.get("start_date"):
                        try:
                            start = datetime.fromisoformat(ev_data["start_date"])
                        except Exception:
                            pass
                    if not start:
                        continue
                    db.add(CalendarEvent(
                        user_id=user_id,
                        moodle_id=str(mid),
                        title=ev_data["title"],
                        description=ev_data.get("description", ""),
                        event_type=ev_data.get("event_type", ""),
                        course_name=ev_data.get("course_name", ""),
                        start_date=start,
                        url=ev_data.get("url", ""),
                    ))
            except Exception as e:
                logger.warning(f"Calendário: {e}")

            user.moodle_last_sync = datetime.utcnow()
            db.commit()

            # Prazos + marcação de atrasadas
            await check_deadlines(db, user_id, user)

            _sync_status[user_id].update({
                "running": False,
                "finished_at": datetime.utcnow().isoformat(),
            })
            logger.info(f"Sync concluído para {user_id}: {_sync_status[user_id]}")

    except Exception as e:
        logger.error(f"Erro no sync do Moodle para {user_id}: {e}", exc_info=True)
        db.rollback()
        _sync_status[user_id].update({
            "running": False,
            "error": str(e)[:300],
            "finished_at": datetime.utcnow().isoformat(),
        })
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Prazos escalonados (7d / 3d / 1d / 6h) + late marking
# ─────────────────────────────────────────────────────────────

async def check_deadlines(db: Session, user_id: str, user):
    from app.models import Activity
    from app.services.notification_service import notification_service

    now = datetime.utcnow()
    thresholds = [
        ("7d", timedelta(days=7), "7 dias"),
        ("3d", timedelta(days=3), "3 dias"),
        ("1d", timedelta(days=1), "1 dia"),
        ("6h", timedelta(hours=6), "6 horas"),
    ]

    activities = db.query(Activity).filter(
        Activity.user_id == user_id,
        Activity.status.in_(["pending", "late"]),
        Activity.due_date != None,
        Activity.due_date > now - timedelta(days=2),
    ).all()

    settings_map = user.notification_settings or {}

    for act in activities:
        sent = dict(act.notified_thresholds or {})
        for key, delta, label in thresholds:
            if sent.get(key):
                continue
            notify_time = act.due_date - delta
            if now >= notify_time and act.due_date > now:
                settings_key = f"deadline_{key}"
                if not settings_map.get(settings_key, True):
                    sent[key] = "skipped"
                    continue
                try:
                    await notification_service.send_notification(
                        db=db,
                        user_id=user_id,
                        title=f"Prazo em {label}: {act.title}",
                        message=f"A atividade vence em {label}.",
                        notif_type="deadline",
                        related_id=act.id,
                        related_url=act.url,
                        user=user,
                    )
                    sent[key] = True
                except Exception as e:
                    logger.warning(f"Notif prazo {key} {act.title}: {e}")
        act.notified_thresholds = sent

    db.commit()


async def mark_late_activities():
    """Job leve: marca atividades vencidas como late."""
    from app.models import Activity

    db: Session = SessionLocal()
    try:
        updated = db.query(Activity).filter(
            Activity.status == "pending",
            Activity.due_date != None,
            Activity.due_date < datetime.utcnow(),
        ).update({"status": "late"}, synchronize_session=False)
        if updated:
            db.commit()
            logger.info(f"{updated} atividades marcadas como atrasadas")
    finally:
        db.close()


async def sync_all_users():
    """Job agendado: sincroniza todos os usuários com credenciais salvas."""
    from app.models import User

    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(
            User.is_active == True,
            User.moodle_username_enc != None,
        ).all()
        user_ids = [u.id for u in users]
    finally:
        db.close()

    for user_id in user_ids:
        try:
            await sync_moodle_for_user(user_id)
        except Exception as e:
            logger.error(f"Erro no sync do usuário {user_id}: {e}")


async def generate_daily_briefings():
    """Job agendado: briefing diário às 6h."""
    from app.models import User, Schedule, Activity, DailyBriefing
    from app.services.ai_service import ai_service, AIProvider
    from app.services.crypto_service import crypto_service

    db: Session = SessionLocal()
    today = datetime.now()
    day_of_week = today.weekday()
    date_str = today.strftime("%Y-%m-%d")

    try:
        users = db.query(User).filter(User.is_active == True).all()

        for user in users:
            existing = db.query(DailyBriefing).filter(
                DailyBriefing.user_id == user.id,
                DailyBriefing.date == date_str,
            ).first()
            if existing:
                continue

            schedules = db.query(Schedule).filter(
                Schedule.user_id == user.id,
                Schedule.day_of_week == day_of_week,
            ).all()

            today_courses = [
                {"name": s.course_name or "Sem nome", "start_time": s.start_time, "end_time": s.end_time}
                for s in schedules
            ]

            pending = db.query(Activity).filter(
                Activity.user_id == user.id,
                Activity.status.in_(["pending", "late"]),
            ).order_by(Activity.due_date).limit(10).all()

            pending_data = [
                {
                    "title": a.title,
                    "due_date": a.due_date.strftime("%d/%m/%Y %H:%M") if a.due_date else None,
                    "status": a.status,
                }
                for a in pending
            ]

            try:
                provider = AIProvider(user.ai_provider or "groq")
                custom_keys = {}
                if user.ai_api_keys_enc:
                    custom_keys = crypto_service.decrypt_json(user.ai_api_keys_enc)

                briefing = DailyBriefing(
                    user_id=user.id,
                    date=date_str,
                    content=await ai_service.generate_daily_briefing(
                        user_name=user.name.split()[0],
                        today_courses=today_courses,
                        pending_activities=pending_data,
                        recent_materials=[],
                        provider=provider,
                        custom_api_keys=custom_keys,
                    ),
                    courses_today=today_courses,
                )
                db.add(briefing)
                db.commit()
                logger.info(f"Briefing gerado para {user.name}")
            except Exception as e:
                logger.error(f"Erro briefing {user.id}: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        sync_all_users,
        trigger=IntervalTrigger(minutes=settings.SCRAPER_INTERVAL_MINUTES),
        id="sync_moodle",
        replace_existing=True,
        misfire_grace_time=300,
        max_instances=1,
    )
    scheduler.add_job(
        mark_late_activities,
        trigger=IntervalTrigger(minutes=30),
        id="mark_late",
        replace_existing=True,
        misfire_grace_time=600,
    )
    scheduler.add_job(
        generate_daily_briefings,
        trigger=CronTrigger(hour=6, minute=0, timezone="America/Sao_Paulo"),
        id="daily_briefing",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado (sync, mark-late, briefing)")
