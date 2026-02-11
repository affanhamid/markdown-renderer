import { renderMarkdownToHtml } from "../markdown-renderer";

describe("Images", () => {
  test("should render block-level image", () => {
    const input = "![alt text](/images/test.png)";
    const output = renderMarkdownToHtml(input);
    expect(output).toContain("<img");
    expect(output).toContain('src="/images/test.png"');
    expect(output).toContain('alt="alt text"');
  });

  test("should render image with empty alt", () => {
    const input = "![](/api/files/uploads/images/abc123.png)";
    const output = renderMarkdownToHtml(input);
    expect(output).toContain("<img");
    expect(output).toContain('src="/api/files/uploads/images/abc123.png"');
    expect(output).toContain('alt=""');
  });

  test("should render inline image within text", () => {
    const input = "Here is an image ![photo](/img.png) in a sentence.";
    const output = renderMarkdownToHtml(input);
    expect(output).toContain("<img");
    expect(output).toContain('src="/img.png"');
    expect(output).toContain("Here is an image");
    expect(output).toContain("in a sentence.");
  });

  test("should render multiple images", () => {
    const input = "![a](/1.png)\n![b](/2.png)";
    const output = renderMarkdownToHtml(input);
    expect(output).toContain('src="/1.png"');
    expect(output).toContain('src="/2.png"');
  });

  test("should escape HTML in image alt and src", () => {
    const input = '![<script>](/img"test.png)';
    const output = renderMarkdownToHtml(input);
    expect(output).not.toContain("<script>");
    expect(output).toContain("&lt;script&gt;");
  });

  test("should render image alongside other markdown", () => {
    const input = "# Title\n\n![](/photo.png)\n\nSome **bold** text.";
    const output = renderMarkdownToHtml(input);
    expect(output).toContain("<h1");
    expect(output).toContain("<img");
    expect(output).toContain("<strong>bold</strong>");
  });
});

describe("renderMarkdownToHtml", () => {
  describe("Basic formatting", () => {
    test("should render bold text", () => {
      const input = "This is **bold** text";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>bold</strong>");
    });

    test("should render italic text", () => {
      const input = "This is *italic* text";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<em>italic</em>");
    });

    test("should render bold and italic text", () => {
      const input = "This is ***bold and italic*** text";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong><em>bold and italic</em></strong>");
    });

    test("should handle multiple formatting in one line", () => {
      const input = "This is **bold** and *italic* text";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>bold</strong>");
      expect(output).toContain("<em>italic</em>");
    });

    test("should handle multiple bold sections with adjacent text", () => {
      const input = "Bagging stands for **B**ootstrap Aggregating.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>B</strong>ootstrap");
    });

    test("should handle multiple bold words in one line", () => {
      const input = "Bagging stands for **B**ootstrap **Agg**regat**ing**.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>B</strong>ootstrap");
      expect(output).toContain("<strong>Agg</strong>regat");
      expect(output).toContain("<strong>ing</strong>");
    });
  });

  describe("Headings", () => {
    test("should render h1 heading", () => {
      const input = "# Heading 1";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<h1");
      expect(output).toContain(">Heading 1</h1>");
    });

    test("should render h2 heading", () => {
      const input = "## Heading 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<h2[^>]*>Heading 2<\/h2>/);
    });

    test("should render h3 heading", () => {
      const input = "### Heading 3";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<h3[^>]*>Heading 3<\/h3>/);
    });

    test("should render h4 heading", () => {
      const input = "#### Heading 4";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<h4[^>]*>Heading 4<\/h4>/);
    });

    test("should render h5 heading", () => {
      const input = "##### Heading 5";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<h5[^>]*>Heading 5<\/h5>/);
    });

    test("should render heading with formatting", () => {
      const input = "# This is **bold** heading";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<h1");
      expect(output).toContain("</h1>");
      expect(output).toContain("<strong>bold</strong>");
    });
  });

  describe("Lists", () => {
    test("should render unordered list with asterisks", () => {
      const input = "* Item 1\n* Item 2\n* Item 3";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain("<li>Item 1</li>");
      expect(output).toContain("<li>Item 2</li>");
      expect(output).toContain("<li>Item 3</li>");
    });

    test("should render unordered list with dashes", () => {
      const input = "- Item 1\n- Item 2\n- Item 3";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain("<li>Item 1</li>");
      expect(output).toContain("<li>Item 2</li>");
      expect(output).toContain("<li>Item 3</li>");
    });

    test("should render ordered list", () => {
      const input = "1. First item\n2. Second item\n3. Third item";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ol[^>]*>/);
      expect(output).toContain("<li>First item</li>");
      expect(output).toContain("<li>Second item</li>");
      expect(output).toContain("<li>Third item</li>");
    });

    test("should render nested unordered list", () => {
      const input = "* Item 1\n  * Nested item 1\n  * Nested item 2\n* Item 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain("<li>Item 1");
      // Should contain nested ul
      expect(output).toMatch(/<ul[^>]*>.*<li>Nested item 1<\/li>.*<li>Nested item 2<\/li>.*<\/ul>/s);
    });

    test("should render nested ordered list", () => {
      const input = "1. Item 1\n   1. Nested item 1\n   2. Nested item 2\n2. Item 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ol[^>]*>/);
      expect(output).toContain("<li>Item 1");
      // Should contain nested ol
      expect(output).toMatch(/<ol[^>]*>.*<li>Nested item 1<\/li>.*<li>Nested item 2<\/li>.*<\/ol>/s);
    });

    test("should render mixed nested lists", () => {
      const input = "1. Item 1\n   * Nested unordered\n2. Item 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ol[^>]*>/);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain("<li>Nested unordered</li>");
    });

    test("should render list items with formatting", () => {
      const input = "* This is **bold** item\n* This is *italic* item";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>bold</strong>");
      expect(output).toContain("<em>italic</em>");
    });

    test("should render dash list with inline math", () => {
      const input = "- In EV, we averaged the money: $p_1 c_1 + \\ldots$\n- In EU, we average the utility: $p_1 u(c_1) + \\ldots$";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain("<li>");
      expect(output).toContain("katex");
      // Should contain the math content
      expect(output).toContain("p_1");
    });
  });

  describe("Math blocks", () => {
    test("should render math block", () => {
      const input = "$$\\pi P = \\pi$$";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("\\pi");
    });

    test("should render multiple math blocks", () => {
      const input = "$$x + y = z$$\n\n$$a + b = c$$";
      const output = renderMarkdownToHtml(input);
      // Should contain katex rendering
      expect(output).toContain("katex");
    });

    test("should render aligned environment in math block", () => {
      const input = `$$
\\begin{aligned}
&\\textbf{Dr } \\text{Investment Property} && £3.5\\text{m} \\\\
&\\quad \\textbf{Cr } \\text{Fair Value Gain (P\\&L)} && £3.5\\text{m}
\\end{aligned}
$$`;
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("aligned");
    });

    test("should render multi-line math block", () => {
      const input = "$$\nx + y = z\n$$";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
    });
  });

  describe("Inline math", () => {
    test("should render inline math", () => {
      const input = "The value is $x + y$.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("x + y");
    });

    test("should render multiple inline math expressions", () => {
      const input = "Calculate $x$ and $y$ values.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
    });

    test("should not treat currency as math", () => {
      const input = "The price is $20.";
      const output = renderMarkdownToHtml(input);
      // Should not contain katex for $20
      expect(output).not.toContain("katex");
      expect(output).toContain("$20");
    });

    test("should handle escaped dollar signs", () => {
      const input = "The price is \\$1.";
      const output = renderMarkdownToHtml(input);
      // Escaped $ should become just $
      expect(output).toContain("$1");
      expect(output).not.toContain("\\$1");
    });

    test("should handle math with asterisks", () => {
      const input = "The expectation is $E^*$.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("E");
    });

    test("should render math inside double quotes", () => {
      const input = 'The value is "$x + y$".';
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("x + y");
      // The quotes should still be in the output
      expect(output).toContain('"');
    });

    test("should render math inside single quotes", () => {
      const input = "The value is '$x + y$'.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("x + y");
      // The quotes should still be in the output (HTML-escaped as &#39;)
      expect(output).toMatch(/&#39;|'/);
    });

    test("should handle multiple math expressions in quoted text", () => {
      const input = 'The formula "$x + y$" equals "$z$".';
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("x + y");
      expect(output).toContain("z");
    });

    test("should render math followed by percent sign", () => {
      const input = "Pays an $x$% coupon on a $14m bond.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      expect(output).toContain("x");
      // Should not render $14m as math (currency)
      expect(output).toContain("$14m");
    });

    test("should handle math with percent in financial context", () => {
      const input = "**US Leg (Outflow for UK firm):** Pays an $x$% coupon on a $14m bond.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>US Leg (Outflow for UK firm):</strong>");
      expect(output).toContain("katex");
      // The $x$ should be rendered as math
      expect(output).toContain("x");
      // The $14m should not be rendered as math
      expect(output).toContain("$14m");
    });

    test("should render math followed by lowercase letter", () => {
      const input = "Learn to predict $Y$ from new $X$s.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      // Both $Y$ and $X$ should be rendered as math
      // The 's' after $X$ should not break the math detection
      expect(output).toContain("Y");
      expect(output).toContain("X");
    });

    test("should render math followed by em-dash", () => {
      const input = "Because $L^*(\\theta)$ requires knowing the \"true distribution\" $P(X, Y)$—aka, knowing every possible future outcome.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
      // Both $L^*(\theta)$ and $P(X, Y)$ should be rendered as math
      // The em-dash after $P(X, Y)$ should not break the math detection
      expect(output).toContain("L^*");
      expect(output).toContain("P(X, Y)");
    });
  });

  describe("Math with brackets (left/right)", () => {
    test("should add left/right for parentheses - feature needs implementation", () => {
      const input = "Calculate ($x + y$).";
      const output = renderMarkdownToHtml(input);
      // The brackets should be detected and \left/\right should be added
      // Check that the annotation contains \left( and \right)
      const annotationMatch = output.match(/annotation encoding="application\/x-tex">([^<]+)</);
      if (annotationMatch) {
        const latex = annotationMatch[1];
        expect(latex).toContain("\\left(");
        expect(latex).toContain("\\right)");
        expect(latex).toContain("x + y");
      } else {
        // If annotation not found, at least verify katex is present
        expect(output).toContain("katex");
      }
    });

    test("should add left/right for square brackets - feature needs implementation", () => {
      const input = "The value is [$a + b$].";
      const output = renderMarkdownToHtml(input);
      // The brackets should be detected and \left/\right should be added
      const annotationMatch = output.match(/annotation encoding="application\/x-tex">([^<]+)</);
      if (annotationMatch) {
        const latex = annotationMatch[1];
        expect(latex).toContain("\\left[");
        expect(latex).toContain("\\right]");
        expect(latex).toContain("a + b");
      } else {
        expect(output).toContain("katex");
      }
    });

    test("should add left/right for curly braces", () => {
      const input = "The set is {$c + d$}.";
      const output = renderMarkdownToHtml(input);
      // The brackets should be detected and \left/\right should be added
      const annotationMatch = output.match(/annotation encoding="application\/x-tex">([^<]+)</);
      if (annotationMatch) {
        const latex = annotationMatch[1];
        expect(latex).toContain("\\left\\{");
        expect(latex).toContain("\\right\\}");
        expect(latex).toContain("c + d");
      } else {
        expect(output).toContain("katex");
      }
    });

    test("should handle complex expression with brackets", () => {
      const input = "($E[X|A_i] = \\frac{E[X 1_{A_i}]}{P(A_i)}$)";
      const output = renderMarkdownToHtml(input);
      // The brackets should be detected and \left/\right should be added
      const annotationMatch = output.match(/annotation encoding="application\/x-tex">([^<]+)</);
      if (annotationMatch) {
        const latex = annotationMatch[1];
        expect(latex).toContain("\\left(");
        expect(latex).toContain("\\right)");
        expect(latex).toContain("E[X|A_i]");
      } else {
        expect(output).toContain("E[X|A_i]");
      }
    });

    test("should not include closing bracket in text when it's part of math", () => {
      const input = "Calculate ($x + y$).";
      const output = renderMarkdownToHtml(input);

      // The math should be rendered with katex
      expect(output).toContain("katex");

      // Verify the LaTeX source contains \left( and \right) in the annotation
      const annotationMatch = output.match(/annotation encoding="application\/x-tex">([^<]+)</);
      expect(annotationMatch).toBeTruthy();
      if (annotationMatch) {
        const latex = annotationMatch[1];
        expect(latex).toContain("\\left(");
        expect(latex).toContain("\\right)");
        expect(latex).toContain("x + y");
      }

      // The text before the math should be "Calculate "
      expect(output).toContain("<p>Calculate ");

      // The text after the math should be ".</p>"
      expect(output).toContain(".</p>");
    });
  });

  describe("Math inside formatting", () => {
    test("should render math inside bold", () => {
      const input = "The value is **$x + y$**.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>");
      expect(output).toContain("katex");
    });

    test("should render math inside italic", () => {
      const input = "The value is *$x + y$*.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<em>");
      expect(output).toContain("katex");
    });

    test("should render math inside bold and italic", () => {
      const input = "The value is ***$x + y$***.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong><em>");
      expect(output).toContain("katex");
    });

    test("should handle math with asterisks inside formatting", () => {
      const input = "The expectation is **$E^*$**.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>");
      expect(output).toContain("katex");
      // Should not split the math expression
      expect(output).toContain("E");
    });
  });

  describe("Code", () => {
    test("should render inline code", () => {
      const input = "This is `inline code` in text.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<code>inline code</code>");
    });

    test("should render multiple inline code", () => {
      const input = "Use `var` or `let` for variables.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<code>var</code>");
      expect(output).toContain("<code>let</code>");
    });

    test("should not process formatting inside inline code", () => {
      const input = "Code like `**bold**` should not be formatted.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<code>**bold**</code>");
      expect(output).not.toContain("<strong>bold</strong>");
    });

    test("should render block code", () => {
      const input = "```\nconst x = 5;\nconsole.log(x);\n```";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<pre");
      expect(output).toContain("<code");
      expect(output).toContain("const x = 5;");
      expect(output).toContain("console.log(x);");
    });

    test("should render block code with language", () => {
      const input = "```javascript\nconst x = 5;\n```";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<pre");
      expect(output).toContain("language-javascript");
      expect(output).toContain("const x = 5;");
    });

    test("should not process markdown inside block code", () => {
      const input = "```\n**bold**\n*italic*\n```";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("**bold**");
      expect(output).toContain("*italic*");
      expect(output).not.toContain("<strong>");
      expect(output).not.toContain("<em>");
    });
  });

  describe("Horizontal rules", () => {
    test("should render horizontal rule", () => {
      const input = "---";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<hr />");
    });
  });

  describe("Paragraphs", () => {
    test("should render plain text as paragraph", () => {
      const input = "This is a paragraph.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<p>This is a paragraph.</p>");
    });

    test("should render multiple paragraphs", () => {
      const input = "First paragraph.\n\nSecond paragraph.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<p>First paragraph.</p>");
      expect(output).toContain("<p>Second paragraph.</p>");
    });
  });

  describe("Edge cases", () => {
    test("should handle unclosed italic (single asterisk)", () => {
      const input = "The Asterisks (*) means something";
      const output = renderMarkdownToHtml(input);
      // Should render the asterisk literally, not as formatting
      expect(output).toContain("(*)");
      expect(output).not.toContain("<em>");
    });

    test("should handle unclosed bold", () => {
      const input = "This is **bold without closing";
      const output = renderMarkdownToHtml(input);
      // Should render ** literally
      expect(output).toContain("**bold without closing");
      expect(output).not.toContain("<strong>");
    });

    test("should handle unclosed italic at start", () => {
      const input = "*italic without closing";
      const output = renderMarkdownToHtml(input);
      // Should render * literally
      expect(output).toContain("*italic without closing");
      expect(output).not.toContain("<em>");
    });

    test("should handle unclosed bold+italic", () => {
      const input = "This is ***bold italic without closing";
      const output = renderMarkdownToHtml(input);
      // Should render *** literally
      expect(output).toContain("***bold italic without closing");
      expect(output).not.toContain("<strong>");
      expect(output).not.toContain("<em>");
    });

    test("should handle unclosed math", () => {
      const input = "The equation is $x + y without closing";
      const output = renderMarkdownToHtml(input);
      // Should render $ literally
      expect(output).toContain("$x + y without closing");
      expect(output).not.toContain("katex");
    });

    test("should handle unclosed code (single backtick)", () => {
      const input = "This is `unclosed code without closing";
      const output = renderMarkdownToHtml(input);
      // Should render backtick literally
      expect(output).toContain("`unclosed code without closing");
      expect(output).not.toContain("<code>");
    });

    test("should handle empty input", () => {
      const input = "";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("prose");
    });

    test("should handle empty lines", () => {
      const input = "Line 1\n\n\nLine 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("Line 1");
      expect(output).toContain("Line 2");
    });

    test("should handle math at start of line", () => {
      const input = "$x$ is the variable.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
    });

    test("should handle math at end of line", () => {
      const input = "The variable is $x$";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
    });

    test("should handle math with punctuation", () => {
      const input = "Calculate $x + y$, then proceed.";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("katex");
    });

    test("should escape HTML in text", () => {
      const input = "This is <script>alert('xss')</script> text";
      const output = renderMarkdownToHtml(input);
      expect(output).not.toContain("<script>");
      expect(output).toContain("&lt;script&gt;");
    });

    test("should handle mixed content", () => {
      const input = "# Heading\n\nThis is **bold** with $x + y$ math.\n\n* Item 1\n* Item 2";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<h1");
      expect(output).toContain(">Heading</h1>");
      expect(output).toContain("<strong>bold</strong>");
      expect(output).toContain("katex");
      expect(output).toMatch(/<ul[^>]*>/);
    });
  });

  describe("Color syntax", () => {
    test("should render basic color tag", () => {
      const input = "This is {color:important}critical{/color} text";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-red-700">critical</span>');
    });

    test("should render definition color", () => {
      const input = "{color:definition}Key term{/color}: a definition";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-sky-700">Key term</span>');
    });

    test("should render example color", () => {
      const input = "{color:example}For example{/color}, this works";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-green-700">For example</span>');
    });

    test("should render note color", () => {
      const input = "{color:note}Tip:{/color} remember this";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-amber-700">Tip:</span>');
    });

    test("should render formula color", () => {
      const input = "{color:formula}E=mc²{/color}";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-violet-600">E=mc²</span>');
    });

    test("should handle multiple colors in one line", () => {
      const input = "{color:important}Warning{/color} and {color:note}tip{/color}";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-red-700">Warning</span>');
      expect(output).toContain('<span class="text-amber-700">tip</span>');
    });

    test("should handle color inside bold", () => {
      const input = "**{color:important}bold critical{/color}**";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>");
      expect(output).toContain('<span class="text-red-700">bold critical</span>');
    });

    test("should handle bold inside color", () => {
      const input = "{color:important}**bold** text{/color}";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-red-700">');
      expect(output).toContain("<strong>bold</strong>");
    });

    test("should handle color inside italic", () => {
      const input = "*{color:definition}italic term{/color}*";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<em>");
      expect(output).toContain('<span class="text-sky-700">italic term</span>');
    });

    test("should ignore unknown color names", () => {
      const input = "{color:unknown}text{/color}";
      const output = renderMarkdownToHtml(input);
      // Unknown colors should not create a colored span
      expect(output).not.toContain('class="text-');
      // The opening tag should be rendered as literal text
      expect(output).toContain("{color:unknown}");
    });

    test("should handle color in list items", () => {
      const input = "* {color:important}Important item{/color}\n* Normal item";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ul[^>]*>/);
      expect(output).toContain('<span class="text-red-700">Important item</span>');
    });

    test("should handle color in headings", () => {
      const input = "## {color:definition}Key Concept{/color}";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<h2[^>]*>/);
      expect(output).toContain('<span class="text-sky-700">Key Concept</span>');
    });

    test("should be case-insensitive for color names", () => {
      const input = "{color:IMPORTANT}text{/color}";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain('<span class="text-red-700">text</span>');
    });

    test("should handle text without colors", () => {
      const input = "Normal text without any colors";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("Normal text without any colors");
      expect(output).not.toContain("<span");
    });

    test("should not process colors inside code blocks", () => {
      const input = "`{color:important}code{/color}`";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<code>{color:important}code{/color}</code>");
      expect(output).not.toContain("text-red-700");
    });
  });

  describe("Complex scenarios", () => {
    test("should not indent headings after list items", () => {
      const input = `Concepts & Techniques:

* Jensen's Alpha
* Beta
* Sharpe Ratio

Step-by-Step Approach:`;
      const output = renderMarkdownToHtml(input);

      // The heading "Step-by-Step Approach:" should not be nested inside the list
      // It should be a top-level paragraph or heading
      const listMatch = output.match(/<ul[^>]*>(.*?)<\/ul>/s);
      expect(listMatch).toBeTruthy();

      // "Step-by-Step Approach:" should NOT be inside the <ul> tags
      if (listMatch) {
        expect(listMatch[1]).not.toContain("Step-by-Step Approach:");
      }

      // "Step-by-Step Approach:" should be a separate element after the list
      expect(output).toMatch(/<\/ul>.*<p>Step-by-Step Approach:<\/p>/s);
    });

    test("should handle nested formatting with math", () => {
      const input = "**Bold text with $x$ and *italic with $y$* inside**";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<strong>");
      expect(output).toContain("<em>");
      expect(output).toContain("katex");
    });

    test("should handle list with math and formatting", () => {
      const input = "1. Calculate $x + y$\n2. Find **$z$** value";
      const output = renderMarkdownToHtml(input);
      expect(output).toMatch(/<ol[^>]*>/);
      expect(output).toContain("katex");
      expect(output).toContain("<strong>");
    });

    test("should handle heading with math and formatting", () => {
      const input = "# The value is **$x$**";
      const output = renderMarkdownToHtml(input);
      expect(output).toContain("<h1");
      expect(output).toContain("</h1>");
      expect(output).toContain("<strong>");
      expect(output).toContain("katex");
    });

    test("should handle complex financial calculation with multiple math blocks and formatting", () => {
      const input = `1.  **Uncover the Value of Revenues (from Part a):**
    $$ V_{Equity} = V_{Rev} - V_{Cost} $$
    $$ 6.67 = V_{Rev} - \\frac{\\text{Old Cost}}{r_f} $$
    Note: We discount costs at the **risk-free rate** (5%) because they are constant and guaranteed.
    $$ 6.67 = V_{Rev} - \\frac{1}{0.05} \\implies 6.67 = V_{Rev} - 20 $$
    $$ V_{Rev} = 26.67 \\text{ million} $$
    This $V_{Rev}$ represents the value of the risky shoe-selling business. This doesn't change just because we cut costs.`;

      const output = renderMarkdownToHtml(input);

      // Should contain ordered list
      expect(output).toMatch(/<ol[^>]*>/);
      expect(output).toContain("<li>");

      // Should contain bold text
      expect(output).toContain("<strong>Uncover the Value of Revenues (from Part a):</strong>");
      expect(output).toContain("<strong>risk-free rate</strong>");

      // Should contain katex math rendering
      expect(output).toContain("katex");

      // Should contain display math blocks
      expect(output).toMatch(/V_{Equity}/);
      expect(output).toMatch(/V_{Rev}/);
      expect(output).toMatch(/V_{Cost}/);

      // Should contain inline math
      expect(output).toMatch(/V_{Rev}/);

      // Should contain fractions
      expect(output).toMatch(/frac/);

      // Should contain text content
      expect(output).toContain("Note:");
      expect(output).toContain("because they are constant and guaranteed");
      expect(output).toContain("represents the value of the risky shoe-selling business");
    });
  });
});
