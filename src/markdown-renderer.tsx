import React, { useRef, useEffect, useCallback } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";
import { codeToHtml } from "shiki";
import { normalizeMathMarkdownDelimiters } from "./math-markdown";

// Cache for highlighted code to avoid re-highlighting
const highlightCache = new Map<string, string>();

// Helper to generate cache key
const getCacheKey = (code: string, lang: string) => `${lang}:${code}`;

export interface CodeExecutionResult {
  output: string;
  error?: string;
  images?: string[];
}

export interface MarkdownRendererProps {
  markdown: string;
  className?: string;
  onRunCode?: (code: string, language: string) => Promise<CodeExecutionResult>;
  executableLanguages?: string[];
  codeTheme?: "light" | "dark" | "auto";
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
// Search backwards from startIndex for the closing delimiter
// When parsing backwards, we're looking for the opening delimiter
// We need to account for other delimiter pairs in between
function hasMatchingDelimiter(text: string, startIndex: number, delimiter: string): boolean {
  let i = startIndex - 1;
  let depth = 0; // How many closing delimiters we've seen (parsing backwards)

  while (i >= 0) {
    // For *, check it's not part of ** or ***
    if (delimiter === "*" && text[i] === "*") {
      const nextChar = i + 1 < text.length ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      if (nextChar !== "*" && prevChar !== "*") {
        if (depth === 0) {
          return true; // Found the matching closing *
        }
        depth--; // We passed through another opening delimiter
      }
    }
    // For **, check it's not part of ***
    else if (delimiter === "**" && i >= 1 && text.slice(i - 1, i + 1) === "**") {
      const prevChar = i > 1 ? text[i - 2] : null;
      // Don't check nextNextChar if it would overlap with our starting position
      // When i+2 >= startIndex, we're checking the delimiter we started from
      const nextNextChar = i + 2 < text.length && i + 2 < startIndex ? text[i + 2] : null;
      if (prevChar !== "*" && nextNextChar !== "*") {
        if (depth === 0) {
          return true; // Found the matching closing **
        }
        depth--; // We passed through another opening delimiter
      }
      i--; // Skip the second * since we processed **
    }
    // For ***, check for exact match
    else if (delimiter === "***" && i >= 2 && text.slice(i - 2, i + 1) === "***") {
      if (depth === 0) {
        return true;
      }
      depth--;
      i -= 2; // Skip the other two * since we processed ***
    }
    // For $, check it's a valid closing $ (same rules as in format())
    else if (delimiter === "$" && text[i] === "$") {
      const nextChar = i + 1 < text.length ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
        if (depth === 0) {
          return true;
        }
        depth--; // We passed through another opening delimiter
      }
    }
    // For `, check for matching backtick
    else if (delimiter === "`" && text[i] === "`") {
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
const LINK_PLACEHOLDER = "\x01LNK";

const format = (text: string): string => {
  // Pre-process inline images: ![alt](url) -> placeholder
  const images: string[] = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => {
    const idx = images.length;
    images.push(
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:inline;max-width:100%;border-radius:0.25rem" />`,
    );
    return `${IMG_PLACEHOLDER}${idx}\x01`;
  });

  // Pre-process inline links: [text](url) -> placeholder (must run after image pre-pass)
  const links: string[] = [];
  text = text.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (_, linkText: string, url: string) => {
    const idx = links.length;
    links.push(
      `<a href="${escapeHtml(url)}">${format(linkText)}</a>`,
    );
    return `${LINK_PLACEHOLDER}${idx}\x01`;
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
        // Found the opening backtick
        parts.unshift(`<code>${escapeHtml(currText)}</code>`);
        currText = "";
        inCode = false;
        i--;
        continue;
      }
      // Inside code, just accumulate characters (no formatting)
      currText = text[i] + currText;
      i--;
      continue;
    }

    // Check if this is an escaped backtick (like \`) - handle it first
    if (text[i] === "`" && i > 0 && text[i - 1] === "\\") {
      currText = "`" + currText;
      i -= 2; // Skip both the backtick and the backslash
      continue;
    }

    // Check for code delimiter (not inside other formatting)
    if (text[i] === "`" && !inLatex && !inBoldItalics && !inBold && !inItalic) {
      // Only enter code mode if there's a matching opening backtick
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

    // Check if this is an escaped $ (like \$) - handle it first
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
      // Handle closing $ of latex (actually the opening $ when parsing backwards)
      if (text[i] === "$") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
          let mathContent = currText;

          // Check if we need to add \left and \right
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

            // Check if prevChar matches the opening bracket
            if (prevChar && prevChar === needsLeftRight.open) {
              mathContent = leftMap[prevChar] + mathContent + rightMap[needsLeftRight.close];
              // Skip the opening bracket since we've incorporated it into the math
              i--;
            } else if (needsLeftRight) {
              // If opening bracket not found but we expected one, don't add \left/\right
              parts.unshift(escapeHtml(needsLeftRight.close));
              needsLeftRight = null;
            }
          } else {
            // Reset needsLeftRight if it was set but we're not using it
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
      // Skip closing bracket if we detected it (it will be added to math with \right)
      if (needsLeftRight && text[i] === needsLeftRight.close) {
        i--;
        continue;
      }
      currText = text[i] + currText;
      i--;
    } else if (inBoldItalics) {
      // Handle closing *** of bold+italics
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
      // Handle closing ** of bold
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
      // Handle closing * of italic
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
      // Not in any mode - check for opening markers
      const prevCharInOriginal = i > 0 ? text[i - 1] : null;
      if (text[i] && [")", "]", "}"].includes(text[i]!) && prevCharInOriginal === "$") {
        // This closing bracket will be part of math, so skip it
        i--;
        continue;
      }
      // Check for {/color} closing tag (parsing backwards, so we encounter this first)
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
      // Check for $ (latex) - project's stricter disambiguation
      if (text[i] === "$") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
          // If $ is at the start of a word/number (like $20), it's currency - reject $ + any alphanumeric
          if (nextChar && /[a-zA-Z0-9]/.test(nextChar)) {
            currText = text[i] + currText;
            i--;
            continue;
          }
          // If $ is at the end, check for valid closing characters
          // Include Chinese/CJK punctuation and characters as valid terminators
          if (
            !nextChar ||
            [
              " ",
              "\t",
              ".",
              ",",
              ")",
              "]",
              "}",
              ";",
              ":",
              "!",
              "?",
              "-",
              '"',
              "'",
              "%",
              "\u2014",
              // Chinese/fullwidth punctuation
              "\uFF08", // （
              "\uFF09", // ）
              "\uFF0C", // ，
              "\u3002", // 。
              "\uFF1A", // ：
              "\uFF1B", // ；
              "\uFF01", // ！
              "\uFF1F", // ？
              "\u3001", // 、
              "\u300B", // 》
              "\u300A", // 《
              "\u201C", // \u201c
              "\u201D", // \u201d
              "\u2018", // \u2018
              "\u2019", // \u2019
              "\u3010", // 【
              "\u3011", // 】
              // Hindi/Devanagari punctuation
              "\u0964", // । (Devanagari Danda - full stop)
              "\u0965", // ॥ (Devanagari Double Danda)
            ].includes(nextChar) ||
            /[a-zA-Z]/.test(nextChar) ||
            // Allow CJK characters (Chinese, Japanese, Korean) after $
            /[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(nextChar)
          ) {
            if (currText) {
              parts.unshift(escapeHtml(currText));
              currText = "";
            }

            // Check if nextChar is a closing bracket
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

  // Any remaining text should be plain
  if (currText) {
    parts.unshift(escapeHtml(currText));
  }

  // Post-process: restore image and link placeholders
  let result = parts.join("");
  for (let idx = 0; idx < images.length; idx++) {
    result = result.replace(
      escapeHtml(`${IMG_PLACEHOLDER}${idx}\x01`),
      images[idx]!,
    );
  }
  for (let idx = 0; idx < links.length; idx++) {
    result = result.replace(
      escapeHtml(`${LINK_PLACEHOLDER}${idx}\x01`),
      links[idx]!,
    );
  }
  return result;
};

// Helper function to get indentation level (number of leading spaces/tabs)
const getIndentLevel = (line: string): number => {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "\t")
      indent += 4; // Treat tab as 4 spaces
    else break;
  }
  return indent;
};

const isTableSeparatorRow = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;

  const cells = trimmed
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const splitTableRow = (line: string): string[] => {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
};

const renderTableBlock = (rows: string[]): string => {
  if (rows.length < 2) return rows.map((line) => `<p>${format(line.trim())}</p>`).join("");

  const headerCells = splitTableRow(rows[0] || "");
  const separatorCells = splitTableRow(rows[1] || "");
  const bodyRows = rows.slice(2);

  if (headerCells.length === 0 || separatorCells.length === 0) {
    return rows.map((line) => `<p>${format(line.trim())}</p>`).join("");
  }

  const alignments = separatorCells.map((cell) => {
    const startsWithColon = cell.startsWith(":");
    const endsWithColon = cell.endsWith(":");
    if (startsWithColon && endsWithColon) return "center";
    if (endsWithColon) return "right";
    return "left";
  });

  const cellBorder = "border:1px solid var(--color-paper-200);padding:0.5rem 0.75rem;";

  const headerHtml = headerCells
    .map((cell, index) => {
      const alignment = alignments[index] || "left";
      return `<th style="${cellBorder}text-align:${alignment};font-weight:600">${format(cell)}</th>`;
    })
    .join("");

  const bodyHtml = bodyRows
    .filter((row) => row.trim().includes("|"))
    .map((row) => {
      const cells = splitTableRow(row);
      const cellHtml = cells
        .map((cell, index) => {
          const alignment = alignments[index] || "left";
          return `<td style="${cellBorder}text-align:${alignment};vertical-align:top">${format(cell)}</td>`;
        })
        .join("");
      return `<tr>${cellHtml}</tr>`;
    })
    .join("");

  return `<div style="margin:1rem 0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.875rem"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
};

// Helper function to parse list items recursively
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

    // If indent is less than base, we've exited this list
    if (indent < baseIndent) {
      break;
    }

    // If indent is same as base, check if it's a list item of the same type
    if (indent === baseIndent) {
      if (listType === "ul" && (trimmed.startsWith("* ") || trimmed.startsWith("- "))) {
        const content = format(trimmed.slice(2));
        let itemContent = `<li>${content}`;

        // Collect continuation lines and nested content
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

          // Stop if we hit another list item at the same level
          if (
            nextIndent === baseIndent &&
            (nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- "))
          ) {
            break;
          }

          // Stop if indent is at or below base level (not a nested item)
          if (nextIndent <= baseIndent) {
            break;
          }

          // Check if it's a nested list
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

          // Collect as continuation content
          continuationLines.push(nextLine);
          i++;
        }

        // Process continuation lines as markdown
        if (continuationLines.length > 0) {
          const continuationHtml = renderMarkdownToHtml(continuationLines.join("\n"));
          // Extract content from the wrapper div
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

          // Collect continuation lines and nested content
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

            // Stop if we hit another list item at the same level
            if (nextIndent === baseIndent && nextTrimmed.match(/^\d+\. /)) {
              break;
            }

            // Stop if indent is at or below base level (not a nested item)
            if (nextIndent <= baseIndent) {
              break;
            }

            // Check if it's a nested list
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

            // Collect as continuation content
            continuationLines.push(nextLine);
            i++;
          }

          // Process continuation lines as markdown
          if (continuationLines.length > 0) {
            const continuationHtml = renderMarkdownToHtml(continuationLines.join("\n"));
            // Extract content from the wrapper div
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
        // Not a list item at this level, exit
        break;
      }
    } else {
      // Indent doesn't match - skip or break
      i++;
    }
  }

  const tag = listType === "ul" ? "ul" : "ol";

  // Determine list style based on depth
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
  const normalizedMarkdown = normalizeMathMarkdownDelimiters(markdown);
  const lines = normalizedMarkdown.split("\n");
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
      // Single-line block math: $$content$$
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
      // Multi-line block math: $$ on separate lines
      const mathLines: string[] = [];
      i++; // Skip opening $$

      while (i < lines.length) {
        const mathLine = lines[i];
        const mathTrimmed = mathLine?.trim() || "";

        if (mathTrimmed === "$$") {
          // Found closing $$
          const mathContent = mathLines.join("\n");
          try {
            const mathHtml = katex.renderToString(preprocessLatex(mathContent), {
              displayMode: true,
              throwOnError: false,
            });
            parts.push(`<div>${mathHtml}</div>`);
          } catch {
            // If KaTeX fails, render as escaped text
            parts.push(`<div>${format(mathContent)}</div>`);
          }
          i++; // Skip closing $$
          break;
        }

        mathLines.push(mathLine || "");
        i++;
      }
      continue;
    } else if (trimmed.startsWith("```")) {
      // Code block
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++; // Skip opening ```

      while (i < lines.length) {
        const codeLine = lines[i];
        const codeTrimmed = codeLine?.trim() || "";

        if (codeTrimmed === "```") {
          // Found closing ```
          const codeContent = codeLines.join("\n");
          const escapedCode = escapeHtml(codeContent);
          const escapedLang = escapeHtml(language || "text");
          const isExecutable =
            options?.executableLanguages &&
            language &&
            options.executableLanguages.includes(language.toLowerCase());
          const currentIndex = codeBlockIndex;
          codeBlockIndex++;

          if (language === "mermaid") {
            parts.push(
              `<div class="md-mermaid" data-mermaid-code="${escapeHtml(codeContent)}">`+
                `<pre style="overflow-x:auto;background:#f7f7f7;padding:0.75rem;border-radius:0.375rem;font-size:0.8rem;color:#666"><code>${escapedCode}</code></pre>` +
              `</div>`,
            );
            i++;
            break;
          }

          if (isExecutable) {
            parts.push(
              `<div class="md-code-block" data-language="${escapedLang}" data-code-index="${currentIndex}" data-executable="true">` +
                `<div class="md-code-block-header" style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0.75rem;background:#f0f0f0;border-radius:0.375rem 0.375rem 0 0;border:1px solid #e0e0e0;border-bottom:none">` +
                `<span style="font-size:0.75rem;color:#666;font-family:monospace">${escapedLang}</span>` +
                `<button class="md-run-btn" data-code-index="${currentIndex}" style="padding:0.2rem 0.6rem;font-size:0.75rem;border-radius:0.25rem;border:1px solid #ccc;background:#fff;cursor:pointer;font-family:inherit">Run</button>` +
                `</div>` +
                `<pre data-lang="${escapedLang}" data-code="${escapeHtml(codeContent)}" style="overflow-x:auto;border-radius:0 0 0.375rem 0.375rem;background:#f7f7f7;color:#1f2937;padding:0.75rem;font-size:0.875rem;margin:0;border:1px solid #e0e0e0;border-top:none"><code class="language-${escapedLang}" data-executable="true">${escapedCode}</code></pre>` +
                `<div class="md-code-output" data-output-for="${currentIndex}" style="display:none"></div>` +
                `</div>`,
            );
          } else {
            // Shiki-ready code block with copy button (project style)
            parts.push(
              `<div class="code-block-wrapper relative group">
              <button class="copy-btn absolute top-2 right-2 p-1.5 rounded bg-paper-200 hover:bg-paper-300 dark:bg-oxford-700 dark:hover:bg-oxford-600 opacity-0 group-hover:opacity-100 transition-opacity" data-code="${escapeHtml(codeContent)}" title="Copy code">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <pre data-lang="${escapeHtml(language || "text")}" data-code="${escapeHtml(codeContent)}"><code class="language-${escapeHtml(language || "text")}">${escapedCode}</code></pre>
            </div>`,
            );
          }

          i++; // Skip closing ```
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

    // Callout block: \begin{callout}{color}...\end{callout}
    const calloutMatch = trimmed.match(/^\\begin\{callout\}\{(\w+)\}$/);
    if (calloutMatch && calloutMatch[1]) {
      const color = calloutMatch[1];
      const contentLines: string[] = [];
      i++;

      while (i < lines.length) {
        const calloutLine = (lines[i] || "").trim();
        if (calloutLine === "\\end{callout}") {
          i++;
          break;
        }
        contentLines.push(lines[i] || "");
        i++;
      }

      const innerHtml = renderMarkdownToHtml(contentLines.join("\n"), options);
      const innerMatch = innerHtml.match(/<div class="prose[^"]*">(.*)<\/div>/s);
      const innerContent = innerMatch?.[1] ?? escapeHtml(contentLines.join("\n"));

      parts.push(
        `<div class="md-callout border-${color}-200 bg-${color}-50 text-${color}-900 dark:border-${color}-700/40 dark:bg-${color}-900/10 dark:text-${color}-200 my-4 rounded-lg border px-4 py-3 text-sm leading-relaxed [&>p]:mb-0 [&>p:last-child]:mb-0">${innerContent}</div>`,
      );
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

    // Table detection (from project)
    const nextNonEmptyIndex = (() => {
      let j = i + 1;
      while (j < lines.length && !(lines[j] || "").trim()) {
        j++;
      }
      return j;
    })();

    if (
      trimmed.includes("|") &&
      nextNonEmptyIndex < lines.length &&
      isTableSeparatorRow((lines[nextNonEmptyIndex] || "").trim())
    ) {
      const tableLines: string[] = [trimmed];
      tableLines.push((lines[nextNonEmptyIndex] || "").trim());
      i = nextNonEmptyIndex + 1;

      while (i < lines.length) {
        const candidate = (lines[i] || "").trim();
        if (!candidate) {
          const lookahead = i + 1;
          if (lookahead < lines.length && (lines[lookahead] || "").trim().includes("|")) {
            i++;
            continue;
          }
          break;
        }
        if (!candidate.includes("|")) {
          break;
        }
        tableLines.push(candidate);
        i++;
      }

      parts.push(renderTableBlock(tableLines));
      continue;
    }

    const content = format(trimmed);
    parts.push(`<p>${content}</p>`);
    i++;
  }

  return `<style>.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::before,.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::after{content:none}.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *)){background-color:transparent}</style><div class="prose max-w-none">${parts.join("")}</div>`;
}

// Module-level mermaid instance — initialized once across all renders
let mermaidInstance: Awaited<typeof import("mermaid")>["default"] | null = null;

const MarkdownRenderer = ({
  markdown,
  className,
  onRunCode,
  executableLanguages = ["python", "r"],
  codeTheme = "auto",
}: MarkdownRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRunCodeRef = useRef(onRunCode);
  onRunCodeRef.current = onRunCode;
  const [html, setHtml] = React.useState<string>("");

  const hasRunCode = !!onRunCode;

  // Render markdown to HTML
  React.useEffect(() => {
    const rendered = renderMarkdownToHtml(
      markdown,
      hasRunCode ? { executableLanguages } : undefined,
    );
    setHtml(rendered);
  }, [markdown, hasRunCode, executableLanguages]);

  // Shiki highlighting + copy button handlers (from project)
  useEffect(() => {
    if (!containerRef.current) return;

    // Resolve theme
    let resolvedTheme: "github-light" | "github-dark" = "github-light";
    if (codeTheme === "dark") {
      resolvedTheme = "github-dark";
    } else if (codeTheme === "auto") {
      resolvedTheme = document.documentElement.classList.contains("dark")
        ? "github-dark"
        : "github-light";
    }

    const highlightCodeBlocks = async () => {
      const codeBlocks = containerRef.current?.querySelectorAll("pre[data-lang]");
      if (!codeBlocks) return;

      for (const block of Array.from(codeBlocks)) {
        const preElement = block as HTMLPreElement;
        const lang = preElement.getAttribute("data-lang") || "plaintext";
        const code = preElement.getAttribute("data-code") || "";

        // Use "plaintext" for unknown languages instead of "text"
        const effectiveLang = lang === "text" || lang === "" ? "plaintext" : lang;

        // Check cache first (include theme in cache key)
        const cacheKey = getCacheKey(code, `${effectiveLang}:${resolvedTheme}`);
        let highlighted = highlightCache.get(cacheKey);

        if (!highlighted) {
          try {
            highlighted = await codeToHtml(code, {
              lang: effectiveLang,
              theme: resolvedTheme,
            });
            highlightCache.set(cacheKey, highlighted);
          } catch (error) {
            // If highlighting fails, add a class for CSS styling
            console.warn(`Failed to highlight code block with language '${effectiveLang}':`, error);
            preElement.classList.add("code-plain");
            continue;
          }
        }

        // Replace the pre element with highlighted version
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = highlighted;
        const newPre = tempDiv.firstElementChild;
        if (newPre) {
          preElement.replaceWith(newPre);
        }
      }
    };

    // Add copy button click handlers
    const copyButtons = containerRef.current.querySelectorAll(".copy-btn");
    copyButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const button = btn as HTMLButtonElement;
        const code = button.getAttribute("data-code") || "";

        try {
          await navigator.clipboard.writeText(code);
          const copyIcon = button.querySelector(".copy-icon");
          const checkIcon = button.querySelector(".check-icon");

          if (copyIcon && checkIcon) {
            copyIcon.classList.add("hidden");
            checkIcon.classList.remove("hidden");

            setTimeout(() => {
              copyIcon.classList.remove("hidden");
              checkIcon.classList.add("hidden");
            }, 2000);
          }
        } catch (err) {
          console.error("Failed to copy code:", err);
        }
      });
    });

    highlightCodeBlocks();
  }, [html, codeTheme]);

  // Run button handler (from library)
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

  // Run button click handler useEffect (from library)
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

  // Mermaid diagram hydration
  // html is set via setHtml (async), so we use a MutationObserver to detect
  // when .md-mermaid blocks actually appear in the DOM, then render them.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let alive = true;

    const renderBlocks = async () => {
      const blocks = container.querySelectorAll<HTMLElement>(".md-mermaid");
      if (blocks.length === 0 || !alive) return;

      try {
        if (!mermaidInstance) {
          const mod = await import("mermaid");
          mermaidInstance = mod.default;
          mermaidInstance.initialize({
            startOnLoad: false,
            securityLevel: "antiscript",
            theme: "neutral",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 13,
            htmlLabels: false,
            flowchart: { useMaxWidth: true, htmlLabels: false },
            sequence: { useMaxWidth: true },
          });
        }

        if (!alive) return;

        for (const block of Array.from(blocks)) {
          if (!alive) break;
          if (block.querySelector("svg")) continue;
          const code = block.getAttribute("data-mermaid-code") || "";
          const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
          try {
            const { svg } = await mermaidInstance.render(id, code.trim());
            if (alive) {
              block.innerHTML = `<div style="display:flex;justify-content:center;overflow:auto;padding:1rem">${svg}</div>`;
            }
          } catch {
            // Leave the fallback <pre> in place
          }
        }
      } catch {
        // mermaid not installed — leave fallback code blocks
      }
    };

    // Render any blocks already in the DOM
    void renderBlocks();

    // Watch for new .md-mermaid blocks appearing (e.g. after dangerouslySetInnerHTML updates)
    const observer = new MutationObserver(() => {
      if (!alive) return;
      const blocks = container.querySelectorAll<HTMLElement>(".md-mermaid:not(:has(svg))");
      if (blocks.length > 0) {
        void renderBlocks();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      alive = false;
      observer.disconnect();
    };
  }, []);

  return <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownRenderer;
export { renderMarkdownToHtml };
