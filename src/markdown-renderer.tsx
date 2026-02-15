import React, { useRef, useEffect, useCallback } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

export interface CodeExecutionResult {
  output: string;
  error?: string;
  images?: string[];
}

export interface MarkdownRendererProps {
  markdown: string;
  onRunCode?: (code: string, language: string) => Promise<CodeExecutionResult>;
  executableLanguages?: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Preprocess LaTeX content to escape & inside \text{} blocks
// In LaTeX, & is a special character for alignment, so it needs to be escaped as \&
function preprocessLatex(latex: string): string {
  // Escape unescaped & inside \text{...} blocks
  return latex.replace(/\\text\{([^}]*)\}/g, (match, content) => {
    // Replace unescaped & with \&
    const escapedContent = content.replace(/(?<!\\)&/g, "\\&");
    return `\\text{${escapedContent}}`;
  });
}

function getColorClass(colorName: string): string {
  const colorMap: Record<string, string> = {
    important: "text-red-700",
    definition: "text-sky-700",
    example: "text-green-700",
    note: "text-amber-700",
    formula: "text-violet-600",
  };
  return colorMap[colorName.toLowerCase()] || "";
}

// Helper to check if a delimiter has a matching pair
function hasMatchingDelimiter(text: string, startIndex: number, delimiter: string): boolean {
  let i = startIndex - 1;
  let depth = 0;

  while (i >= 0) {
    if (delimiter === "*" && text[i] === "*") {
      const nextChar = i + 1 < text.length ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      if (nextChar !== "*" && prevChar !== "*") {
        if (depth === 0) {
          return true;
        }
        depth--;
      }
    } else if (delimiter === "**" && i >= 1 && text.slice(i - 1, i + 1) === "**") {
      const prevChar = i > 1 ? text[i - 2] : null;
      const nextNextChar = i + 2 < text.length && i + 2 < startIndex ? text[i + 2] : null;
      if (prevChar !== "*" && nextNextChar !== "*") {
        if (depth === 0) {
          return true;
        }
        depth--;
      }
      i--;
    } else if (delimiter === "***" && i >= 2 && text.slice(i - 2, i + 1) === "***") {
      if (depth === 0) {
        return true;
      }
      depth--;
      i -= 2;
    } else if (delimiter === "$" && text[i] === "$") {
      const nextChar = i + 1 < text.length ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
        if (depth === 0) {
          return true;
        }
        depth--;
      }
    } else if (delimiter === "`" && text[i] === "`") {
      if (depth === 0) {
        return true;
      }
      depth--;
    }
    i--;
  }

  return false;
}

const IMG_PLACEHOLDER = "\x01IMG";

const format = (text: string): string => {
  // Pre-process inline images: ![alt](url) → placeholder
  const images: string[] = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => {
    const idx = images.length;
    images.push(
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:inline;max-width:100%;border-radius:0.25rem" />`,
    );
    return `${IMG_PLACEHOLDER}${idx}\x01`;
  });

  let inLatex = false;
  let inBoldItalics = false;
  let inBold = false;
  let inItalic = false;
  let inCode = false;
  let i = text.length - 1;
  let currText = "";
  const parts: string[] = [];
  let needsLeftRight: { open: string; close: string } | null = null;

  while (i >= 0) {
    // Handle inline code - takes precedence over all other formatting
    if (inCode) {
      if (text[i] === "`") {
        parts.unshift(`<code>${escapeHtml(currText)}</code>`);
        currText = "";
        inCode = false;
        i--;
        continue;
      }
      currText = text[i] + currText;
      i--;
      continue;
    }

    // Check if this is an escaped backtick
    if (text[i] === "`" && i > 0 && text[i - 1] === "\\") {
      currText = "`" + currText;
      i -= 2;
      continue;
    }

    // Check for code delimiter
    if (text[i] === "`" && !inLatex && !inBoldItalics && !inBold && !inItalic) {
      if (hasMatchingDelimiter(text, i, "`")) {
        if (currText) {
          parts.unshift(escapeHtml(currText));
          currText = "";
        }
        inCode = true;
        i--;
        continue;
      }
    }

    // Check if this is an escaped $
    if (text[i] === "$" && i > 0 && text[i - 1] === "\\") {
      if (inLatex) {
        currText = "\\$" + currText;
      } else {
        currText = "$" + currText;
      }
      i -= 2;
      continue;
    }

    if (inLatex) {
      if (text[i] === "$") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
          let mathContent = currText;

          if (needsLeftRight) {
            const leftMap: Record<string, string> = {
              "(": "\\left(",
              "[": "\\left[",
              "{": "\\left\\{",
            };
            const rightMap: Record<string, string> = {
              ")": "\\right)",
              "]": "\\right]",
              "}": "\\right\\}",
            };

            if (prevChar && prevChar === needsLeftRight.open) {
              mathContent = leftMap[prevChar] + mathContent + rightMap[needsLeftRight.close];
              i--;
            } else if (needsLeftRight) {
              parts.unshift(escapeHtml(needsLeftRight.close));
              needsLeftRight = null;
            }
          } else {
            needsLeftRight = null;
          }

          try {
            const mathHtml = katex.renderToString(preprocessLatex(mathContent), {
              displayMode: false,
              throwOnError: false,
            });
            parts.unshift(mathHtml);
            currText = "";
            inLatex = false;
            needsLeftRight = null;
            i--;
            continue;
          } catch {
            currText = "$" + currText + "$";
            inLatex = false;
            needsLeftRight = null;
            i--;
            continue;
          }
        }
      }
      if (needsLeftRight && text[i] === needsLeftRight.close) {
        i--;
        continue;
      }
      currText = text[i] + currText;
      i--;
    } else if (inBoldItalics) {
      if (i >= 2 && text.slice(i - 2, i + 1) === "***") {
        parts.unshift(`<strong><em>${format(currText)}</em></strong>`);
        currText = "";
        inBoldItalics = false;
        i -= 3;
        continue;
      }
      currText = text[i] + currText;
      i--;
    } else if (inBold) {
      if (i >= 1 && text.slice(i - 1, i + 1) === "**") {
        parts.unshift(`<strong>${format(currText)}</strong>`);
        currText = "";
        inBold = false;
        i -= 2;
        continue;
      }
      currText = text[i] + currText;
      i--;
    } else if (inItalic) {
      if (text[i] === "*") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "*" && prevChar !== "*") {
          parts.unshift(`<em>${format(currText)}</em>`);
          currText = "";
          inItalic = false;
          i--;
          continue;
        }
      }
      currText = text[i] + currText;
      i--;
    } else {
      const prevCharInOriginal = i > 0 ? text[i - 1] : null;
      if (text[i] && [")", "]", "}"].includes(text[i]!) && prevCharInOriginal === "$") {
        i--;
        continue;
      }
      // Check for {/color} closing tag
      if (text[i] === "}" && i >= 7 && text.slice(i - 7, i + 1) === "{/color}") {
        if (currText) {
          parts.unshift(escapeHtml(currText));
          currText = "";
        }
        parts.unshift("</span>");
        i -= 8;
        continue;
      }
      // Check for {color:NAME} opening tag
      if (text[i] === "}" && i >= 8) {
        const searchStart = Math.max(0, i - 30);
        const segment = text.slice(searchStart, i + 1);
        const match = segment.match(/\{color:([a-zA-Z]+)\}$/);
        if (match && match[1]) {
          const colorClass = getColorClass(match[1]);
          if (colorClass) {
            if (currText) {
              parts.unshift(escapeHtml(currText));
              currText = "";
            }
            parts.unshift(`<span class="${colorClass}">`);
            i -= match[0].length;
            continue;
          }
        }
      }
      // Check for *** (bold+italics)
      if (i >= 2 && text.slice(i - 2, i + 1) === "***") {
        if (hasMatchingDelimiter(text, i - 2, "***")) {
          if (currText) {
            parts.unshift(escapeHtml(currText));
            currText = "";
          }
          inBoldItalics = true;
          i -= 3;
          continue;
        }
      }
      // Check for ** (bold)
      if (i >= 1 && text.slice(i - 1, i + 1) === "**") {
        if (hasMatchingDelimiter(text, i - 1, "**")) {
          if (currText) {
            parts.unshift(escapeHtml(currText));
            currText = "";
          }
          inBold = true;
          i -= 2;
          continue;
        }
      }
      // Check for * (italic)
      if (text[i] === "*") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "*" && prevChar !== "*") {
          if (hasMatchingDelimiter(text, i, "*")) {
            if (currText) {
              parts.unshift(escapeHtml(currText));
              currText = "";
            }
            inItalic = true;
            i--;
            continue;
          }
        }
      }
      // Check for $ (latex)
      if (text[i] === "$") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
          // Reject digits after $ to avoid treating currency like $20 as math
          if (nextChar && /[0-9]/.test(nextChar)) {
            currText = text[i] + currText;
            i--;
            continue;
          }
          if (hasMatchingDelimiter(text, i, "$")) {
            if (currText) {
              parts.unshift(escapeHtml(currText));
              currText = "";
            }

            if (nextChar && [")", "]", "}"].includes(nextChar)) {
              const bracketMap: Record<string, string> = {
                ")": "(",
                "]": "[",
                "}": "{",
              };
              const openBracket = bracketMap[nextChar];
              if (openBracket) {
                needsLeftRight = {
                  open: openBracket,
                  close: nextChar,
                };
              }
            }

            inLatex = true;
            i--;
            continue;
          }
        }
      }
      currText = text[i] + currText;
      i--;
    }
  }

  if (currText) {
    parts.unshift(escapeHtml(currText));
  }

  // Post-process: restore image placeholders
  let result = parts.join("");
  for (let idx = 0; idx < images.length; idx++) {
    result = result.replace(
      escapeHtml(`${IMG_PLACEHOLDER}${idx}\x01`),
      images[idx]!,
    );
  }
  return result;
};

const getIndentLevel = (line: string): number => {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "\t") indent += 4;
    else break;
  }
  return indent;
};

const parseListItems = (
  lines: string[],
  startIndex: number,
  baseIndent: number,
  listType: "ul" | "ol",
  depth: number = 0,
): { html: string; nextIndex: number } => {
  const items: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    const indent = getIndentLevel(line);
    const trimmed = line.trim();

    if (indent < baseIndent) {
      break;
    }

    if (indent === baseIndent) {
      if (listType === "ul" && (trimmed.startsWith("* ") || trimmed.startsWith("- "))) {
        const content = format(trimmed.slice(2));
        let itemContent = `<li>${content}`;

        i++;
        const continuationLines: string[] = [];

        while (i < lines.length) {
          const nextLine = lines[i];
          if (!nextLine) {
            i++;
            continue;
          }

          const nextIndent = getIndentLevel(nextLine);
          const nextTrimmed = nextLine.trim();

          if (
            nextIndent === baseIndent &&
            (nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- "))
          ) {
            break;
          }

          if (nextIndent <= baseIndent) {
            break;
          }

          if (
            nextIndent > baseIndent &&
            (nextTrimmed.startsWith("* ") ||
              nextTrimmed.startsWith("- ") ||
              nextTrimmed.match(/^\d+\. /))
          ) {
            const nestedType =
              nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") ? "ul" : "ol";
            const nested = parseListItems(lines, i, nextIndent, nestedType, depth + 1);
            itemContent += nested.html;
            i = nested.nextIndex;
            continue;
          }

          continuationLines.push(nextLine);
          i++;
        }

        if (continuationLines.length > 0) {
          const continuationHtml = renderMarkdownToHtml(continuationLines.join("\n"));
          const match = continuationHtml.match(/<div class="prose[^"]*">(.*)<\/div>/s);
          if (match && match[1]) {
            itemContent += match[1];
          }
        }

        itemContent += "</li>";
        items.push(itemContent);
      } else if (listType === "ol" && trimmed.match(/^\d+\. /)) {
        const match = trimmed.match(/^(\d+)\. (.+)$/);
        if (match && match[2]) {
          const content = format(match[2]);
          let itemContent = `<li>${content}`;

          i++;
          const continuationLines: string[] = [];

          while (i < lines.length) {
            const nextLine = lines[i];
            if (!nextLine) {
              i++;
              continue;
            }

            const nextIndent = getIndentLevel(nextLine);
            const nextTrimmed = nextLine.trim();

            if (nextIndent === baseIndent && nextTrimmed.match(/^\d+\. /)) {
              break;
            }

            if (nextIndent <= baseIndent) {
              break;
            }

            if (
              nextIndent > baseIndent &&
              (nextTrimmed.startsWith("* ") ||
                nextTrimmed.startsWith("- ") ||
                nextTrimmed.match(/^\d+\. /))
            ) {
              const nestedType =
                nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") ? "ul" : "ol";
              const nested = parseListItems(lines, i, nextIndent, nestedType, depth + 1);
              itemContent += nested.html;
              i = nested.nextIndex;
              continue;
            }

            continuationLines.push(nextLine);
            i++;
          }

          if (continuationLines.length > 0) {
            const continuationHtml = renderMarkdownToHtml(continuationLines.join("\n"));
            const match = continuationHtml.match(/<div class="prose[^"]*">(.*)<\/div>/s);
            if (match && match[1]) {
              itemContent += match[1];
            }
          }

          itemContent += "</li>";
          items.push(itemContent);
        } else {
          break;
        }
      } else {
        break;
      }
    } else {
      i++;
    }
  }

  const tag = listType === "ul" ? "ul" : "ol";

  let styleClass = "ml-5 marker:text-current marker:font-bold ";
  if (listType === "ol") {
    if (depth === 0) styleClass += "list-decimal";
    else if (depth === 1) styleClass += "list-[lower-alpha]";
    else styleClass += "list-[lower-roman]";
  } else {
    if (depth === 0) styleClass += "list-disc";
    else if (depth === 1) styleClass += "list-['›_']";
    else styleClass += "list-[square]";
  }

  return {
    html: `<${tag} class="${styleClass}">${items.join("")}</${tag}>`,
    nextIndex: i,
  };
};

function renderMarkdownToHtml(
  markdown: string,
  options?: { executableLanguages?: string[] },
): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let i = 0;
  let codeBlockIndex = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      const content = format(trimmed.slice(2));
      parts.push(`<h1 class="text-xl">${content}</h1>`);
      i++;
      continue;
    } else if (trimmed.startsWith("## ")) {
      const content = format(trimmed.slice(3));
      parts.push(`<h2 class="text-lg">${content}</h2>`);
      i++;
      continue;
    } else if (trimmed.startsWith("### ")) {
      const content = format(trimmed.slice(4));
      parts.push(`<h3 class="text-base">${content}</h3>`);
      i++;
      continue;
    } else if (trimmed.startsWith("#### ")) {
      const content = format(trimmed.slice(5));
      parts.push(`<h4>${content}</h4>`);
      i++;
      continue;
    } else if (trimmed.startsWith("##### ")) {
      const content = format(trimmed.slice(6));
      parts.push(`<h5>${content}</h5>`);
      i++;
      continue;
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const indent = getIndentLevel(line);
      const result = parseListItems(lines, i, indent, "ul");
      parts.push(result.html);
      i = result.nextIndex;
      continue;
    } else if (trimmed.match(/^\d+\. /)) {
      const indent = getIndentLevel(line);
      const result = parseListItems(lines, i, indent, "ol");
      parts.push(result.html);
      i = result.nextIndex;
      continue;
    } else if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length >= 4) {
      const mathContent = trimmed.slice(2, -2).trim();
      try {
        const mathHtml = katex.renderToString(preprocessLatex(mathContent), {
          displayMode: true,
          throwOnError: false,
        });
        parts.push(`<div>${mathHtml}</div>`);
      } catch {
        parts.push(`<div>${format(trimmed)}</div>`);
      }
      i++;
      continue;
    } else if (trimmed === "$$") {
      const mathLines: string[] = [];
      i++;

      while (i < lines.length) {
        const mathLine = lines[i];
        const mathTrimmed = mathLine?.trim() || "";

        if (mathTrimmed === "$$") {
          const mathContent = mathLines.join("\n");
          try {
            const mathHtml = katex.renderToString(preprocessLatex(mathContent), {
              displayMode: true,
              throwOnError: false,
            });
            parts.push(`<div>${mathHtml}</div>`);
          } catch {
            parts.push(`<div>${format(mathContent)}</div>`);
          }
          i++;
          break;
        }

        mathLines.push(mathLine || "");
        i++;
      }
      continue;
    } else if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length) {
        const codeLine = lines[i];
        const codeTrimmed = codeLine?.trim() || "";

        if (codeTrimmed === "```") {
          const codeContent = codeLines.join("\n");
          const escapedCode = escapeHtml(codeContent);
          const escapedLang = escapeHtml(language || "text");
          const isExecutable =
            options?.executableLanguages &&
            language &&
            options.executableLanguages.includes(language.toLowerCase());
          const currentIndex = codeBlockIndex;
          codeBlockIndex++;

          if (isExecutable) {
            parts.push(
              `<div class="md-code-block" data-language="${escapedLang}" data-code-index="${currentIndex}" data-executable="true">` +
                `<div class="md-code-block-header" style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0.75rem;background:#f0f0f0;border-radius:0.375rem 0.375rem 0 0;border:1px solid #e0e0e0;border-bottom:none">` +
                `<span style="font-size:0.75rem;color:#666;font-family:monospace">${escapedLang}</span>` +
                `<button class="md-run-btn" data-code-index="${currentIndex}" style="padding:0.2rem 0.6rem;font-size:0.75rem;border-radius:0.25rem;border:1px solid #ccc;background:#fff;cursor:pointer;font-family:inherit">Run</button>` +
                `</div>` +
                `<pre style="overflow-x:auto;border-radius:0 0 0.375rem 0.375rem;background:#f7f7f7;color:#1f2937;padding:0.75rem;font-size:0.875rem;margin:0;border:1px solid #e0e0e0;border-top:none"><code class="language-${escapedLang}" data-executable="true">${escapedCode}</code></pre>` +
                `<div class="md-code-output" data-output-for="${currentIndex}" style="display:none"></div>` +
                `</div>`,
            );
          } else {
            parts.push(
              `<pre class="overflow-x-auto rounded bg-gray-100 p-3 text-sm"><code class="language-${escapedLang}">${escapedCode}</code></pre>`,
            );
          }

          i++;
          break;
        }

        codeLines.push(codeLine || "");
        i++;
      }
      continue;
    } else if (trimmed === "---") {
      parts.push("<hr />");
      i++;
      continue;
    }

    // Check for image: ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch && imageMatch[2]) {
      const alt = escapeHtml(imageMatch[1] ?? "");
      const src = escapeHtml(imageMatch[2]);
      parts.push(`<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:0.25rem;margin:0.75rem 0" />`);
      i++;
      continue;
    }

    const content = format(trimmed);
    parts.push(`<p>${content}</p>`);
    i++;
  }

  return `<div class="prose max-w-none">${parts.join("")}</div>`;
}

const MarkdownRenderer = ({
  markdown,
  onRunCode,
  executableLanguages = ["python", "r"],
}: MarkdownRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRunCodeRef = useRef(onRunCode);
  onRunCodeRef.current = onRunCode;

  const hasRunCode = !!onRunCode;
  const html = React.useMemo(
    () =>
      renderMarkdownToHtml(
        markdown,
        hasRunCode ? { executableLanguages } : undefined,
      ),
    [markdown, hasRunCode, executableLanguages],
  );

  const handleRun = useCallback(
    async (button: HTMLButtonElement, block: Element) => {
      const codeEl = block.querySelector("code[data-executable]");
      const outputEl = block.querySelector(".md-code-output") as HTMLElement | null;
      const language = block.getAttribute("data-language") || "";
      const code = codeEl?.textContent || "";

      if (!onRunCodeRef.current || !outputEl) return;

      button.disabled = true;
      button.textContent = "Running...";
      outputEl.style.display = "block";
      outputEl.textContent = "Running...";
      outputEl.style.background = "#f7f7f7";
      outputEl.style.color = "#333";
      outputEl.className = "md-code-output";

      try {
        const result = await onRunCodeRef.current(code, language);

        // Clear previous output
        outputEl.textContent = "";
        outputEl.className = "md-code-output";

        if (result.error) {
          outputEl.className = "md-code-output md-code-error";
          outputEl.style.background = "#fef2f2";
          outputEl.style.color = "#dc2626";
          outputEl.textContent = result.error;
        } else if (result.output) {
          outputEl.style.background = "#f7f7f7";
          outputEl.style.color = "#333";
          outputEl.textContent = result.output;
        }

        if (result.images && result.images.length > 0) {
          for (const src of result.images) {
            const img = document.createElement("img");
            img.src = src;
            img.style.maxWidth = "100%";
            img.style.borderRadius = "0.25rem";
            img.style.marginTop = "0.5rem";
            outputEl.appendChild(img);
          }
        }

        if (!result.output && !result.error && (!result.images || result.images.length === 0)) {
          outputEl.style.display = "none";
        }
      } catch (err) {
        outputEl.className = "md-code-output md-code-error";
        outputEl.style.background = "#fef2f2";
        outputEl.style.color = "#dc2626";
        outputEl.textContent = err instanceof Error ? err.message : "Execution failed";
      } finally {
        button.disabled = false;
        button.textContent = "Run";
      }
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onRunCodeRef.current) return;

    const buttons =
      container.querySelectorAll<HTMLButtonElement>(".md-run-btn");
    const handlers: Array<[HTMLButtonElement, () => void]> = [];

    buttons.forEach((btn) => {
      const block = btn.closest(".md-code-block");
      if (!block) return;
      const handler = () => handleRun(btn, block);
      btn.addEventListener("click", handler);
      handlers.push([btn, handler]);
    });

    return () => {
      handlers.forEach(([btn, handler]) =>
        btn.removeEventListener("click", handler),
      );
    };
  }, [html, handleRun]);

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownRenderer;
export { renderMarkdownToHtml };
