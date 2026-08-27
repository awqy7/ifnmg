"""
Serviço de notificações: in-app, Web Push e Telegram.
"""
import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class NotificationService:

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
        from datetime import timedelta

        # ── Deduplicação: evita notificações repetidas a cada sync ──
        if related_id:
            from datetime import datetime
            cutoff = datetime.utcnow() - timedelta(hours=24)
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
        if user and user.push_subscription:
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
        if user and user.telegram_chat_id and settings.TELEGRAM_BOT_TOKEN:
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

        from pywebpush import webpush, WebPushException

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url or "/",
            "icon": "/icon-192x192.png",
        })

        webpush(
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
            await client.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=10.0,
            )

    async def _broadcast_ws(self, user_id: str, data: dict):
        """Envia notificação via WebSocket para o usuário."""
        from app.routers.websocket import manager
        try:
            await manager.send_to_user(user_id, {"type": "notification", "data": data})
        except Exception:
            pass  # WebSocket pode não estar conectado


notification_service = NotificationService()
