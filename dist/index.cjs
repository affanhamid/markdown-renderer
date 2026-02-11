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
  MarkdownRenderer: () => markdown_renderer_default,
  renderMarkdownToHtml: () => renderMarkdownToHtml
});
module.exports = __toCommonJS(index_exports);

// src/markdown-renderer.tsx
var import_react = __toESM(require("react"), 1);
var import_katex_min = require("katex/dist/katex.min.css");
var import_katex = __toESM(require("katex"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
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
var format = (text) => {
  const images = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const idx = images.length;
    images.push(
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="inline max-w-full rounded" />`
    );
    return `${IMG_PLACEHOLDER}${idx}`;
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
            "\uFF08",
            "\uFF09",
            "\uFF0C",
            "\u3002",
            "\uFF1A",
            "\uFF1B",
            "\uFF01",
            "\uFF1F",
            "\u3001",
            "\u300B",
            "\u300A",
            "\u201C",
            "\u201D",
            "\u2018",
            "\u2019",
            "\u3010",
            "\u3011",
            "\u0964",
            "\u0965"
          ].includes(nextChar) || /[a-zA-Z]/.test(nextChar) || /[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(nextChar)) {
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
  return result;
};
var getIndentLevel = (line) => {
  let indent = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === " ") indent++;
    else if (line[i] === "	") indent += 4;
    else break;
  }
  return indent;
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
function renderMarkdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const parts = [];
  let i = 0;
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
          parts.push(
            `<pre class="overflow-x-auto rounded bg-gray-100 p-3 text-sm"><code class="language-${escapeHtml(language || "text")}">${escapedCode}</code></pre>`
          );
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
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch && imageMatch[2]) {
      const alt = escapeHtml(imageMatch[1] ?? "");
      const src = escapeHtml(imageMatch[2]);
      parts.push(`<img src="${src}" alt="${alt}" class="max-w-full rounded my-3" />`);
      i++;
      continue;
    }
    const content = format(trimmed);
    parts.push(`<p>${content}</p>`);
    i++;
  }
  return `<div class="prose max-w-none">${parts.join("")}</div>`;
}
var MarkdownRenderer = ({ markdown }) => {
  const html = import_react.default.useMemo(() => renderMarkdownToHtml(markdown), [markdown]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { dangerouslySetInnerHTML: { __html: html } });
};
var markdown_renderer_default = MarkdownRenderer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MarkdownRenderer,
  renderMarkdownToHtml
});
