import asyncio
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import httpx
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request
from starlette.responses import Response
from fastapi import HTTPException

from app.config import settings
from app.database import Base
from app.main import CsrfOriginMiddleware, _origin_is_allowed
from app.models import User
from app.routers.chat import FlashcardGenerationRequest, QuizGenerationRequest
from app.routers.websocket import _websocket_origin_allowed
from app.services.datetime_utils import SAO_PAULO, to_utc_naive, utc_iso
from app.services.ai_quota import consume_ai_request
from app.services.moodle_auth import MoodleAuthService
from app.services.moodle_scraper import MoodleScraper
from app.services.scheduler import (
    _acquire_distributed_lock,
    _parse_datetime,
    _release_distributed_lock,
)


class SecurityAndSyncTests(unittest.TestCase):
    def test_cors_origin_is_exact_and_csrf_rejects_cross_site_cookie(self):
        with patch.object(settings, "ALLOWED_ORIGINS", "https://app.example.com"):
            self.assertTrue(_origin_is_allowed("https://app.example.com"))
            self.assertFalse(_origin_is_allowed("https://app.example.com.evil.test"))

            scope = {
                "type": "http",
                "method": "POST",
                "path": "/api/moodle/sync",
                "scheme": "https",
                "server": ("api.example.com", 443),
                "client": ("127.0.0.1", 1234),
                "query_string": b"",
                "headers": [
                    (b"cookie", b"ifnmg_token=test"),
                    (b"origin", b"https://evil.test"),
                ],
            }
            request = Request(scope)

            async def call_next(_request):
                return Response(status_code=204)

            result = asyncio.run(CsrfOriginMiddleware(None).dispatch(request, call_next))
            self.assertEqual(result.status_code, 403)

    def test_websocket_without_origin_is_rejected_in_production(self):
        with patch.object(settings, "APP_ENV", "production"):
            self.assertFalse(_websocket_origin_allowed(None))

    def test_moodle_password_whitespace_is_preserved(self):
        service = MoodleAuthService()
        with (
            patch.object(service, "_token_login", AsyncMock(return_value=None)) as token_login,
            patch.object(service, "_http_login", AsyncMock(return_value=None)) as http_login,
            patch.object(settings, "ENABLE_PLAYWRIGHT_FALLBACK", False),
        ):
            asyncio.run(service.login(" aluno ", " senha com espaços "))
        token_login.assert_awaited_once_with("aluno", " senha com espaços ")
        http_login.assert_awaited_once_with("aluno", " senha com espaços ")

    def test_study_generation_limits_are_bounded(self):
        with self.assertRaises(ValidationError):
            FlashcardGenerationRequest(quantity=31)
        with self.assertRaises(ValidationError):
            QuizGenerationRequest(quantity=0)

    def test_ai_quota_is_shared_and_durable(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        db = sessionmaker(bind=engine)()
        db.add(User(id="quota-user", name="Aluno", email="quota@test", hashed_password="x"))
        db.commit()
        try:
            with patch.object(settings, "AI_REQUESTS_PER_DAY", 2):
                consume_ai_request(db, "quota-user", "chat")
                consume_ai_request(db, "quota-user", "quiz")
                with self.assertRaises(HTTPException) as error:
                    consume_ai_request(db, "quota-user", "flashcards")
            self.assertEqual(error.exception.status_code, 429)
        finally:
            db.close()

    def test_datetime_boundaries_use_utc(self):
        local = datetime(2026, 9, 2, 10, 0)
        self.assertEqual(to_utc_naive(local, SAO_PAULO), datetime(2026, 9, 2, 13, 0))
        aware = datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc)
        self.assertEqual(_parse_datetime(aware), datetime(2026, 9, 2, 10, 0))
        self.assertEqual(utc_iso(datetime(2026, 9, 2, 10, 0)), "2026-09-02T10:00:00Z")

    def test_local_sync_lock_prevents_overlap(self):
        db = sessionmaker(bind=create_engine("sqlite:///:memory:"))()
        first = _acquire_distributed_lock(db, "lock-test-user")
        try:
            self.assertTrue(first)
            self.assertIsNone(_acquire_distributed_lock(db, "lock-test-user"))
        finally:
            _release_distributed_lock(first, "lock-test-user")
            db.close()

    def test_partial_section_failure_never_claims_complete_collection(self):
        html = """
        <main id="region-main">
          <li id="section-0" class="section">
            <h3 class="sectionname">Semana 1</h3>
            <div class="activity modtype_assign"><a>Trabalho sem id</a></div>
          </li>
          <li id="section-1" class="section"><h3 class="sectionname">Semana 2</h3></li>
        </main>
        """

        def handler(request: httpx.Request) -> httpx.Response:
            section = request.url.params.get("section")
            if section == "1":
                return httpx.Response(503, text="indisponível")
            return httpx.Response(200, text=html)

        async def collect():
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
                return await MoodleScraper(client).get_course_content(10)

        result = asyncio.run(collect())
        self.assertFalse(result["collection_complete"])
        self.assertEqual(len(result["activities"]), 1)
        self.assertTrue(result["activities"][0]["moodle_id"].startswith("generated-"))


if __name__ == "__main__":
    unittest.main()
