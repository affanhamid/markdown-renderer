"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MATH_MARKDOWN_RULES_APPENDIX: () => MATH_MARKDOWN_RULES_APPENDIX,
  MarkdownRenderer: () => markdown_renderer_default,
  normalizeMathMarkdownDelimiters: () => normalizeMathMarkdownDelimiters,
  renderMarkdownToHtml: () => renderMarkdownToHtml
});
module.exports = __toCommonJS(index_exports);

// src/markdown-renderer.tsx
var import_react = __toESM(require("react"), 1);
var import_katex_min = require("katex/dist/katex.min.css");
var import_katex = __toESM(require("katex"), 1);
var import_shiki = require("shiki");

// src/math-markdown.ts
var INLINE_CODE_SPLIT_REGEX = /(`[^`]*`)/g;
function normalizeMathSegment(segment) {
  let normalized = segment.replace(/\\\(([\s\S]*?)\\\)/g, (_match, expr) => `$${expr.trim()}$`).replace(/\\\[([^\n]+?)\\\]/g, (_match, expr) => `$${expr.trim()}$`);
  normalized = normalized.replace(/\$\$([^$\n]+?)\$\$/g, (match, expr, offset) => {
    const before = normalized.slice(0, offset);
    const after = normalized.slice(offset + match.length);
    if (!before.trim() && !after.trim()) {
      return `$$${expr.trim()}$$`;
    }
    return `$${expr.trim()}$`;
  });
  return normalized;
}
function normalizeInlineMathLine(line) {
  const parts = line.split(INLINE_CODE_SPLIT_REGEX);
  return parts.map((part, index) => {
    if (index % 2 === 1) return part;
    return normalizeMathSegment(part);
  }).join("");
}
function normalizeMathMarkdownDelimiters(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const normalized = [];
  let inCodeFence = false;
  let inBracketMathBlock = false;
  let bracketMathBuffer = [];
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
        const before2 = line.slice(0, openIdx);
        const after = line.slice(closeIdx + 2);
        if (!before2.trim() && !after.trim()) {
          normalized.push("$$");
          if (expr) {
            normalized.push(expr);
          }
          normalized.push("$$");
        } else {
          normalized.push(normalizeInlineMathLine(`${before2}$${expr}$${after}`));
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
var MATH_MARKDOWN_RULES_APPENDIX = `Math formatting rules (must follow):
- Inline math: use single-dollar delimiters like $...$.
- Display math: use $$ delimiters on their own lines with nothing else on those lines.
- Do not use \\(...\\) or \\[...\\] delimiters.
- Do not place display-math $$...$$ inside bullets or table cells; use inline $...$ there.
- Escape non-math currency dollars as \\$.`;

// src/markdown-renderer.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var highlightCache = /* @__PURE__ */ new Map();
var getCacheKey = (code, lang) => `${lang}:${code}`;
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function preprocessLatex(latex) {
  return latex.replace(/\\text\{([^}]*)\}/g, (match, content) => {
    const escapedContent = content.replace(/(?<!\\)&/g, "\\&");
    return `\\text{${escapedContent}}`;
  });
}
function getColorClass(colorName) {
  const colorMap = {
    important: "text-red-700",
    definition: "text-sky-700",
    example: "text-green-700",
    note: "text-amber-700",
    formula: "text-violet-600"
  };
  return colorMap[colorName.toLowerCase()] || "";
}
function hasMatchingDelimiter(text, startIndex, delimiter) {
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
var IMG_PLACEHOLDER = "IMG";
var LINK_PLACEHOLDER = "LNK";
var format = (text) => {
  const images = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const idx = images.length;
    images.push(
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:inline;max-width:100%;border-radius:0.25rem" />`
    );
    return `${IMG_PLACEHOLDER}${idx}`;
  });
  const links = [];
  text = text.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (_, linkText, url) => {
    const idx = links.length;
    links.push(
      `<a href="${escapeHtml(url)}">${format(linkText)}</a>`
    );
    return `${LINK_PLACEHOLDER}${idx}`;
  });
  let inLatex = false;
  let inBoldItalics = false;
  let inBold = false;
  let inItalic = false;
  let inCode = false;
  let i = text.length - 1;
  let currText = "";
  const parts = [];
  let needsLeftRight = null;
  while (i >= 0) {
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
    if (text[i] === "`" && i > 0 && text[i - 1] === "\\") {
      currText = "`" + currText;
      i -= 2;
      continue;
    }
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
            const leftMap = {
              "(": "\\left(",
              "[": "\\left[",
              "{": "\\left\\{"
            };
            const rightMap = {
              ")": "\\right)",
              "]": "\\right]",
              "}": "\\right\\}"
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
            const mathHtml = import_katex.default.renderToString(preprocessLatex(mathContent), {
              displayMode: false,
              throwOnError: false
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
      if (text[i] && [")", "]", "}"].includes(text[i]) && prevCharInOriginal === "$") {
        i--;
        continue;
      }
      if (text[i] === "}" && i >= 7 && text.slice(i - 7, i + 1) === "{/color}") {
        if (currText) {
          parts.unshift(escapeHtml(currText));
          currText = "";
        }
        parts.unshift("</span>");
        i -= 8;
        continue;
      }
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
      if (text[i] === "$") {
        const nextChar = i + 1 < text.length ? text[i + 1] : null;
        const prevChar = i > 0 ? text[i - 1] : null;
        if (nextChar !== "$" && prevChar !== "$" && prevChar !== "\\") {
          if (nextChar && /[a-zA-Z0-9]/.test(nextChar)) {
            currText = text[i] + currText;
            i--;
            continue;
          }
          if (!nextChar || [
            " ",
            "	",
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
            "\uFF08",
            // （
            "\uFF09",
            // ）
            "\uFF0C",
            // ，
            "\u3002",
            // 。
            "\uFF1A",
            // ：
            "\uFF1B",
            // ；
            "\uFF01",
            // ！
            "\uFF1F",
            // ？
            "\u3001",
            // 、
            "\u300B",
            // 》
            "\u300A",
            // 《
            "\u201C",
            // \u201c
            "\u201D",
            // \u201d
            "\u2018",
            // \u2018
            "\u2019",
            // \u2019
            "\u3010",
            // 【
            "\u3011",
            // 】
            // Hindi/Devanagari punctuation
            "\u0964",
            // । (Devanagari Danda - full stop)
            "\u0965"
            // ॥ (Devanagari Double Danda)
          ].includes(nextChar) || /[a-zA-Z]/.test(nextChar) || // Allow CJK characters (Chinese, Japanese, Korean) after $
          /[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(nextChar)) {
            if (currText) {
              parts.unshift(escapeHtml(currText));
              currText = "";
            }
            if (nextChar && [")", "]", "}"].includes(nextChar)) {
              const bracketMap = {
                ")": "(",
                "]": "[",
                "}": "{"
              };
              const openBracket = bracketMap[nextChar];
              if (openBracket) {
                needsLeftRight = {
                  open: openBracket,
                  close: nextChar
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
  let result = parts.join("");
  for (let idx = 0; idx < images.length; idx++) {
    result = result.replace(
      escapeHtml(`${IMG_PLACEHOLDER}${idx}`),
      images[idx]
    );
  }
  for (let idx = 0; idx < links.length; idx++) {
    result = result.replace(
      escapeHtml(`${LINK_PLACEHOLDER}${idx}`),
      links[idx]
    );
  }
  return result;
};
var getIndentLevel = (line) => {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "	")
      indent += 4;
    else break;
  }
  return indent;
};
var isTableSeparatorRow = (line) => {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed.split("|").map((cell) => cell.trim()).filter((cell) => cell.length > 0);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};
var splitTableRow = (line) => {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
};
var renderTableBlock = (rows) => {
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
  const headerHtml = headerCells.map((cell, index) => {
    const alignment = alignments[index] || "left";
    return `<th style="${cellBorder}text-align:${alignment};font-weight:600">${format(cell)}</th>`;
  }).join("");
  const bodyHtml = bodyRows.filter((row) => row.trim().includes("|")).map((row) => {
    const cells = splitTableRow(row);
    const cellHtml = cells.map((cell, index) => {
      const alignment = alignments[index] || "left";
      return `<td style="${cellBorder}text-align:${alignment};vertical-align:top">${format(cell)}</td>`;
    }).join("");
    return `<tr>${cellHtml}</tr>`;
  }).join("");
  return `<div style="margin:1rem 0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.875rem"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
};
var parseListItems = (lines, startIndex, baseIndent, listType, depth = 0) => {
  const items = [];
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
        const continuationLines = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          if (!nextLine) {
            i++;
            continue;
          }
          const nextIndent = getIndentLevel(nextLine);
          const nextTrimmed = nextLine.trim();
          if (nextIndent === baseIndent && (nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- "))) {
            break;
          }
          if (nextIndent <= baseIndent) {
            break;
          }
          if (nextIndent > baseIndent && (nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") || nextTrimmed.match(/^\d+\. /))) {
            const nestedType = nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") ? "ul" : "ol";
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
          const continuationLines = [];
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
            if (nextIndent > baseIndent && (nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") || nextTrimmed.match(/^\d+\. /))) {
              const nestedType = nextTrimmed.startsWith("* ") || nextTrimmed.startsWith("- ") ? "ul" : "ol";
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
            const match2 = continuationHtml.match(/<div class="prose[^"]*">(.*)<\/div>/s);
            if (match2 && match2[1]) {
              itemContent += match2[1];
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
    else if (depth === 1) styleClass += "list-['\u203A_']";
    else styleClass += "list-[square]";
  }
  return {
    html: `<${tag} class="${styleClass}">${items.join("")}</${tag}>`,
    nextIndex: i
  };
};
function renderMarkdownToHtml(markdown, options) {
  const normalizedMarkdown = normalizeMathMarkdownDelimiters(markdown);
  const lines = normalizedMarkdown.split("\n");
  const parts = [];
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
      const content2 = format(trimmed.slice(2));
      parts.push(`<h1 class="text-xl">${content2}</h1>`);
      i++;
      continue;
    } else if (trimmed.startsWith("## ")) {
      const content2 = format(trimmed.slice(3));
      parts.push(`<h2 class="text-lg">${content2}</h2>`);
      i++;
      continue;
    } else if (trimmed.startsWith("### ")) {
      const content2 = format(trimmed.slice(4));
      parts.push(`<h3 class="text-base">${content2}</h3>`);
      i++;
      continue;
    } else if (trimmed.startsWith("#### ")) {
      const content2 = format(trimmed.slice(5));
      parts.push(`<h4>${content2}</h4>`);
      i++;
      continue;
    } else if (trimmed.startsWith("##### ")) {
      const content2 = format(trimmed.slice(6));
      parts.push(`<h5>${content2}</h5>`);
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
        const mathHtml = import_katex.default.renderToString(preprocessLatex(mathContent), {
          displayMode: true,
          throwOnError: false
        });
        parts.push(`<div>${mathHtml}</div>`);
      } catch {
        parts.push(`<div>${format(trimmed)}</div>`);
      }
      i++;
      continue;
    } else if (trimmed === "$$") {
      const mathLines = [];
      i++;
      while (i < lines.length) {
        const mathLine = lines[i];
        const mathTrimmed = mathLine?.trim() || "";
        if (mathTrimmed === "$$") {
          const mathContent = mathLines.join("\n");
          try {
            const mathHtml = import_katex.default.renderToString(preprocessLatex(mathContent), {
              displayMode: true,
              throwOnError: false
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
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const codeLine = lines[i];
        const codeTrimmed = codeLine?.trim() || "";
        if (codeTrimmed === "```") {
          const codeContent = codeLines.join("\n");
          const escapedCode = escapeHtml(codeContent);
          const escapedLang = escapeHtml(language || "text");
          const isExecutable = options?.executableLanguages && language && options.executableLanguages.includes(language.toLowerCase());
          const currentIndex = codeBlockIndex;
          codeBlockIndex++;
          if (language === "mermaid") {
            parts.push(
              `<div class="md-mermaid" data-mermaid-code="${escapeHtml(codeContent)}"><pre style="overflow-x:auto;background:#f7f7f7;padding:0.75rem;border-radius:0.375rem;font-size:0.8rem;color:#666"><code>${escapedCode}</code></pre></div>`
            );
            i++;
            break;
          }
          if (isExecutable) {
            parts.push(
              `<div class="md-code-block" data-language="${escapedLang}" data-code-index="${currentIndex}" data-executable="true"><div class="md-code-block-header" style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0.75rem;background:#f0f0f0;border-radius:0.375rem 0.375rem 0 0;border:1px solid #e0e0e0;border-bottom:none"><span style="font-size:0.75rem;color:#666;font-family:monospace">${escapedLang}</span><button class="md-run-btn" data-code-index="${currentIndex}" style="padding:0.2rem 0.6rem;font-size:0.75rem;border-radius:0.25rem;border:1px solid #ccc;background:#fff;cursor:pointer;font-family:inherit">Run</button></div><pre style="overflow-x:auto;border-radius:0 0 0.375rem 0.375rem;background:#f7f7f7;color:#1f2937;padding:0.75rem;font-size:0.875rem;margin:0;border:1px solid #e0e0e0;border-top:none"><code class="language-${escapedLang}" data-executable="true">${escapedCode}</code></pre><div class="md-code-output" data-output-for="${currentIndex}" style="display:none"></div></div>`
            );
          } else {
            parts.push(
              `<div class="code-block-wrapper relative group">
              <button class="copy-btn absolute top-2 right-2 p-1.5 rounded bg-paper-200 hover:bg-paper-300 dark:bg-oxford-700 dark:hover:bg-oxford-600 opacity-0 group-hover:opacity-100 transition-opacity" data-code="${escapeHtml(codeContent)}" title="Copy code">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <pre data-lang="${escapeHtml(language || "text")}" data-code="${escapeHtml(codeContent)}"><code class="language-${escapeHtml(language || "text")}">${escapedCode}</code></pre>
            </div>`
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
    const calloutMatch = trimmed.match(/^\\begin\{callout\}\{(\w+)\}$/);
    if (calloutMatch && calloutMatch[1]) {
      const color = calloutMatch[1];
      const contentLines = [];
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
        `<div class="md-callout border-${color}-200 bg-${color}-50 text-${color}-900 dark:border-${color}-700/40 dark:bg-${color}-900/10 dark:text-${color}-200 my-4 rounded-lg border px-4 py-3 text-sm leading-relaxed [&>p]:mb-0 [&>p:last-child]:mb-0">${innerContent}</div>`
      );
      continue;
    }
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch && imageMatch[2]) {
      const alt = escapeHtml(imageMatch[1] ?? "");
      const src = escapeHtml(imageMatch[2]);
      parts.push(`<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:0.25rem;margin:0.75rem 0" />`);
      i++;
      continue;
    }
    const nextNonEmptyIndex = (() => {
      let j = i + 1;
      while (j < lines.length && !(lines[j] || "").trim()) {
        j++;
      }
      return j;
    })();
    if (trimmed.includes("|") && nextNonEmptyIndex < lines.length && isTableSeparatorRow((lines[nextNonEmptyIndex] || "").trim())) {
      const tableLines = [trimmed];
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
  return `<style>.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::before,.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::after{content:none}</style><div class="prose max-w-none">${parts.join("")}</div>`;
}
var mermaidInstance = null;
var MarkdownRenderer = ({
  markdown,
  className,
  onRunCode,
  executableLanguages = ["python", "r"]
}) => {
  const containerRef = (0, import_react.useRef)(null);
  const onRunCodeRef = (0, import_react.useRef)(onRunCode);
  onRunCodeRef.current = onRunCode;
  const [html, setHtml] = import_react.default.useState("");
  const hasRunCode = !!onRunCode;
  import_react.default.useEffect(() => {
    const rendered = renderMarkdownToHtml(
      markdown,
      hasRunCode ? { executableLanguages } : void 0
    );
    setHtml(rendered);
  }, [markdown, hasRunCode, executableLanguages]);
  (0, import_react.useEffect)(() => {
    if (!containerRef.current) return;
    const highlightCodeBlocks = async () => {
      const codeBlocks = containerRef.current?.querySelectorAll("pre[data-lang]");
      if (!codeBlocks) return;
      for (const block of Array.from(codeBlocks)) {
        const preElement = block;
        const lang = preElement.getAttribute("data-lang") || "plaintext";
        const code = preElement.getAttribute("data-code") || "";
        const effectiveLang = lang === "text" || lang === "" ? "plaintext" : lang;
        const cacheKey = getCacheKey(code, effectiveLang);
        let highlighted = highlightCache.get(cacheKey);
        if (!highlighted) {
          try {
            highlighted = await (0, import_shiki.codeToHtml)(code, {
              lang: effectiveLang,
              theme: "github-light"
            });
            highlightCache.set(cacheKey, highlighted);
          } catch (error) {
            console.warn(`Failed to highlight code block with language '${effectiveLang}':`, error);
            preElement.classList.add("code-plain");
            continue;
          }
        }
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = highlighted;
        const newPre = tempDiv.firstElementChild;
        if (newPre) {
          preElement.replaceWith(newPre);
        }
      }
    };
    const copyButtons = containerRef.current.querySelectorAll(".copy-btn");
    copyButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const button = btn;
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
            }, 2e3);
          }
        } catch (err) {
          console.error("Failed to copy code:", err);
        }
      });
    });
    highlightCodeBlocks();
  }, [html]);
  const handleRun = (0, import_react.useCallback)(
    async (button, block) => {
      const codeEl = block.querySelector("code[data-executable]");
      const outputEl = block.querySelector(".md-code-output");
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
    []
  );
  (0, import_react.useEffect)(() => {
    const container = containerRef.current;
    if (!container || !onRunCodeRef.current) return;
    const buttons = container.querySelectorAll(".md-run-btn");
    const handlers = [];
    buttons.forEach((btn) => {
      const block = btn.closest(".md-code-block");
      if (!block) return;
      const handler = () => handleRun(btn, block);
      btn.addEventListener("click", handler);
      handlers.push([btn, handler]);
    });
    return () => {
      handlers.forEach(
        ([btn, handler]) => btn.removeEventListener("click", handler)
      );
    };
  }, [html, handleRun]);
  (0, import_react.useEffect)(() => {
    const container = containerRef.current;
    if (!container) return;
    let alive = true;
    const renderBlocks = async () => {
      const blocks = container.querySelectorAll(".md-mermaid");
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
            sequence: { useMaxWidth: true }
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
          }
        }
      } catch {
      }
    };
    void renderBlocks();
    const observer = new MutationObserver(() => {
      if (!alive) return;
      const blocks = container.querySelectorAll(".md-mermaid:not(:has(svg))");
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: containerRef, className, dangerouslySetInnerHTML: { __html: html } });
};
var markdown_renderer_default = MarkdownRenderer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MATH_MARKDOWN_RULES_APPENDIX,
  MarkdownRenderer,
  normalizeMathMarkdownDelimiters,
  renderMarkdownToHtml
});
