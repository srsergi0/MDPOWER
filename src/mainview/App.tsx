import { useState, useCallback, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { Electroview } from "electrobun/view";
import type { MarkdownReaderRPC, FileEntry } from "../shared/types";
import MarkdownViewer from "./components/MarkdownViewer";
import TopBar from "./components/TopBar";
import TabBar, { type Tab } from "./components/TabBar";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import UpdateToast from "./components/UpdateToast";
import { Upload } from "lucide-react";

declare const __APP_VERSION__: string;

export type ThemeId =
  | "github-light"
  | "one-light"
  | "solarized-light"
  | "one-dark"
  | "dracula"
  | "github-dark"
  | "nord"
  | "tokyo-night"
  | "gruvbox-dark"
  | "rose-pine"
  | "synthwave84"
  | "night-owl"
  | "ayu-light"
  | "gruvbox-light"
  | "everforest-light"
  | "rose-pine-dawn";

type ThemeContextType = {
  theme: "light" | "dark";
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  themeId: "one-dark",
  setThemeId: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const savedSession = (() => {
  try {
    const saved = localStorage.getItem("md-reader-session");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

let tabCounter = 0;
if (savedSession?.tabs) {
  let maxIdNum = 0;
  for (const tab of savedSession.tabs) {
    const num = parseInt(tab.id.replace("tab-", ""), 10);
    if (num > maxIdNum) maxIdNum = num;
  }
  tabCounter = maxIdNum;
}

function App() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    return (localStorage.getItem("md-reader-theme-id") as ThemeId) || "one-dark";
  });
  const [tabs, setTabs] = useState<Tab[]>(() => savedSession?.tabs || []);
  const [activeTabId, setActiveTabId] = useState<string | null>(() => savedSession?.activeTabId || null);
  const [tabContents, setTabContents] = useState<Record<string, string>>({});
  const [tabHtmls, setTabHtmls] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => savedSession?.sidebarOpen ?? true);
  const [folderTrees, setFolderTrees] = useState<Record<string, FileEntry[]>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  const electroviewRef = useRef<any>(null);
  const activeTabRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);
  const watchedFolderRef = useRef<string | null>(null);

  activeTabRef.current = activeTabId;

  const activeContent = activeTabId ? tabContents[activeTabId] || "" : "";
  const activeHtml = activeTabId ? tabHtmls[activeTabId] || "" : "";
  const activeFile = tabs.find((t) => t.id === activeTabId) || null;
  const currentFolderPath = activeFile?.folderPath || null;
  const hasFolder = !!currentFolderPath;
  const sidebarFiles = currentFolderPath ? folderTrees[currentFolderPath] || [] : [];

  const darkThemes = useMemo<ThemeId[]>(() => [
    "one-dark",
    "dracula",
    "github-dark",
    "nord",
    "tokyo-night",
    "gruvbox-dark",
    "rose-pine",
    "synthwave84",
    "night-owl",
  ], []);
  const isDark = darkThemes.includes(themeId);
  const theme = isDark ? "dark" : "light";

  const toggleTheme = useCallback(() => {
    setThemeId((prev) => {
      const currentIsDark = darkThemes.includes(prev);
      const next = currentIsDark ? "github-light" : "one-dark";
      localStorage.setItem("md-reader-theme-id", next);
      return next;
    });
  }, [darkThemes]);

  const handleSetThemeId = useCallback((id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem("md-reader-theme-id", id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Remove all old theme classes
    root.className = "";
    // Toggle the dark class for Tailwind support
    root.classList.toggle("dark", isDark);
    // Add the new theme class
    root.classList.add(`theme-${themeId}`);
  }, [themeId, isDark]);

  // Save session when relevant states change
  useEffect(() => {
    if (!electroviewRef.current) return;

    const session = {
      tabs,
      activeTabId,
      sidebarOpen,
    };
    localStorage.setItem("md-reader-session", JSON.stringify(session));
  }, [tabs, activeTabId, sidebarOpen]);

  // Sync watched folder when active tab's folder or sidebarOpen changes
  useEffect(() => {
    const view = electroviewRef.current;
    if (!view) return;
    if (currentFolderPath && sidebarOpen && !currentFolderPath.startsWith("virtual:")) {
      if (watchedFolderRef.current !== currentFolderPath) {
        watchedFolderRef.current = currentFolderPath;
        view.proxy.request.startWatchingFolder({ path: currentFolderPath }).catch(() => {});
      }
    } else {
      if (watchedFolderRef.current) {
        watchedFolderRef.current = null;
        view.proxy.request.stopWatchingFolder({}).catch(() => {});
      }
    }
  }, [currentFolderPath, sidebarOpen]);

  // Lazily load folder tree if active tab belongs to a folder not yet in memory
  useEffect(() => {
    if (currentFolderPath && !currentFolderPath.startsWith("virtual:") && !folderTrees[currentFolderPath] && electroviewRef.current) {
      electroviewRef.current.proxy.request.readFolder({ path: currentFolderPath })
        .then((files: FileEntry[]) => {
          if (files) {
            setFolderTrees((prev) => ({ ...prev, [currentFolderPath]: files }));
          }
        })
        .catch(() => {});
    }
  }, [currentFolderPath, folderTrees]);

  useEffect(() => {
    const rpc = Electroview.defineRPC<MarkdownReaderRPC>({
      maxRequestTime: 30000,
      handlers: {
        requests: {},
        messages: {
          initialFile: ({ path, content, html, filename }) => {
            const id = `tab-${++tabCounter}`;
            setTabs((prev) => {
              const existing = prev.find((t) => t.path === path);
              if (existing) {
                setActiveTabId(existing.id);
                setTabContents((c) => ({ ...c, [existing.id]: content }));
                setTabHtmls((h) => ({ ...h, [existing.id]: html }));
                return prev;
              }
              return [...prev, { id, path, filename, folderPath: null }];
            });
            setActiveTabId(id);
            setTabContents((prev) => ({ ...prev, [id]: content }));
            setTabHtmls((prev) => ({ ...prev, [id]: html }));
            electroviewRef.current?.proxy.request.startWatching({ path });
          },
          fileChanged: ({ path, content, html }) => {
            setTabs((prev) => {
              const tab = prev.find((t) => t.path === path);
              if (tab && tab.id === activeTabRef.current) {
                setTabContents((c) => ({ ...c, [tab.id]: content }));
                setTabHtmls((h) => ({ ...h, [tab.id]: html }));
              }
              return prev;
            });
          },
          folderChanged: ({ files }) => {
            if (watchedFolderRef.current) {
              setFolderTrees((prev) => ({ ...prev, [watchedFolderRef.current!]: files }));
            }
          },
        },
      },
    });
    new Electroview({ rpc });
    electroviewRef.current = rpc;

    // Load content for restored tabs and set up watchers
    const initRestoredSession = async () => {
      if (savedSession) {
        const { tabs: savedTabs, activeTabId: savedActiveTabId } = savedSession;

        if (savedTabs && savedTabs.length > 0) {
          const contents: Record<string, string> = {};
          const htmls: Record<string, string> = {};
          const validTabs: any[] = [];
          const uniqueFolders = new Set<string>();

          await Promise.all(
            savedTabs.map(async (tab: any) => {
              try {
                const res = await rpc.proxy.request.getFileContent({ path: tab.path });
                if (res) {
                  contents[tab.id] = res.content;
                  htmls[tab.id] = res.html;
                  validTabs.push(tab);
                  if (tab.folderPath && !tab.folderPath.startsWith("virtual:")) {
                    uniqueFolders.add(tab.folderPath);
                  }
                }
              } catch {
                // File deleted or moved while app was closed
              }
            })
          );
          
          if (validTabs.length > 0) {
            setTabs(validTabs);
            setTabContents((prev) => ({ ...contents, ...prev }));
            setTabHtmls((prev) => ({ ...htmls, ...prev }));

            const targetActiveId = validTabs.some((t) => t.id === savedActiveTabId)
              ? savedActiveTabId
              : validTabs[0].id;

            setActiveTabId(targetActiveId);
            const activeTab = validTabs.find((t: any) => t.id === targetActiveId);
            if (activeTab) {
              rpc.proxy.request.startWatching({ path: activeTab.path }).catch(() => {});
            }

            for (const fPath of uniqueFolders) {
              try {
                const files = await rpc.proxy.request.readFolder({ path: fPath });
                if (files) {
                  setFolderTrees((prev) => ({ ...prev, [fPath]: files }));
                }
              } catch { }
            }
          } else {
            setTabs([]);
            setActiveTabId(null);
          }
        }
      }
    };

    const isNewerVersion = (current: string, latest: string): boolean => {
      const parse = (v: string) => v.split(".").map((x) => parseInt(x, 10) || 0);
      const curParts = parse(current);
      const latParts = parse(latest);
      for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
        const cur = curParts[i] || 0;
        const lat = latParts[i] || 0;
        if (lat > cur) return true;
        if (cur > lat) return false;
      }
      return false;
    };

    const checkForUpdates = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/srsergi0/MDPOWER/releases/latest");
        if (!response.ok) return;
        const data = await response.json();
        const latestVersion = data.tag_name;
        if (!latestVersion) return;

        const cleanLatest = latestVersion.replace(/^v/, "");
        const cleanCurrent = __APP_VERSION__.replace(/^v/, "");

        console.log("Update check:", { cleanCurrent, cleanLatest });

        if (isNewerVersion(cleanCurrent, cleanLatest)) {
          setUpdateInfo({
            version: cleanLatest,
            url: data.html_url || "https://github.com/srsergi0/MDPOWER/releases/latest"
          });
        }
      } catch (e) {
        console.error("Failed to check for updates:", e);
      }
    };

    initRestoredSession();
    checkForUpdates();

    return () => {
      rpc.proxy.request.stopWatchingFolder({}).catch(() => {});
      rpc.proxy.request.stopWatching({}).catch(() => {});
    };
  }, []);

  const handleDownloadUpdate = useCallback(() => {
    if (updateInfo && electroviewRef.current) {
      electroviewRef.current.proxy.request.openExternalUrl({ url: updateInfo.url }).catch((err: any) => {
        console.error("Failed to open update url:", err);
      });
    }
  }, [updateInfo]);

  // Auto-compile if content exists but HTML has not yet been populated
  useEffect(() => {
    if (activeTabId && activeContent && !tabHtmls[activeTabId]) {
      electroviewRef.current?.proxy.request.compileMarkdown({ markdown: activeContent })
        .then((res: { html: string }) => {
          if (res?.html) {
            setTabHtmls((prev) => ({ ...prev, [activeTabId]: res.html }));
          }
        })
        .catch(() => {});
    }
  }, [activeTabId, activeContent, tabHtmls]);

  const openFileByPath = useCallback(
    async (filePath: string, filename?: string) => {
      const view = electroviewRef.current;
      if (!view) return;
      const existing = tabs.find((t) => t.path === filePath);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      const result = await view.proxy.request.getFileContent({ path: filePath });
      if (!result) return;
      const id = `tab-${++tabCounter}`;
      setTabs((prev) => [...prev, { id, path: filePath, filename: filename || result.filename, folderPath: null }]);
      setActiveTabId(id);
      setTabContents((prev) => ({ ...prev, [id]: result.content }));
      setTabHtmls((prev) => ({ ...prev, [id]: result.html }));
      view.proxy.request.startWatching({ path: filePath });
    },
    [tabs],
  );

  const handleSelectSidebarFile = useCallback(
    async (entry: FileEntry) => {
      const view = electroviewRef.current;
      if (!view) return;
      const existing = tabs.find((t) => t.path === entry.path);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      if (entry.content) {
        const id = `tab-${++tabCounter}`;
        setTabs((prev) => [...prev, { id, path: entry.path, filename: entry.name, folderPath: currentFolderPath }]);
        setActiveTabId(id);
        setTabContents((prev) => ({ ...prev, [id]: entry.content! }));
        view.proxy.request.compileMarkdown({ markdown: entry.content! }).then((res: { html: string }) => {
          if (res?.html) setTabHtmls((prev) => ({ ...prev, [id]: res.html }));
        });
        return;
      }
      const result = await view.proxy.request.getFileContent({ path: entry.path });
      if (!result) return;
      const id = `tab-${++tabCounter}`;
      setTabs((prev) => [...prev, { id, path: entry.path, filename: result.filename, folderPath: currentFolderPath }]);
      setActiveTabId(id);
      setTabContents((prev) => ({ ...prev, [id]: result.content }));
      setTabHtmls((prev) => ({ ...prev, [id]: result.html }));
      view.proxy.request.startWatching({ path: entry.path });
    },
    [tabs, currentFolderPath],
  );

  const openFolderByPath = useCallback(
    async (folderPath: string) => {
      const view = electroviewRef.current;
      if (!view) return;
      const files = await view.proxy.request.readFolder({ path: folderPath });
      setFolderTrees((prev) => ({ ...prev, [folderPath]: files }));
      setSidebarOpen(true);

      // Automatically open the first markdown file found or README.md
      const findFirstMd = (list: FileEntry[]): FileEntry | null => {
        let first: FileEntry | null = null;
        for (const item of list) {
          if (!item.isDirectory) {
            if (/^readme\.md$/i.test(item.name)) return item;
            if (!first) first = item;
          } else if (item.children) {
            const childMatch = findFirstMd(item.children);
            if (childMatch) {
              if (/^readme\.md$/i.test(childMatch.name)) return childMatch;
              if (!first) first = childMatch;
            }
          }
        }
        return first;
      };

      const firstMd = findFirstMd(files);
      if (firstMd) {
        const existing = tabs.find((t) => t.path === firstMd.path);
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }
        const result = await view.proxy.request.getFileContent({ path: firstMd.path });
        if (result) {
          const id = `tab-${++tabCounter}`;
          setTabs((prev) => [...prev, { id, path: firstMd.path, filename: firstMd.name, folderPath }]);
          setActiveTabId(id);
          setTabContents((prev) => ({ ...prev, [id]: result.content }));
          setTabHtmls((prev) => ({ ...prev, [id]: result.html }));
          view.proxy.request.startWatching({ path: firstMd.path });
        }
      }
    },
    [tabs],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const view = electroviewRef.current;
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (prev.find((t) => t.id === tabId)) {
          view?.proxy.request.stopWatching({});
        }
        if (activeTabId === tabId) {
          setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }
        return remaining;
      });
      setTabContents((prev) => {
        const { [tabId]: _, ...rest } = prev;
        return rest;
      });
      setTabHtmls((prev) => {
        const { [tabId]: _, ...rest } = prev;
        return rest;
      });
    },
    [activeTabId],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      setActiveTabId(tabId);
      const view = electroviewRef.current;
      if (view) {
        view.proxy.request.stopWatching({});
        view.proxy.request.startWatching({ path: tab.path });
      }
    },
    [tabs],
  );

  const handleOpenLink = useCallback(
    async (href: string) => {
      if (!activeFile?.path) return;
      const view = electroviewRef.current;
      if (!view) return;
      try {
        const resolvedPath = await view.proxy.request.resolvePath({
          basePath: activeFile.path,
          relativePath: href,
        });
        const existing = tabs.find((t) => t.path === resolvedPath);
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }
        const result = await view.proxy.request.getFileContent({ path: resolvedPath });
        if (!result) return;
        const id = `tab-${++tabCounter}`;
        setTabs((prev) => [...prev, { id, path: resolvedPath, filename: result.filename, folderPath: activeFile?.folderPath || null }]);
        setActiveTabId(id);
        setTabContents((prev) => ({ ...prev, [id]: result.content }));
        setTabHtmls((prev) => ({ ...prev, [id]: result.html }));
        view.proxy.request.startWatching({ path: resolvedPath });
      } catch (err) {
        console.error("Failed to open link:", err);
      }
    },
    [activeFile, tabs],
  );

  const handleReorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);


  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const items = Array.from(e.dataTransfer.items);
      const dataTransferFiles = Array.from(e.dataTransfer.files);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawFile = dataTransferFiles[i] || (item as any).getAsFile?.();
        const systemPath = (rawFile as any)?.path;
        const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null;

        // Check if dropped item is a directory
        if (entry?.isDirectory || (rawFile && (rawFile as any).type === "" && systemPath && !systemPath.includes("."))) {
          if (systemPath && electroviewRef.current) {
            try {
              await openFolderByPath(systemPath);
              continue;
            } catch (err) {
              console.warn("Direct folder open failed, falling back to entry reader", err);
            }
          }

          // Fallback if system path is not accessible directly
          if (entry?.isDirectory) {
            const buildTree = async (
              dirEntry: FileSystemDirectoryEntry,
            ): Promise<FileEntry[]> => {
              const reader = dirEntry.createReader();
              const allEntries: FileSystemEntry[] = [];
              await new Promise<void>((resolve) => {
                const readBatch = () => {
                  reader.readEntries((batch) => {
                    if (batch.length === 0) resolve();
                    else { allEntries.push(...Array.from(batch)); readBatch(); }
                  });
                };
                readBatch();
              });

              const result: FileEntry[] = [];
              for (const el of allEntries) {
                if (el.isFile) {
                  const name = el.name.toLowerCase();
                  if (name.endsWith(".md") || name.endsWith(".markdown")) {
                    const f = await new Promise<File>((resolve) =>
                      (el as FileSystemFileEntry).file(resolve),
                    );
                    const content = await f.text();
                    result.push({
                      name: el.name,
                      isDirectory: false,
                      path: (f as any).path || el.name,
                      content,
                    });
                  }
                } else if (el.isDirectory) {
                  if (el.name === "node_modules" || el.name.startsWith(".")) {
                    continue;
                  }
                  const children = await buildTree(el as FileSystemDirectoryEntry);
                  result.push({
                    name: el.name,
                    isDirectory: true,
                    path: el.name,
                    children,
                  });
                }
              }
              result.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
              });
              return result;
            };

            const tree = await buildTree(entry as FileSystemDirectoryEntry);
            const virtualFolderId = `virtual:${entry.name}`;
            setFolderTrees((prev) => ({ ...prev, [virtualFolderId]: tree }));
            setSidebarOpen(true);

            // Open first file in tree
            const firstChild = tree.find((t) => !t.isDirectory && t.content);
            if (firstChild && firstChild.content) {
              const id = `tab-${++tabCounter}`;
              setTabs((prev) => [...prev, { id, path: firstChild.path, filename: firstChild.name, folderPath: virtualFolderId }]);
              setTabContents((prev) => ({ ...prev, [id]: firstChild.content! }));
              setActiveTabId(id);
            }
          }
        } else {
          // File dropped
          if (systemPath && (systemPath.toLowerCase().endsWith(".md") || systemPath.toLowerCase().endsWith(".markdown"))) {
            await openFileByPath(systemPath, rawFile?.name);
          } else {
            const fileEntry = entry as FileSystemFileEntry | null;
            if (fileEntry) {
              const name = fileEntry.name.toLowerCase();
              if (name.endsWith(".md") || name.endsWith(".markdown")) {
                const blob = await new Promise<File>((resolve) => fileEntry.file(resolve));
                const text = await blob.text();
                const filePath = (blob as any)?.path || fileEntry.name;
                const id = `tab-${++tabCounter}`;
                setTabs((prev) => [...prev, { id, path: filePath, filename: fileEntry.name, folderPath: null }]);
                setTabContents((prev) => ({ ...prev, [id]: text }));
                setActiveTabId(id);
                if ((blob as any)?.path) {
                  electroviewRef.current?.proxy.request.startWatching({ path: filePath });
                }
              }
            } else if (rawFile) {
              const name = rawFile.name.toLowerCase();
              if (name.endsWith(".md") || name.endsWith(".markdown")) {
                const text = await rawFile.text();
                const filePath = (rawFile as any)?.path || rawFile.name;
                const id = `tab-${++tabCounter}`;
                setTabs((prev) => [...prev, { id, path: filePath, filename: rawFile.name, folderPath: null }]);
                setTabContents((prev) => ({ ...prev, [id]: text }));
                setActiveTabId(id);
                if ((rawFile as any)?.path) {
                  electroviewRef.current?.proxy.request.startWatching({ path: filePath });
                }
              }
            }
          }
        }
      }
    },
    [openFolderByPath, openFileByPath],
  );

  const handleToggleSidebar = useCallback(() => {
    if (!hasFolder) return;
    setSidebarOpen((p) => !p);
  }, [hasFolder]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId: handleSetThemeId, toggleTheme }}>
      <div className="h-screen flex flex-col bg-[var(--bg-editor)] text-[var(--text-main)] theme-transition">
        <TopBar />
        <div className="flex-1 flex min-h-0">
          <Sidebar
            open={sidebarOpen && hasFolder}
            files={sidebarFiles}
            activePath={activeFile?.path || null}
            onSelectFile={handleSelectSidebarFile}
          />
          <div
            className="flex-1 flex flex-col min-w-0 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isDragOver && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--accent-hover)] border-2 border-dashed border-[var(--accent-blue)] rounded-lg pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-[var(--accent-blue)]">
                  <Upload className="w-10 h-10" strokeWidth={1.5} />
                  <p className="text-sm font-medium">Drop markdown files or folders here</p>
                </div>
              </div>
            )}
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onReorderTabs={handleReorderTabs}
              hasFolder={hasFolder}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={handleToggleSidebar}
            />
            <main className="flex-1 overflow-auto">
              <MarkdownViewer
                content={activeContent}
                html={activeHtml}
                onOpenLink={handleOpenLink}
              />
            </main>
          </div>
        </div>
      </div>
      <Toast
        message={toastMsg || ""}
        visible={toastMsg !== null}
        onDone={() => setToastMsg(null)}
      />
      {updateInfo && (
        <UpdateToast
          latestVersion={updateInfo.version}
          onDownload={handleDownloadUpdate}
          onClose={() => setUpdateInfo(null)}
        />
      )}
    </ThemeContext.Provider>
  );
}

export default App;
