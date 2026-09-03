"""Acesso autenticado e seguro a arquivos do Virtual2."""
from contextlib import asynccontextmanager
from dataclasses import dataclass
import mimetypes
from pathlib import PurePath
from typing import AsyncIterator
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit
import re
import unicodedata

import httpx

from app.config import settings
from app.services.crypto_service import crypto_service
from app.services.material_extractor import download_file_limited
from app.services.moodle_auth import moodle_auth_service
from app.services.moodle_webservice import MoodleWebService

MAX_DOWNLOAD_BYTES = 30 * 1024 * 1024
SECRET_QUERY_KEYS = {"token", "wstoken", "sesskey"}


class MoodleFileUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class MoodleDownload:
    data: bytes
    content_type: str


def download_headers(filename: str) -> dict[str, str]:
    normalised = unicodedata.normalize("NFKD", filename or "arquivo")
    ascii_name = normalised.encode("ascii", "ignore").decode("ascii")
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_name).strip("._") or "arquivo"
    utf8_name = quote((filename or "arquivo").replace("\r", "").replace("\n", ""), safe="")
    return {
        "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
    }


def filename_for_content_type(filename: str, content_type: str) -> str:
    clean_name = (filename or "arquivo").strip()
    if PurePath(clean_name).suffix:
        return clean_name
    mime = (content_type or "").split(";", 1)[0].strip().lower()
    extension = mimetypes.guess_extension(mime) or ""
    return f"{clean_name}{extension}"


def strip_moodle_secrets(url: str) -> str:
    """Remove credenciais que eventualmente vieram embutidas pela API Moodle."""
    if not url:
        return ""
    parsed = urlsplit(url)
    query = urlencode([
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in SECRET_QUERY_KEYS
    ])
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, parsed.fragment))


def normalise_source_files(files: object) -> list[dict]:
    if not isinstance(files, list):
        return []
    result: list[dict] = []
    seen: set[str] = set()
    for item in files:
        if not isinstance(item, dict):
            continue
        url = strip_moodle_secrets(str(item.get("fileurl") or item.get("url") or "").strip())
        if not url or url in seen:
            continue
        seen.add(url)
        try:
            size = int(item.get("filesize") or item.get("size") or 0)
        except (TypeError, ValueError):
            size = 0
        result.append({
            "name": str(item.get("filename") or item.get("name") or "arquivo")[:500],
            "url": url,
            "mimetype": str(item.get("mimetype") or "").split(";", 1)[0].strip(),
            "size": size,
        })
    return result


def _moodle_credentials(user) -> tuple[dict, str | None]:
    session_data: dict = {}
    if user.moodle_session_cookies:
        try:
            session_data = crypto_service.decrypt_json(user.moodle_session_cookies)
        except Exception:
            session_data = {}

    token = session_data.get("moodle_token")
    if not token and user.moodle_token_enc:
        try:
            token = crypto_service.decrypt(user.moodle_token_enc)
        except Exception:
            token = None
    return session_data, token


@asynccontextmanager
async def open_user_moodle_access(user) -> AsyncIterator[tuple[httpx.AsyncClient, MoodleWebService | None]]:
    session_data, token = _moodle_credentials(user)
    if not session_data.get("cookies") and not token:
        raise MoodleFileUnavailable("Reconecte sua conta do Virtual2 para acessar este arquivo.")

    client = moodle_auth_service.build_httpx_client(session_data)
    ws = MoodleWebService(settings.MOODLE_BASE_URL, token, client=client) if token else None
    async with client:
        yield client, ws


async def download_user_moodle_file(user, file_url: str) -> MoodleDownload:
    safe_url = strip_moodle_secrets(file_url)
    if not safe_url:
        raise MoodleFileUnavailable("Arquivo sem endereço de download.")

    async with open_user_moodle_access(user) as (client, ws):
        authenticated_url = ws.build_file_download_url(safe_url) if ws else safe_url
        data, content_type = await download_file_limited(
            client,
            authenticated_url,
            max_bytes=MAX_DOWNLOAD_BYTES,
        )
    if not data:
        raise MoodleFileUnavailable(
            "Não foi possível baixar o arquivo. Sincronize ou reconecte o Virtual2 e tente novamente."
        )
    return MoodleDownload(data=data, content_type=content_type or "application/octet-stream")
