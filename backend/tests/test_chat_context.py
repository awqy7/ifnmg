import asyncio
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Activity, Course, Material, User
from app.routers.chat import _build_system_context


class ChatContextTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.user = User(id="u1", name="Aluno", email="a@test", hashed_password="x")
        self.other = User(id="u2", name="Outro", email="b@test", hashed_password="x")
        self.course = Course(id="c1", user_id="u1", moodle_id=1, name="Algoritmos")
        other_course = Course(id="c2", user_id="u2", moodle_id=2, name="Curso privado")
        self.db.add_all([self.user, self.other, self.course, other_course])
        self.db.flush()
        self.db.add_all([
            Material(
                user_id="u1", course_id="c1", moodle_id="m1", title="Árvores binárias",
                material_type="page", topic_name="Estruturas", content_text="Busca em profundidade e percurso em ordem.",
            ),
            Material(
                user_id="u2", course_id="c2", moodle_id="m2", title="SEGREDO DE OUTRO ALUNO",
                content_text="não pode aparecer",
            ),
            Activity(user_id="u1", course_id="c1", moodle_id="a1", title="Lista de árvores", status="pending"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_general_chat_uses_academic_data_without_cross_user_leak(self):
        context = asyncio.run(_build_system_context(self.db, "u1", None, "árvores"))
        self.assertIn("Árvores binárias", context)
        self.assertIn("Lista de árvores", context)
        self.assertNotIn("GRADE DE HORÁRIOS", context)
        self.assertNotIn("\nNOTAS:", context)
        self.assertNotIn("\nCALENDÁRIO:", context)
        self.assertNotIn("SEGREDO DE OUTRO ALUNO", context)
        self.assertIn("dado não confiável", context)


if __name__ == "__main__":
    unittest.main()
