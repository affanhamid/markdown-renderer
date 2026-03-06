const INLINE_CODE_SPLIT_REGEX = /(`[^`]*`)/g;

function normalizeMathSegment(segment: string): string {
  let normalized = segment
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expr: string) => `$${expr.trim()}$`)
    .replace(/\\\[([^\n]+?)\\\]/g, (_match, expr: string) => `$${expr.trim()}$`);

  normalized = normalized.replace(/\$\$([^$\n]+?)\$\$/g, (match, expr: string, offset: number) => {
    const before = normalized.slice(0, offset);
    const after = normalized.slice(offset + match.length);
    if (!before.trim() && !after.trim()) {
      return `$$${expr.trim()}$$`;
    }
    return `$${expr.trim()}$`;
  });

  return normalized;
}

function normalizeInlineMathLine(line: string): string {
  const parts = line.split(INLINE_CODE_SPLIT_REGEX);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return normalizeMathSegment(part);
    })
    .join("");
}

export function normalizeMathMarkdownDelimiters(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const normalized: string[] = [];
  let inCodeFence = false;
  let inBracketMathBlock = false;
  let bracketMathBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inBracketMathBlock) {
        normalized.push("\\[");
        normalized.push(...bracketMathBuffer);
        inBracketMathBlock = false;
        bracketMathBuffer = [];
      }

      inCodeFence = !inCodeFence;
      normalized.push(line);
      continue;
    }

    if (inCodeFence) {
      normalized.push(line);
      continue;
    }

    if (inBracketMathBlock) {
      const closeIdx = line.indexOf("\\]");
      if (closeIdx !== -1) {
        const beforeClose = line.slice(0, closeIdx);
        if (beforeClose.trim()) {
          bracketMathBuffer.push(beforeClose.trimEnd());
        }

        normalized.push("$$");
        const mathContent = bracketMathBuffer.join("\n").trim();
        if (mathContent) {
          normalized.push(mathContent);
        }
        normalized.push("$$");

        inBracketMathBlock = false;
        bracketMathBuffer = [];

        const remainder = line.slice(closeIdx + 2);
        if (remainder.trim()) {
          normalized.push(normalizeInlineMathLine(remainder));
        }
      } else {
        bracketMathBuffer.push(line);
      }
      continue;
    }

    const openIdx = line.indexOf("\\[");
    if (openIdx !== -1) {
      const closeIdx = line.indexOf("\\]", openIdx + 2);
      if (closeIdx !== -1) {
        const expr = line.slice(openIdx + 2, closeIdx).trim();
        const before = line.slice(0, openIdx);
        const after = line.slice(closeIdx + 2);

        if (!before.trim() && !after.trim()) {
          normalized.push("$$");
          if (expr) {
            normalized.push(expr);
          }
          normalized.push("$$");
        } else {
          normalized.push(normalizeInlineMathLine(`${before}$${expr}$${after}`));
        }
        continue;
      }

      const before = line.slice(0, openIdx);
      if (!before.trim()) {
        const afterOpen = line.slice(openIdx + 2);
        inBracketMathBlock = true;
        bracketMathBuffer = [];
        if (afterOpen.trim()) {
          bracketMathBuffer.push(afterOpen.trimEnd());
        }
        continue;
      }
    }

    normalized.push(normalizeInlineMathLine(line));
  }

  if (inBracketMathBlock) {
    normalized.push("\\[");
    normalized.push(...bracketMathBuffer);
  }

  return normalized.join("\n");
}

export const MATH_MARKDOWN_RULES_APPENDIX = `Math formatting rules (must follow):
- Inline math: use single-dollar delimiters like $...$.
- Display math: use $$ delimiters on their own lines with nothing else on those lines.
- Do not use \\(...\\) or \\[...\\] delimiters.
- Do not place display-math $$...$$ inside bullets or table cells; use inline $...$ there.
- Escape non-math currency dollars as \\$.`;
