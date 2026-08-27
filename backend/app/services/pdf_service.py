"""Serviço para geração de PDFs de rascunhos de resposta de atividades."""

import re
from datetime import date

from fpdf import FPDF


def _pdf_text(value: str) -> str:
    """Normaliza texto para as fontes internas (Latin-1) do fpdf2.

    O Moodle e os provedores de IA normalmente retornam travessões, aspas
    tipográficas, marcadores e emojis. As fontes internas do FPDF não suportam
    esses caracteres e lançam exceção ao gerar o arquivo. Mantemos acentos do
    português e substituímos apenas o que não é representável em Latin-1.
    """
    text = str(value or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.translate(str.maketrans({
        "–": "-", "—": "-", "−": "-", "•": "-", "◦": "-",
        "“": '"', "”": '"', "„": '"', "’": "'", "‘": "'",
        "…": "...", "→": "->", "⇒": "=>", "✓": "OK",
    }))
    text = text.encode("latin-1", errors="replace").decode("latin-1")
    return re.sub(r"[ \t]+\n", "\n", text).strip()


def _write_paragraphs(pdf: FPDF, text: str, line_height: float = 5) -> None:
    """Escreve parágrafos preservando quebras sem deixar linhas em branco inválidas."""
    for line in _pdf_text(text).split("\n"):
        pdf.multi_cell(0, line_height, line or " ")


def generate_activity_response_pdf(
    activity_title: str,
    activity_type: str,
    description: str,
    course_name: str,
    user_name: str,
    answers: str,
    extra_context: str = "",
    source_summary: str = "",
) -> bytes:
    """Gera um PDF formatado com um rascunho de resposta da atividade.

    O PDF inclui:
    - Cabeçalho com nome do usuário, disciplina e título da atividade
    - O enunciado/descrição da atividade
    - As respostas geradas pela IA
    - Formatação acadêmica simples
    """
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    # --- Cores e estilos ---
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _pdf_text("IFNMG - Instituto Federal do Norte de Minas Gerais"), new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Rascunho de Resposta da Atividade", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(6)

    # --- Metadados ---
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _pdf_text(f"Aluno: {user_name}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.cell(0, 7, _pdf_text(f"Disciplina: {course_name}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.cell(0, 7, _pdf_text(f"Atividade: {activity_title}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    if source_summary.strip():
        pdf.set_font("Helvetica", "I", 8)
        pdf.multi_cell(0, 4, _pdf_text(f"Base analisada: {source_summary}"))
        pdf.ln(2)

    # --- Enunciado ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Enunciado / Instrucoes:", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.set_font("Helvetica", "", 10)
    _write_paragraphs(pdf, description)
    pdf.ln(3)

    # --- Respostas ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, "Resposta sugerida (revisar antes de entregar):", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.set_font("Helvetica", "", 10)
    _write_paragraphs(pdf, answers)
    pdf.ln(3)

    # --- Contexto extra (opcional) ---
    if extra_context.strip():
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, "Contexto adicional:", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_font("Helvetica", "", 10)
        _write_paragraphs(pdf, extra_context)
        pdf.ln(3)

    # --- Rodapé ---
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 5, "Gerado pelo IFNMG Assistente - revise o conteudo antes de entregar.", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 5, f"Data: {date.today().strftime('%d/%m/%Y')}", new_x="LMARGIN", new_y="NEXT", align="C")

    output = pdf.output()
    return bytes(output)
