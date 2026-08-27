"""
Rotas do Chat com IA (Tutor Virtual por disciplina).
"""
import json
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ChatSession, ChatMessage, Course, Activity, Material
from app.routers.auth import get_current_user
from app.services.ai_service import ai_service, AIProvider
from app.services.crypto_service import crypto_service

router = APIRouter(prefix="/api/chat", tags=["Chat IA"])
logger = logging.getLogger(__name__)


class MessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=6000)
    session_id: Optional[str] = None
    course_id: Optional[str] = None
    provider: Optional[str] = "groq"
    stream: bool = False


class NewSession(BaseModel):
    course_id: Optional[str] = None
    title: Optional[str] = "Nova conversa"


# ─── Sessões ─────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    course_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista sessões de chat."""
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    if course_id:
        query = query.filter(ChatSession.course_id == course_id)

    sessions = query.order_by(ChatSession.updated_at.desc()).limit(50).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "course_id": s.course_id,
            "ai_provider": s.ai_provider,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/sessions")
async def create_session(
    data: NewSession,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria nova sessão de chat."""
    if data.course_id:
        course = db.query(Course).filter(
            Course.id == data.course_id,
            Course.user_id == current_user.id,
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    session = ChatSession(
        user_id=current_user.id,
        course_id=data.course_id,
        title=data.title or "Nova conversa",
        ai_provider=current_user.ai_provider or "groq",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title}


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retorna mensagens de uma sessão."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()

    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]


# ─── Mensagem Principal ───────────────────────────────────────────────────────

@router.post("/message")
async def send_message(
    data: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Envia mensagem para o tutor IA e retorna resposta."""
    # Cria sessão se não fornecida
    if not data.session_id:
        session = ChatSession(
            user_id=current_user.id,
            course_id=data.course_id,
            title=data.content[:50] + "..." if len(data.content) > 50 else data.content,
            ai_provider=data.provider or current_user.ai_provider or "groq",
        )
        db.add(session)
        db.flush()
        session_id = session.id
    else:
        session = db.query(ChatSession).filter(
            ChatSession.id == data.session_id,
            ChatSession.user_id == current_user.id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")
        session_id = session.id

    # Monta contexto do tutor
    system_context = await _build_system_context(
        db=db,
        user_id=current_user.id,
        course_id=data.course_id or session.course_id,
    )

    # Recupera histórico da sessão
    # Usa as últimas mensagens; ordenar ascendente antes do limite devolvia
    # sempre o começo da conversa e fazia o tutor perder o contexto recente.
    history = list(reversed(db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.desc()).limit(20).all()))

    messages = [{"role": "system", "content": system_context}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": data.content})

    # Salva mensagem do usuário
    user_msg = ChatMessage(session_id=session_id, role="user", content=data.content)
    db.add(user_msg)
    db.flush()

    # Determina provider e chaves
    provider_str = data.provider or current_user.ai_provider or "groq"
    try:
        provider = AIProvider(provider_str)
    except ValueError:
        provider = AIProvider.GROQ  # fallback para o provider padrão

    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    if data.stream:
        # Streaming response
        async def stream_generator():
            full_response = ""
            try:
                async for chunk in ai_service.stream_chat(
                    messages=messages,
                    provider=provider,
                    custom_api_keys=custom_keys,
                ):
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
            finally:
                # Sessão própria: a sessão do request pode já ter fechado
                from app.database import SessionLocal
                save_db = SessionLocal()
                try:
                    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=full_response)
                    save_db.add(ai_msg)
                    from datetime import datetime
                    save_db.query(ChatSession).filter(
                        ChatSession.id == session_id
                    ).update({"updated_at": datetime.utcnow()})
                    save_db.commit()
                except Exception as e:
                    logger.warning(f"Falha ao salvar msg stream: {e}")
                finally:
                    save_db.close()
            yield f"data: {json.dumps({'done': True})}\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    # Resposta normal
    try:
        ai_response = await ai_service.chat(
            messages=messages,
            provider=provider,
            custom_api_keys=custom_keys,
            max_tokens=700,
            temperature=0.5,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na IA: {str(e)}")

    # Remove blocos de raciocínio (<think>) que alguns modelos retornam,
    # inclusive truncados sem a tag de fechamento
    import re
    ai_response = re.sub(r"<think>[\s\S]*?</think>", "", ai_response or "")
    ai_response = re.sub(r"<think>[\s\S]*$", "", ai_response)
    ai_response = ai_response.strip()

    # Salva resposta da IA
    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_response)
    db.add(ai_msg)
    from datetime import datetime
    session.updated_at = datetime.utcnow()
    db.commit()

    return {
        "session_id": session_id,
        "response": ai_response,
        "provider": provider_str,
    }


# ─── Ferramentas de Estudo ───────────────────────────────────────────────────

@router.post("/flashcards/generate")
async def generate_flashcards(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera flashcards a partir de um conteúdo ou curso."""
    course_id = data.get("course_id")
    content = data.get("content", "")
    quantity = data.get("quantity", 10)

    course_name = "Geral"
    if course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.user_id == current_user.id,
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Disciplina não encontrada")
        course_name = course.name
        if not content:
            # Usa somente materiais pertencentes ao aluno atual.
            materials = db.query(Material).filter(
                Material.course_id == course_id,
                Material.user_id == current_user.id,
                Material.content_text != None,
            ).limit(3).all()
            content = "\n\n".join([m.content_text for m in materials if m.content_text])

    if not content:
        raise HTTPException(status_code=400, detail="Forneça conteúdo ou selecione um curso com materiais")

    provider = AIProvider(current_user.ai_provider or "groq")
    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    flashcards = await ai_service.generate_flashcards(
        content=content,
        course_name=course_name,
        quantity=quantity,
        provider=provider,
        custom_api_keys=custom_keys,
    )

    return {"flashcards": flashcards, "course_name": course_name, "count": len(flashcards)}


@router.post("/quiz/generate")
async def generate_quiz(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gera simulado com questões de múltipla escolha."""
    course_id = data.get("course_id")
    content = data.get("content", "")
    quantity = data.get("quantity", 5)

    course_name = "Geral"
    if course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.user_id == current_user.id,
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Disciplina não encontrada")
        course_name = course.name
        if not content:
            materials = db.query(Material).filter(
                Material.course_id == course_id,
                Material.user_id == current_user.id,
                Material.content_text != None,
            ).limit(3).all()
            content = "\n\n".join([m.content_text for m in materials if m.content_text])

    if not content:
        raise HTTPException(status_code=400, detail="Forneça conteúdo ou selecione um curso com materiais")

    provider = AIProvider(current_user.ai_provider or "groq")
    custom_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            custom_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    questions = await ai_service.generate_quiz(
        content=content,
        course_name=course_name,
        quantity=quantity,
        provider=provider,
        custom_api_keys=custom_keys,
    )

    return {"questions": questions, "course_name": course_name, "count": len(questions)}


# ─── Configuração de IA ───────────────────────────────────────────────────────

@router.get("/ai/providers")
async def list_providers(current_user: User = Depends(get_current_user)):
    """Lista os providers de IA disponíveis."""
    from app.services.ai_service import PROVIDER_FREE, PROVIDER_MODELS
    from app.config import settings

    providers = []
    for p in AIProvider:
        has_system_key = bool({
            AIProvider.GEMINI: settings.GEMINI_API_KEY,
            AIProvider.OPENAI: settings.OPENAI_API_KEY,
            AIProvider.ANTHROPIC: settings.ANTHROPIC_API_KEY,
            AIProvider.GROQ: settings.GROQ_API_KEY,
            AIProvider.OLLAMA: True,
        }.get(p))

        providers.append({
            "id": p.value,
            "name": p.value.capitalize(),
            "model": PROVIDER_MODELS[p],
            "free": PROVIDER_FREE[p],
            "available": has_system_key or PROVIDER_FREE[p],
            "is_default": p.value == (current_user.ai_provider or "groq"),
        })

    return providers


@router.post("/ai/configure")
async def configure_ai(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Configura chave de API de um provider."""
    provider = data.get("provider")
    api_key = data.get("api_key")

    if not provider or not api_key:
        raise HTTPException(status_code=400, detail="Informe provider e api_key")

    # Testa a chave antes de salvar
    try:
        test_result = await ai_service.test_provider(AIProvider(provider), api_key)
        if not test_result["success"]:
            raise HTTPException(status_code=400, detail=f"Chave inválida: {test_result.get('error')}")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Provider desconhecido: {provider}")

    # Salva chave criptografada
    existing_keys = {}
    if current_user.ai_api_keys_enc:
        try:
            existing_keys = crypto_service.decrypt_json(current_user.ai_api_keys_enc)
        except Exception:
            pass

    existing_keys[provider] = api_key
    current_user.ai_api_keys_enc = crypto_service.encrypt_json(existing_keys)

    if data.get("set_default"):
        current_user.ai_provider = provider

    db.commit()
    return {"message": f"Chave do {provider} configurada com sucesso! ✅"}


@router.post("/ai/test")
async def test_provider(
    data: dict,
    current_user: User = Depends(get_current_user),
):
    """Testa se um provider está funcionando."""
    provider_str = data.get("provider", "groq")
    api_key = data.get("api_key")

    try:
        result = await ai_service.test_provider(AIProvider(provider_str), api_key)
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Provider desconhecido: {provider_str}")


# ─── Helper: Constrói contexto do sistema ────────────────────────────────────

async def _build_system_context(db: Session, user_id: str, course_id: Optional[str]) -> str:
    """Monta o prompt de sistema com contexto do curso."""
    base_context = """Você é um tutor acadêmico do IFNMG. Regras OBRIGATÓRIAS para TODA resposta:
1. Responda SEMPRE em português brasileiro.
2. Seja CURTO e DIRETO: no máximo 5 linhas (a não ser que o aluno peça explicitamente mais detalhes).
3. Vá direto ao ponto: sem saudações, sem repetir a pergunta, sem enrolação.
4. Explique bem com poucas palavras: frases claras e um exemplo só se for essencial.
5. Use negrito apenas para termos-chave."""
    if not course_id:
        return base_context

    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not course:
        return base_context

    # Materiais recentes
    materials = db.query(Material).filter(
        Material.course_id == course_id,
        Material.content_text != None,
    ).order_by(Material.created_at.desc()).limit(3).all()

    # Atividades pendentes
    pending = db.query(Activity).filter(
        Activity.course_id == course_id,
        Activity.status == "pending",
    ).limit(5).all()

    return await ai_service.build_tutor_context(
        course_name=course.name,
        materials_summaries=[m.content_text for m in materials if m.content_text],
        pending_activities=[
            {"title": a.title, "due_date": str(a.due_date), "status": a.status}
            for a in pending
        ],
    )
