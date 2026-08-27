"""
WebSocket para notificações em tempo real.
"""
import json
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.config import settings

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


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


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket autenticado para notificações em tempo real."""
    # Valida token JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        # Envia mensagem de boas-vindas
        await websocket.send_json({
            "type": "connected",
            "message": "Conectado ao IFNMG Assistente! 🎓",
        })

        # Mantém conexão aberta aguardando mensagens
        while True:
            data = await websocket.receive_text()
            # Processa ping/pong
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        logger.info(f"WebSocket desconectado: usuário {user_id}")
