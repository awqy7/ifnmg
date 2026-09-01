"""
Scheduler de background jobs.
Sync completo do Moodle: API oficial (webservice) como fonte primária,
HTML scraper como fallback. Sincroniza cursos, atividades (com UPDATE),
materiais (com extração de texto p/ IA) e notificações escalonadas de prazo.
"""
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

# Status de sync em memória (por usuário) para feedback no frontend
_sync_status: Dict[str, dict] = {}


def _persist_sync_status(db: Session, user_id: str) -> None:
    """Espelha o progresso no banco para polling funcionar entre workers."""
    from app.models import SyncState

    state = db.query(SyncState).filter(SyncState.user_id == user_id).first()
    payload = dict(_sync_status.get(user_id, {"running": False}))
    if state:
        state.status = payload
        state.updated_at = datetime.utcnow()
    else:
        db.add(SyncState(user_id=user_id, status=payload))
    db.commit()


def mark_sync_queued(db: Session, user_id: str) -> None:
    """Publica o estado antes da resposta HTTP, eliminando a corrida do polling."""
    from app.models import SyncState

    payload = {
        "running": True,
        "phase": "queued",
        "started_at": datetime.utcnow().isoformat(),
        "courses_done": 0,
        "activities": 0,
        "materials": 0,
        "source": None,
        "error": None,
    }
    state = db.query(SyncState).filter(SyncState.user_id == user_id).first()
    if state:
        state.status = payload
        state.updated_at = datetime.utcnow()
    else:
        db.add(SyncState(user_id=user_id, status=payload))
    db.commit()


def get_sync_status(user_id: str, db: Optional[Session] = None) -> dict:
    memory_status = _sync_status.get(user_id)
    if memory_status and memory_status.get("running"):
        return memory_status

    from app.models import SyncState
    owns_session = db is None
    session = db or SessionLocal()
    try:
        state = session.query(SyncState).filter(SyncState.user_id == user_id).first()
        if not state or not state.status:
            return memory_status or {"running": False}
        status = dict(state.status)
        started_at = status.get("started_at")
        if status.get("running") and started_at:
            try:
                if datetime.utcnow() - datetime.fromisoformat(started_at) > timedelta(minutes=45):
                    status["running"] = False
                    status["error"] = "Sincronização anterior interrompida"
            except (TypeError, ValueError):
                pass
        return status
    finally:
        if owns_session:
            session.close()


def _acquire_distributed_lock(db: Session, user_id: str) -> bool:
    """Usa advisory lock no PostgreSQL; SQLite continua protegido pelo estado local."""
    if db.bind and db.bind.dialect.name == "postgresql":
        return bool(db.execute(
            text("SELECT pg_try_advisory_lock(hashtext(:lock_key))"),
            {"lock_key": f"moodle-sync:{user_id}"},
        ).scalar())
    return not _sync_status.get(user_id, {}).get("running", False)


def _release_distributed_lock(db: Session, user_id: str) -> None:
    if db.bind and db.bind.dialect.name == "postgresql":
        try:
            db.execute(
                text("SELECT pg_advisory_unlock(hashtext(:lock_key))"),
                {"lock_key": f"moodle-sync:{user_id}"},
            )
        except Exception:
            logger.warning("Não foi possível liberar o lock de sync do usuário %s", user_id)


# ─────────────────────────────────────────────────────────────
# Upserts compartilhados
# ─────────────────────────────────────────────────────────────

def _compute_status(item: dict, existing_status: Optional[str]) -> str:
    """Define status da atividade: submitted > late > pending."""
    if existing_status in ("submitted", "graded"):
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
    extraction_budget: Optional[list] = None,
    existing_activities: Optional[dict] = None,
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

    activity = existing_activities.get(mid) if existing_activities is not None else None
    if activity is None and existing_activities is None:
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
        if existing_activities is not None:
            existing_activities[mid] = activity
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
    files_fingerprint = hashlib.sha256(
        json.dumps(files_list, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest() if files_list else None
    source_changed = bool(files_fingerprint and raw_data.get("content_fingerprint") != files_fingerprint)
    has_budget = extraction_budget is None or extraction_budget[0] > 0
    if files_list and source_changed and has_budget and (ws or client):
        if extraction_budget is not None:
            extraction_budget[0] -= 1
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
            raw_data["content_fingerprint"] = files_fingerprint
            raw_data["content_extraction_at"] = datetime.utcnow().isoformat()
            activity.raw_data = raw_data
        except Exception as e:
            logger.debug(f"Erro ao extrair anexo da atividade {mid}: {e}")

    # Status recalculado; registros legados "graded" viram "submitted".
    new_status = _compute_status(
        {**act_data, "due_date": activity.due_date},
        activity.status,
    )
    activity.status = new_status

    if created and new_status in ("pending", "late") and not is_new_course:
        activity.is_new = True
        activity.notified = False

    return activity


async def _sync_materials(
    db: Session,
    user_id: str,
    course,
    materials_data: list,
    ws=None,
    client=None,
    extract_text: bool = True,
    extraction_budget: Optional[list] = None,
):
    """Cria/atualiza materiais do curso e extrai texto dos arquivos para a IA."""
    from app.models import Material, MaterialSyncMeta
    from app.services.material_extractor import extract_material_content, extract_url_content

    synced = 0
    stored_materials = db.query(Material).filter(
        Material.user_id == user_id,
        Material.course_id == course.id,
    ).all()
    materials_by_key = {material.moodle_id: material for material in stored_materials}
    material_ids = [material.id for material in stored_materials]
    stored_meta = (
        db.query(MaterialSyncMeta).filter(MaterialSyncMeta.material_id.in_(material_ids)).all()
        if material_ids else []
    )
    meta_by_material_id = {meta.material_id: meta for meta in stored_meta}

    for mat_data in materials_data:
        mid = str(mat_data.get("moodle_id") or "")
        title = mat_data.get("title")
        if not title:
            continue

        files_meta = mat_data.get("files", []) or []
        fingerprint_payload = {
            "title": title,
            "url": mat_data.get("url", ""),
            "description": mat_data.get("description", ""),
            "files": [
                {
                    "url": item.get("fileurl") or item.get("url"),
                    "name": item.get("filename") or item.get("name"),
                    "size": item.get("filesize"),
                    "modified": item.get("timemodified") or item.get("timecreated"),
                }
                for item in files_meta
            ],
        }
        fingerprint = hashlib.sha256(
            json.dumps(fingerprint_payload, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        # chave de dedupe por módulo
        mat_key = f"mod_{mid}" if mid else f"url_{mat_data.get('url', '')[:200]}"
        material = materials_by_key.get(mat_key)

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
            materials_by_key[mat_key] = material
        else:
            material.title = title[:500]
            if mat_data.get("topic_name"):
                material.topic_name = mat_data["topic_name"]
            material.topic_number = mat_data.get("topic_number")
            material.url = mat_data.get("url", "") or material.url

        extraction_meta = meta_by_material_id.get(material.id)
        source_changed = not extraction_meta or extraction_meta.fingerprint != fingerprint
        has_budget = extraction_budget is None or extraction_budget[0] > 0

        # Extrai apenas materiais novos/alterados e respeita o orçamento global
        # para que OCR não atrase indefinidamente a sincronização principal.
        if extract_text and source_changed and has_budget:
            if extraction_budget is not None:
                extraction_budget[0] -= 1
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

            if extraction_meta:
                extraction_meta.fingerprint = fingerprint
                extraction_meta.extraction_attempted = True
                extraction_meta.extracted_at = datetime.utcnow() if text_parts else extraction_meta.extracted_at
            else:
                extraction_meta = MaterialSyncMeta(
                    material_id=material.id,
                    fingerprint=fingerprint,
                    extraction_attempted=True,
                    extracted_at=datetime.utcnow() if text_parts else None,
                )
                db.add(extraction_meta)
                meta_by_material_id[material.id] = extraction_meta

        synced += 1

    return synced


# ─────────────────────────────────────────────────────────────
# Sync principal
# ─────────────────────────────────────────────────────────────

async def sync_moodle_for_user(user_id: str):
    """Sincroniza TUDO do Moodle para um usuário. WS primeiro, HTML fallback."""
    from app.models import User, Course, Activity
    from app.services.moodle_auth import moodle_auth_service
    from app.services.crypto_service import crypto_service
    from app.services.notification_service import notification_service
    from app.services.moodle_webservice import MoodleWebService, collect_course_data
    from app.services.moodle_scraper import MoodleScraper

    db: Session = SessionLocal()
    lock_acquired = False
    try:
        lock_acquired = _acquire_distributed_lock(db, user_id)
        if not lock_acquired:
            logger.info("Sync já em andamento para %s; chamada duplicada ignorada", user_id)
            return

        _sync_status[user_id] = {
            "running": True,
            "phase": "syncing",
            "started_at": datetime.utcnow().isoformat(),
            "courses_done": 0,
            "activities": 0,
            "materials": 0,
            "source": None,
            "error": None,
        }
        _persist_sync_status(db, user_id)

        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.moodle_username_enc or not user.moodle_password_enc:
            _sync_status[user_id]["running"] = False
            _sync_status[user_id]["error"] = "Credenciais não configuradas"
            _persist_sync_status(db, user_id)
            return

        username = crypto_service.decrypt(user.moodle_username_enc)
        password = crypto_service.decrypt(user.moodle_password_enc)

        # Renova sessão se preciso
        session_data = None
        if user.moodle_session_cookies:
            try:
                session_data = crypto_service.decrypt_json(user.moodle_session_cookies)
                had_cached_user_id = bool(session_data.get("moodle_user_id"))
                if not await moodle_auth_service.validate_session(session_data):
                    session_data = None
                elif not had_cached_user_id and session_data.get("moodle_user_id"):
                    # Evita uma segunda consulta a core_webservice_get_site_info
                    # nas próximas sincronizações.
                    user.moodle_session_cookies = crypto_service.encrypt_json(session_data)
            except Exception:
                session_data = None

        if not session_data:
            session_data = await moodle_auth_service.login(username, password)
            if not session_data:
                user.moodle_connected = False
                db.commit()
                logger.warning(f"Falha ao reconectar usuário {user_id} ao Moodle")
                _sync_status[user_id].update({"running": False, "error": "login"})
                _persist_sync_status(db, user_id)
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

        client = moodle_auth_service.build_httpx_client(session_data)
        ws = MoodleWebService(
            settings.MOODLE_BASE_URL,
            moodle_token,
            client=client,
            userid=session_data.get("moodle_user_id"),
        ) if moodle_token else None
        scraper = MoodleScraper(
            client,
            moodle_token,
            moodle_user_id=session_data.get("moodle_user_id"),
        )

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

            existing_courses = db.query(Course).filter(Course.user_id == user_id).all()
            courses_by_moodle_id = {course.moodle_id: course for course in existing_courses}

            new_activities_all = []
            new_activity_ids = set()
            # No máximo três extrações/OCR pesados por ciclo. Os demais materiais
            # ficam para o ciclo seguinte sem bloquear os dados essenciais.
            extraction_budget = [3]
            activity_extraction_budget = [2]

            for idx, course_data in enumerate(courses_data):
                moodle_id = course_data["moodle_id"]
                course = courses_by_moodle_id.get(moodle_id)
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
                    courses_by_moodle_id[moodle_id] = course
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
                stored_activities = db.query(Activity).filter(Activity.course_id == course.id).all()
                activities_by_moodle_id = {
                    str(activity.moodle_id): activity for activity in stored_activities
                }
                for act_data in content.get("activities", []):
                    activity = await _upsert_activity(
                        db, user_id, course, act_data, is_new_course, ws=ws, client=client,
                        extraction_budget=activity_extraction_budget,
                        existing_activities=activities_by_moodle_id,
                    )
                    if activity and activity.is_new and activity.status in ("pending", "late"):
                        if activity.id not in new_activity_ids:
                            new_activities_all.append(activity)
                            new_activity_ids.add(activity.id)

                # Materiais (com extração de texto p/ IA)
                try:
                    n_mat = await _sync_materials(
                        db, user_id, course,
                        content.get("materials", []),
                        ws=ws if (use_ws and source == "ws") else None,
                        client=client,
                        extraction_budget=extraction_budget,
                    )
                    _sync_status[user_id]["materials"] += n_mat
                except Exception as e:
                    logger.warning(f"[{course_data['name']}] materiais: {e}")

                _sync_status[user_id]["courses_done"] = idx + 1
                _sync_status[user_id]["activities"] += len(content.get("activities", []))
                _persist_sync_status(db, user_id)

            # Notifica novas atividades
            courses_by_id = {course.id: course for course in courses_by_moodle_id.values()}
            for act in new_activities_all:
                course = courses_by_id.get(act.course_id)
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

            user.moodle_last_sync = datetime.utcnow()
            db.commit()

            # Prazos + marcação de atrasadas
            await check_deadlines(db, user_id, user)

            _sync_status[user_id].update({
                "running": False,
                "finished_at": datetime.utcnow().isoformat(),
            })
            _persist_sync_status(db, user_id)
            logger.info(f"Sync concluído para {user_id}: {_sync_status[user_id]}")

    except Exception as e:
        logger.error(f"Erro no sync do Moodle para {user_id}: {e}", exc_info=True)
        db.rollback()
        _sync_status[user_id].update({
            "running": False,
            "error": str(e)[:300],
            "finished_at": datetime.utcnow().isoformat(),
        })
        try:
            _persist_sync_status(db, user_id)
        except Exception:
            logger.warning("Falha ao persistir erro de sincronização do usuário %s", user_id)
    finally:
        if lock_acquired:
            _release_distributed_lock(db, user_id)
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
    from app.models import User, DailyBriefing
    from app.routers.briefing import _generate_user_briefing, _local_now

    db: Session = SessionLocal()
    date_str = _local_now().strftime("%Y-%m-%d")

    try:
        users = db.query(User).filter(User.is_active == True).all()

        for user in users:
            briefing_lock_key = f"briefing:{user.id}"
            if not _acquire_distributed_lock(db, briefing_lock_key):
                continue
            try:
                existing = db.query(DailyBriefing).filter(
                    DailyBriefing.user_id == user.id,
                    DailyBriefing.date == date_str,
                ).first()
                if existing:
                    continue
                await _generate_user_briefing(db, user)
                logger.info(f"Briefing gerado para {user.name}")
            except Exception as e:
                logger.error(f"Erro briefing {user.id}: {e}")
            finally:
                _release_distributed_lock(db, briefing_lock_key)
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
