"""Smoke test manual do Virtual2 sem expor dados pessoais ou credenciais.

Este arquivo não faz parte da suíte unitária automática porque depende de rede e
de uma conta criptografada já existente no banco local.
"""
import asyncio
import logging
from collections import Counter

from app.database import SessionLocal
from app.models import User
from app.services.crypto_service import crypto_service
from app.services.moodle_auth import moodle_auth_service
from app.services.moodle_webservice import MoodleWebService, collect_course_data


async def main():
    logging.disable(logging.CRITICAL)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.moodle_username_enc.isnot(None),
            User.moodle_password_enc.isnot(None),
        ).first()
        if not user:
            raise RuntimeError("Nenhuma credencial criptografada disponível no banco local")
        username = crypto_service.decrypt(user.moodle_username_enc)
        password = crypto_service.decrypt(user.moodle_password_enc)
    finally:
        db.close()

    session = await moodle_auth_service.login(username, password)
    if not session or not session.get("moodle_token"):
        raise RuntimeError("Autenticação/token do Virtual2 indisponível")

    ws = MoodleWebService(session["base_url"], session["moodle_token"])
    courses = await ws.get_courses()
    activity_count = 0
    material_count = 0
    module_types = Counter()
    failures = 0
    for course in courses:
        try:
            content = await collect_course_data(ws, course["moodle_id"])
            activity_count += len(content["activities"])
            material_count += len(content["materials"])
            module_types.update(item.get("type", "unknown") for item in content["activities"])
            module_types.update(item.get("type", "unknown") for item in content["materials"])
        except Exception:
            failures += 1

    print("AUTH=ok")
    print(f"COURSES={len(courses)}")
    print(f"ACTIVITIES={activity_count}")
    print(f"MATERIALS={material_count}")
    print(f"COURSE_FAILURES={failures}")
    print("MODULE_TYPES=" + ",".join(sorted(module_types)))


if __name__ == "__main__":
    asyncio.run(main())
