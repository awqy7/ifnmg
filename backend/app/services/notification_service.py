"""
Serviço de notificações: in-app, Web Push e Telegram.
"""
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from app.services.datetime_utils import utc_now_naive

logger = logging.getLogger(__name__)


class NotificationService:

    @staticmethod
    def _is_quiet_time(user) -> bool:
        settings_map = (user.notification_settings or {}) if user else {}
        start = str(settings_map.get("quiet_start") or "22:00")
        end = str(settings_map.get("quiet_end") or "07:00")
        current = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%H:%M")
        if start == end:
            return False
        return start <= current < end if start < end else current >= start or current < end

    async def send_notification(
        self,
        db: Session,
        user_id: str,
        title: str,
        message: str,
        notif_type: str,
        related_id: Optional[str] = None,
        related_url: Optional[str] = None,
        user=None,
    ):
        """Cria notificação no banco e envia via push/telegram."""
        from app.models import Notification
        from app.config import settings

        # ── Deduplicação: evita notificações repetidas a cada sync ──
        if related_id:
            cutoff = utc_now_naive() - timedelta(hours=24)
            exists = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.notification_type == notif_type,
                Notification.related_id == related_id,
                Notification.created_at >= cutoff,
            ).first()
            if exists:
                return  # Já notificado recentemente

        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notif_type,
            related_id=related_id,
            related_url=related_url,
        )
        db.add(notif)
        db.flush()

        # Web Push (se configurado)
        quiet_time = self._is_quiet_time(user)
        if user and user.push_subscription and not quiet_time:
            try:
                await self._send_web_push(
                    subscription=json.loads(user.push_subscription),
                    title=title,
                    body=message,
                    url=related_url,
                )
                notif.sent_push = True
            except Exception as e:
                logger.warning(f"Falha no Web Push: {e}")

        # Telegram (se configurado)
        if user and user.telegram_chat_id and settings.TELEGRAM_BOT_TOKEN and not quiet_time:
            try:
                await self._send_telegram(
                    chat_id=user.telegram_chat_id,
                    text=f"*{title}*\n{message}",
                )
                notif.sent_telegram = True
            except Exception as e:
                logger.warning(f"Falha no Telegram: {e}")

        db.commit()
        logger.info(f"Notificação enviada: [{notif_type}] {title}")

        # Envia via WebSocket (in-app em tempo real)
        await self._broadcast_ws(user_id, {
            "id": notif.id,
            "title": title,
            "message": message,
            "type": notif_type,
            "related_url": related_url,
        })

    async def _send_web_push(self, subscription: dict, title: str, body: str, url: Optional[str] = None):
        """Envia notificação via Web Push API."""
        from app.config import settings
        if not settings.VAPID_PRIVATE_KEY:
            return

        from pywebpush import webpush

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url or "/",
            "icon": "/icon-192x192.png",
        })

        await asyncio.to_thread(
            webpush,
            subscription_info=subscription,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
        )

    async def _send_telegram(self, chat_id: str, text: str):
        """Envia mensagem via Telegram Bot API."""
        import httpx
        from app.config import settings

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=10.0,
            )
            response.raise_for_status()

    async def _broadcast_ws(self, user_id: str, data: dict):
        """Envia notificação via WebSocket para o usuário."""
        from app.routers.websocket import manager
        try:
            await manager.send_to_user(user_id, {"type": "notification", "data": data})
        except Exception:
            pass  # WebSocket pode não estar conectado


notification_service = NotificationService()
