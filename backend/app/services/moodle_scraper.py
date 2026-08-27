"""
Scraper avançado e completo do Moodle IFNMG.
Extrai 100% dos cursos (via Overview, AJAX Timeline, Dashboard e Perfil),
além de todos os tópicos, materiais, atividades detalhadas, notas e eventos de calendário.
"""
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
    def __init__(self, client: httpx.AsyncClient, moodle_token: Optional[str] = None):
        self.client = client
        self.token = moodle_token

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
        Cruza dados do Boletim Geral (/grade/report/overview), AJAX Timeline, Dashboard e Perfil.
        """
        courses_by_id: Dict[int, Dict] = {}

        # 1. Fonte Principal: Boletim Geral de Notas (/grade/report/overview/index.php)
        try:
            overview_courses = await self._get_courses_from_grade_overview()
            for c in overview_courses:
                courses_by_id[c["moodle_id"]] = c
            logger.info(f"Fonte Boletim Geral: {len(overview_courses)} cursos encontrados")
        except Exception as e:
            logger.warning(f"Falha ao ler Boletim Geral: {e}")

        # 2. Fonte AJAX: Moodle Timeline API (/lib/ajax/service.php)
        try:
            ajax_courses = await self._get_courses_from_ajax_timeline()
            for c in ajax_courses:
                mid = c["moodle_id"]
                if mid in courses_by_id:
                    courses_by_id[mid].update({k: v for k, v in c.items() if v})
                else:
                    courses_by_id[mid] = c
            logger.info(f"Fonte AJAX Timeline: {len(ajax_courses)} cursos encontrados")
        except Exception as e:
            logger.warning(f"Falha no AJAX Timeline: {e}")

        # 3. Fonte Dashboard: /my/
        try:
            dashboard_courses = await self._get_courses_from_dashboard()
            for c in dashboard_courses:
                mid = c["moodle_id"]
                if mid in courses_by_id:
                    courses_by_id[mid].update({k: v for k, v in c.items() if v})
                else:
                    courses_by_id[mid] = c
            logger.info(f"Fonte Dashboard /my/: {len(dashboard_courses)} cursos encontrados")
        except Exception as e:
            logger.warning(f"Falha no Dashboard /my/: {e}")

        # 4. Fonte Perfil: /user/profile.php
        try:
            profile_courses = await self._get_courses_from_user_profile()
            for c in profile_courses:
                mid = c["moodle_id"]
                if mid not in courses_by_id:
                    courses_by_id[mid] = c
        except Exception as e:
            logger.warning(f"Falha no Perfil: {e}")

        # 5. Fonte API REST (se token estiver disponível)
        if self.token:
            try:
                api_courses = await self._get_courses_api()
                for c in api_courses:
                    mid = c["moodle_id"]
                    if mid in courses_by_id:
                        courses_by_id[mid].update({k: v for k, v in c.items() if v})
                    else:
                        courses_by_id[mid] = c
            except Exception as e:
                logger.warning(f"Falha na API REST: {e}")

        # Atribui cores únicas
        result = list(courses_by_id.values())
        for idx, course in enumerate(result):
            course["color"] = COURSE_COLORS[idx % len(COURSE_COLORS)]

        logger.info(f"Total consolidado de disciplinas: {len(result)}")
        return result

    async def _get_courses_from_grade_overview(self) -> List[Dict]:
        """Lê o relatório geral de notas onde todos os cursos são listados pelo servidor."""
        courses = []
        resp = await self.client.get(f"{MOODLE_BASE}/grade/report/overview/index.php")
        if resp.status_code != 200:
            return []

        soup = self._soup(resp.text)
        # Seleciona links para cursos na tabela de notas
        links = soup.select(
            "table#overview-grade a[href*='course/view.php'], "
            ".generictable a[href*='course/view.php'], "
            "a[href*='/course/view.php?id=']"
        )
        seen = set()
        for link in links:
            href = link.get("href", "")
            match = re.search(r"id=(\d+)", href)
            if match:
                course_id = int(match.group(1))
                if course_id in seen or course_id <= 1:
                    continue
                seen.add(course_id)
                name = link.get_text(strip=True)
                if name and len(name) > 2:
                    courses.append({
                        "moodle_id": course_id,
                        "name": name,
                        "short_name": "",
                        "teacher": None,
                        "progress": 0,
                        "raw_data": {"source": "grade_overview"},
                    })
        return courses

    async def _get_courses_from_ajax_timeline(self) -> List[Dict]:
        """Usa o endpoint AJAX nativo do Moodle para buscar cursos da timeline."""
        courses = []
        # Primeiro pega a sesskey da página /my/
        my_resp = await self.client.get(f"{MOODLE_BASE}/my/")
        soup = self._soup(my_resp.text)
        
        sesskey = None
        sesskey_input = soup.find("input", {"name": "sesskey"})
        if sesskey_input:
            sesskey = sesskey_input.get("value")
        else:
            match = re.search(r'"sesskey":"([^"]+)"', my_resp.text)
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

    async def _get_courses_from_dashboard(self) -> List[Dict]:
        """Extrai cursos do HTML da página /my/."""
        courses = []
        resp = await self.client.get(f"{MOODLE_BASE}/my/")
        if resp.status_code != 200:
            return []

        soup = self._soup(resp.text)
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
            return data.get("userid")
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

        try:
            # 1. Página principal (professor + título)
            course_url = f"{MOODLE_BASE}/course/view.php?id={moodle_course_id}"
            resp = await self.client.get(course_url)
            if resp.status_code != 200:
                return {"activities": [], "materials": [], "teacher": None}

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

        except Exception as e:
            logger.error(f"Erro no scraping de conteúdo do curso {moodle_course_id}: {e}", exc_info=True)

        return {
            "activities": activities,
            "materials": materials,
            "teacher": teacher_name,
            "course_title": course_title,
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
            "grading_status_text": "Não avaliado",
            "grade": None,
            "max_grade": None,
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
                elif "status da avaliação" in label or "grading status" in label:
                    details["grading_status_text"] = val
                elif "data de entrega" in label or "due date" in label:
                    parsed_dt = self._parse_moodle_date(val)
                    if parsed_dt:
                        details["due_date"] = parsed_dt.isoformat()
                elif "tempo restante" in label or "time remaining" in label:
                    details["time_remaining"] = val
                    if "atrasado" in val.lower() or "overdue" in val.lower():
                        details["submission_status"] = "late"
                elif "nota" in label or "grade" in label:
                    match = re.search(r"(\d+[.,]?\d*)\s*/\s*(\d+[.,]?\d*)?", val)
                    if match:
                        try:
                            details["grade"] = float(match.group(1).replace(",", "."))
                            if match.group(2):
                                details["max_grade"] = float(match.group(2).replace(",", "."))
                        except Exception:
                            pass
                elif "comentários de feedback" in label or "feedback comments" in label:
                    details["feedback"] = val

        except Exception as e:
            logger.error(f"Erro ao extrair detalhes completos da atividade {activity_url}: {e}")

        return details

    # ─────────────────────────────────────────────────────────────
    # MÓDULO: Notas por Disciplina
    # ─────────────────────────────────────────────────────────────

    async def get_grades(self, moodle_course_id: int) -> List[Dict]:
        """Extrai todas as avaliações e notas do curso."""
        grades = []
        try:
            resp = await self.client.get(f"{MOODLE_BASE}/grade/report/user/index.php?id={moodle_course_id}")
            if resp.status_code != 200:
                return []

            soup = self._soup(resp.text)
            rows = soup.select("table.user-grade tr, .gradereport-user-wrapper table tr")
            for row in rows:
                cells = row.select("td, th")
                if len(cells) < 2:
                    continue

                item_name = cells[0].get_text(strip=True)
                if not item_name or item_name.lower() in ("item de avaliação", "nota", "avaliação", "total do curso"):
                    continue

                grade_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                max_text = cells[2].get_text(strip=True) if len(cells) > 2 else ""

                grade_num = None
                max_num = None
                try:
                    clean_g = re.search(r"(\d+[.,]?\d*)", grade_text)
                    if clean_g:
                        grade_num = float(clean_g.group(1).replace(",", "."))
                    clean_m = re.search(r"(\d+[.,]?\d*)", max_text)
                    if clean_m:
                        max_num = float(clean_m.group(1).replace(",", "."))
                except Exception:
                    pass

                feedback = cells[3].get_text(strip=True) if len(cells) > 3 else None

                grades.append({
                    "item_name": item_name,
                    "grade": grade_num,
                    "max_grade": max_num,
                    "percentage": round((grade_num / max_num * 100), 1) if (grade_num is not None and max_num) else None,
                    "feedback": feedback if feedback and feedback != "-" else None,
                })

        except Exception as e:
            logger.error(f"Erro ao extrair notas do curso {moodle_course_id}: {e}")

        return grades

    # ─────────────────────────────────────────────────────────────
    # MÓDULO: Calendário Acadêmico
    # ─────────────────────────────────────────────────────────────

    async def get_calendar_events(self) -> List[Dict]:
        """Extrai todos os eventos e datas limites do calendário."""
        events = []
        try:
            resp = await self.client.get(f"{MOODLE_BASE}/calendar/view.php?view=upcoming")
            if resp.status_code != 200:
                resp = await self.client.get(f"{MOODLE_BASE}/calendar/view.php?view=month")

            soup = self._soup(resp.text)
            event_blocks = soup.select(".event, .calendar-event-column, [data-event-id]")

            for ev in event_blocks:
                title_el = ev.select_one(".event-name, .name, a, h5, h4")
                if not title_el:
                    continue

                date_el = ev.select_one("time, .date, .calendar-event-date")
                parsed_date = None
                if date_el:
                    parsed_date = self._parse_moodle_date(date_el.get_text())

                desc_el = ev.select_one(".description, .content")
                desc = desc_el.get_text(strip=True) if desc_el else ""

                link = title_el.get("href", "") if title_el.name == "a" else ""

                events.append({
                    "moodle_id": ev.get("data-event-id") or str(len(events) + 1),
                    "title": title_el.get_text(strip=True),
                    "description": desc,
                    "event_type": "event",
                    "course_name": "",
                    "start_date": parsed_date.isoformat() if parsed_date else None,
                    "url": link if link.startswith("http") else f"{MOODLE_BASE}/{link.lstrip('/')}" if link else "",
                })

        except Exception as e:
            logger.error(f"Erro ao ler calendário: {e}")

        return events
