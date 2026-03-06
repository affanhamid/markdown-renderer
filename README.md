# @affanhamid/markdown-renderer

A React markdown renderer built for AI-generated content. Handles the math rendering problems that react-markdown + remark-math can't.

## Why this exists

If you've used `react-markdown` with `remark-math` and `rehype-katex` to render LLM output, you've hit these problems:

**1. Dollar signs break everything.** `remark-math` uses `$` for LaTeX math, but `$` is also currency. Their `singleDollarTextMath: false` option disables single-dollar math entirely, forcing `$$` for everything. This package disambiguates intelligently: `$20` renders as currency (digit follows `$`), while `$x + y$` renders as math. It also handles CJK characters, Devanagari/Hindi punctuation, and fullwidth punctuation as valid math boundaries.

**2. AI models use inconsistent math delimiters.** GPT, Claude, and Gemini variously output `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`. `remark-math` does not support `\(...\)` or `\[...\]` — there's an [open discussion](https://github.com/remarkjs/remark-math/issues) with no resolution. This package normalizes all four formats automatically before rendering.

**3. Too many moving parts.** The standard setup requires `react-markdown` + `remark-math` + `remark-gfm` + `rehype-katex` + KaTeX CSS + a syntax highlighter + custom components for tables, images, code blocks. This package is one import.

## Features

- **Math rendering** — KaTeX with automatic delimiter normalization (`$`, `$$`, `\(`, `\[`)
- **Dollar sign disambiguation** — currency vs. math, with CJK/Devanagari/fullwidth support
- **Syntax highlighting** — Shiki with `github-light` theme and copy-to-clipboard
- **Tables** — GFM-style with column alignment (left, center, right)
- **Executable code blocks** — optional `onRunCode` callback for running Python, R, etc.
- **Inline images** — `![alt](url)` works inside paragraphs, not just as standalone blocks
- **Semantic color tags** — `{color:important}text{/color}` for highlighting (important, definition, example, note, formula)
- **Auto-scaling brackets** — `($x + y$)` automatically uses `\left(` and `\right)` for proper sizing
- **Prompt appendix** — exported `MATH_MARKDOWN_RULES_APPENDIX` string to append to your LLM system prompt, steering models toward consistent delimiter usage

## Installation

```bash
npm install @affanhamid/markdown-renderer
```

Peer dependency: `react >= 18`

## Usage

### React component

```tsx
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

function ChatMessage({ content }: { content: string }) {
  return <MarkdownRenderer markdown={content} />;
}
```

### With executable code blocks

```tsx
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

function Notebook({ content }: { content: string }) {
  const handleRunCode = async (code: string, language: string) => {
    const result = await executeOnServer(code, language);
    return {
      output: result.stdout,
      error: result.stderr,
      images: result.plots, // base64 data URIs
    };
  };

  return (
    <MarkdownRenderer
      markdown={content}
      onRunCode={handleRunCode}
      executableLanguages={["python", "r"]}
    />
  );
}
```

### Server-side HTML (no React)

```ts
import { renderMarkdownToHtml } from "@affanhamid/markdown-renderer";

const html = renderMarkdownToHtml(markdownString);
```

### Normalize delimiters only

If you want to preprocess markdown before passing it to your own renderer:

```ts
import { normalizeMathMarkdownDelimiters } from "@affanhamid/markdown-renderer";

// Converts \(...\) -> $...$, \[...\] -> $$...$$, inline $$...$$ -> $...$
const normalized = normalizeMathMarkdownDelimiters(rawMarkdown);
```

### Prompt engineering helper

Append this to your LLM system prompt to reduce delimiter inconsistency at the source:

```ts
import { MATH_MARKDOWN_RULES_APPENDIX } from "@affanhamid/markdown-renderer";

const systemPrompt = `You are a helpful assistant.\n\n${MATH_MARKDOWN_RULES_APPENDIX}`;
```

## API

### `<MarkdownRenderer />` (default export)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `markdown` | `string` | required | Markdown content to render |
| `onRunCode` | `(code: string, language: string) => Promise<CodeExecutionResult>` | `undefined` | Callback for executing code blocks |
| `executableLanguages` | `string[]` | `["python", "r"]` | Languages that get a "Run" button |

### `CodeExecutionResult`

```ts
interface CodeExecutionResult {
  output: string;
  error?: string;
  images?: string[]; // data URIs or URLs
}
```

### `renderMarkdownToHtml(markdown: string, options?: { executableLanguages?: string[] }): string`

Renders markdown to an HTML string. Works without React (server-side, emails, PDFs).

### `normalizeMathMarkdownDelimiters(markdown: string): string`

Normalizes `\(...\)` to `$...$` and `\[...\]` to `$$...$$`. Converts inline `$$...$$` to `$...$`. Leaves code fences untouched.

### `MATH_MARKDOWN_RULES_APPENDIX: string`

A plain-text string with math formatting rules to append to LLM system prompts.

## License

MIT
