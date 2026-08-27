"""
Rotas completas de Atividades: Listagem, Detalhes, Resumo, Atualização de Status, Explicação por IA e Geração de PDF.
"""
import logging
import re
from pathlib import PurePosixPath
from typing import Optional
from urllib.parse import urljoin

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Activity, Course
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service, AIProvider
from app.services.crypto_service import crypto_service
from app.services.material_extractor import (
    MAX_TEXT_CHARS,
    download_file_limited,
    extract_text_from_bytes,
)
from app.services.moodle_auth import moodle_auth_service
from app.services.moodle_scraper import MoodleScraper
from app.services.pdf_service import generate_activity_response_pdf

router = APIRouter(prefix="/api/activities", tags=["Atividades"])
logger = logging.getLogger(__name__)

MAX_ACTIVITY_FILES = 3
MAX_ACTIVITY_SOURCE_CHARS = 18_000
SUPPORTED_ACTIVITY_FILE_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".html", ".htm", ".docx"}


class StatusUpdateBody(BaseModel):
    status: str


def _normalise_attachment(file_data: object) -> Optional[dict]:
    """Normaliza anexos que chegam dos dois conectores do Moodle."""
    if not isinstance(file_data, dict):
        return None
    url = str(file_data.get("url") or file_data.get("fileurl") or "").strip()
    if not url:
        return None
    url = urljoin("https://virtual2.ifnmg.edu.br/", url)
    filename = str(file_data.get("name") or file_data.get("filename") or "arquivo").strip()
    return {
        "name": filename[:500],
        "url": url,
        "mimetype": str(file_data.get("mimetype") or "").split(";", 1)[0].strip(),
    }


def _unique_attachments(*groups: object) -> list[dict]:
    attachments: list[dict] = []
    seen_urls: set[str] = set()
    for group in groups:
        if not isinstance(group, list):
            continue
        for raw_file in group:
            file_data = _normalise_attachment(raw_file)
            if file_data and file_data["url"] not in seen_urls:
                seen_urls.add(file_data["url"])
                attachments.append(file_data)
    return attachments


def _is_extractable_attachment(file_data: dict) -> bool:
    name = file_data["name"].lower()
    mimetype = file_data["mimetype"].lower()
    return (
        PurePosixPath(name).suffix in SUPPORTED_ACTIVITY_FILE_EXTENSIONS
        or mimetype.startswith("text/")
        or "pdf" in mimetype
        or "html" in mimetype
        or "wordprocessingml" in mimetype
    )


async def _collect_activity_source(activity: Activity, user: User, db: Session) -> tuple[str, str]:
    """Obtém enunciado atualizado e texto dos anexos da atividade.

    O sincronismo de cursos não baixa todos os anexos de atividades para evitar
    uso excessivo de rede. Esta coleta é feita apenas quando o aluno solicita o
    PDF e reutiliza a sessão Moodle criptografada dele.
    """
    raw_data = dict(activity.raw_data or {})
    saved_files = raw_data.get("files", [])
    live_details: dict = {}

    if user.moodle_session_cookies and activity.url:
        try:
            session_data = crypto_service.decrypt_json(user.moodle_session_cookies)
            client = moodle_auth_service.build_httpx_client(session_data)
            async with client:
                scraper = MoodleScraper(client)
                live_details = await scraper.get_activity_full_details(
                    activity.url, activity.activity_type or "assign"
                )
        except Exception as exc:
            # O enunciado que já foi sincronizado continua sendo uma fonte válida.
            logger.warning("Não foi possível atualizar atividade %s: %s", activity.id, exc)

    live_description = str(live_details.get("description_text") or "").strip()
    if live_description and len(live_description) >= len(activity.description or ""):
        activity.description = live_description[:MAX_ACTIVITY_SOURCE_CHARS]

    attachments = _unique_attachments(saved_files, live_details.get("files", []))
    raw_data["files"] = attachments
    activity.raw_data = raw_data
    db.commit()

    source_parts = []
    description = (activity.description or "").strip()
    if description:
        source_parts.append(f"ENUNCIADO DA ATIVIDADE:\n{description}")

    extracted_files = []
    if attachments and user.moodle_session_cookies:
        try:
            session_data = crypto_service.decrypt_json(user.moodle_session_cookies)
            client = moodle_auth_service.build_httpx_client(session_data)
            async with client:
                for attachment in attachments:
                    if len(extracted_files) >= MAX_ACTIVITY_FILES:
                        break
                    if not _is_extractable_attachment(attachment):
                        continue
                    data, detected_mimetype = await download_file_limited(client, attachment["url"])
                    if not data:
                        continue
                    text = extract_text_from_bytes(
                        attachment["name"],
                        attachment["mimetype"] or detected_mimetype,
                        data,
                    )[:MAX_TEXT_CHARS].strip()
                    if text:
                        extracted_files.append(attachment["name"])
                        source_parts.append(f"ANEXO: {attachment['name']}\n{text}")
        except Exception as exc:
            logger.warning("Não foi possível ler anexos da atividade %s: %s", activity.id, exc)

    source = "\n\n".join(source_parts)[:MAX_ACTIVITY_SOURCE_CHARS]
    summary_parts = ["enunciado" if description else ""] + extracted_files
    summary = ", ".join(part for part in summary_parts if part) or "dados disponíveis da atividade"
    return source, summary


def _pdf_filename(title: str) -> str:
    """Cria nome de download seguro para o cabeçalho HTTP e sistemas de arquivo."""
    slug = re.sub(r"[^A-Za-z0-9._-]+", "_", title).strip("._")[:60]
    return f"resposta_{slug or 'atividade'}.pdf"


@router.get("")
async def list_activities(
    status: Optional[str] = None,
    course_id: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista atividades do usuário com filtros opcionais de status e disciplina."""
    query = db.query(Activity, Course.name.label("course_name"), Course.color.label("course_color")).join(
        Course, Activity.course_id == Course.id
    ).filter(Activity.user_id == current_user.id)

    if status:
        query = query.filter(Activity.status == status)
    if course_id:
        query = query.filter(Activity.course_id == course_id)

    results = query.order_by(Activity.due_date.asc().nullslast()).limit(limit).all()

    return [
        {
            "id": a.id,
            "moodle_id": a.moodle_id,
            "title": a.title,
            "type": a.activity_type or "assign",
            "description": a.description or "",
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "status": a.status,
            "grade": a.grade,
            "max_grade": a.max_grade,
            "url": a.url or "",
            "course_id": a.course_id,
            "course_name": course_name or "Disciplina",
            "course_color": course_color or "#6366f1",
            "is_new": a.is_new,
        }
        for a, course_name, course_color in results
    ]


@router.get("/summary")
async def activities_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna contagem agregada de atividades por status."""
    rows = db.query(Activity.status, func.count(Activity.id)).filter(
        Activity.user_id == current_user.id
    ).group_by(Activity.status).all()
    return {status: count for status, count in rows}


@router.get("/{activity_id}/details")
async def get_activity_details(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna dados completos de uma atividade para exibição no ActivityModal."""
    res = db.query(Activity, Course.name.label("course_name"), Course.color.label("course_color")).join(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.id == activity_id,
        Activity.user_id == current_user.id,
    ).first()

    if not res:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    act, course_name, course_color = res
    raw = act.raw_data or {}

    files = []
    if raw.get("files"):
        files = raw.get("files")
    elif raw.get("attachments"):
        files = raw.get("attachments")

    status_text_map = {
        "pending": "Pendente",
        "submitted": "Enviado para avaliação",
        "late": "Atrasado",
        "graded": "Avaliado",
        "closed": "Finalizado",
    }

    return {
        "id": act.id,
        "moodle_id": act.moodle_id,
        "title": act.title,
        "type": act.activity_type or "assign",
        "description": act.description or "Sem orientações adicionais informadas pelo professor.",
        "due_date": act.due_date.isoformat() if act.due_date else None,
        "status": act.status,
        "status_text": status_text_map.get(act.status, "Pendente"),
        "grade": act.grade,
        "max_grade": act.max_grade,
        "time_remaining": "Prazo encerrado" if act.status == "late" else None,
        "url": act.url or "",
        "course_id": act.course_id,
        "course_name": course_name or "Disciplina",
        "course_color": course_color or "#6366f1",
        "files": files,
    }


@router.post("/{activity_id}/status")
async def update_activity_status(
    activity_id: str,
    status: Optional[str] = None,
    body: Optional[StatusUpdateBody] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza o status de uma atividade (suporta param na query ou body JSON)."""
    target_status = status or (body.status if body else None)
    if not target_status:
        raise HTTPException(status_code=400, detail="Status não informado")

    VALID_STATUSES = {"pending", "submitted", "late", "graded", "closed"}
    if target_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {', '.join(VALID_STATUSES)}")

    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.user_id == current_user.id,
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    activity.status = target_status
    activity.updated_at = datetime.utcnow()
    db.commit()
    return {"id": activity.id, "status": activity.status}


@router.post("/{activity_id}/explain-ai")
async def explain_activity_with_ai(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera um guia didático passo a passo para resolução da atividade usando IA."""
    res = db.query(Activity, Course.name.label("course_name")).join(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.id == activity_id,
        Activity.user_id == current_user.id,
    ).first()

    if not res:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    act, course_name = res

    prompt = f"""Você é o tutor acadêmico do IFNMG para a disciplina **{course_name}**.
Analise a seguinte atividade e crie um guia de resolução claro, didático e estruturado para o estudante:

**Atividade:** {act.title}
**Disciplina:** {course_name}
**Enunciado / Orientações:**
{act.description or "Sem descrição fornecida."}

Estruture a explicação nos seguintes tópicos:
1. 🎯 **Objetivo Principal:** O que esta atividade avalia em 1 frase.
2. 📋 **Passo a Passo de Resolução:** Etapas práticas e sequenciais para fazer a tarefa.
3. 💡 **Dicas & Conceitos-Chave:** O que não pode faltar para tirar nota máxima.
4. ⚠️ **Atenção:** Erros comuns a evitar.

Seja direto, didático e encorajador."""

    provider_str = current_user.ai_provider or "groq"
    try:
        provider = AIProvider(provider_str)
    except ValueError:
        provider = AIProvider.GROQ

    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    try:
        explanation = await ai_service.chat(
            messages=[{"role": "user", "content": prompt}],
            provider=provider,
            custom_api_keys=custom_keys,
            max_tokens=1500,
            temperature=0.4,
        )
        return {
            "status": "success",
            "activity_id": activity_id,
            "explanation": explanation,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao consultar IA: {str(e)}")


@router.post("/{activity_id}/generate-response-pdf")
async def generate_activity_response_pdf_endpoint(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lê a atividade/anexos e retorna um PDF de rascunho identificado ao aluno."""
    res = db.query(Activity, Course.name.label("course_name")).join(
        Course, Activity.course_id == Course.id
    ).filter(
        Activity.id == activity_id,
        Activity.user_id == current_user.id,
    ).first()

    if not res:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")

    act, course_name = res

    source_text, source_summary = await _collect_activity_source(act, current_user, db)
    if len(source_text.strip()) < 30:
        raise HTTPException(
            status_code=422,
            detail=(
                "Não foi possível obter texto suficiente do enunciado ou dos anexos. "
                "Verifique se a atividade possui instruções em texto ou um PDF selecionável."
            ),
        )

    # Gera resposta/rascunho com IA para o PDF.
    provider_str = current_user.ai_provider or "groq"
    try:
        provider = AIProvider(provider_str)
    except ValueError:
        provider = AIProvider.GROQ

    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    try:
        answers = await ai_service.generate_activity_draft(
            course_name=course_name,
            activity_title=act.title,
            source_text=source_text,
            provider=provider,
            custom_api_keys=custom_keys,
        )
    except Exception as exc:
        logger.exception("Falha ao gerar rascunho da atividade %s", activity_id)
        raise HTTPException(
            status_code=503,
            detail="Não foi possível consultar o provedor de IA. Verifique a configuração e tente novamente.",
        ) from exc

    pdf_bytes = generate_activity_response_pdf(
        activity_title=act.title,
        activity_type=act.activity_type or "Atividade",
        description=act.description or f"Instruções extraídas de: {source_summary}.",
        course_name=course_name,
        user_name=current_user.name,
        answers=answers,
        source_summary=source_summary,
    )

    filename = _pdf_filename(act.title)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )
