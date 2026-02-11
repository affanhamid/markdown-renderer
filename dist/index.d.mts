import * as react_jsx_runtime from 'react/jsx-runtime';

declare function renderMarkdownToHtml(markdown: string): string;
declare const MarkdownRenderer: ({ markdown }: {
    markdown: string;
}) => react_jsx_runtime.JSX.Element;

export { MarkdownRenderer, renderMarkdownToHtml };
