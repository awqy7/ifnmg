import asyncio
import unittest
from datetime import datetime, timedelta
from app.services.datetime_utils import utc_now_naive

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Activity, Course, User
from app.routers.briefing import build_briefing_snapshot
from app.routers.dashboard import dashboard_snapshot
from app.services.scheduler import get_sync_status, mark_sync_queued


class DashboardSnapshotTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.user = User(id="u-dashboard", name="Maria Teste", email="maria@test", hashed_password="x")
        self.course = Course(id="c-dashboard", user_id=self.user.id, moodle_id=10, name="Algoritmos")
        self.db.add_all([self.user, self.course])
        self.db.flush()
        self.db.add_all([
            Activity(
                id="a-dashboard",
                user_id=self.user.id,
                course_id=self.course.id,
                moodle_id="100",
                title="Lista de árvores",
                status="pending",
                due_date=utc_now_naive() + timedelta(hours=2),
            ),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_briefing_snapshot_is_actionable_without_ai(self):
        result = build_briefing_snapshot(self.db, self.user)
        self.assertFalse(result["is_ai_generated"])
        self.assertEqual(result["metrics"]["courses"], 1)
        self.assertEqual(result["metrics"]["pending"], 1)
        self.assertEqual(result["metrics"]["due_24h"], 1)
        self.assertEqual(result["top_priority"]["id"], "a-dashboard")
        self.assertTrue(result["study_plan"])

    def test_dashboard_uses_one_local_snapshot(self):
        result = asyncio.run(dashboard_snapshot(current_user=self.user, db=self.db))
        self.assertEqual(result["briefing"]["top_priority"]["title"], "Lista de árvores")
        self.assertNotIn("today_schedule", result)
        self.assertEqual(result["courses"][0]["pending_activities"], 1)

    def test_queued_sync_state_is_persistent(self):
        mark_sync_queued(self.db, self.user.id)
        status = get_sync_status(self.user.id, self.db)
        self.assertTrue(status["running"])
        self.assertEqual(status["phase"], "queued")


if __name__ == "__main__":
    unittest.main()
