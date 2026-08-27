"use client";

import { Fragment, ReactNode } from "react";

/**
 * Renderizador Markdown minimalista e seguro (sem dangerouslySetInnerHTML).
 * Suporta: headings, bold, italic, code inline, blocos de código,
 * listas (- e 1.), links, blockquotes e quebras de linha.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last, match.index)}</Fragment>);
    }
    if (match[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`} className="font-bold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <em key={`${keyPrefix}-i${i++}`} className="italic">
          {match[3]}
        </em>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i++}`}
          className="px-1.5 py-0.5 rounded-md bg-white/10 text-indigo-300 text-[0.85em] font-mono"
        >
          {match[4]}
        </code>
      );
    } else if (match[5] !== undefined && match[6]) {
      let safeHref: string | null = null;
      try {
        const parsed = new URL(match[6]);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          safeHref = parsed.toString();
        }
      } catch {
        // Links gerados pela IA devem ser absolutos e HTTP(S).
      }
      if (!safeHref) {
        nodes.push(<Fragment key={`${keyPrefix}-a${i++}`}>{match[5]}</Fragment>);
        last = match.index + match[0].length;
        continue;
      }
      nodes.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={safeHref}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          {match[5]}
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

export default function Markdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
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
          className="my-2 p-3 rounded-xl bg-black/40 border border-white/10 overflow-x-auto"
        >
          <code className="text-xs text-emerald-300 font-mono whitespace-pre">
            {codeLines.join("\n")}
          </code>
        </pre>
      );
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = ["text-lg", "text-base", "text-sm", "text-sm"];
      blocks.push(
        <div key={key++} className={`mt-3 mb-1 font-bold text-white ${sizes[level - 1]} first:mt-0`}>
          {renderInline(hMatch[2], `h${key}`)}
        </div>
      );
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
          className="my-2 pl-3 border-l-2 border-indigo-500/50 text-gray-300"
        >
          {renderInline(quoteLines.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Lista não-ordenada
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1.5 space-y-1 list-disc list-outside ml-4">
          {items.map((item, j) => (
            <li key={j} className="pl-0.5">{renderInline(item, `ul${key}-${j}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Lista ordenada
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-1.5 space-y-1 list-decimal list-outside ml-4">
          {items.map((item, j) => (
            <li key={j} className="pl-0.5">{renderInline(item, `ol${key}-${j}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Linha vazia
    if (!line.trim()) {
      blocks.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Parágrafo normal (consome linhas até próxima estrutura)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trimStart().startsWith("> ") &&
      !lines[i].trim().startsWith("```")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(paraLines.join(" "), `p${key}`)}
      </p>
    );
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
