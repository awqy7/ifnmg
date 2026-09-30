import asyncio
from urllib.parse import parse_qs
import unittest

import httpx

from app.routers.activities import _submitted_status
from app.services.moodle_webservice import MoodleWebService


class MoodleSubmissionTests(unittest.TestCase):
    def test_upload_save_submit_and_confirm_assignment(self):
        calls = []

        def handler(request: httpx.Request) -> httpx.Response:
            calls.append(request)
            if request.url.path.endswith("/webservice/upload.php"):
                self.assertEqual(request.url.params.get("token"), "moodle-token")
                self.assertEqual(request.url.params.get("filearea"), "draft")
                return httpx.Response(200, json={"itemid": 456})

            params = parse_qs(request.content.decode())
            function = params["wsfunction"][0]
            if function == "mod_assign_get_submission_status":
                return httpx.Response(200, json={
                    "lastattempt": {
                        "submission": {"status": "submitted", "timemodified": 1_700_000_000},
                    },
                })
            return httpx.Response(200, json={"warnings": []})

        async def run_submission():
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
                ws = MoodleWebService("https://virtual2.ifnmg.edu.br", "moodle-token", client=client)
                draft_id = await ws.upload_draft_file("resposta.pdf", b"PDF", "application/pdf")
                await ws.save_assignment_submission(12, "Resposta em texto", draft_id)
                await ws.submit_assignment_for_grading(12)
                return await ws.get_assignment_submission_status(12)

        status = asyncio.run(run_submission())
        confirmed, submitted_at, is_group = _submitted_status(status)

        self.assertTrue(confirmed)
        self.assertIsNotNone(submitted_at)
        self.assertFalse(is_group)
        self.assertEqual(len(calls), 4)

    def test_group_submission_is_an_official_confirmation(self):
        confirmed, submitted_at, is_group = _submitted_status({
            "lastattempt": {
                "submission": {"status": "new", "timemodified": 0},
                "teamsubmission": {"status": "submitted", "timemodified": 1_700_000_000},
            },
        })
        self.assertTrue(confirmed)
        self.assertTrue(is_group)
        self.assertIsNotNone(submitted_at)


if __name__ == "__main__":
    unittest.main()
