import { useRef, useCallback, useEffect, useState } from "react";
import { File, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ThemeMenu from "./ThemeMenu";

export type Tab = {
  id: string;
  path: string;
  filename: string;
  folderPath?: string | null;
};

type Props = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  hasFolder: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  hasFolder,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const focusTab = useCallback((index: number) => {
    const el = tabListRef.current?.querySelector<HTMLElement>(`[data-tab-index="${index}"]`);
    el?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let newIndex = -1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = tabs.length - 1;
    }
    if (newIndex >= 0) {
      onSelectTab(tabs[newIndex].id);
      focusTab(newIndex);
    }
  }, [tabs, onSelectTab, focusTab]);

  useEffect(() => {
    const activeEl = tabListRef.current?.querySelector<HTMLElement>(
      `[data-tab-id="${activeTabId}"]`,
    );
    if (activeEl && document.activeElement?.closest('[role="tablist"]')) {
      activeEl.focus();
    }
  }, [activeTabId]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) {
      onReorderTabs?.(dragIndex, index);
      setDragIndex(index);
    }
  }, [dragIndex, onReorderTabs]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  return (
    <div className="flex items-stretch bg-[var(--bg-sidebar)] border-b border-[var(--border-main)] h-[35px] select-none w-full min-w-0 pr-2">
      {/* Botón de sidebar fijo a la izquierda (solo si hay carpeta abierta) */}
      {hasFolder && (
        <div className="flex-shrink-0 flex items-center px-1 border-r border-[var(--border-main)]">
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className={`p-1.5 rounded-md transition-colors active:scale-95 flex items-center justify-center ${
              sidebarOpen
                ? "bg-[var(--accent-hover)] text-[var(--text-main)]"
                : "text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
            }`}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Lista de pestañas con scroll horizontal */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Open files"
        className="flex-1 flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              data-tab-id={tab.id}
              data-tab-index={index}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              draggable
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-1.5 px-3 text-[13px] cursor-pointer border-r border-[var(--border-main)] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-[-2px] relative flex-shrink-0 ${
                isActive
                  ? "bg-[var(--bg-editor)] text-[var(--text-main)]"
                  : "bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
              } ${dragIndex === index ? "opacity-50" : ""}`}
              style={isActive ? { boxShadow: "inset 0 -2px 0 var(--accent-blue)" } : undefined}
            >
              <File className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="max-w-32 truncate">{tab.filename}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                aria-label={`Close ${tab.filename}`}
                className="p-0.5 rounded hover:bg-[var(--accent-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:scale-90"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Selector de tema a la derecha */}
      <div className="flex-shrink-0 flex items-center px-1.5 border-l border-[var(--border-main)]">
        <ThemeMenu />
      </div>
    </div>
  );
}

