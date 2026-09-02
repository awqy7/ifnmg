"""
WebSocket para notificações em tempo real.
"""
import logging
import re
from typing import Dict, List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import jwt
from jwt import InvalidTokenError

from app.config import settings
from app.database import SessionLocal
from app.models import User

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

ALGORITHM = settings.JWT_ALGORITHM


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket conectado: usuário {user_id}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active_connections:
            dead = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id].remove(ws)

    async def broadcast(self, data: dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, data)


manager = ConnectionManager()


async def get_ws_user_id(
    token: Optional[str],
) -> Optional[str]:
    """Valida o ticket curto e exclusivo emitido para notificações."""
    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            audience="websocket",
        )
        if payload.get("scope") != "notifications:read":
            return None
        user_id = payload.get("sub")
        session_version = payload.get("sv")
        if not user_id or session_version is None:
            return None
        db = SessionLocal()
        try:
            active = db.query(User.id, User.session_version).filter(
                User.id == user_id,
                User.is_active == True,
            ).first()
            return user_id if active and int(active.session_version or 0) == int(session_version) else None
        finally:
            db.close()
    except (InvalidTokenError, TypeError, ValueError):
        return None


def _websocket_origin_allowed(origin: Optional[str]) -> bool:
    if not origin:
        return settings.APP_ENV != "production"
    if origin in settings.allowed_origins_list:
        return True
    return bool(
        settings.ALLOWED_ORIGIN_REGEX
        and re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin)
    )


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """WebSocket autenticado exclusivamente por ticket curto e restrito."""
    if not _websocket_origin_allowed(websocket.headers.get("origin")):
        await websocket.close(code=4003, reason="Origin not allowed")
        return

    user_id = await get_ws_user_id(token)
    
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(user_id, websocket)
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Conectado ao IFNMG Assistente!",
        })

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        logger.info(f"WebSocket desconectado: usuário {user_id}")
