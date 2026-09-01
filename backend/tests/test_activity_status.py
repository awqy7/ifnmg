import asyncio
import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Activity, Course, User
from app.services.activity_status import effective_activity_status
from app.services.scheduler import _upsert_activity


class ActivityStatusTests(unittest.TestCase):
    def test_manual_completion_is_not_official_submission(self):
        now = datetime.utcnow()
        self.assertEqual(effective_activity_status("new", now, now + timedelta(days=1)), "manual_completed")
        self.assertEqual(effective_activity_status("submitted", now, now + timedelta(days=1)), "submitted")

    def test_late_only_when_no_completion_exists(self):
        due = datetime.utcnow() - timedelta(minutes=1)
        self.assertEqual(effective_activity_status("pending", None, due), "late")
        self.assertEqual(effective_activity_status("submitted", None, due), "submitted")

    def test_sync_promotes_manual_to_official_and_clears_removed_deadline(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        try:
            user = User(id="u1", name="Aluno", email="a@example.com", hashed_password="x")
            course = Course(id="c1", user_id="u1", moodle_id=1, name="Curso")
            db.add_all([user, course])
            db.commit()

            activity = Activity(
                id="a1",
                user_id="u1",
                course_id="c1",
                moodle_id="10",
                title="Trabalho em grupo",
                due_date=datetime.utcnow() + timedelta(days=1),
                status="manual_completed",
                moodle_status="new",
                manual_completed_at=datetime.utcnow(),
            )
            db.add(activity)
            db.commit()

            asyncio.run(_upsert_activity(
                db, "u1", course,
                {
                    "moodle_id": "10",
                    "title": "Trabalho em grupo",
                    "description": "",
                    "due_date": None,
                    "submission_status": "new",
                    "is_completed": False,
                    "files": [],
                },
                False,
                existing_activities={"10": activity},
                extraction_budget=[0],
            ))
            self.assertIsNone(activity.due_date)
            self.assertEqual(activity.status, "manual_completed")

            asyncio.run(_upsert_activity(
                db, "u1", course,
                {
                    "moodle_id": "10",
                    "title": "Trabalho em grupo",
                    "submission_status": "submitted",
                    "is_completed": True,
                    "is_group_activity": True,
                },
                False,
                existing_activities={"10": activity},
                extraction_budget=[0],
            ))
            self.assertEqual(activity.status, "submitted")
            self.assertEqual(activity.moodle_status, "submitted")
            self.assertTrue(activity.is_group_activity)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
