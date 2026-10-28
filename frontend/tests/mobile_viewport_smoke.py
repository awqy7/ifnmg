"""Smoke test responsivo contra o build local com API simulada.

Uso: python tests/mobile_viewport_smoke.py
Requer `next start` em http://127.0.0.1:3000 e Playwright Python.
"""
import json
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright


def api_response(url: str):
    if url.endswith("/api/auth/me"):
        return {
            "id": "mobile-test",
            "name": "Estudante Teste",
            "email": "teste@virtual2.ifnmg.edu.br",
            "moodle_connected": True,
            "moodle_last_sync": datetime.now(timezone.utc).isoformat(),
            "ai_provider": "groq",
            "theme": "dark",
        }
    if "/api/briefing/today" in url:
        return {"content": "Tudo pronto para estudar hoje."}
    if url.endswith("/api/dashboard"):
        return {
            "briefing": {
                "content": "Priorize a atividade de teste e reserve um bloco de estudo focado.",
                "metrics": {"courses": 1, "pending": 1, "late": 0, "due_24h": 0},
                "top_priority": {
                    "id": "atividade-mobile",
                    "title": "Atividade de teste responsivo",
                    "course_name": "Disciplina de teste",
                    "status": "pending",
                    "due_date": "2030-12-31T23:59:00",
                },
                "study_plan": [
                    {
                        "id": "atividade-mobile",
                        "label": "Avançar em Atividade de teste responsivo",
                        "course_name": "Disciplina de teste",
                        "minutes": 40,
                    }
                ],
            },
            "pending_activities": [
                {
                    "id": "atividade-mobile",
                    "title": "Atividade de teste responsivo",
                    "type": "assignment",
                    "status": "pending",
                    "course_id": "curso-mobile",
                    "course_name": "Disciplina de teste",
                    "due_date": "2030-12-31T23:59:00",
                }
            ],
            "courses": [
                {
                    "id": "curso-mobile",
                    "name": "Disciplina de teste",
                    "teacher": "Prof. Teste",
                    "pending_activities": 1,
                }
            ],
        }
    if "/api/notifications/unread-count" in url:
        return {"count": 0}
    if "/api/notifications/settings" in url:
        return {
            "new_activity": True,
            "deadline_7d": True,
            "deadline_3d": True,
            "deadline_1d": True,
            "deadline_6h": True,
            "daily_briefing": True,
            "quiet_start": "22:00",
            "quiet_end": "07:00",
        }
    if "/api/notifications" in url:
        return []
    if "/api/activities/summary" in url:
        return {}
    if "/manual-completion" in url:
        return {
            "status": "manual_completed",
            "status_source": "manual",
            "manual_completed_at": "2026-09-01T12:00:00",
            "manual_completion_reason": "group_member_submitted",
            "is_group_activity": True,
        }
    if url.endswith("/api/activities"):
        return [
            {
                "id": "atividade-mobile",
                "title": "Atividade de teste responsivo",
                "type": "assignment",
                "status": "pending",
                "course_id": "curso-mobile",
                "course_name": "Disciplina de teste",
                "course_color": "#6366f1",
                "due_date": "2030-12-31T23:59:00",
            },
            {
                "id": "atividade-entregue",
                "title": "Atividade ja entregue",
                "type": "assignment",
                "status": "submitted",
                "course_id": "curso-mobile",
                "course_name": "Disciplina de teste",
                "course_color": "#6366f1",
                "due_date": "2030-11-30T23:59:00",
            },
            {
                "id": "atividade-atrasada",
                "title": "Atividade atrasada",
                "type": "assignment",
                "status": "late",
                "course_id": "curso-mobile",
                "course_name": "Disciplina de teste",
                "course_color": "#6366f1",
                "due_date": "2020-01-01T23:59:00",
            },
        ]
    if url.endswith("/api/activities/atividade-mobile/details"):
        return {
            "id": "atividade-mobile",
            "title": "Atividade de teste responsivo",
            "type": "assignment",
            "status": "pending",
            "status_text": "Pendente",
            "course_id": "curso-mobile",
            "course_name": "Disciplina de teste",
            "course_color": "#6366f1",
            "due_date": "2030-12-31T23:59:00",
            "description": "Leia as orientacoes e responda as questoes propostas.",
            "files": [],
        }
    if "/api/courses/curso-mobile/materials" in url:
        return [
            {
                "id": "material-mobile",
                "title": "Material de teste responsivo",
                "topic_name": "Tópico de teste",
                "has_text": False,
                "downloadable": False,
                "files": [],
            }
        ]
    if "/api/courses" in url:
        return [
            {
                "id": "curso-mobile",
                "name": "Disciplina de teste",
                "teacher": "Prof. Teste",
                "pending_activities": 1,
            }
        ]
    if "/api/chat/sessions/sessao-mobile/messages" in url:
        return []
    if "/api/chat/sessions" in url:
        return [
            {
                "id": "sessao-mobile",
                "title": "Conversa de teste",
                "created_at": "2026-10-28T12:00:00",
            }
        ]
    if "/api/moodle/sync/status" in url:
        return {"running": False}
    if "/api/moodle/sync" in url:
        return {"ok": True}
    if "/api/auth/websocket-ticket" in url:
        return {"ticket": "test-ticket", "expires_in": 60}
    return []


def main():
    viewports = [(320, 568), (375, 667), (430, 932), (844, 390)]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for width, height in viewports:
                print(f"Testando {width}x{height}...", flush=True)
                page = browser.new_page(viewport={"width": width, "height": height})
                page_errors: list[str] = []
                page.on("pageerror", lambda error: page_errors.append(str(error)))

                def route_api(route):
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps(api_response(route.request.url)),
                    )

                page.route("**/api/**", route_api)
                page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")

                # Wait for bottom nav to be visible
                page.get_by_role(
                    "navigation", name="Navegação principal"
                ).wait_for(state="visible", timeout=10000)

                # 1) No horizontal overflow
                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
                )
                assert not overflow, f"overflow horizontal em {width}x{height}"

                # 2) Main content uses available width
                main_width = page.locator("main").evaluate(
                    "element => element.clientWidth"
                )
                assert main_width >= width - 1, (
                    f"conteudo comprimido em {width}x{height}: main={main_width}px"
                )

                # 3) TopBar and manual sync stay visible while scrolling
                page.locator("main > div").evaluate(
                    "element => element.style.paddingBottom = '1200px'"
                )
                page.locator("main").evaluate(
                    "element => { element.scrollTop = 300; element.dispatchEvent(new Event('scroll')); }"
                )
                page.wait_for_timeout(400)
                assert page.locator("header").evaluate(
                    "element => element.clientHeight"
                ) > 0, "TopBar should remain visible"
                assert page.get_by_role("button", name="Sincronizar dados").is_visible()

                # 4) Navigate to Atividades via bottom nav
                page.locator("nav[aria-label='Navegação principal'] button").filter(has_text="Tarefas").click()
                page.get_by_role("heading", name="Atividades").wait_for(
                    state="visible"
                )

                # 5) Activity cards render with correct order
                titles = page.locator("main h3").all_text_contents()
                assert len(titles) >= 2, f"Expected at least 2 activities, got {titles}"
                assert "Atividade atrasada" in titles[0]
                assert "Atividade de teste responsivo" in titles[1]
                assert "Atividade ja entregue" in titles[2]

                # 6) Manual group delivery is explicit and reversible
                pending_card = page.locator("article").filter(
                    has_text="Atividade de teste responsivo"
                ).first
                pending_card.get_by_role("button", name="Marcar como entregue").click()
                page.get_by_role("heading", name="Confirmar entrega do grupo").wait_for(state="visible")
                page.keyboard.press("Escape")
                assert page.get_by_role("heading", name="Confirmar entrega do grupo").count() == 0
                pending_card.get_by_role("button", name="Marcar como entregue").click()
                page.get_by_role("heading", name="Confirmar entrega do grupo").wait_for(state="visible")
                page.get_by_role("button", name="Confirmar entrega").click()
                page.get_by_text("Grupo entregou", exact=True).first.wait_for(state="visible")

                # 7) Filters are present and actually filter the list
                for label in ["Todas", "Vencidas", "Pendentes", "Concluídas"]:
                    assert (
                        page.locator("main button").filter(has_text=label).count() > 0
                    ), f"Expected filter button '{label}'"
                page.locator("main button").filter(has_text="Vencidas").first.click()
                assert page.get_by_text("Atividade atrasada", exact=True).is_visible()
                assert page.get_by_text("Atividade de teste responsivo", exact=True).count() == 0
                page.locator("main button").filter(has_text="Todas").first.click()

                # 8) Course name badge is visible
                assert page.get_by_text("Disciplina de teste", exact=True).first.is_visible()

                # 9) Activity modal opens and fits viewport
                page.get_by_text("Atividade de teste responsivo", exact=True).first.click()
                page.get_by_role("dialog").wait_for(state="visible")
                dialog = page.get_by_role("dialog").bounding_box()
                assert dialog and dialog["x"] >= 0 and dialog["x"] + dialog["width"] <= width
                for _ in range(8):
                    page.keyboard.press("Tab")
                assert page.evaluate(
                    "Boolean(document.activeElement?.closest('[role=\"dialog\"]'))"
                ), "focus escapou do modal"
                page.keyboard.press("Escape")
                page.get_by_role("dialog").wait_for(state="hidden")
                page.get_by_text("Atividade de teste responsivo", exact=True).first.click()
                page.get_by_role("dialog").wait_for(state="visible")
                page.get_by_role("button", name="Fechar modal").click()
                page.wait_for_timeout(300)

                # 10) All main views render
                page.locator("nav[aria-label='Navegação principal'] button").filter(has_text="Matérias").click()
                page.get_by_role("heading", name="Disciplinas").wait_for(state="visible")
                assert page.get_by_text("Disciplina de teste", exact=True).first.is_visible()
                assert page.get_by_text("Material de teste responsivo", exact=True).first.is_visible()

                page.locator("nav[aria-label='Navegação principal'] button").filter(has_text="Tutor IA").click()
                page.get_by_placeholder("Pergunte sobre prazos, PDFs ou matérias...").wait_for(state="visible")
                assert page.get_by_text("Seu contexto acadêmico", exact=True).is_visible()

                page.locator("nav[aria-label='Navegação principal'] button").filter(has_text="Início").click()
                page.get_by_role("button", name="Notificações").click()
                page.get_by_text("Nenhuma notificação por aqui.", exact=True).wait_for(state="visible")
                page.keyboard.press("Escape")
                assert page.get_by_text("Nenhuma notificação por aqui.", exact=True).count() == 0

                page.get_by_role("button", name="Abrir todas as opções").click()
                page.locator("aside").get_by_role("button", name="Estudo", exact=True).click()
                page.get_by_role("heading", name="Estudo").wait_for(state="visible")

                page.get_by_role("button", name="Abrir todas as opções").click()
                page.locator("aside").get_by_role("button", name="Configurações", exact=True).click()
                page.get_by_role("heading", name="Configurações").wait_for(state="visible")
                assert page.locator("main").get_by_text("Estudante Teste", exact=True).is_visible()
                assert page.locator("main").get_by_text("Virtual2 conectado", exact=True).first.is_visible()
                notif_switch = page.get_by_role("switch", name="Novas tarefas publicadas")
                before_switch = notif_switch.get_attribute("aria-checked")
                notif_switch.focus()
                page.keyboard.press("Space")
                assert notif_switch.get_attribute("aria-checked") != before_switch

                page.get_by_role("button", name="Abrir todas as opções").click()
                page.locator("aside").get_by_role("button", name="Início", exact=True).click()
                page.wait_for_timeout(300)

                # 11) Slide-out drawer opens and fits viewport
                page.get_by_role("button", name="Abrir todas as opções").click()
                page.wait_for_timeout(400)
                aside = page.locator("aside").bounding_box()
                assert aside and aside["x"] >= 0, f"drawer nao abriu em {width}x{height}"

                # 12) Screenshot for visual check
                page.screenshot(
                    path=f"tests/screenshot_{width}x{height}.png", full_page=False
                )
                print(f"  screenshot salvo: tests/screenshot_{width}x{height}.png")

                assert not page_errors, f"erros de runtime em {width}x{height}: {page_errors}"
                page.close()
        finally:
            browser.close()

    print(f"\nOK: {len(viewports)} viewports moveis sem overflow e com navegacao funcional")


if __name__ == "__main__":
    main()
