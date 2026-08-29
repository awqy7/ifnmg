"""Smoke test responsivo contra o build local com API simulada.

Uso: python tests/mobile_viewport_smoke.py
Requer `next start` em http://127.0.0.1:3000 e Playwright Python.
"""
import json

from playwright.sync_api import sync_playwright


def api_response(url: str):
    if url.endswith("/api/auth/me"):
        return {
            "id": "mobile-test",
            "name": "Estudante Teste",
            "email": "teste@virtual2.ifnmg.edu.br",
            "moodle_connected": True,
            "moodle_last_sync": None,
            "ai_provider": "groq",
            "theme": "dark",
        }
    if "/api/briefing/today" in url:
        return {"content": "Tudo pronto para estudar hoje."}
    if "/api/schedule/today" in url:
        return {"day": "Hoje", "slots": []}
    if "/api/notifications/unread-count" in url:
        return {"count": 0}
    if "/api/activities/summary" in url:
        return {}
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
            }
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
            "description": "Leia as orientações e responda às questões propostas.",
            "files": [],
        }
    return []


def main():
    viewports = [(320, 568), (375, 667), (430, 932), (844, 390)]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for width, height in viewports:
                print(f"Testando {width}x{height}...", flush=True)
                page = browser.new_page(viewport={"width": width, "height": height})
                page.add_init_script("localStorage.setItem('ifnmg_token', 'mobile-smoke-token')")

                def route_api(route):
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps(api_response(route.request.url)),
                    )

                page.route("**/api/**", route_api)
                page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")
                page.get_by_role("navigation", name="Navegação principal").wait_for(state="visible")

                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
                )
                assert not overflow, f"overflow horizontal em {width}x{height}"
                main_width = page.locator("main").evaluate("element => element.clientWidth")
                assert main_width >= width - 1, (
                    f"conteúdo comprimido em {width}x{height}: main={main_width}px"
                )

                page.locator("nav.mobile-bottom-nav button").filter(has_text="Tarefas").click()
                page.get_by_role("heading", name="Atividades & Tarefas").wait_for(state="visible")

                # Todos os filtros precisam estar visíveis sem rolagem horizontal oculta.
                for label in ["Todas", "Pendentes", "Entregues", "Atrasadas"]:
                    button = page.get_by_role("button", name=label, exact=True)
                    button.wait_for(state="visible")
                    box = button.bounding_box()
                    assert box and box["x"] >= 0 and box["x"] + box["width"] <= width

                # O visualizador global também deve caber e fechar no menor viewport.
                page.get_by_text("Atividade de teste responsivo", exact=True).click()
                page.get_by_role("dialog").wait_for(state="visible")
                dialog = page.get_by_role("dialog").bounding_box()
                assert dialog and dialog["x"] >= 0 and dialog["x"] + dialog["width"] <= width
                page.get_by_role("button", name="Fechar atividade").click()

                page.get_by_role("button", name="Abrir todas as opções").click()
                page.wait_for_timeout(400)
                aside = page.locator("aside").bounding_box()
                assert aside and aside["x"] >= 0, f"drawer não abriu em {width}x{height}"
                page.close()
        finally:
            browser.close()

    print(f"OK: {len(viewports)} viewports móveis sem overflow e com navegação funcional")


if __name__ == "__main__":
    main()
