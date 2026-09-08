import { BrowserWindow, BrowserView, Utils } from "electrobun/bun";
import { watch, type FSWatcher } from "fs";
import { readdir, access } from "fs/promises";
import { join, basename } from "path";
import { tmpdir } from "os";
import puppeteer from "puppeteer-core";
import { buildPrintHTML } from "../shared/buildPrintHTML";
import type { MarkdownReaderRPC, FileEntry } from "../shared/types";

async function findChrome(): Promise<string | null> {
  const candidates = [
    // Chrome
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Edge
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {}
  }
  return null;
}

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
  try {
    await fetch(DEV_SERVER_URL, { method: "HEAD" });
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
  } catch {}
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
        const file = Bun.file(filePath);
        const content = await file.text();
        return { content, filename: basename(filePath) };
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
            indexer.indexFile(filePath, basename(filePath));
            win?.webview.rpc?.send.fileChanged({ path: filePath, content });
          } catch {
            // file might not be readable at the moment
          }
        };
        currentWatcher = watch(filePath, {} as any, (eventType: string) => {
          if (eventType === "change") onChange();
        }) as unknown as FSWatcher;
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
      saveFile: async ({ path: filePath, content }) => {
        if (currentWatcher) {
          currentWatcher.close();
          currentWatcher = null;
          currentWatchedPath = null;
        }
        await Bun.write(filePath, content);
        indexer.indexFile(filePath, basename(filePath));
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
            } catch {}
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
      savePdf: async ({ markdown, filename, options }) => {
        let browser;
        try {
          const chromePath = await findChrome();
          if (!chromePath) {
            console.error("Chrome or Edge not found. Install Google Chrome or Microsoft Edge to use PDF export.");
            return null;
          }

          const html = await buildPrintHTML(markdown, options);

          browser = await puppeteer.launch({ headless: true, executablePath: chromePath });
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "load" });

          const pdfName = filename.replace(/\.(md|markdown)$/i, "") + ".pdf";
          const format = options.pageSize === "letter" ? "letter" : options.pageSize === "legal" ? "legal" : "a4";
          const landscape = options.orientation === "landscape";
          const marginMap = { none: "0mm", narrow: "12.7mm", normal: "25.4mm", wide: "38.1mm" };
          const marginVal = marginMap[options.margins];

          const pdfPath = join(tmpdir(), pdfName);
          await page.pdf({
            path: pdfPath,
            format,
            landscape,
            printBackground: true,
            margin: { top: marginVal, bottom: marginVal, left: marginVal, right: marginVal },
          });

          await browser.close();
          browser = null;

          Utils.openPath(pdfPath);
          return { path: pdfPath };
        } catch (err) {
          console.error("Failed to generate PDF:", err);
          if (browser) await browser.close();
          return null;
        }
      },
      searchInFolder: async ({ path: folderPath, query }) => {
        console.log(`Searching folder ${folderPath} for: ${query}`);
        return indexer.search(query);
      },
      saveHtml: async ({ markdown, filename }) => {
        try {
          const { buildStandaloneHTML } = await import("../shared/buildPrintHTML");
          const html = await buildStandaloneHTML(markdown);
          const htmlName = filename.replace(/\.(md|markdown)$/i, "") + ".html";
          const htmlPath = join(tmpdir(), htmlName);
          await Bun.write(htmlPath, html);
          Utils.openPath(htmlPath);
          return { path: htmlPath };
        } catch (err) {
          console.error("Failed to save HTML:", err);
          return null;
        }
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
        const filename = basename(initialFilePath);
        win.webview.rpc?.send.initialFile({
          path: initialFilePath,
          content,
          filename,
        });
      }
    } catch (err) {
      console.error("Failed to read initial file:", err);
    }
  }
});

console.log("MDPOWER started!");
