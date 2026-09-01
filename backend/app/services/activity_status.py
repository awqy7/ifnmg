"""Regras centrais para a situação efetiva de uma atividade."""
from datetime import datetime
from typing import Optional


OFFICIAL_COMPLETED_STATUSES = {"submitted", "graded"}
MANUAL_COMPLETION_REASONS = {"group_member_submitted", "submitted_elsewhere", "other"}


def normalise_moodle_status(value: Optional[str], is_completed: bool = False) -> str:
    if is_completed:
        return "submitted"
    status = str(value or "unknown").strip().lower()
    aliases = {
        "complete": "submitted",
        "completed": "submitted",
        "finished": "submitted",
        "draft": "draft",
        "reopened": "reopened",
        "new": "new",
        "pending": "pending",
        "submitted": "submitted",
        "graded": "graded",
    }
    return aliases.get(status, "unknown")


def effective_activity_status(
    moodle_status: Optional[str],
    manual_completed_at: Optional[datetime],
    due_date: Optional[datetime],
    *,
    removed_at: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> str:
    """Calcula o estado exibido sem confundir confirmação manual e oficial."""
    if removed_at:
        return "closed"
    if str(moodle_status or "").lower() in OFFICIAL_COMPLETED_STATUSES:
        return "submitted"
    if manual_completed_at:
        return "manual_completed"
    current = now or datetime.utcnow()
    if due_date and due_date < current:
        return "late"
    return "pending"


def completion_source(status: str) -> str:
    if status == "submitted":
        return "moodle"
    if status == "manual_completed":
        return "manual"
    return "none"
