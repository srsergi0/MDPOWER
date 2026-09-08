import { BrowserWindow, BrowserView, Utils } from "electrobun/bun";
import { watch, type FSWatcher } from "fs";
import { readdir } from "fs/promises";
import { join, basename } from "path";
import type { MarkdownReaderRPC, FileEntry } from "../shared/types";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
  try {
    await fetch(DEV_SERVER_URL, { method: "HEAD", signal: AbortSignal.timeout(300) });
    console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
    return DEV_SERVER_URL;
  } catch {
    console.log("Using bundled assets.");
  }
  return "views://mainview/index.html";
}

let currentWatcher: FSWatcher | null = null;
let currentWatchedPath: string | null = null;

let currentFolderWatcher: FSWatcher | null = null;
let currentWatchedFolder: string | null = null;
let folderRescanTimeout: ReturnType<typeof setTimeout> | null = null;

class SearchIndexer {
  private cache = new Map<string, { filename: string; lines: { raw: string; lower: string }[] }>();
  private folderPath: string | null = null;

  async indexFile(filePath: string, filename: string) {
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();
      if (exists) {
        const content = await file.text();
        const rawLines = content.split(/\r?\n/);
        const lines = rawLines.map(line => ({
          raw: line,
          lower: line.toLowerCase()
        }));
        this.cache.set(filePath, { filename, lines });
      } else {
        this.cache.delete(filePath);
      }
    } catch (err) {
      console.error(`Error indexing file ${filePath}:`, err);
    }
  }

  removeFile(filePath: string) {
    this.cache.delete(filePath);
  }

  clear() {
    this.cache.clear();
    this.folderPath = null;
  }

  async indexFolder(dir: string) {
    if (this.folderPath === dir && this.cache.size > 0) {
      return; // Already indexed
    }
    this.clear();
    this.folderPath = dir;

    const filesToProcess: { path: string; name: string }[] = [];

    const walk = async (currentDir: string) => {
      try {
        const items = await readdir(currentDir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = join(currentDir, item.name);
          if (item.isDirectory()) {
            if (item.name !== "node_modules" && !item.name.startsWith(".")) {
              await walk(fullPath);
            }
          } else if (item.name.endsWith(".md") || item.name.endsWith(".markdown")) {
            filesToProcess.push({ path: fullPath, name: item.name });
          }
        }
      } catch (err) {
        console.error(`Walk error in indexFolder:`, err);
      }
    };

    await walk(dir);

    // Concurrently process files in batches of 20
    const concurrency = 20;
    for (let i = 0; i < filesToProcess.length; i += concurrency) {
      const batch = filesToProcess.slice(i, i + concurrency);
      await Promise.all(batch.map(file => this.indexFile(file.path, file.name)));
    }

    console.log(`Finished indexing folder: ${dir}. Total indexed files: ${this.cache.size}`);
  }

  search(query: string): { path: string; filename: string; line: number; content: string }[] {
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    const results: { path: string; filename: string; line: number; content: string }[] = [];

    for (const [filePath, fileData] of this.cache.entries()) {
      const lines = fileData.lines;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].lower.includes(lowerQ)) {
          results.push({
            path: filePath,
            filename: fileData.filename,
            line: i + 1,
            content: lines[i].raw.trim()
          });
        }
      }
    }
    return results;
  }
}

const indexer = new SearchIndexer();


async function scanDir(dir: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  try {
    const items = await readdir(dir, { withFileTypes: true });
    const sorted = items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const item of sorted) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name === "node_modules" || item.name.startsWith(".")) {
          continue;
        }
        const children = await scanDir(fullPath);
        entries.push({ name: item.name, path: fullPath, isDirectory: true, children });
      } else if (item.name.endsWith(".md") || item.name.endsWith(".markdown")) {
        entries.push({ name: item.name, path: fullPath, isDirectory: false });
      }
    }
  } catch { }
  return entries;
}

function getInitialFilePath(): string | null {
  for (let i = 1; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.endsWith(".md") || arg.endsWith(".markdown")) {
      return arg;
    }
  }
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function compileMarkdownWithBun(markdown: string): string {
  return (Bun as any).markdown.render(markdown, {
    heading: (children: string, meta: any) =>
      `<h${meta.level} id="${meta.id || ''}" class="heading-${meta.level} font-bold text-[var(--text-main)] scroll-mt-20 my-4">${children}</h${meta.level}>\n`,
    paragraph: (children: string) =>
      `<p class="mb-3 leading-[1.7] text-[var(--text-main)]">${children}</p>\n`,
    code: (children: string, meta: any) => {
      const lang = meta?.language || '';
      if (lang === 'mermaid') {
        return `<div class="mermaid-block my-4" data-code="${encodeURIComponent(children)}"><div class="mermaid">${escapeHtml(children)}</div></div>\n`;
      }
      return `<div class="code-wrapper relative my-4 rounded-lg overflow-hidden border border-[var(--border-main)]"><div class="code-header flex items-center justify-between px-3 py-1.5 text-xs bg-[var(--bg-sidebar)] text-[var(--text-muted)] border-b border-[var(--border-main)] font-mono font-medium"><span>${lang || 'text'}</span><button class="copy-code-btn px-2 py-0.5 rounded hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)] transition-colors cursor-pointer" data-code="${encodeURIComponent(children)}">Copy</button></div><pre class="code-block p-4 overflow-x-auto bg-[var(--bg-sidebar)]/50 font-mono text-sm leading-relaxed"><code class="language-${lang}">${escapeHtml(children)}</code></pre></div>\n`;
    },
    codespan: (children: string) =>
      `<code class="bg-[var(--bg-sidebar)] text-[var(--text-main)] px-1.5 py-0.5 rounded text-[13px] border border-[var(--border-main)]/50 font-mono">${children}</code>`,
    blockquote: (children: string) =>
      `<blockquote class="border-l-4 border-[var(--accent-blue)] pl-4 py-1 my-3 text-[var(--text-muted)] italic bg-[var(--bg-sidebar)]/30 rounded-r">${children}</blockquote>\n`,
    link: (children: string, meta: any) =>
      `<a href="${meta.href}" ${meta.title ? `title="${escapeHtml(meta.title)}"` : ''} class="md-link text-[var(--accent-blue)] underline decoration-[var(--border-main)] underline-offset-2 hover:decoration-[var(--accent-blue)]">${children}</a>`,
    table: (children: string) =>
      `<div class="overflow-x-auto my-4 rounded-lg border border-[var(--border-main)]"><table class="min-w-full border-collapse divide-y divide-[var(--border-main)]">${children}</table></div>\n`,
    thead: (children: string) => `<thead class="bg-[var(--bg-sidebar)]">${children}</thead>\n`,
    tbody: (children: string) => `<tbody class="divide-y divide-[var(--border-main)]">${children}</tbody>\n`,
    tr: (children: string) => `<tr class="hover:bg-[var(--accent-hover)] transition-colors">${children}</tr>\n`,
    th: (children: string, meta: any) =>
      `<th class="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] ${meta?.align ? `text-${meta.align}` : ''}">${children}</th>\n`,
    td: (children: string, meta: any) =>
      `<td class="px-3 py-2 text-sm text-[var(--text-main)] ${meta?.align ? `text-${meta.align}` : ''}">${children}</td>\n`,
    list: (children: string, meta: any) =>
      meta.ordered
        ? `<ol class="list-decimal pl-6 my-3 space-y-1 text-[var(--text-main)]" ${meta.start ? `start="${meta.start}"` : ''}>${children}</ol>\n`
        : `<ul class="list-disc pl-6 my-3 space-y-1 text-[var(--text-main)]">${children}</ul>\n`,
    listItem: (children: string, meta: any) => {
      if (meta.checked !== undefined) {
        return `<li class="flex items-center gap-2 list-none text-[var(--text-main)]"><input type="checkbox" ${meta.checked ? 'checked' : ''} disabled class="rounded accent-[var(--accent-blue)] pointer-events-none" /><span>${children}</span></li>\n`;
      }
      return `<li class="leading-relaxed text-[var(--text-main)]">${children}</li>\n`;
    },
    hr: () => `<hr class="my-6 border-[var(--border-main)]" />\n`,
    strong: (children: string) => `<strong class="font-semibold text-[var(--text-main)]">${children}</strong>`,
    emphasis: (children: string) => `<em class="italic">${children}</em>`,
    strikethrough: (children: string) => `<del class="line-through text-[var(--text-muted)]">${children}</del>`,
  }, {
    tables: true,
    strikethrough: true,
    tasklists: true,
    headings: { ids: true },
    latexMath: true,
    autolinks: true,
  });
}

const rpc = BrowserView.defineRPC<MarkdownReaderRPC>({
  handlers: {
    requests: {
      openFileDialog: async () => {
        const paths = await Utils.openFileDialog({
          canChooseFiles: true,
          canChooseDirectory: false,
          allowsMultipleSelection: false,
          allowedFileTypes: "*",
        });
        if (!paths || paths.length === 0 || !paths[0]) return null;
        const filePath = paths[0];
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (!exists) return null;
        const content = await file.text();
        return { content, path: filePath, filename: basename(filePath) };
      },
      openFolderDialog: async () => {
        const paths = await Utils.openFileDialog({
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        if (!paths || paths.length === 0 || !paths[0]) return null;
        return paths;
      },
      getFileContent: async ({ path: filePath }) => {
        try {
          const file = Bun.file(filePath);
          const exists = await file.exists();
          if (!exists) return null;
          const content = await file.text();
          const html = compileMarkdownWithBun(content);
          return { content, html, filename: basename(filePath) };
        } catch {
          return null;
        }
      },
      compileMarkdown: async ({ markdown }) => {
        const html = compileMarkdownWithBun(markdown);
        return { html };
      },
      resolvePath: async ({ basePath, relativePath }) => {
        const { dirname, resolve } = await import("path");
        return resolve(dirname(basePath), relativePath);
      },
      startWatching: async ({ path: filePath }) => {
        if (currentWatchedPath === filePath && currentWatcher) return {};
        if (currentWatcher) {
          currentWatcher.close();
          currentWatcher = null;
        }
        currentWatchedPath = filePath;
        const onChange = async () => {
          try {
            const file = Bun.file(filePath);
            const exists = await file.exists();
            if (!exists) return;
            const content = await file.text();
            const html = compileMarkdownWithBun(content);
            indexer.indexFile(filePath, basename(filePath));
            win?.webview.rpc?.send.fileChanged({ path: filePath, content, html });
          } catch {
            // file might not be readable at the moment
          }
        };
        try {
          const file = Bun.file(filePath);
          if (await file.exists()) {
            currentWatcher = watch(filePath, {} as any, (eventType: string) => {
              if (eventType === "change") onChange();
            }) as unknown as FSWatcher;
          }
        } catch (err) {
          console.warn("Could not watch file:", filePath, err);
        }
        return {};
      },
      stopWatching: async () => {
        if (currentWatcher) {
          currentWatcher.close();
          currentWatcher = null;
        }
        currentWatchedPath = null;
        return {};
      },
      readFolder: async ({ path: folderPath }) => {
        indexer.indexFolder(folderPath).catch(err => console.error("Index error:", err));
        return scanDir(folderPath);
      },
      startWatchingFolder: async ({ path: folderPath }) => {
        indexer.indexFolder(folderPath).catch(err => console.error("Index error:", err));
        if (currentFolderWatcher && currentWatchedFolder === folderPath) return {};
        if (currentFolderWatcher) {
          currentFolderWatcher.close();
          currentFolderWatcher = null;
        }
        currentWatchedFolder = folderPath;

        const rescan = async () => {
          if (folderRescanTimeout) clearTimeout(folderRescanTimeout);
          folderRescanTimeout = setTimeout(async () => {
            try {
              const files = await scanDir(folderPath);
              win?.webview.rpc?.send.folderChanged({ files });
            } catch { }
          }, 400);
        };

        try {
          currentFolderWatcher = watch(
            folderPath,
            { recursive: true },
            (eventType: string, filename: string | null) => {
              if (!filename) return;
              const fullPath = join(folderPath, filename);
              const name = filename.toLowerCase();
              if (name.endsWith(".md") || name.endsWith(".markdown")) {
                indexer.indexFile(fullPath, basename(filename));
                rescan();
              } else if (eventType === "rename") {
                rescan();
              }
            },
          ) as unknown as FSWatcher;
        } catch (err) {
          console.error("Failed to watch folder:", err);
        }
        return {};
      },
      stopWatchingFolder: async () => {
        if (folderRescanTimeout) {
          clearTimeout(folderRescanTimeout);
          folderRescanTimeout = null;
        }
        if (currentFolderWatcher) {
          currentFolderWatcher.close();
          currentFolderWatcher = null;
        }
        currentWatchedFolder = null;
        return {};
      },
      searchInFolder: async ({ path: folderPath, query }) => {
        console.log(`Searching folder ${folderPath} for: ${query}`);
        return indexer.search(query);
      },

      openExternalUrl: async ({ url }) => {
        try {
          Utils.openExternal(url);
          return { success: true };
        } catch (err) {
          console.error("Failed to open external URL:", err);
          return { success: false };
        }
      },
    },
    messages: {
      log: ({ msg }) => console.log("[View]", msg),
    },
  },
});

const initialFilePath = getInitialFilePath();
const url = await getMainViewUrl();

const win = new BrowserWindow({
  title: "MDPOWER",
  url,
  titleBarStyle: "default",
  frame: {
    width: 1000,
    height: 750,
    x: 200,
    y: 200,
  },
  rpc,
});

win.webview.on("dom-ready", async () => {
  if (initialFilePath) {
    try {
      const file = Bun.file(initialFilePath);
      const exists = await file.exists();
      if (exists) {
        const content = await file.text();
        const html = compileMarkdownWithBun(content);
        const filename = basename(initialFilePath);
        win.webview.rpc?.send.initialFile({
          path: initialFilePath,
          content,
          html,
          filename,
        });
      }
    } catch (err) {
      console.error("Failed to read initial file:", err);
    }
  }
});

console.log("MDPOWER started!");
