import { useState, useCallback, useEffect, useRef, createContext, useContext, useMemo } from "react";
import { Electroview } from "electrobun/view";
import type { MarkdownReaderRPC, FileEntry } from "../shared/types";
import MarkdownViewer from "./components/MarkdownViewer";
import MarkdownEditor from "./components/MarkdownEditor";
import TopBar from "./components/TopBar";
import TabBar, { type Tab } from "./components/TabBar";
import Sidebar from "./components/Sidebar";
import SettingsModal, { type ExportMode } from "./components/SettingsModal";
import SearchPanel from "./components/SearchPanel";
import Toast from "./components/Toast";
import UpdateToast from "./components/UpdateToast";
import { printMarkdown, type PrintOptions } from "./utils/print";
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
  const [isEditing, setIsEditing] = useState<boolean>(() => !!savedSession?.isEditing);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => savedSession?.sidebarOpen ?? false);
  const [sidebarFiles, setSidebarFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState<ExportMode>("print");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  const [hasFolder, setHasFolder] = useState<boolean>(() => !!savedSession?.folderPath);
  const [workspacePath, setWorkspacePath] = useState<string | null>(() => savedSession?.folderPath || null);
  const [scrollTarget, setScrollTarget] = useState<{ path: string; line: number; timestamp: number } | null>(null);
  const electroviewRef = useRef<any>(null);
  const activeTabRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);
  const watchedFolderRef = useRef<string | null>(null);
  const lastFolderPath = useRef<string | null>(null);

  activeTabRef.current = activeTabId;

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

  useEffect(() => {
    if (!sidebarOpen && watchedFolderRef.current) {
      lastFolderPath.current = watchedFolderRef.current;
      watchedFolderRef.current = null;
      electroviewRef.current?.proxy.request.stopWatchingFolder({}).catch(() => {});
    }
  }, [sidebarOpen]);

  // Save session when relevant states change
  useEffect(() => {
    if (!electroviewRef.current) return;

    const session = {
      folderPath: workspacePath,
      tabs,
      activeTabId,
      sidebarOpen,
      isEditing,
    };
    localStorage.setItem("md-reader-session", JSON.stringify(session));
  }, [tabs, activeTabId, sidebarOpen, isEditing, workspacePath]);

  useEffect(() => {
    const rpc = Electroview.defineRPC<MarkdownReaderRPC>({
      maxRequestTime: 30000,
      handlers: {
        requests: {},
        messages: {
          initialFile: ({ path, content, filename }) => {
            const id = `tab-${++tabCounter}`;
            setTabs((prev) => {
              const existing = prev.find((t) => t.path === path);
              if (existing) {
                setActiveTabId(existing.id);
                setTabContents((c) => ({ ...c, [existing.id]: content }));
                return prev;
              }
              return [...prev, { id, path, filename }];
            });
            setActiveTabId(id);
            setTabContents((prev) => ({ ...prev, [id]: content }));
            electroviewRef.current?.proxy.request.startWatching({ path });
          },
          fileChanged: ({ path, content }) => {
            setTabs((prev) => {
              const tab = prev.find((t) => t.path === path);
              if (tab && tab.id === activeTabRef.current) {
                setTabContents((c) => ({ ...c, [tab.id]: content }));
              }
              return prev;
            });
          },
          folderChanged: ({ files }) => {
            setSidebarFiles(files);
          },
        },
      },
    });
    new Electroview({ rpc });
    electroviewRef.current = rpc;

    // Load content for restored tabs and set up watchers
    const initRestoredSession = async () => {
      if (savedSession) {
        const { folderPath, tabs: savedTabs, activeTabId: savedActiveTabId } = savedSession;

        if (folderPath) {
          try {
            const files = await rpc.proxy.request.readFolder({ path: folderPath });
            setSidebarFiles(files);
            watchedFolderRef.current = folderPath;
            lastFolderPath.current = folderPath;
            
            if (sidebarOpen) {
              rpc.proxy.request.startWatchingFolder({ path: folderPath }).catch(() => {});
            }
          } catch (e) {
            console.error("Failed to restore folder files:", e);
          }
        }

        if (savedTabs && savedTabs.length > 0) {
          const contents: Record<string, string> = {};
          await Promise.all(
            savedTabs.map(async (tab: any) => {
              try {
                const res = await rpc.proxy.request.getFileContent({ path: tab.path });
                if (res) {
                  contents[tab.id] = res.content;
                }
              } catch (e) {
                console.error("Failed to restore tab content:", tab.path, e);
              }
            })
          );
          
          setTabContents((prev) => ({ ...contents, ...prev }));

          // Watch active file, only if it's still the active tab
          if (savedActiveTabId && activeTabRef.current === savedActiveTabId) {
            const activeTab = savedTabs.find((t: any) => t.id === savedActiveTabId);
            if (activeTab) {
              rpc.proxy.request.startWatching({ path: activeTab.path }).catch(() => {});
            }
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

  const activeContent = activeTabId ? tabContents[activeTabId] || "" : "";
  const activeFile = tabs.find((t) => t.id === activeTabId) || null;

  const handleOpenFile = useCallback(async () => {
    const view = electroviewRef.current;
    if (!view) return;
    const result = await view.proxy.request.openFileDialog({});
    if (!result) return;
    const { path, content, filename } = result;
    const id = `tab-${++tabCounter}`;
    setTabs((prev) => [...prev, { id, path, filename }]);
    setActiveTabId(id);
    setTabContents((prev) => ({ ...prev, [id]: content }));
    setIsEditing(false);
    view.proxy.request.startWatching({ path });
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const view = electroviewRef.current;
    if (!view) return;
    const paths = await view.proxy.request.openFolderDialog({});
    if (!paths || paths.length === 0 || !paths[0]) return;
    const folderPath = paths[0];
    await view.proxy.request.stopWatchingFolder({});
    const files = await view.proxy.request.readFolder({ path: folderPath });
    setSidebarFiles(files);
    setSidebarOpen(true);
    watchedFolderRef.current = folderPath;
    lastFolderPath.current = folderPath;
    setHasFolder(true);
    setWorkspacePath(folderPath);
    view.proxy.request.startWatchingFolder({ path: folderPath });
  }, []);

  const handleSelectSidebarFile = useCallback(
    async (entry: FileEntry) => {
      const view = electroviewRef.current;
      if (!view) return;
      const existing = tabs.find((t) => t.path === entry.path);
      if (existing) {
        setActiveTabId(existing.id);
        setIsEditing(false);
        return;
      }
      if (entry.content) {
        const id = `tab-${++tabCounter}`;
        setTabs((prev) => [...prev, { id, path: entry.path, filename: entry.name }]);
        setActiveTabId(id);
        setTabContents((prev) => ({ ...prev, [id]: entry.content! }));
        setIsEditing(false);
        return;
      }
      const result = await view.proxy.request.getFileContent({ path: entry.path });
      if (!result) return;
      const id = `tab-${++tabCounter}`;
      setTabs((prev) => [...prev, { id, path: entry.path, filename: result.filename }]);
      setActiveTabId(id);
      setTabContents((prev) => ({ ...prev, [id]: result.content }));
      setIsEditing(false);
      view.proxy.request.startWatching({ path: entry.path });
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
    },
    [activeTabId],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;
      setActiveTabId(tabId);
      setIsEditing(false);
      const view = electroviewRef.current;
      if (view) {
        view.proxy.request.stopWatching({});
        view.proxy.request.startWatching({ path: tab.path });
      }
    },
    [tabs],
  );

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handleSave = useCallback(
    async (content: string) => {
      const tab = activeFile;
      if (!tab) return;
      const view = electroviewRef.current;
      if (!view) return;
      await view.proxy.request.saveFile({ path: tab.path, content });
      setTabContents((prev) => ({ ...prev, [tab.id]: content }));
      view.proxy.request.startWatching({ path: tab.path });
      setToastMsg("Saved!");
    },
    [activeFile],
  );

  const handlePrint = useCallback(
    async (options: PrintOptions) => {
      if (!activeContent) return;
      try {
        await printMarkdown(activeContent, options);
      } catch (err) {
        console.error("Print failed:", err);
      }
    },
    [activeContent],
  );

  const handleSavePdf = useCallback(
    async (options: PrintOptions) => {
      if (!activeContent) return;
      const view = electroviewRef.current;
      if (!view) return;
      try {
        await view.proxy.request.savePdf({
          markdown: activeContent,
          filename: activeFile?.filename || "document.md",
          options,
        });
      } catch (err) {
        console.error("Save PDF failed:", err);
      }
    },
    [activeContent, activeFile],
  );

  const handleSaveHtml = useCallback(async () => {
    if (!activeContent) return;
    const view = electroviewRef.current;
    if (!view) return;
    try {
      await view.proxy.request.saveHtml({
        markdown: activeContent,
        filename: activeFile?.filename || "document.md",
      });
      setToastMsg("HTML exported!");
    } catch (err) {
      console.error("Save HTML failed:", err);
    }
  }, [activeContent, activeFile]);

  const handleOpenSettings = useCallback((mode: ExportMode) => {
    if (mode === "save-html") {
      handleSaveHtml();
      return;
    }
    setSettingsMode(mode);
    setSettingsOpen(true);
  }, [handleSaveHtml]);

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
          setIsEditing(false);
          return;
        }
        const result = await view.proxy.request.getFileContent({ path: resolvedPath });
        if (!result) return;
        const id = `tab-${++tabCounter}`;
        setTabs((prev) => [...prev, { id, path: resolvedPath, filename: result.filename }]);
        setActiveTabId(id);
        setTabContents((prev) => ({ ...prev, [id]: result.content }));
        setIsEditing(false);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        if (hasFolder) {
          setSearchOpen((p) => !p);
        }
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, hasFolder]);

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

      for (const item of items) {
        const entry = (item as any).webkitGetAsEntry?.() as FileSystemEntry | null;
        if (!entry) continue;

        if (entry.isDirectory) {
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
            for (const e of allEntries) {
              if (e.isFile) {
                const name = e.name.toLowerCase();
                if (name.endsWith(".md") || name.endsWith(".markdown")) {
                  const file = await new Promise<File>((resolve) =>
                    (e as FileSystemFileEntry).file(resolve),
                  );
                  const content = await file.text();
                  result.push({
                    name: e.name,
                    isDirectory: false,
                    path: e.name,
                    content,
                  });
                }
              } else if (e.isDirectory) {
                if (e.name === "node_modules" || e.name.startsWith(".")) {
                  continue;
                }
                const children = await buildTree(e as FileSystemDirectoryEntry);
                result.push({
                  name: e.name,
                  isDirectory: true,
                  path: e.name,
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
          electroviewRef.current?.proxy.request.stopWatchingFolder({});
          watchedFolderRef.current = null;
          lastFolderPath.current = null;
          setHasFolder(false);
          setWorkspacePath(null);
          setSidebarFiles([{ name: entry.name, isDirectory: true, path: entry.name, children: tree }]);
          setSidebarOpen(true);
        } else {
          const file = (entry as FileSystemFileEntry);
          const name = file.name.toLowerCase();
          if (name.endsWith(".md") || name.endsWith(".markdown")) {
            const blob = await new Promise<File>((resolve) => file.file(resolve));
            const text = await blob.text();
            const id = `tab-${++tabCounter}`;
            setTabs((prev) => [...prev, { id, path: file.name, filename: file.name }]);
            setTabContents((prev) => ({ ...prev, [id]: text }));
            setActiveTabId(id);
          }
        }
      }
      setIsEditing(false);
    },
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId: handleSetThemeId, toggleTheme }}>
      <div className="h-screen flex flex-col bg-[var(--bg-editor)] text-[var(--text-main)] theme-transition">
        <TopBar
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
          activeFile={activeFile?.path || null}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => {
            const next = !sidebarOpen;
            setSidebarOpen(next);
            if (next && lastFolderPath.current && !watchedFolderRef.current) {
              const view = electroviewRef.current;
              if (view) {
                watchedFolderRef.current = lastFolderPath.current;
                view.proxy.request.startWatchingFolder({ path: lastFolderPath.current }).catch(() => {});
              }
            }
          }}
          onExportSelect={handleOpenSettings}
          hasFolder={hasFolder}
          searchOpen={searchOpen}
          onToggleSearch={useCallback(() => {
            if (hasFolder) setSearchOpen((p) => !p);
          }, [hasFolder])}
        />
        <div className="flex-1 flex min-h-0">
          {searchOpen && (            <SearchPanel
              folderPath={lastFolderPath.current || watchedFolderRef.current || ""}
              electroview={electroviewRef.current}
              onSelectFile={(path, line) => {
                setScrollTarget({ path, line, timestamp: Date.now() });
                const existing = tabs.find((t) => t.path === path);
                if (existing) {
                  setActiveTabId(existing.id);
                  setIsEditing(false);
                  return;
                }
                const view = electroviewRef.current;
                if (!view) return;
                view.proxy.request.getFileContent({ path }).then((result: { content: string; filename: string }) => {
                  if (!result) return;
                  const id = `tab-${++tabCounter}`;
                  setTabs((prev) => [...prev, { id, path, filename: result.filename }]);
                  setActiveTabId(id);
                  setTabContents((prev) => ({ ...prev, [id]: result.content }));
                  setIsEditing(false);
                  view.proxy.request.startWatching({ path });
                });
              }}
              onClose={() => setSearchOpen(false)}
            />
          )}
  <Sidebar
            open={sidebarOpen}
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
            {tabs.length > 0 && (
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
                onReorderTabs={handleReorderTabs}
              />
            )}
            <main className="flex-1 overflow-auto">
              {activeFile && isEditing ? (
                <MarkdownEditor content={activeContent} onSave={handleSave} />
              ) : (
                <MarkdownViewer
                  content={activeContent}
                  onOpenLink={handleOpenLink}
                  scrollToLine={scrollTarget && scrollTarget.path === activeFile?.path ? scrollTarget : null}
                />
              )}
            </main>
          </div>
        </div>
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onPrint={handlePrint}
        onSavePdf={handleSavePdf}
        mode={settingsMode}
        filename={activeFile?.filename || null}
      />
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
