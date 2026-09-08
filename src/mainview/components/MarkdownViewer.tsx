import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "../App";
import MermaidRenderer from "./MermaidRenderer";
import { FileText, ChevronRight, Check } from "lucide-react";

type Props = {
  content: string;
  onOpenLink?: (href: string) => void;
  scrollToLine?: { line: number; timestamp: number } | null;
};

type HeadingItem = {
  text: string;
  level: number;
  id: string;
  parentId: string | null;
};

// Helper to extract text content from react-markdown children recursively
const getHeadingText = (children: React.ReactNode): string => {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map(getHeadingText).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return getHeadingText((children as any).props.children);
  }
  return "";
};

// Helper to generate a clean anchor ID from text
const getHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// Helper to parse headings directly from raw markdown string
const extractHeadings = (markdown: string) => {
  const lines = markdown.split("\n");
  const list: HeadingItem[] = [];
  let inCodeBlock = false;
  
  const levelParents: Record<number, string | null> = {
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const cleanText = rawText
        .replace(/[*_`[\]]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      const id = getHeadingId(cleanText);
      
      const parentId = level > 1 ? levelParents[level - 1] : null;
      levelParents[level] = id;
      for (let l = level + 1; l <= 6; l++) {
        levelParents[l] = null;
      }
      
      list.push({ text: cleanText, level, id, parentId });
    }
  }
  return list;
};

function BreadcrumbSegment({
  item,
  headings,
  onSelect,
}: {
  item: HeadingItem;
  headings: HeadingItem[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const siblings = useMemo(() => {
    return headings.filter(
      (h) => h.level === item.level && h.parentId === item.parentId
    );
  }, [headings, item]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center h-full"
    >
      <button
        onClick={() => onSelect(item.id)}
        className={`px-2 py-0.5 rounded transition-all text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[var(--accent-hover)] font-medium truncate max-w-[140px] text-xs ${
          open ? "text-[var(--accent-blue)] bg-[var(--accent-hover)]" : ""
        }`}
      >
        {item.text}
      </button>

      {/* Segment Sibling Dropdown Menu */}
      {open && siblings.length > 1 && (
        <div 
          className="absolute left-0 mt-1 min-w-[200px] max-w-[280px] bg-[var(--bg-sidebar)]/90 backdrop-blur-xl border border-[var(--border-main)] rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1 z-50 animate-scale-in max-h-60 overflow-y-auto custom-scrollbar select-none flex flex-col gap-0.5"
          style={{ top: "100%" }}
        >
          {siblings.map((sibling) => {
            const isSelf = sibling.id === item.id;
            return (
              <button
                key={sibling.id}
                onClick={() => {
                  onSelect(sibling.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs truncate rounded-lg transition-all duration-150 flex items-center justify-between hover:translate-x-0.5 ${
                  isSelf 
                    ? "text-[var(--accent-blue)] bg-[var(--accent-hover)] font-semibold" 
                    : "text-[var(--text-main)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
                }`}
              >
                <span className="truncate">{sibling.text}</span>
                {isSelf && <Check className="w-3.5 h-3.5 text-[var(--accent-blue)] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CodeBlock({
  className,
  children,
  style,
}: {
  className?: string;
  children?: React.ReactNode;
  style: Record<string, React.CSSProperties>;
}) {
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");
  if (match) {
    if (match[1] === "mermaid") {
      return <MermaidRenderer code={code} />;
    }
    return (
      <SyntaxHighlighter
        style={style}
        language={match[1]}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: "6px", fontSize: "13px" }}
      >
        {code}
      </SyntaxHighlighter>
    );
  }
  return (
    <code className="bg-[var(--bg-sidebar)] text-[var(--text-main)] px-1 py-0.5 rounded text-[13px] border border-[var(--border-main)]/50">
      {children}
    </code>
  );
}

export default function MarkdownViewer({ content, onOpenLink, scrollToLine }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const highlighterStyle = isDark ? oneDark : oneLight;

  const headings = useMemo(() => extractHeadings(content), [content]);

  const [activeId, setActiveId] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Ref to lock scroll spy during smooth scroll navigation
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to targeted line from search result click
  useEffect(() => {
    if (scrollToLine && scrollContainerRef.current) {
      const line = scrollToLine.line;
      const container = scrollContainerRef.current;
      // Find all elements with data-line attribute
      const elements = Array.from(container.querySelectorAll("[data-line]"));
      if (elements.length === 0) return;

      // Find the closest element that starts at or before the target line
      let closestEl: HTMLElement | null = null;
      let closestDiff = Infinity;

      for (const el of elements) {
        const elLine = parseInt(el.getAttribute("data-line") || "0", 10);
        if (elLine > 0) {
          const diff = line - elLine;
          if (diff >= 0 && diff < closestDiff) {
            closestDiff = diff;
            closestEl = el as HTMLElement;
          }
        }
      }

      // Fallback: if we didn't find any element starting before it, use the first element
      if (!closestEl && elements.length > 0) {
        closestEl = elements[0] as HTMLElement;
      }

      if (closestEl) {
        // Scroll element to center of screen
        closestEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight matching block element with pulse animation
        closestEl.classList.remove("highlight-pulse");
        void closestEl.offsetWidth; // Trigger reflow to restart animation
        closestEl.classList.add("highlight-pulse");
        
        const targetEl = closestEl;
        setTimeout(() => {
          targetEl.classList.remove("highlight-pulse");
        }, 2500);
      }
    }
  }, [scrollToLine]);

  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const headers = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headers.length === 0) return;

    // Boundary check: if scrolled to the very bottom, activate the last heading
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 15;
    if (isAtBottom) {
      setActiveId(headers[headers.length - 1].id);
      return;
    }

    let currentActive = headers[0].id;
    const containerRect = container.getBoundingClientRect();
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const rect = header.getBoundingClientRect();
      if (rect.top - containerRect.top <= 140) {
        currentActive = header.id;
      } else {
        break;
      }
    }
    
    setActiveId(currentActive);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    handleScroll();
    
    const timer = setTimeout(() => {
      handleScroll();
    }, 150);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [content, handleScroll]);

  // Compute active hierarchy path (e.g. H1 > H2 > H3)
  const activePath = useMemo(() => {
    if (!activeId || headings.length === 0) return [];
    
    const path: HeadingItem[] = [];
    let current = headings.find(h => h.id === activeId);
    
    while (current) {
      path.push(current);
      const parentId: string | null = current.parentId;
      if (parentId) {
        current = headings.find((h) => h.id === parentId);
      } else {
        break;
      }
    }
    
    return path.reverse();
  }, [activeId, headings]);

  const handleSegmentSelect = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Lock the scroll spy to prevent intermediate segment jumping during smooth scrolling
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    // Instantly set the active ID so breadcrumbs update immediately
    setActiveId(id);

    el.scrollIntoView({ behavior: "smooth" });

    // Unlock scroll spy after smooth scroll completes (typically ~800ms)
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  }, []);

  const components: Components = {
    h1: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h1
          id={id}
          data-line={node?.position?.start?.line}
          className="text-3xl font-bold mt-8 mb-4 text-[var(--text-main)] pb-2 border-b border-[var(--border-main)] scroll-mt-20"
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h2
          id={id}
          data-line={node?.position?.start?.line}
          className="text-2xl font-bold mt-6 mb-3 text-[var(--text-main)] pb-1 scroll-mt-20"
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h3
          id={id}
          data-line={node?.position?.start?.line}
          className="text-xl font-semibold mt-5 mb-2 text-[var(--text-main)] scroll-mt-20"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h4
          id={id}
          data-line={node?.position?.start?.line}
          className="text-lg font-semibold mt-4 mb-2 text-[var(--text-main)] scroll-mt-20"
          {...props}
        >
          {children}
        </h4>
      );
    },
    h5: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h5
          id={id}
          data-line={node?.position?.start?.line}
          className="text-base font-semibold mt-3 mb-1 text-[var(--text-main)] scroll-mt-20"
          {...props}
        >
          {children}
        </h5>
      );
    },
    h6: ({ node, children, ...props }) => {
      const text = getHeadingText(children);
      const id = getHeadingId(text);
      return (
        <h6
          id={id}
          data-line={node?.position?.start?.line}
          className="text-sm font-semibold mt-3 mb-1 text-[var(--text-muted)] scroll-mt-20"
          {...props}
        >
          {children}
        </h6>
      );
    },
    p: ({ node, children, ...props }) => (
      <p data-line={node?.position?.start?.line} className="mb-3 leading-[1.7] text-[var(--text-main)]" {...props}>
        {children}
      </p>
    ),
    a: ({ node, children, href, ...props }) => {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (
          href &&
          (href.toLowerCase().endsWith(".md") || href.toLowerCase().endsWith(".markdown")) &&
          !/^https?:\/\//i.test(href) &&
          onOpenLink
        ) {
          e.preventDefault();
          onOpenLink(href);
        }
      };
      return (
        <a
          href={href}
          onClick={handleClick}
          className="text-[var(--accent-blue)] underline decoration-[var(--border-main)] underline-offset-2 hover:decoration-[var(--accent-blue)]"
          target={href && /^https?:\/\//i.test(href) ? "_blank" : undefined}
          rel="noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    ul: ({ node, children, ...props }) => (
      <ul data-line={node?.position?.start?.line} className="list-disc pl-6 mb-3 space-y-1 text-[var(--text-main)]" {...props}>
        {children}
      </ul>
    ),
    ol: ({ node, children, ...props }) => (
      <ol data-line={node?.position?.start?.line} className="list-decimal pl-6 mb-3 space-y-1 text-[var(--text-main)]" {...props}>
        {children}
      </ol>
    ),
    li: ({ node, children, ...props }) => (
      <li data-line={node?.position?.start?.line} className="leading-[1.7]" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ node, children, ...props }) => (
      <blockquote
        data-line={node?.position?.start?.line}
        className="border-l-2 border-[var(--border-main)] pl-4 py-1 mb-3 text-[var(--text-muted)]"
        {...props}
      >
        {children}
      </blockquote>
    ),
    code: ({ node, className, children, ...props }) => {
      if (className) {
        return (
          <CodeBlock className={className} style={highlighterStyle}>
            {children}
          </CodeBlock>
        );
      }
      return (
        <code
          className="bg-[var(--bg-sidebar)] text-[var(--text-main)] px-1 py-0.5 rounded text-[13px] border border-[var(--border-main)]/50"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ node, children, ...props }) => (
      <pre data-line={node?.position?.start?.line} className="mb-3 rounded-lg overflow-x-auto" {...props}>
        {children}
      </pre>
    ),
    table: ({ node, children, ...props }) => (
      <div data-line={node?.position?.start?.line} className="overflow-x-auto mb-3">
        <table className="min-w-full border-collapse border border-[var(--border-main)]" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ node, children, ...props }) => (
      <thead className="bg-[var(--bg-sidebar)]" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ node, children, ...props }) => (
      <tbody className="divide-y divide-[var(--border-main)]" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ node, children, ...props }) => (
      <tr className="hover:bg-[var(--accent-hover)]" {...props}>
        {children}
      </tr>
    ),
    th: ({ node, children, ...props }) => (
      <th className="border border-[var(--border-main)] px-3 py-1.5 text-left font-medium text-[var(--text-main)]" {...props}>
        {children}
      </th>
    ),
    td: ({ node, children, ...props }) => (
      <td className="border border-[var(--border-main)] px-3 py-1.5 text-[var(--text-main)]" {...props}>
        {children}
      </td>
    ),
    hr: ({ node, ...props }) => (
      <hr data-line={node?.position?.start?.line} className="my-6 border-[var(--border-main)]" {...props} />
    ),
    img: ({ node, src, alt, ...props }) => (
      <img
        data-line={node?.position?.start?.line}
        src={src}
        alt={alt || ""}
        className="max-w-full h-auto rounded my-4 mx-auto"
        loading="lazy"
        {...props}
      />
    ),
    strong: ({ node, children, ...props }) => (
      <strong className="font-semibold text-[var(--text-main)]" {...props}>
        {children}
      </strong>
    ),
    em: ({ node, children, ...props }) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
    del: ({ node, children, ...props }) => (
      <del className="line-through text-[var(--text-muted)]" {...props}>
        {children}
      </del>
    ),
    input: ({ node, type, checked, ...props }) => {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-1.5"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
    details: ({ node, children, ...props }) => (
      <details className="mb-3" {...props}>
        {children}
      </details>
    ),
    summary: ({ node, children, ...props }) => (
      <summary className="cursor-pointer font-medium text-[var(--text-main)] hover:text-[var(--text-muted)]" {...props}>
        {children}
      </summary>
    ),
  };

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
      {/* Floating Glass Breadcrumbs Bar */}
      {activePath.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-[var(--bg-sidebar)]/85 backdrop-blur-md border border-[var(--border-main)] rounded-full px-4 py-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.45)] select-none">
          {activePath.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              )}
              <BreadcrumbSegment
                item={item}
                headings={headings}
                onSelect={handleSegmentSelect}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main content scroll area */}
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto px-8 py-8 relative custom-scrollbar scroll-smooth" 
        id="markdown-content-scroll"
      >
        <div className="max-w-3xl mx-auto pt-14">
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </Markdown>
        </div>
      </div>
    </div>
  );
}
