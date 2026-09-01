"""
Scraper do Moodle IFNMG usado como fallback da API oficial.
Descobre cursos via Timeline, Dashboard e Perfil, além de extrair tópicos,
materiais e atividades detalhadas.
"""
import asyncio
import re
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from app.config import settings

logger = logging.getLogger(__name__)
MOODLE_BASE = settings.MOODLE_BASE_URL.rstrip("/")

COURSE_COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
    "#f97316", "#06b6d4", "#84cc16", "#a855f7",
]


class MoodleScraper:
    def __init__(
        self,
        client: httpx.AsyncClient,
        moodle_token: Optional[str] = None,
        moodle_user_id: Optional[int] = None,
    ):
        self.client = client
        self.token = moodle_token
        self.moodle_user_id = moodle_user_id

    def _soup(self, html: str) -> BeautifulSoup:
        return BeautifulSoup(html, "html.parser")

    def _parse_moodle_date(self, text: str) -> Optional[datetime]:
        """Parseia datas em múltiplos formatos do Moodle."""
        if not text:
            return None
        text = text.strip()
        # Normaliza meses em português
        months_map = {
            "janeiro": "01", "fevereiro": "02", "março": "03", "marco": "03",
            "abril": "04", "maio": "05", "junho": "06",
            "julho": "07", "agosto": "08", "setembro": "09",
            "outubro": "10", "novembro": "11", "dezembro": "12",
            "jan": "01", "fev": "02", "mar": "03", "abr": "04",
            "mai": "05", "jun": "06", "jul": "07", "ago": "08",
            "set": "09", "out": "10", "nov": "11", "dez": "12",
        }
        clean_text = text.lower()
        for pt_month, num_month in months_map.items():
            if pt_month in clean_text:
                clean_text = re.sub(rf"\b{pt_month}\b", num_month, clean_text)
                break

        # Tenta formatos com data normalizada
        formats = [
            "%d %m %Y, %H:%M",
            "%d de %m de %Y, %H:%M",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y, %H:%M",
            "%d/%m/%Y",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(clean_text, fmt)
            except ValueError:
                continue

        # Regex para extrair dia, mes, ano, hora, min
        match = re.search(r"(\d{1,2})[/\-\s](\d{1,2})[/\-\s](\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?", clean_text)
        if match:
            day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
            hour = int(match.group(4)) if match.group(4) else 23
            minute = int(match.group(5)) if match.group(5) else 59
            try:
                return datetime(year, month, day, hour, minute)
            except Exception:
                pass

        if text.isdigit():
            try:
                return datetime.fromtimestamp(int(text))
            except Exception:
                pass

        return None

    # ─────────────────────────────────────────────────────────────
    # MÓDULO: Coleta Completa de Cursos (Multi-Layer Discovery)
    # ─────────────────────────────────────────────────────────────

    async def get_courses(self) -> List[Dict]:
        """
        Coleta TODOS os cursos em que o estudante está matriculado.
        Cruza dados do AJAX Timeline, Dashboard, Perfil e API REST.
        """
        courses_by_id: Dict[int, Dict] = {}
        dashboard_html = ""
        try:
            response = await self.client.get(f"{MOODLE_BASE}/my/")
            if response.status_code == 200:
                dashboard_html = response.text
        except Exception as exc:
            logger.warning("Falha ao abrir Dashboard /my/: %s", exc)

        source_names = ["AJAX Timeline", "Dashboard /my/", "Perfil"]
        source_calls = [
            self._get_courses_from_ajax_timeline(dashboard_html),
            self._get_courses_from_dashboard(dashboard_html),
            self._get_courses_from_user_profile(),
        ]
        if self.token:
            source_names.append("API REST")
            source_calls.append(self._get_courses_api())

        source_results = await asyncio.gather(*source_calls, return_exceptions=True)
        for source_index, (source_name, source_courses) in enumerate(zip(source_names, source_results)):
            if isinstance(source_courses, Exception):
                logger.warning("Falha na fonte %s: %s", source_name, source_courses)
                continue
            logger.info("Fonte %s: %s cursos encontrados", source_name, len(source_courses))
            for course in source_courses:
                moodle_id = course["moodle_id"]
                # O perfil é a fonte menos rica: apenas preenche lacunas.
                if source_index == 2 and moodle_id in courses_by_id:
                    continue
                if moodle_id in courses_by_id:
                    courses_by_id[moodle_id].update({key: value for key, value in course.items() if value})
                else:
                    courses_by_id[moodle_id] = course

        # Atribui cores únicas
        result = list(courses_by_id.values())
        for idx, course in enumerate(result):
            course["color"] = COURSE_COLORS[idx % len(COURSE_COLORS)]

        logger.info(f"Total consolidado de disciplinas: {len(result)}")
        return result

    async def _get_courses_from_ajax_timeline(self, dashboard_html: str = "") -> List[Dict]:
        """Usa o endpoint AJAX nativo do Moodle para buscar cursos da timeline."""
        courses = []
        # Primeiro pega a sesskey da página /my/
        if not dashboard_html:
            my_resp = await self.client.get(f"{MOODLE_BASE}/my/")
            dashboard_html = my_resp.text
        soup = self._soup(dashboard_html)
        
        sesskey = None
        sesskey_input = soup.find("input", {"name": "sesskey"})
        if sesskey_input:
            sesskey = sesskey_input.get("value")
        else:
            match = re.search(r'"sesskey":"([^"]+)"', dashboard_html)
            if match:
                sesskey = match.group(1)

        if not sesskey:
            return []

        # Chama core_course_get_enrolled_courses_by_timeline_classification
        ajax_url = f"{MOODLE_BASE}/lib/ajax/service.php?sesskey={sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification"
        payload = [
            {
                "index": 0,
                "methodname": "core_course_get_enrolled_courses_by_timeline_classification",
                "args": {
                    "offset": 0,
                    "limit": 0,
                    "classification": "all",
                    "sort": "fullname",
                },
            }
        ]

        resp = await self.client.post(ajax_url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                courses_data = data[0].get("data", {}).get("courses", [])
                for c in courses_data:
                    courses.append({
                        "moodle_id": c["id"],
                        "name": c.get("fullname", c.get("shortname", f"Curso {c['id']}")),
                        "short_name": c.get("shortname", ""),
                        "progress": c.get("progress", 0) or 0,
                        "raw_data": c,
                    })
        return courses

    async def _get_courses_from_dashboard(self, dashboard_html: str = "") -> List[Dict]:
        """Extrai cursos do HTML da página /my/."""
        courses = []
        if not dashboard_html:
            resp = await self.client.get(f"{MOODLE_BASE}/my/")
            if resp.status_code != 200:
                return []
            dashboard_html = resp.text

        soup = self._soup(dashboard_html)
        seen = set()

        # 1. Cards de cursos com data-course-id
        for el in soup.select("[data-course-id], [data-courseid], .coursebox, .dashboard-card"):
            cid_str = el.get("data-course-id") or el.get("data-courseid")
            if not cid_str:
                link = el.select_one("a[href*='/course/view.php?id=']")
                if link:
                    match = re.search(r"id=(\d+)", link.get("href", ""))
                    cid_str = match.group(1) if match else None

            if cid_str and cid_str.isdigit():
                cid = int(cid_str)
                if cid in seen or cid <= 1:
                    continue
                seen.add(cid)
                name_el = el.select_one(".coursename, .course-name, h3, h4, .text-truncate")
                name = name_el.get_text(strip=True) if name_el else f"Curso {cid}"
                teacher_el = el.select_one(".teachers, .teacher, .instructor")
                courses.append({
                    "moodle_id": cid,
                    "name": name,
                    "short_name": "",
                    "teacher": teacher_el.get_text(strip=True) if teacher_el else None,
                    "progress": 0,
                    "raw_data": {},
                })

        # 2. Links soltos de cursos no menu de navegação
        for link in soup.select("a[href*='/course/view.php?id=']"):
            href = link.get("href", "")
            match = re.search(r"id=(\d+)", href)
            if match:
                cid = int(match.group(1))
                if cid not in seen and cid > 1:
                    seen.add(cid)
                    text = link.get_text(strip=True)
                    if text and len(text) > 3 and not text.isdigit():
                        courses.append({
                            "moodle_id": cid,
                            "name": text,
                            "short_name": "",
                            "teacher": None,
                            "progress": 0,
                            "raw_data": {},
                        })

        return courses

    async def _get_courses_from_user_profile(self) -> List[Dict]:
        """Extrai cursos listados na página de perfil do usuário."""
        courses = []
        resp = await self.client.get(f"{MOODLE_BASE}/user/profile.php")
        if resp.status_code != 200:
            return []

        soup = self._soup(resp.text)
        seen = set()
        for link in soup.select(".profile_tree a[href*='/course/view.php?id='], .node_category a[href*='/course/view.php?id=']"):
            href = link.get("href", "")
            match = re.search(r"id=(\d+)", href)
            if match:
                cid = int(match.group(1))
                if cid not in seen and cid > 1:
                    seen.add(cid)
                    courses.append({
                        "moodle_id": cid,
                        "name": link.get_text(strip=True),
                        "short_name": "",
                        "teacher": None,
                        "progress": 0,
                        "raw_data": {},
                    })
        return courses

    async def _get_courses_api(self) -> List[Dict]:
        """Cursos via token da API REST."""
        try:
            resp = await self.client.post(
                f"{MOODLE_BASE}/webservice/rest/server.php",
                data={
                    "wstoken": self.token,
                    "wsfunction": "core_enrol_get_users_courses",
                    "moodlewsrestformat": "json",
                    "userid": await self._get_user_id_api(),
                },
            )
            data = resp.json()
            if isinstance(data, list):
                return [
                    {
                        "moodle_id": c["id"],
                        "name": c["fullname"],
                        "short_name": c.get("shortname", ""),
                        "progress": c.get("progress", 0) or 0,
                        "raw_data": c,
                    }
                    for c in data
                ]
        except Exception:
            pass
        return []

    async def _get_user_id_api(self) -> Optional[int]:
        if self.moodle_user_id:
            return self.moodle_user_id
        try:
            resp = await self.client.post(
                f"{MOODLE_BASE}/webservice/rest/server.php",
                data={
                    "wstoken": self.token,
                    "wsfunction": "core_webservice_get_site_info",
                    "moodlewsrestformat": "json",
                },
            )
            data = resp.json()
            self.moodle_user_id = data.get("userid")
            return self.moodle_user_id
        except Exception:
            return None

    # ─────────────────────────────────────────────────────────────
    # MÓDULO: Conteúdo e Materiais do Curso
    # ─────────────────────────────────────────────────────────────

    async def get_course_content(self, moodle_course_id: int) -> Dict:
        """Extrai todos os tópicos, materiais, PDFs e atividades de uma disciplina.
        Compatível com Moodle 3.x e 4.x. Percorre seção por seção para
        capturar conteúdo colapsado/lazy-load."""
        activities = []
        materials = []
        teacher_name = None
        course_title = None
        collection_complete = False

        try:
            # 1. Página principal (professor + título)
            course_url = f"{MOODLE_BASE}/course/view.php?id={moodle_course_id}"
            resp = await self.client.get(course_url)
            if resp.status_code != 200:
                return {
                    "activities": [], "materials": [], "teacher": None,
                    "course_title": None, "collection_complete": False,
                }

            soup = self._soup(resp.text)

            teacher_el = soup.select_one(
                ".teachers, .teacher, .instructors, [data-region='teacher'], "
                ".course-teacher, .teachers-list"
            )
            teacher_name = teacher_el.get_text(strip=True) if teacher_el else None

            heading_el = soup.select_one(".page-header-headings h1, .coursename, h1.course-title")
            course_title = heading_el.get_text(strip=True) if heading_el else None

            # 2. Detecta quantas seções existem (links de navegação de seção)
            section_links = soup.select(
                "li[id^='section-'], [data-region='section'], .section, .course-section"
            )
            num_sections = len(section_links)
            if num_sections == 0:
                nav_matches = re.findall(r"[?&]section=(\d+)", resp.text)
                if nav_matches:
                    num_sections = max(int(m) for m in nav_matches) + 1

            seen_ids = set()
            all_pages = [(soup, 0)]

            # 3. Busca seção por seção (captura conteúdo lazy/colapsado do 4.x)
            if num_sections > 1:
                for sec in range(min(num_sections, 20)):
                    try:
                        sec_resp = await self.client.get(
                            f"{MOODLE_BASE}/course/view.php?id={moodle_course_id}&section={sec}"
                        )
                        if sec_resp.status_code == 200:
                            all_pages.append((self._soup(sec_resp.text), sec))
                    except Exception:
                        continue

            for page_soup, page_sec in all_pages:
                sections = page_soup.select(
                    "[data-region='section'], li.section, li[id^='section-'], "
                    ".section, .course-section, .topics > li, .weeks > li, [data-sectionid]"
                )
                if not sections:
                    sections = [page_soup.select_one("#region-main") or page_soup]

                for sec_idx, section in enumerate(sections):
                    topic_title_el = section.select_one(
                        ".sectionname, .section-title, h3.sectionname, .title, "
                        ".course-section-header, [data-region='section-header']"
                    )
                    topic_name = (
                        topic_title_el.get_text(strip=True)
                        if topic_title_el else f"Tópico {sec_idx + 1}"
                    )

                    # Seletores Moodle 4.x + legados
                    modules = section.select(
                        "[data-module-id], .activity-item, "
                        ".activity, .modtype_assign, .modtype_quiz, .modtype_forum, "
                        ".modtype_resource, .modtype_url, .modtype_page, "
                        ".modtype_folder, .modtype_label, .modtype_workshop, "
                        ".modtype_lesson, .modtype_book, .modtype_glossary"
                    )

                    for mod in modules:
                        link_el = mod.select_one("a[href]")
                        href = link_el.get("href", "") if link_el else ""

                        classes = " ".join(mod.get("class", []))
                        data_attrs = " ".join(f"{k}={v}" for k, v in mod.attrs.items() if isinstance(v, str))
                        mod_type = "resource"
                        for t in [
                            "assign", "quiz", "forum", "workshop", "resource", "url",
                            "page", "folder", "label", "lesson", "glossary", "book",
                            "choice", "feedback", "wiki", "scorm", "h5pactivity",
                        ]:
                            if (
                                f"modtype_{t}" in classes
                                or f"/mod/{t}/" in href
                                or f"mod-{t}" in data_attrs
                            ):
                                mod_type = t
                                break

                        is_activity = mod_type in {
                            "assign", "quiz", "forum", "workshop", "lesson",
                            "choice", "feedback", "scorm", "h5pactivity",
                        }

                        title_el = mod.select_one(
                            ".instancename, .activityname a, .activityname, "
                            ".activity-title, a.aalink span, a"
                        )
                        title = ""
                        if title_el:
                            title = title_el.get_text(" ", strip=True)
                            title = re.sub(r"\s+", " ", title).strip()
                        elif link_el:
                            title = link_el.get_text(strip=True)
                        elif mod_type == "label":
                            title = mod.get_text(strip=True)[:80] or "Aviso / Texto"

                        # remove sufixo de tipo que o Moodle 4 adiciona no instancename
                        title = re.sub(r"\s*(File|Arquivo|URL|Page|Página|Folder|Pasta)\s*$", "", title).strip()

                        if not title:
                            continue

                        content_el = mod.select_one(
                            ".contentafterlink, .summary, .description, "
                            "[data-region='activity-information'] .activity-description"
                        )
                        short_desc = content_el.get_text(strip=True) if content_el else ""

                        due_date = None
                        due_el = mod.select_one(
                            ".activity-dates, .duedate, "
                            "[data-region='activity-dates'], .badge[data-region='duedate']"
                        )
                        if due_el:
                            parsed = self._parse_moodle_date(due_el.get_text())
                            if parsed:
                                due_date = parsed.isoformat()

                        moodle_id_match = re.search(r"id=(\d+)", href)
                        mid = (
                            (moodle_id_match.group(1) if moodle_id_match else None)
                            or mod.get("data-module-id")
                            or str(page_sec * 1000 + sec_idx * 100 + len(activities))
                        )

                        if mid in seen_ids:
                            continue
                        seen_ids.add(mid)

                        full_url = (
                            href if href.startswith("http")
                            else f"{MOODLE_BASE}/{href.lstrip('/')}" if href else ""
                        )

                        # Conclusão: Moodle 4.x + legados
                        is_completed = bool(mod.select_one(
                            ".completionbadge img[alt*='Concluído'], .completionbadge img[alt*='Feito'], "
                            ".completionbadge img[alt*='Completo'], "
                            "img[alt*='Concluído'], img[alt*='Feito'], img[alt*='Finalizado'], "
                            "img[src*='completion-manual-y'], img[src*='completion-auto-y'], "
                            "img[src*='completed'], i.icon[aria-label*='Concluído'], "
                            "[data-action='toggle-completion'][aria-checked='true'], "
                            ".btn-toggle-completion[aria-pressed='true'], "
                            ".autocompletion-complete, .completion-state-completed, "
                            ".badge-success, .submitted, .submissionstatus-submitted"
                        ))

                        item = {
                            "moodle_id": str(mid),
                            "title": title,
                            "type": mod_type,
                            "is_activity": is_activity,
                            "url": full_url,
                            "description": short_desc,
                            "topic_name": topic_name,
                            "topic_number": sec_idx,
                            "due_date": due_date,
                            "status": "submitted" if is_completed else "pending",
                            "is_completed": is_completed,
                        }

                        if is_activity:
                            activities.append(item)
                        else:
                            materials.append(item)

            collection_complete = True

        except Exception as e:
            logger.error(f"Erro no scraping de conteúdo do curso {moodle_course_id}: {e}", exc_info=True)

        return {
            "activities": activities,
            "materials": materials,
            "teacher": teacher_name,
            "course_title": course_title,
            "collection_complete": collection_complete,
        }

    # ─────────────────────────────────────────────────────────────
    # MÓDULO: Detalhes Completos da Atividade (In-App Viewer)
    # ─────────────────────────────────────────────────────────────

    async def get_activity_full_details(self, activity_url: str, activity_type: str) -> Dict:
        """
        Lê e extrai todos os detalhes de uma atividade diretamente do Moodle
        para exibição completa dentro do aplicativo sem precisar sair.
        """
        details = {
            "title": "",
            "description_html": "",
            "description_text": "",
            "instructions": "",
            "due_date": None,
            "time_remaining": "",
            "submission_status": "pending",
            "submission_status_text": "Não enviado",
            "files": [],
            "feedback": "",
        }

        if not activity_url:
            return details

        try:
            resp = await self.client.get(activity_url)
            if resp.status_code != 200:
                return details

            soup = self._soup(resp.text)

            # Título da atividade
            title_el = soup.select_one(".page-header-headings h2, h2, .main-heading")
            if title_el:
                details["title"] = title_el.get_text(strip=True)

            # Descrição / Enunciado completo da tarefa
            intro_el = soup.select_one(
                "#intro, .activity-description, "
                "[data-region='activity-information'] .description, "
                "[data-region='activity-information'] .no-overflow"
            )
            if intro_el:
                details["description_html"] = str(intro_el)
                details["description_text"] = intro_el.get_text(separator="\n", strip=True)

            # Arquivos anexados pelo professor no enunciado. Não usamos
            # ``.fileuploadsubmission``: ela contém arquivos já enviados pelo
            # próprio aluno e misturá-los aqui exporia uma entrega anterior.
            file_links = intro_el.select("a[href*='pluginfile.php']") if intro_el else []
            for file_link in file_links:
                file_url = file_link.get("href", "")
                if file_url:
                    details["files"].append({
                        "name": file_link.get_text(strip=True) or "Arquivo Anexo",
                        "url": file_url,
                    })

            # Tabela de Status de Envio (Generaltable)
            rows = soup.select("table.generaltable tr, table.submissionstatustable tr")
            for row in rows:
                th = row.select_one("th, td.cell.c0")
                td = row.select_one("td.cell.c1, td:last-child")
                if not th or not td:
                    continue

                label = th.get_text(strip=True).lower()
                val = td.get_text(strip=True)

                if "status do envio" in label or "submission status" in label:
                    details["submission_status_text"] = val
                    if "enviado para avaliação" in val.lower() or "submitted" in val.lower():
                        details["submission_status"] = "submitted"
                    elif "rascunho" in val.lower():
                        details["submission_status"] = "draft"
                elif "data de entrega" in label or "due date" in label:
                    parsed_dt = self._parse_moodle_date(val)
                    if parsed_dt:
                        details["due_date"] = parsed_dt.isoformat()
                elif "tempo restante" in label or "time remaining" in label:
                    details["time_remaining"] = val
                    if "atrasado" in val.lower() or "overdue" in val.lower():
                        details["submission_status"] = "late"
                elif "comentários de feedback" in label or "feedback comments" in label:
                    details["feedback"] = val

        except Exception as e:
            logger.error(f"Erro ao extrair detalhes completos da atividade {activity_url}: {e}")

        return details
