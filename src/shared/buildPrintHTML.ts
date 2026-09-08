
export type PrintOptions = {
  pageSize: "a4" | "letter" | "legal";
  orientation: "portrait" | "landscape";
  margins: "none" | "narrow" | "normal" | "wide";
  lineNumbers: boolean;
  tableOfContents: boolean;
};

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  pageSize: "a4",
  orientation: "portrait",
  margins: "normal",
  lineNumbers: false,
  tableOfContents: false,
};

const PAGE_SIZES: Record<PrintOptions["pageSize"], string> = {
  a4: "210mm 297mm",
  letter: "215.9mm 279.4mm",
  legal: "215.9mm 355.6mm",
};

const MARGINS: Record<PrintOptions["margins"], string> = {
  none: "0",
  narrow: "12.7mm",
  normal: "25.4mm",
  wide: "38.1mm",
};

function getPrintCSS(options: PrintOptions): string {
  const pageSize = PAGE_SIZES[options.pageSize];
  const margins = MARGINS[options.margins];
  const [width, height] = pageSize.split(" ");
  const landscapeSize =
    options.orientation === "landscape" ? `${height} ${width}` : pageSize;

  return `
    @page {
      size: ${landscapeSize};
      margin: ${margins};
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      margin: 0;
      padding: 0;
    }

    .markdown-body {
      max-width: 100%;
      padding: 0;
    }

    h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; page-break-after: avoid; }
    h2 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0; page-break-after: avoid; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 0.83em 0; page-break-after: avoid; }
    h4 { font-size: 1em; font-weight: 600; margin: 1em 0; page-break-after: avoid; }
    h5 { font-size: 0.875em; font-weight: 600; margin: 1.17em 0; page-break-after: avoid; }
    h6 { font-size: 0.85em; font-weight: 600; margin: 1.17em 0; color: #666; page-break-after: avoid; }

    p { margin: 0 0 1em 0; }

    a { color: #1a1a1a; text-decoration: underline; }

    ul, ol { margin: 0 0 1em 0; padding-left: 2em; }
    li { margin-bottom: 0.25em; }

    blockquote {
      border-left: 3px solid #ccc;
      margin: 0 0 1em 0;
      padding: 0.5em 0 0.5em 1em;
      color: #555;
    }

    code {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
      font-size: 0.9em;
      background: #f5f5f5;
      padding: 0.15em 0.3em;
      border-radius: 3px;
    }

    pre {
      background: #f5f5f5;
      border-radius: 6px;
      padding: 1em;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1em 0;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 0.5em 0.75em;
      text-align: left;
    }

    th { background: #f5f5f5; font-weight: 600; }

    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    .line-number {
      display: inline-block;
      width: 2.5em;
      text-align: right;
      padding-right: 1em;
      color: #999;
      user-select: none;
      -webkit-user-select: none;
    }

    .toc {
      margin-bottom: 2em;
      padding: 1em;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fafafa;
      page-break-after: always;
    }

    .toc h2 {
      font-size: 1.25em;
      margin: 0 0 0.5em 0;
    }

    .toc ul {
      list-style: none;
      padding-left: 1em;
      margin: 0;
    }

    .toc li {
      margin-bottom: 0.25em;
    }

    .toc a {
      text-decoration: none;
      color: #333;
    }
  `;
}

function buildTOC(markdown: string): string {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)/.exec(line);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ level, text, id });
    }
  }

  if (headings.length === 0) return "";

  let html = '<div class="toc"><h2>Table of Contents</h2><ul>';
  let prevLevel = 0;

  for (const h of headings) {
    if (h.level > prevLevel) {
      for (let i = prevLevel; i < h.level; i++) html += "<ul>";
    } else if (h.level < prevLevel) {
      for (let i = h.level; i < prevLevel; i++) html += "</ul>";
    }
    html += `<li><a href="#${h.id}">${h.text}</a></li>`;
    prevLevel = h.level;
  }

  for (let i = 1; i < prevLevel; i++) html += "</ul>";
  html += "</ul></div>";
  return html;
}

function addHeadingIDs(html: string): string {
  return html.replace(
    /<h([1-6])>(.*?)<\/h([1-6])>/g,
    (_, level, content, _level2) => {
      const text = content.replace(/<[^>]+>/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h${level} id="${id}">${content}</h${level}>`;
    },
  );
}

function addLineNumbers(html: string): string {
  return html.replace(
    /<pre>([\s\S]*?)<\/pre>/g,
    (_match, codeContent: string) => {
      const lines = codeContent.split("\n");
      const numbered = lines
        .map(
          (line: string, i: number) =>
            `<span class="line-number">${i + 1}</span>${line}`,
        )
        .join("\n");
      return `<pre>${numbered}</pre>`;
    },
  );
}

export async function markdownToHTML(markdown: string): Promise<string> {
  return (Bun as any).markdown.html(markdown, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    headings: { ids: true },
    autolinks: true,
    latexMath: true,
  });
}

const STANDALONE_CSS = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif;
    font-size: 16px; line-height: 1.7; color: #1a1a1a; max-width: 800px;
    margin: 0 auto; padding: 32px 24px; background: #fff;
  }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
  h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  p { margin-bottom: 1em; }
  a { color: #0366d6; text-decoration: underline; }
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  blockquote { border-left: 3px solid #ddd; margin: 0 0 1em; padding: 0.5em 1em; color: #666; }
  code { font-family: "SF Mono", "Fira Code", monospace; font-size: 0.9em; background: #f5f5f5; padding: 0.15em 0.3em; border-radius: 3px; }
  pre { background: #f5f5f5; border-radius: 6px; padding: 1em; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  th, td { border: 1px solid #ddd; padding: 0.5em 0.75em; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  img { max-width: 100%; height: auto; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #e0e0e0; }
    h1, h2 { border-bottom-color: #333; }
    a { color: #58a6ff; }
    blockquote { border-left-color: #444; color: #999; }
    code { background: #2d2d2d; }
    pre { background: #2d2d2d; }
    th, td { border-color: #444; }
    th { background: #2d2d2d; }
    hr { border-top-color: #333; }
  }
`;

export async function buildStandaloneHTML(markdown: string): Promise<string> {
  const html = await markdownToHTML(markdown);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Document</title>
<style>${STANDALONE_CSS}</style>
</head>
<body>
<div class="markdown-body">${html}</div>
</body>
</html>`;
}

export async function buildPrintHTML(
  markdown: string,
  options: PrintOptions,
): Promise<string> {
  let html = await markdownToHTML(markdown);

  if (options.tableOfContents) {
    const toc = buildTOC(markdown);
    html = toc + html;
  }

  html = addHeadingIDs(html);

  if (options.lineNumbers) {
    html = addLineNumbers(html);
  }

  const css = getPrintCSS(options);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print</title>
  <style>${css}</style>
</head>
<body>
  <div class="markdown-body">${html}</div>
</body>
</html>`;
}
