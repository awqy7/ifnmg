import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
from fastapi import HTTPException, Response
from starlette.requests import Request

from app.config import settings
from app.routers.auth import ALGORITHM, create_access_token, get_current_user


class _UserQuery:
    def __init__(self, user):
        self.user = user

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self.user


class _UserDb:
    def __init__(self, user):
        self.user = user

    def query(self, *_args, **_kwargs):
        return _UserQuery(self.user)


def _request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/", "headers": []})


class AuthTokenTests(unittest.TestCase):
    def test_access_token_keeps_user_and_session_version(self):
        token = create_access_token("user-1", session_version=7)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

        self.assertEqual(payload["sub"], "user-1")
        self.assertEqual(payload["sv"], 7)
        self.assertTrue(payload["jti"])

    def test_current_user_accepts_current_session(self):
        user = SimpleNamespace(id="user-1", is_active=True, session_version=3)
        resolved = asyncio.run(get_current_user(
            request=_request(),
            response=Response(),
            token=create_access_token(user.id, session_version=3),
            bearer=None,
            db=_UserDb(user),
        ))

        self.assertIs(resolved, user)

    def test_current_user_rejects_revoked_and_expired_tokens(self):
        user = SimpleNamespace(id="user-1", is_active=True, session_version=4)
        revoked = create_access_token(user.id, session_version=3)
        expired = jwt.encode(
            {
                "sub": user.id,
                "sv": 4,
                "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
            },
            settings.SECRET_KEY,
            algorithm=ALGORITHM,
        )

        for token in (revoked, expired):
            with self.subTest(token=token[:12]):
                with self.assertRaises(HTTPException) as error:
                    asyncio.run(get_current_user(
                        request=_request(),
                        response=Response(),
                        token=token,
                        bearer=None,
                        db=_UserDb(user),
                    ))
                self.assertEqual(error.exception.status_code, 401)
