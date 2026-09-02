"""Conversões de data na fronteira da aplicação.

O banco mantém datetimes UTC sem timezone por compatibilidade com SQLite. As
APIs expõem UTC com ``Z``; datas textuais do Virtual2 são interpretadas no fuso
de São Paulo antes de serem persistidas.
"""
from datetime import datetime, timezone, tzinfo
from zoneinfo import ZoneInfo

UTC = timezone.utc
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def utc_now_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def to_utc_naive(value: datetime, assume_timezone: tzinfo = UTC) -> datetime:
    aware = value.replace(tzinfo=assume_timezone) if value.tzinfo is None else value
    return aware.astimezone(UTC).replace(tzinfo=None)


def utc_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return f"{to_utc_naive(value).isoformat()}Z"
