"use client";

import { Fragment, ReactNode } from "react";

/**
 * Renderizador Markdown minimalista, seguro e resiliente.
 * Suporta: headings, bold, italic, code inline, blocos de código,
 * listas não-ordenadas (múltiplos marcadores), listas ordenadas, checklists,
 * links, blockquotes, tabelas completas e quebras de linha entre tópicos.
 *
 * Sanitizações:
 * - Converte <br>, <br/>, <p>, <li> e quebras literais (\\n) para novas linhas reais
 * - Elimina tags HTML residuais e decodifica entidades (&nbsp;, &amp;, etc.)
 * - Trata tabelas markdown e descarta separadores órfãos (ex: | |---|---| |)
 * - Garante que tópicos e parágrafos com quebras de linha pulem linha visualmente
 */

function cleanContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/?(b|strong)>/gi, "**")
    .replace(/<\/?(i|em)>/gi, "*")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last, match.index)}</Fragment>);
    }
    if (match[2] !== undefined) {
      // Bold + Italic (***texto***)
      nodes.push(
        <strong key={`${keyPrefix}-bi${i++}`} className="font-bold italic text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // Bold (**texto**)
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`} className="font-bold text-white">
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      // Italic (*texto*)
      nodes.push(
        <em key={`${keyPrefix}-i${i++}`} className="italic text-neutral-200">
          {match[4]}
        </em>
      );
    } else if (match[5] !== undefined) {
      // Inline code (`código`)
      nodes.push(
        <code
          key={`${keyPrefix}-c${i++}`}
          className="px-1.5 py-0.5 rounded-md bg-white/10 text-emerald-300 text-[0.85em] font-mono"
        >
          {match[5]}
        </code>
      );
    } else if (match[6] !== undefined && match[7]) {
      // Link ([texto](url))
      let safeHref: string | null = null;
      try {
        const parsed = new URL(match[7]);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeHref = parsed.toString();
        }
      } catch {
        // Links devem ser HTTP(S) válidos
      }
      if (!safeHref) {
        nodes.push(<Fragment key={`${keyPrefix}-a${i++}`}>{match[6]}</Fragment>);
        last = match.index + match[0].length;
        continue;
      }
      nodes.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={safeHref}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
        >
          {match[6]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-tf`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

/** Renderiza texto multilinha inserindo <br /> nas quebras internas */
function renderWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split("\n");
  const nodes: ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (idx > 0) nodes.push(<br key={`${keyPrefix}-br-${idx}`} />);
    nodes.push(...renderInline(part, `${keyPrefix}-l${idx}`));
  });
  return nodes;
}

/** Verifica se uma linha é separador de tabela markdown (|---|---|) */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.includes("|") &&
    /^\|?[\s|:=-]+\|?$/.test(trimmed) &&
    /[-=]{2,}/.test(trimmed)
  );
}

/** Extrai as células de uma linha de tabela */
function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  const cells = trimmed.split("|").map((cell) => cell.trim());
  while (cells.length > 0 && cells[0] === "") cells.shift();
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

/** Verifica se uma linha é uma linha de dados de tabela markdown válida */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (isTableSeparator(trimmed)) return false;
  if (!trimmed.includes("|")) return false;
  const cells = parseTableRow(trimmed);
  return cells.length >= 2;
}

export default function Markdown({ content }: { content: string }) {
  if (!content) return null;

  const normalized = cleanContent(content);
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bloco de código
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // fecha ```
      blocks.push(
        <pre
          key={key++}
          className="my-2.5 p-3 rounded-xl bg-black/40 border border-white/10 overflow-x-auto"
        >
          <code className="text-xs text-emerald-300 font-mono whitespace-pre">
            {codeLines.join("\n")}
          </code>
        </pre>
      );
      continue;
    }

    // Tabela markdown
    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && (isTableRow(lines[i]) || isTableSeparator(lines[i]))) {
        if (!isTableSeparator(lines[i])) {
          const cells = parseTableRow(lines[i]);
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
        i++;
      }

      if (rows.length > 0) {
        const [header, ...body] = rows;
        blocks.push(
          <div key={key++} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {header.map((cell, ci) => (
                    <th key={ci} className="px-3.5 py-2.5 text-left font-semibold text-white">
                      {renderInline(cell, `th${key}-${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              {body.length > 0 && (
                <tbody className="divide-y divide-white/[0.05]">
                  {body.map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3.5 py-2 text-neutral-300">
                          {renderInline(cell, `td${key}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        );
      }
      continue;
    }

    // Descarta separadores de tabela órfãos (ex: | |-------|-------------|------| |)
    if (isTableSeparator(line)) {
      i++;
      continue;
    }

    // Heading (#, ##, ###, ####)
    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = ["text-lg", "text-[15px]", "text-sm", "text-xs"];
      blocks.push(
        <div key={key++} className={`mt-4 mb-1.5 flex items-center gap-2 font-semibold text-white ${sizes[level - 1]} first:mt-0`}>
          {level <= 2 && <span className="h-4 w-0.5 rounded-full bg-emerald-400/70" />}
          {renderInline(hMatch[2], `h${key}`)}
        </div>
      );
      i++;
      continue;
    }

    // Linha horizontal
    if (/^\s*(---|___|\ *\*\*\*)\ *$/.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-0 border-t border-white/[0.07]" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2.5 rounded-r-lg border-l-2 border-emerald-500/50 bg-emerald-500/[0.03] px-3 py-2 text-neutral-300"
        >
          {renderWithBreaks(quoteLines.join("\n"), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Lista não-ordenada (suporta - * • ▪ ▫ – — ✦ ➢ ✓ ✔ e checklists [ ] / [x])
    if (/^\s*([-*•▪▫–—✦➢✓✔]|\([a-zA-Z\d]\))\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        if (/^\s*([-*•▪▫–—✦➢✓✔]|\([a-zA-Z\d]\))\s+/.test(curr)) {
          items.push(curr.replace(/^\s*([-*•▪▫–—✦➢✓✔]|\([a-zA-Z\d]\))\s+/, ""));
          i++;
        } else if (items.length > 0 && /^\s{2,}\S/.test(curr)) {
          items[items.length - 1] += "\n" + curr.trim();
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ul key={key++} className="my-2.5 ml-4 list-outside list-disc space-y-1.5 marker:text-emerald-400/70">
          {items.map((item, j) => {
            const taskMatch = item.match(/^\[([ xX])\]\s+(.*)$/);
            if (taskMatch) {
              const checked = taskMatch[1].toLowerCase() === "x";
              return (
                <li key={j} className="flex items-start gap-2 -ml-4 pl-0.5 leading-relaxed list-none text-neutral-300">
                  <span className={`inline-flex items-center justify-center w-3.5 h-3.5 mt-0.5 rounded border text-[10px] ${
                    checked ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-white/20 bg-white/5 text-transparent"
                  }`}>
                    ✓
                  </span>
                  <div className="flex-1">
                    {renderWithBreaks(taskMatch[2], `task${key}-${j}`)}
                  </div>
                </li>
              );
            }
            return (
              <li key={j} className="pl-0.5 leading-relaxed text-neutral-300">
                {renderWithBreaks(item, `ul${key}-${j}`)}
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    // Lista ordenada (1., 1), 1 -, 1.1, etc.)
    if (/^\s*(\d+(\.\d+)*[.)]|\d+\s*[-–—])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        if (/^\s*(\d+(\.\d+)*[.)]|\d+\s*[-–—])\s+/.test(curr)) {
          items.push(curr.replace(/^\s*(\d+(\.\d+)*[.)]|\d+\s*[-–—])\s+/, ""));
          i++;
        } else if (items.length > 0 && /^\s{2,}\S/.test(curr)) {
          items[items.length - 1] += "\n" + curr.trim();
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ol key={key++} className="my-2.5 ml-4 list-outside list-decimal space-y-1.5 marker:font-semibold marker:text-emerald-400/70">
          {items.map((item, j) => (
            <li key={j} className="pl-0.5 leading-relaxed text-neutral-300">
              {renderWithBreaks(item, `ol${key}-${j}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Linha vazia → espaçamento entre blocos
    if (!line.trim()) {
      blocks.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Parágrafo normal (consome linhas contínuas até próxima estrutura especial)
    // Mantém as quebras de linha originais para que tópicos pulem linha corretamente
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^\s*([-*•▪▫–—✦➢✓✔]|\([a-zA-Z\d]\))\s+/.test(lines[i]) &&
      !/^\s*(\d+(\.\d+)*[.)]|\d+\s*[-–—])\s+/.test(lines[i]) &&
      !lines[i].trimStart().startsWith("> ") &&
      !lines[i].trim().startsWith("```") &&
      !isTableRow(lines[i]) &&
      !isTableSeparator(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-6 text-neutral-300">
        {paraLines.map((pLine, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(pLine, `p${key}-${idx}`)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}
