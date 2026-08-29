"""
WebSocket para notificações em tempo real.
"""
import json
import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Header, Cookie
from jose import jwt, JWTError

from app.config import settings

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
    websocket: WebSocket,
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="token"),
    token_cookie: Optional[str] = Cookie(None, alias="ifnmg_token"),
) -> Optional[str]:
    """Extrai e valida o token JWT de header, query ou cookie (preferência: header > cookie > query)."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif token_cookie:
        token = token_cookie
    elif token_query:
        token = token_query
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    """WebSocket autenticado para notificações em tempo real.
    
    Token pode ser enviado via:
    - Header Authorization: Bearer <token> (recomendado)
    - Cookie ifnmg_token (para navegadores)
    - Query param ?token= (fallback, menos seguro)
    """
    user_id = await get_ws_user_id(websocket, authorization, token)
    
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