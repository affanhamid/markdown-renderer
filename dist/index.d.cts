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

export { type CodeExecutionResult, MarkdownRenderer, type MarkdownRendererProps, renderMarkdownToHtml };
