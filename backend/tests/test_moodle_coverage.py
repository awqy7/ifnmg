import asyncio
import io
import unittest
import zipfile

from app.services.material_extractor import (
    extract_material_content,
    extract_text_from_bytes,
    extract_youtube_video_id,
)
from app.services.moodle_webservice import collect_course_data


class _FakeWebService:
    async def get_userid(self):
        return 7

    async def get_assignments(self, _course_id):
        return []

    async def get_quizzes(self, _course_id):
        return []

    async def get_module_instances(self, modname, _course_id):
        if modname == "page":
            return [{"coursemodule": 11, "content": "<h2>Aula</h2><p>Texto completo da página</p>"}]
        if modname == "url":
            return [{"coursemodule": 14, "externalurl": "https://youtu.be/dQw4w9WgXcQ"}]
        return []

    async def get_course_contents(self, _course_id):
        return [{
            "id": 3,
            "name": "Semana 1",
            "summary": "<p>Recado importante do professor.</p>",
            "modules": [
                {"id": 11, "modname": "page", "name": "Conteúdo da aula", "url": "https://moodle/page/11"},
                {"id": 12, "modname": "pluginlocal", "name": "Laboratório virtual", "url": "https://moodle/local/12"},
                {
                    "id": 13,
                    "modname": "assign",
                    "name": "Entrega 1",
                    "url": "https://moodle/assign/13",
                    "contents": [{
                        "type": "file",
                        "filename": "roteiro.pdf",
                        "fileurl": "https://moodle/pluginfile/roteiro.pdf",
                        "mimetype": "application/pdf",
                    }],
                },
                {"id": 14, "modname": "url", "name": "Videoaula", "url": "https://moodle/url/14"},
            ],
        }]

    async def _call(self, *_args, **_kwargs):
        return {}


class MoodleCoverageTests(unittest.TestCase):
    def test_collects_inline_text_unknown_plugins_and_activity_files(self):
        data = asyncio.run(collect_course_data(_FakeWebService(), 99))

        material_types = {item["type"] for item in data["materials"]}
        self.assertIn("section_summary", material_types)
        self.assertIn("pluginlocal", material_types)
        page = next(item for item in data["materials"] if item["type"] == "page")
        self.assertIn("Texto completo da página", page["description"])
        assignment = data["activities"][0]
        self.assertEqual(assignment["files"][0]["filename"], "roteiro.pdf")
        video = next(item for item in data["materials"] if item["moodle_id"] == "14")
        self.assertEqual(video["url"], "https://youtu.be/dQw4w9WgXcQ")

    def test_extracts_presentation_and_spreadsheet_text(self):
        pptx = io.BytesIO()
        with zipfile.ZipFile(pptx, "w") as archive:
            archive.writestr(
                "ppt/slides/slide1.xml",
                '<p:sld xmlns:a="a" xmlns:p="p"><a:t>Fotossíntese</a:t><a:t>Clorofila</a:t></p:sld>',
            )
        self.assertIn("Fotossíntese", extract_text_from_bytes("aula.pptx", "", pptx.getvalue()))

        xlsx = io.BytesIO()
        with zipfile.ZipFile(xlsx, "w") as archive:
            archive.writestr("xl/sharedStrings.xml", "<sst><si><t>Resultado</t></si></sst>")
            archive.writestr(
                "xl/worksheets/sheet1.xml",
                '<worksheet><row><c t="s"><v>0</v></c><c><v>42</v></c></row></worksheet>',
            )
        text = extract_text_from_bytes("dados.xlsx", "", xlsx.getvalue())
        self.assertIn("Resultado | 42", text)

    def test_youtube_urls_and_token_downloads_are_recognised(self):
        self.assertEqual(extract_youtube_video_id("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertEqual(
            extract_youtube_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"),
            "dQw4w9WgXcQ",
        )

        class FakeWs:
            called = False

            async def download_file(self, _url):
                self.called = True
                return b"conteudo autenticado"

        ws = FakeWs()
        text = asyncio.run(extract_material_content(
            ws,
            None,
            "https://virtual2.ifnmg.edu.br/pluginfile.php/arquivo.txt",
            "arquivo.txt",
            "text/plain",
        ))
        self.assertTrue(ws.called)
        self.assertEqual(text, "conteudo autenticado")


if __name__ == "__main__":
    unittest.main()
