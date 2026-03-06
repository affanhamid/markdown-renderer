module.exports = {
  codeToHtml: async (code, options) => {
    const lang = options?.lang || "text";
    return `<pre class="shiki"><code class="language-${lang}">${code}</code></pre>`;
  },
};
