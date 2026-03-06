import * as react_jsx_runtime from 'react/jsx-runtime';

interface CodeExecutionResult {
    output: string;
    error?: string;
    images?: string[];
}
interface MarkdownRendererProps {
    markdown: string;
    onRunCode?: (code: string, language: string) => Promise<CodeExecutionResult>;
    executableLanguages?: string[];
}
declare function renderMarkdownToHtml(markdown: string, options?: {
    executableLanguages?: string[];
}): string;
declare const MarkdownRenderer: ({ markdown, onRunCode, executableLanguages, }: MarkdownRendererProps) => react_jsx_runtime.JSX.Element;

declare function normalizeMathMarkdownDelimiters(markdown: string): string;
declare const MATH_MARKDOWN_RULES_APPENDIX = "Math formatting rules (must follow):\n- Inline math: use single-dollar delimiters like $...$.\n- Display math: use $$ delimiters on their own lines with nothing else on those lines.\n- Do not use \\(...\\) or \\[...\\] delimiters.\n- Do not place display-math $$...$$ inside bullets or table cells; use inline $...$ there.\n- Escape non-math currency dollars as \\$.";

export { type CodeExecutionResult, MATH_MARKDOWN_RULES_APPENDIX, MarkdownRenderer, type MarkdownRendererProps, normalizeMathMarkdownDelimiters, renderMarkdownToHtml };
