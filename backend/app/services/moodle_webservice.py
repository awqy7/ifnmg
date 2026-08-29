"""
Cliente oficial da API REST do Moodle (webservice moodle_mobile_app).
Retorna JSON estruturado — muito mais confiável que scraping HTML.
Usado como fonte primária; o scraper HTML é apenas fallback.
"""
import html
import logging
import re
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

# modnames que contam como ATIVIDADE (prazo/entrega/avaliação)
ACTIVITY_MODNAMES = {
    "assign", "quiz", "forum", "workshop", "lesson",
    "choice", "feedback", "survey", "scorm", "h5pactivity", "data",
}
# modnames que contam como MATERIAL
MATERIAL_MODNAMES = {
    "resource", "folder", "url", "page", "book", "glossary", "wiki", "imscp",
    "label", "lti", "subsection",
}

# Plugins conhecidos do Moodle. Módulos instalados pelo campus que não estejam
# nestas listas também são preservados como materiais em vez de desaparecerem.
INSTANCE_FUNCTIONS = {
    "resource": "mod_resource_get_resources_by_courses",
    "folder": "mod_folder_get_folders_by_courses",
    "url": "mod_url_get_urls_by_courses",
    "page": "mod_page_get_pages_by_courses",
    "book": "mod_book_get_books_by_courses",
    "label": "mod_label_get_labels_by_courses",
    "lesson": "mod_lesson_get_lessons_by_courses",
    "choice": "mod_choice_get_choices_by_courses",
    "feedback": "mod_feedback_get_feedbacks_by_courses",
    "glossary": "mod_glossary_get_glossaries_by_courses",
    "wiki": "mod_wiki_get_wikis_by_courses",
    "scorm": "mod_scorm_get_scorms_by_courses",
    "h5pactivity": "mod_h5pactivity_get_h5pactivities_by_courses",
}


def clean_moodle_text(value: Any, limit: int = 15_000) -> str:
    """Converte HTML do Moodle em texto legível sem apagar quebras úteis."""
    if not value:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<(br|/p|/div|/li|/h[1-6])\b[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    return text[:limit]


class MoodleWebService:
    """Wrapper dos web services oficiais do Moodle via token."""

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._userid: Optional[int] = None

    async def _call(self, wsfunction: str, params: Optional[Dict] = None) -> Any:
        payload = {
            "wstoken": self.token,
            "wsfunction": wsfunction,
            "moodlewsrestformat": "json",
        }
        if params:
            payload.update(params)

        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(f"{self.base_url}/webservice/rest/server.php", data=payload)
            data = resp.json()

        if isinstance(data, dict) and data.get("exception"):
            raise RuntimeError(f"MoodleWS[{wsfunction}]: {data.get('message', 'erro desconhecido')}")
        return data

    # ─── Info básica ─────────────────────────────────────────────

    async def get_userid(self) -> Optional[int]:
        if self._userid is None:
            info = await self._call("core_webservice_get_site_info")
            self._userid = info.get("userid")
        return self._userid

    async def get_fullname(self) -> str:
        info = await self._call("core_webservice_get_site_info")
        return info.get("fullname") or ""

    # ─── Cursos ──────────────────────────────────────────────────

    async def get_courses(self) -> List[Dict]:
        """Todos os cursos matriculados."""
        userid = await self.get_userid()
        data = await self._call("core_enrol_get_users_courses", {"userid": userid})
        courses = []
        for c in data:
            courses.append({
                "moodle_id": c["id"],
                "name": c.get("fullname", ""),
                "short_name": c.get("shortname", ""),
                "progress": c.get("progress") or 0,
                "raw_data": c,
            })
        return courses

    async def get_course_contents(self, courseid: int) -> List[Dict]:
        """
        Estrutura completa do curso: seções → módulos → arquivos.
        É a fonte mais completa de materiais e atividades.
        """
        return await self._call("core_course_get_contents", {"courseid": courseid})

    # ─── Atividades detalhadas ───────────────────────────────────

    async def get_assignments(self, courseid: int) -> List[Dict]:
        """Tarefas (assign) com datas, descrição e configurações."""
        data = await self._call("mod_assign_get_assignments", {
            "courseids[0]": courseid,
            "includenotenrolledcourses": 0,
        })
        courses = data.get("courses", []) if isinstance(data, dict) else []
        result = []
        for course in courses:
            for a in course.get("assignments", []):
                result.append(a)
        return result

    async def get_quizzes(self, courseid: int) -> List[Dict]:
        """Quizzes com timeopen/timeclose."""
        try:
            data = await self._call("mod_quiz_get_quizzes_by_courses", {"courseids[0]": courseid})
            return data.get("quizzes", [])
        except Exception as e:
            logger.warning(f"get_quizzes({courseid}): {e}")
            return []

    async def get_forums(self, courseid: int) -> List[Dict]:
        try:
            data = await self._call("mod_forum_get_forums_by_courses", {"courseids[0]": courseid})
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"get_forums({courseid}): {e}")
            return []

    async def get_module_instances(self, modname: str, courseid: int) -> List[Dict]:
        """Busca detalhes opcionais de um tipo de módulo.

        Nem todo plugin está habilitado no webservice do Virtual2. Por isso uma
        função ausente é tratada como ausência de enriquecimento, sem derrubar o
        restante da disciplina.
        """
        wsfunction = INSTANCE_FUNCTIONS.get(modname)
        if not wsfunction:
            return []
        try:
            data = await self._call(wsfunction, {"courseids[0]": courseid})
        except Exception as exc:
            logger.debug("%s indisponível no curso %s: %s", wsfunction, courseid, exc)
            return []
        if not isinstance(data, dict):
            return data if isinstance(data, list) else []
        # Cada endpoint usa uma chave plural própria (pages, books, urls...).
        for value in data.values():
            if isinstance(value, list):
                return value
        return []

    # ─── Notas ───────────────────────────────────────────────────

    async def get_grade_items(self, courseid: int) -> List[Dict]:
        """Notas completas do usuário no curso, estruturadas."""
        userid = await self.get_userid()
        data = await self._call("gradereport_user_get_grade_items", {
            "courseid": courseid,
            "userid": userid,
        })
        usergrades = data.get("usergrades", [])
        items = []
        for ug in usergrades:
            items.extend(ug.get("gradeitems", []))
        return items

    # ─── Calendário ──────────────────────────────────────────────

    async def get_calendar_events(
        self,
        days_back: int = 7,
        days_ahead: int = 120,
    ) -> List[Dict]:
        """Eventos do calendário num intervalo de datas."""
        now = datetime.utcnow()
        timestart = int((now - timedelta(days=days_back)).timestamp())
        timeend = int((now + timedelta(days=days_ahead)).timestamp())
        data = await self._call("core_calendar_get_calendar_events", {
            "options[timestart]": timestart,
            "options[timeend]": timeend,
        })
        return data.get("events", [])

    # ─── Download de arquivos ────────────────────────────────────

    def build_file_download_url(self, fileurl: str) -> str:
        """Adiciona token a URLs webservice/pluginfile.php para download autenticado."""
        sep = "&" if "?" in fileurl else "?"
        if "token=" in fileurl:
            return fileurl
        return f"{fileurl}{sep}token={self.token}"

    async def download_file(self, fileurl: str, max_bytes: int = 15 * 1024 * 1024) -> Optional[bytes]:
        """Baixa um arquivo do Moodle usando o token. Retorna None se falhar/exceder limite."""
        url = self.build_file_download_url(fileurl)
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return None
                if len(resp.content) > max_bytes:
                    logger.warning(f"Arquivo excede {max_bytes} bytes: {fileurl[:100]}")
                    return None
                return resp.content
        except Exception as e:
            logger.warning(f"Falha ao baixar {fileurl[:100]}: {e}")
            return None


def ts_to_datetime(ts) -> Optional[datetime]:
    """Converte timestamp unix do Moodle em datetime UTC."""
    if not ts:
        return None
    try:
        return datetime.utcfromtimestamp(int(ts))
    except Exception:
        return None


async def collect_course_data(ws: MoodleWebService, moodle_course_id: int) -> Dict:
    """
    Coleta TUDO de um curso via web services e normaliza no mesmo formato
    usado pelo scraper HTML: {activities, materials}.
    Prioridade de datas: assign duedate > quiz timeclose > nada.
    Também consulta o status REAL de envio de cada tarefa (mod_assign).
    """
    activities: Dict[str, Dict] = {}
    materials: List[Dict] = []
    userid = await ws.get_userid()

    # Datas oficiais por cmid + instância de assign
    due_dates: Dict[int, datetime] = {}
    descriptions: Dict[int, str] = {}
    assignment_files: Dict[int, List[Dict]] = {}
    instance_details: Dict[int, Dict] = {}

    try:
        assignments = await ws.get_assignments(moodle_course_id)
        for a in assignments:
            cmid = a.get("cmid")
            d = ts_to_datetime(a.get("duedate"))
            if cmid and d and d.year > 2000:
                due_dates[cmid] = d
            intro = a.get("intro") or ""
            if intro:
                text = clean_moodle_text(intro, 15_000)
                if text:
                    descriptions[cmid] = text
            if cmid:
                assignment_files[cmid] = [
                    {
                        "filename": file.get("filename", ""),
                        "fileurl": file.get("fileurl", ""),
                        "mimetype": file.get("mimetype", ""),
                        "filesize": file.get("filesize", 0),
                    }
                    for file in (a.get("introattachments") or [])
                    if file.get("fileurl")
                ]
    except Exception as e:
        logger.warning(f"[collect] assignments curso {moodle_course_id}: {e}")

    # ── Status REAL de envio das tarefas (o que o aluno já entregou) ──
    submission_map: Dict[int, str] = {}
    try:
        assignments = await ws.get_assignments(moodle_course_id)
        for a in assignments:
            inst = a.get("id")
            cmid = a.get("cmid")
            if not inst or not cmid:
                continue
            try:
                st = await ws._call("mod_assign_get_submission_status", {
                    "assignid": inst, "userid": userid,
                })
                last = st.get("lastattempt") or {}
                sub = last.get("submission") or {}
                team = last.get("teamsubmission") or {}
                status = sub.get("status") or team.get("status") or "new"
                submission_map[cmid] = status
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"[collect] submissions curso {moodle_course_id}: {e}")

    try:
        quizzes = await ws.get_quizzes(moodle_course_id)
        for q in quizzes:
            cmid = q.get("coursemodule") or q.get("cmid")
            d = ts_to_datetime(q.get("timeclose"))
            if cmid and d and d.year > 2000 and cmid not in due_dates:
                due_dates[cmid] = d
    except Exception as e:
        logger.warning(f"[collect] quizzes curso {moodle_course_id}: {e}")

    # Enriquece páginas, livros, pastas, labels e plugins que trazem o conteúdo
    # em endpoints separados de core_course_get_contents.
    for modname in INSTANCE_FUNCTIONS:
        for detail in await ws.get_module_instances(modname, moodle_course_id):
            cmid = detail.get("coursemodule") or detail.get("cmid")
            if cmid:
                instance_details[int(cmid)] = detail

    # Estrutura completa do curso
    sections = await ws.get_course_contents(moodle_course_id)

    for sec_idx, section in enumerate(sections):
        topic_name = section.get("name") or f"Tópico {sec_idx + 1}"
        modules = section.get("modules", [])

        section_summary = clean_moodle_text(section.get("summary"))
        if section_summary:
            materials.append({
                "moodle_id": f"section-{section.get('id', sec_idx)}",
                "title": topic_name,
                "type": "section_summary",
                "url": "",
                "description": section_summary,
                "topic_name": topic_name,
                "topic_number": sec_idx,
                "files": [],
            })

        for mod in modules:
            cmid = mod.get("id")
            modname = mod.get("modname", "")
            title = (mod.get("name") or "").strip()
            url = mod.get("url") or ""
            detail = instance_details.get(int(cmid), {}) if cmid else {}
            external_url = str(detail.get("externalurl") or "").strip()
            description = (
                descriptions.get(cmid, "")
                or clean_moodle_text(detail.get("content") or detail.get("intro"))
                or clean_moodle_text(mod.get("description"))
            )

            # limpa html da description do módulo
            description = clean_moodle_text(description)

            sub_status = submission_map.get(cmid)
            completed = sub_status == "submitted"

            item = {
                "moodle_id": str(cmid),
                "title": title,
                "type": modname,
                "url": external_url if modname == "url" and external_url else url,
                "description": description,
                "topic_name": topic_name,
                "topic_number": sec_idx,
                "due_date": due_dates[cmid].isoformat() if cmid in due_dates else None,
                "is_completed": completed,
                "submission_status": sub_status,
                "files": assignment_files.get(cmid, []),
                "availability": mod.get("availabilityinfo") or "",
                "visible": mod.get("visible", 1),
            }

            # Conteúdos podem aparecer em vários campos dependendo do plugin.
            module_files = []
            for content in (mod.get("contents") or []):
                if content.get("type") == "file" and content.get("fileurl"):
                    module_files.append({
                        "filename": content.get("filename", ""),
                        "filesize": content.get("filesize", 0),
                        "fileurl": content.get("fileurl", ""),
                        "mimetype": content.get("mimetype", ""),
                    })
            for field in ("contentfiles", "introfiles", "packagefile"):
                values = detail.get(field) or []
                if isinstance(values, dict):
                    values = [values]
                for content in values:
                    if isinstance(content, dict) and content.get("fileurl"):
                        module_files.append({
                            "filename": content.get("filename", ""),
                            "filesize": content.get("filesize", 0),
                            "fileurl": content.get("fileurl", ""),
                            "mimetype": content.get("mimetype", ""),
                        })
            seen_file_urls = set()
            item["files"] = [
                f for f in (item["files"] + module_files)
                if f.get("fileurl") and not (f["fileurl"] in seen_file_urls or seen_file_urls.add(f["fileurl"]))
            ]

            if modname in ACTIVITY_MODNAMES:
                # Ignora fóruns genéricos de avisos (não são atividades a entregar)
                t_lower = title.lower().strip()
                is_announcement = (
                    modname == "forum"
                    and any(
                        k in t_lower
                        for k in ("aviso", "news forum", "fórum de notícias", "announcements")
                    )
                )
                if is_announcement:
                    continue
                activities[str(cmid)] = item
            else:
                # Todo módulo visível que não exige entrega continua sendo
                # conhecimento útil (inclusive plugins locais desconhecidos).
                materials.append(item)

    return {
        "activities": list(activities.values()),
        "materials": materials,
    }
