import unittest
from unittest.mock import AsyncMock, patch

from app.database import Base, SessionLocal, engine
from app.models import Activity, Course, Material, User
from app.routers.activities import download_activity_file
from app.routers.courses import download_material
from app.services.moodle_file_service import (
    MoodleDownload,
    normalise_source_files,
    strip_moodle_secrets,
)
from app.services.scheduler import _sync_materials


class MoodleFileDownloadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.user = User(
            id="download-user",
            name="Aluno",
            email="download@example.com",
            hashed_password="unused",
        )
        self.course = Course(
            id="download-course",
            user_id=self.user.id,
            moodle_id="101",
            name="Disciplina",
            is_active=True,
        )
        self.db.add_all([self.user, self.course])
        self.db.commit()

    def tearDown(self):
        self.db.query(Activity).filter(Activity.user_id == self.user.id).delete()
        self.db.query(Material).filter(Material.user_id == self.user.id).delete()
        self.db.query(Course).filter(Course.user_id == self.user.id).delete()
        self.db.query(User).filter(User.id == self.user.id).delete()
        self.db.commit()
        self.db.close()

    def test_source_urls_never_keep_moodle_tokens(self):
        url = "https://virtual2.ifnmg.edu.br/pluginfile.php/1/a.pdf?forcedownload=1&token=secret"
        cleaned = strip_moodle_secrets(url)
        files = normalise_source_files([{"filename": "Aula.pdf", "fileurl": url}])

        self.assertIn("forcedownload=1", cleaned)
        self.assertNotIn("token=", cleaned)
        self.assertEqual(files[0]["url"], cleaned)

    async def test_sync_persists_download_metadata_without_token(self):
        await _sync_materials(
            self.db,
            self.user.id,
            self.course,
            [{
                "moodle_id": "77",
                "title": "Apostila",
                "type": "resource",
                "url": "https://virtual2.ifnmg.edu.br/mod/resource/view.php?id=77",
                "files": [{
                    "filename": "apostila.pdf",
                    "fileurl": "https://virtual2.ifnmg.edu.br/pluginfile.php/77/apostila.pdf?wstoken=secret",
                    "mimetype": "application/pdf",
                }],
            }],
            extract_text=False,
        )
        self.db.commit()

        material = self.db.query(Material).filter(Material.moodle_id == "mod_77").one()
        self.assertEqual(material.source_files[0]["name"], "apostila.pdf")
        self.assertNotIn("wstoken", material.source_files[0]["url"])

    async def test_material_and_activity_download_return_attachment(self):
        material = Material(
            id="download-material",
            user_id=self.user.id,
            course_id=self.course.id,
            moodle_id="mod_88",
            title="Material.pdf",
            material_type="resource",
            source_files=[{
                "name": "Material.pdf",
                "url": "https://virtual2.ifnmg.edu.br/pluginfile.php/88/Material.pdf",
                "mimetype": "application/pdf",
                "size": 3,
            }],
            is_active=True,
        )
        activity = Activity(
            id="download-activity",
            user_id=self.user.id,
            course_id=self.course.id,
            moodle_id="99",
            title="Atividade",
            status="pending",
            raw_data={"files": [{
                "name": "Enunciado.pdf",
                "url": "https://virtual2.ifnmg.edu.br/pluginfile.php/99/Enunciado.pdf",
                "mimetype": "application/pdf",
            }]},
        )
        self.db.add_all([material, activity])
        self.db.commit()
        downloaded = MoodleDownload(data=b"PDF", content_type="application/pdf")

        with patch(
            "app.routers.courses.download_user_moodle_file",
            new=AsyncMock(return_value=downloaded),
        ):
            material_response = await download_material(
                self.course.id,
                material.id,
                file_index=0,
                current_user=self.user,
                db=self.db,
            )
        with patch(
            "app.routers.activities.download_user_moodle_file",
            new=AsyncMock(return_value=downloaded),
        ):
            activity_response = await download_activity_file(
                activity.id,
                file_index=0,
                current_user=self.user,
                db=self.db,
            )

        self.assertEqual(material_response.body, b"PDF")
        self.assertIn("attachment", material_response.headers["content-disposition"])
        self.assertEqual(activity_response.body, b"PDF")
        self.assertIn("Enunciado.pdf", activity_response.headers["content-disposition"])


if __name__ == "__main__":
    unittest.main()
