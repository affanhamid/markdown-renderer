import { renderMarkdownToHtml } from './dist/index.js';
import fs from 'fs';

// Comprehensive markdown that exercises EVERY feature
const markdown = `# H1 Heading - Main Title

## H2 Heading - Section Title

### H3 Heading - Subsection

#### H4 Heading - Sub-subsection

##### H5 Heading - Smallest Heading

This is a paragraph with **bold text**, *italic text*, and ***bold and italic*** text.

## Text Formatting Showcase

Multiple formatting in one line: **bold** and *italic* and ***both***.

Bagging stands for **B**ootstrap **Agg**regat**ing**.

## Lists

### Unordered Lists (Asterisk)

* First item
* Second item
* Third item

### Unordered Lists (Dash)

- Alpha
- Beta
- Gamma

### Ordered Lists

1. First step
2. Second step
3. Third step

### Nested Lists (2+ levels deep)

* Level 1 item
  * Level 2 item A
    * Level 3 item i
    * Level 3 item ii
  * Level 2 item B
* Level 1 item 2

### Mixed Nested Lists

1. Ordered level 1
   * Unordered level 2
     1. Ordered level 3
     2. Another ordered level 3
   * Back to unordered level 2
2. Ordered level 1 continued
   - Dash unordered level 2
   - Another dash item

### List with Inline Math

- In EV, we averaged the money: $p_1 c_1 + \\ldots$
- In EU, we average the utility: $p_1 u(c_1) + \\ldots$

## Code

### Inline Code

This is \`inline code\` in a sentence. Use \`var\` or \`let\` for variables.

### Block Code Without Language

\`\`\`
const x = 5;
console.log(x);
\`\`\`

### Block Code With Language (Non-Executable)

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

### Executable Python Code Block

\`\`\`python
# This is executable!
print("Hello, World!")
x = 42
print(x)
numbers = [1, 2, 3]
print(numbers)
\`\`\`

### Executable R Code Block

\`\`\`r
# This is executable!
print("Hello from R!")
x <- 42
print(x)
\`\`\`

## Math

### Inline Math

The value is $x + y$. Calculate $x$ and $y$ values.

The expectation is $E^*$ and the variable is $X$s.

### Math with Currency (Not Rendered as Math)

The price is $20. It costs $14m.

### Escaped Dollar Signs

The price is \\$1.

### Math in Quotes

The value is "$x + y$" and "$z$".

### Math with Percent

Pays an $x$% coupon on a $14m bond.

### Math Followed by Em-Dash

Because $L^*(\\theta)$ requires knowing the "true distribution" $P(X, Y)$—aka, knowing every possible future outcome.

### Math with Brackets (Triggers left/right)

Calculate ($x + y$).

The value is [$a + b$].

The set is {$c + d$}.

Complex expression: ($E[X|A_i] = \\frac{E[X 1_{A_i}]}{P(A_i)}$)

### Display Math (Single Line)

$$\\pi P = \\pi$$

$$x + y = z$$

### Display Math (Multi-line)

$$
x + y = z
$$

$$
\\begin{aligned}
&\\textbf{Dr } \\text{Investment Property} && £3.5\\text{m} \\\\
&\\quad \\textbf{Cr } \\text{Fair Value Gain (P\\&L)} && £3.5\\text{m}
\\end{aligned}
$$

## Math Inside Formatting

The value is **$x + y$**.

The value is *$x + y$*.

The value is ***$x + y$***.

The expectation is **$E^*$**.

## Colors

### Basic Colors

This is {color:important}critical{/color} text.

{color:definition}Key term{/color}: a definition.

{color:example}For example{/color}, this works.

{color:note}Tip:{/color} remember this.

{color:formula}E=mc²{/color}

### Multiple Colors

{color:important}Warning{/color} and {color:note}tip{/color}.

### Color Inside Formatting

**{color:important}bold critical{/color}**

*{color:definition}italic term{/color}*

### Formatting Inside Color

{color:important}**bold** text{/color}

{color:definition}*italic* content{/color}

### Color in List Items

* {color:important}Important item{/color}
* Normal item
* {color:example}Example item{/color}

### Color in Headings

## {color:definition}Key Concept{/color}

## Horizontal Rule

Text before the rule.

---

Text after the rule.

## Images

### Block Image

![Example Image](/images/example.png)

### Inline Image

Here is an image ![photo](/images/photo.png) in a sentence.

### Multiple Images

![First](/images/first.png)
![Second](/images/second.png)

### Image with Empty Alt

![](/images/placeholder.png)

## Complex Mixed Scenario

# Financial Calculation Example

1. **Uncover the Value of Revenues (from Part a):**
   $$ V_{Equity} = V_{Rev} - V_{Cost} $$
   $$ 6.67 = V_{Rev} - \\frac{\\text{Old Cost}}{r_f} $$
   Note: We discount costs at the **risk-free rate** (5%) because they are {color:important}constant and guaranteed{/color}.
   $$ 6.67 = V_{Rev} - \\frac{1}{0.05} \\implies 6.67 = V_{Rev} - 20 $$
   $$ V_{Rev} = 26.67 \\text{ million} $$
   This $V_{Rev}$ represents the value of the {color:formula}risky shoe-selling business{/color}.

## Edge Cases

### Unclosed Formatting

The Asterisks (*) means something.

This is **bold without closing.

*italic without closing.

### Unclosed Math

The equation is $x + y without closing.

### Code Inside Formatting

Code like \`**bold**\` should not be formatted.

### Color Not Processed in Code

\`{color:important}code{/color}\`

## All Features Combined

### {color:definition}Ultimate Test{/color}

This section combines **everything**:

1. **Bold text** with *italic* and ***both***
2. Math expressions: $x + y = z$ and ($a^2 + b^2$)
3. {color:important}Colored text{/color} with **{color:example}colored bold{/color}**
4. Inline code: \`const x = 5\`
5. Lists with nested items:
   * First level
     - Second level with {color:note}color{/note}
     - More items with $\\alpha$ math
       1. Third level ordered
       2. With **formatting**

Here's a formula: $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

And an image: ![example](/images/final.png)

---

**End of comprehensive example!**
`;

// Render the markdown to HTML
const renderedContent = renderMarkdownToHtml(markdown, {
  executableLanguages: ['python', 'r']
});

// Create the full HTML page
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Renderer - Comprehensive Example</title>

  <!-- KaTeX CSS for math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    h1, h2, h3, h4, h5 {
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    p {
      margin-bottom: 1rem;
    }
    pre {
      margin: 1rem 0;
    }
    .md-code-output {
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
      border: 1px solid #e0e0e0;
      border-top: none;
      border-radius: 0 0 0.375rem 0.375rem;
      margin-top: -1px;
    }
    hr {
      margin: 2rem 0;
      border: none;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    ${renderedContent}
  </div>

  <script>
    // Simulate the Run button behavior for executable code blocks
    document.addEventListener('DOMContentLoaded', function() {
      const headers = document.querySelectorAll('.md-code-block-header');

      headers.forEach(header => {
        // Skip if button already exists
        if (header.querySelector('.md-run-btn')) return;

        const codeBlock = header.parentElement;
        const language = codeBlock.getAttribute('data-language');
        const codeIndex = codeBlock.getAttribute('data-code-index');
        const codeElement = codeBlock.querySelector('code[data-executable]');
        const outputElement = codeBlock.querySelector(\`.md-code-output[data-output-for="\${codeIndex}"]\`);

        if (!codeElement || !outputElement) return;

        // Create Run button
        const runBtn = document.createElement('button');
        runBtn.className = 'md-run-btn';
        runBtn.textContent = 'Run';
        runBtn.style.cssText = 'padding:0.2rem 0.6rem;font-size:0.75rem;border-radius:0.25rem;border:1px solid #ccc;background:#fff;cursor:pointer;font-family:inherit;transition:background 0.2s';

        runBtn.addEventListener('mouseenter', () => {
          runBtn.style.background = '#f0f0f0';
        });

        runBtn.addEventListener('mouseleave', () => {
          if (!runBtn.disabled) {
            runBtn.style.background = '#fff';
          }
        });

        runBtn.addEventListener('click', async function() {
          const code = codeElement.textContent;

          // Disable button and show running state
          runBtn.disabled = true;
          runBtn.textContent = 'Running...';
          runBtn.style.background = '#e0e0e0';
          outputElement.style.display = 'block';
          outputElement.textContent = 'Running...';
          outputElement.style.background = '#f7f7f7';
          outputElement.style.color = '#333';

          // Simulate async execution with setTimeout
          await new Promise(resolve => setTimeout(resolve, 800));

          // Mock output based on language
          let mockOutput;
          if (language === 'python') {
            mockOutput = 'Hello, World!\\n42\\n[1, 2, 3]';
          } else if (language === 'r') {
            mockOutput = '[1] "Hello from R!"\\n[1] 42';
          } else {
            mockOutput = 'Execution completed.';
          }

          // Display the output
          outputElement.textContent = mockOutput;
          outputElement.style.background = '#f7f7f7';
          outputElement.style.color = '#333';

          // Re-enable button
          runBtn.disabled = false;
          runBtn.textContent = 'Run';
          runBtn.style.background = '#fff';
        });

        header.appendChild(runBtn);
      });
    });
  </script>
</body>
</html>
`;

// Write the result to example.html
fs.writeFileSync('example.html', fullHtml, 'utf8');

console.log('✓ Generated example.html successfully!');
console.log('  Open example.html in your browser to see the comprehensive markdown rendering.');
