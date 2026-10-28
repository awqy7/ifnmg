"""Smoke test desktop contra o build local com API simulada.

Uso: python tests/desktop_viewport_smoke.py
Requer `next start` em http://127.0.0.1:3000 e Playwright Python.
"""
import json

from playwright.sync_api import sync_playwright

from mobile_viewport_smoke import api_response


def main():
    viewports = [(1024, 768), (1280, 800), (1440, 900)]
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

                aside = page.locator("aside")
                aside.get_by_role("button", name="Início", exact=True).wait_for(
                    state="visible", timeout=10000
                )

                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
                )
                assert not overflow, f"overflow horizontal em {width}x{height}"
                main_width = page.locator("main").evaluate(
                    "element => element.clientWidth"
                )
                assert main_width >= width - 320, (
                    f"conteudo comprimido em {width}x{height}: main={main_width}px"
                )

                aside.get_by_role("button", name="Atividades", exact=True).click()
                page.get_by_role("heading", name="Atividades").wait_for(state="visible")

                aside.get_by_role("button", name="Disciplinas", exact=True).click()
                page.get_by_role("heading", name="Disciplinas").wait_for(state="visible")
                assert page.get_by_text("Disciplina de teste", exact=True).first.is_visible()
                assert page.get_by_text("Material de teste responsivo", exact=True).first.is_visible()

                aside.get_by_role("button", name="Chat IA", exact=True).click()
                page.get_by_placeholder("Pergunte sobre prazos, PDFs ou matérias...").wait_for(
                    state="visible"
                )
                assert page.get_by_text("Seu contexto acadêmico", exact=True).is_visible()

                aside.get_by_role("button", name="Estudo", exact=True).click()
                page.get_by_role("heading", name="Estudo").wait_for(state="visible")

                aside.get_by_role("button", name="Configurações", exact=True).click()
                page.get_by_role("heading", name="Configurações").wait_for(state="visible")
                assert page.locator("main").get_by_text("Estudante Teste", exact=True).is_visible()
                notif_switch = page.get_by_role("switch", name="Novas tarefas publicadas")
                before_switch = notif_switch.get_attribute("aria-checked")
                notif_switch.focus()
                page.keyboard.press("Space")
                assert notif_switch.get_attribute("aria-checked") != before_switch

                aside.get_by_role("button", name="Início", exact=True).click()
                page.get_by_role("button", name="Notificações").click()
                page.get_by_text("Nenhuma notificação por aqui.", exact=True).wait_for(
                    state="visible"
                )
                page.keyboard.press("Escape")
                assert page.get_by_text("Nenhuma notificação por aqui.", exact=True).count() == 0

                aside.get_by_role("button", name="Atividades", exact=True).click()
                page.get_by_role("heading", name="Atividades").wait_for(state="visible")
                page.get_by_text("Atividade de teste responsivo", exact=True).first.click()
                page.get_by_role("dialog").wait_for(state="visible")
                dialog = page.get_by_role("dialog").bounding_box()
                assert dialog and dialog["x"] >= 0 and dialog["x"] + dialog["width"] <= width
                assert dialog["y"] >= 0 and dialog["y"] + dialog["height"] <= height
                page.keyboard.press("Escape")
                page.get_by_role("dialog").wait_for(state="hidden")

                aside.get_by_role("button", name="Início", exact=True).click()
                page.get_by_role("button", name="Recolher menu").click()
                page.wait_for_timeout(400)
                collapsed = aside.bounding_box()
                assert collapsed and collapsed["width"] <= 90, (
                    f"menu recolhido com largura inesperada: {collapsed}"
                )
                page.get_by_role("button", name="Expandir menu").click()
                page.wait_for_timeout(400)
                expanded = aside.bounding_box()
                assert expanded and expanded["width"] >= 260, (
                    f"menu expandido com largura inesperada: {expanded}"
                )

                page.screenshot(
                    path=f"tests/desktop_screenshot_{width}x{height}.png", full_page=False
                )
                print(f"  screenshot salvo: tests/desktop_screenshot_{width}x{height}.png")

                assert not page_errors, f"erros de runtime em {width}x{height}: {page_errors}"
                page.close()
        finally:
            browser.close()

    print(f"\nOK: {len(viewports)} viewports desktop sem overflow e com navegacao funcional")


if __name__ == "__main__":
    main()
