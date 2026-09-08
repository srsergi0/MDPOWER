import { useEffect, useRef, useCallback } from "react";
import { FileText } from "lucide-react";
import mermaid from "mermaid";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-rust";
import "prismjs/themes/prism-tomorrow.css";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    background: "transparent",
    primaryColor: "#3b82f6",
    primaryBorderColor: "#2563eb",
    primaryTextColor: "#1f2937",
    lineColor: "#9ca3af",
    secondaryColor: "#e5e7eb",
    tertiaryColor: "#f3f4f6",
    fontSize: "14px",
  },
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

type Props = {
  content: string;
  html?: string;
  onOpenLink?: (href: string) => void;
  onOpenExternal?: (url: string) => void;
};

export default function MarkdownViewer({ content, html, onOpenLink, onOpenExternal }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentDivRef = useRef<HTMLDivElement>(null);

  // Render Mermaid diagrams and highlight syntax when html changes
  useEffect(() => {
    const container = contentDivRef.current;
    if (!container || !html) return;

    // 1. Mermaid diagram blocks
    const mermaidBlocks = container.querySelectorAll(".mermaid-block");
    for (const block of Array.from(mermaidBlocks)) {
      const rawCode = block.getAttribute("data-code");
      if (rawCode && !block.getAttribute("data-rendered")) {
        block.setAttribute("data-rendered", "true");
        const code = decodeURIComponent(rawCode);
        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        mermaid.render(id, code)
          .then(({ svg }) => {
            block.innerHTML = svg;
            const svgEl = block.querySelector("svg");
            if (svgEl) {
              svgEl.style.maxWidth = "100%";
              svgEl.style.height = "auto";
            }
          })
          .catch((err) => {
            block.innerHTML = `<pre class="text-red-400 text-xs p-2 bg-red-950/20 rounded border border-red-500/30">${String(err)}</pre>`;
          });
      }
    }

    // 2. Syntax highlighting with Prism
    try {
      Prism.highlightAllUnder(container);
    } catch (e) {
      console.warn("Prism highlight error:", e);
    }
  }, [html]);

  // Click delegation for copy buttons and internal markdown links
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Handle copy code button
    const copyBtn = target.closest(".copy-code-btn");
    if (copyBtn) {
      e.stopPropagation();
      const rawCode = copyBtn.getAttribute("data-code");
      if (rawCode) {
        navigator.clipboard.writeText(decodeURIComponent(rawCode));
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = originalText || "Copy";
        }, 2000);
      }
      return;
    }

    // Handle all markdown links
    const link = target.closest("a");
    if (link) {
      const rawHref = link.getAttribute("href");
      if (!rawHref) return;
      const href = rawHref.trim();
      if (!href) return;
      if (/^(javascript|data|vbscript):/i.test(href)) {
        e.preventDefault();
        return;
      }
      if (href.startsWith("#")) {
        e.preventDefault();
        const id = decodeURIComponent(href.slice(1));
        if (!id) return;
        const root = contentDivRef.current;
        const el = root?.querySelector(`#${CSS.escape(id)}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
        e.preventDefault();
        if (onOpenExternal) onOpenExternal(href);
        return;
      }
      const clean = href.split("#")[0].split("?")[0].trim();
      const lower = clean.toLowerCase();
      if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
        e.preventDefault();
        if (onOpenLink) onOpenLink(href);
        return;
      }
      e.preventDefault();
    }
  }, [onOpenLink, onOpenExternal]);





  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-4">
        <FileText className="w-12 h-12" strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text-main)]">Drop markdown files or folders here</p>
          <p className="text-xs mt-1 text-[var(--text-muted)]">Drag and drop any .md file or workspace directory to start viewing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative bg-[var(--bg-editor)] text-[var(--text-main)]">
      {/* Main content scroll area */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overflow-x-auto px-8 py-8 relative custom-scrollbar scroll-smooth"
        id="markdown-content-scroll"
        onClick={handleContainerClick}
      >
        <div
          ref={contentDivRef}
          className="max-w-3xl mx-auto pt-14 markdown-rendered-content"
          dangerouslySetInnerHTML={{ __html: html || "<div class='text-sm text-[var(--text-muted)] animate-pulse'>Compiling Markdown with Bun...</div>" }}
        />
      </div>
    </div>
  );
}
