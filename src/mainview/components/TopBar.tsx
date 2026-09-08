import { PanelLeft, PanelLeftClose, PanelLeftOpen, File, FolderOpen, Eye, PenSquare, Search } from "lucide-react";
import ExportMenu from "./ExportMenu";
import type { ExportMode } from "./SettingsModal";
import ThemeMenu from "./ThemeMenu";

type Props = {
  onOpenFile: () => void;
  onOpenFolder: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  activeFile: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onExportSelect: (mode: ExportMode) => void;
  hasFolder: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
};

const btn = "p-2 rounded-md transition-colors active:scale-95";

export default function TopBar({
  onOpenFile,
  onOpenFolder,
  isEditing,
  onToggleEdit,
  activeFile,
  sidebarOpen,
  onToggleSidebar,
  onExportSelect,
  hasFolder,
  searchOpen,
  onToggleSearch,
}: Props) {
  const bg = "bg-[var(--bg-header)]";
  const border = "border-b border-[var(--border-main)]";
  const textColor = "text-[var(--text-main)]";
  const iconColor = "text-[var(--text-muted)]";
  const iconHover = "hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]";
  const activeBg = "bg-[var(--accent-hover)]";

  return (
    <div
      className={`relative flex items-center h-[38px] ${bg} ${border} ${textColor} select-none`}
    >
      <div
        className="flex items-center gap-1 px-2 flex-1 min-w-0"
      >
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className={`group ${btn} ${sidebarOpen ? activeBg : iconHover} ${sidebarOpen ? textColor : iconColor}`}
        >
          {sidebarOpen ? (
            <>
              <PanelLeft className="w-4 h-4 group-hover:hidden" />
              <PanelLeftClose className="w-4 h-4 hidden group-hover:block" />
            </>
          ) : (
            <>
              <PanelLeft className="w-4 h-4 group-hover:hidden" />
              <PanelLeftOpen className="w-4 h-4 hidden group-hover:block" />
            </>
          )}
        </button>
        <div className="w-px h-4 bg-[var(--border-main)] mx-0.5" aria-hidden="true" />
        <button
          onClick={onOpenFile}
          aria-label="Open file"
          className={`${btn} ${iconHover} ${iconColor}`}
        >
          <File className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenFolder}
          aria-label="Open folder"
          className={`${btn} ${iconHover} ${iconColor}`}
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleSearch}
          disabled={!hasFolder}
          aria-label={searchOpen ? "Close search" : "Open search (Ctrl+Shift+F)"}
          title={hasFolder ? "Search in Workspace (Ctrl+Shift+F)" : "Open a folder to enable search"}
          className={`${btn} ${
            !hasFolder
              ? "opacity-40 cursor-not-allowed text-[var(--text-muted)]"
              : searchOpen
              ? `${activeBg} ${textColor}`
              : `${iconHover} ${iconColor}`
          }`}
        >
          <Search className="w-4 h-4" />
        </button>
        {activeFile && (
          <>
            <div className="w-px h-4 bg-[var(--border-main)] mx-0.5" aria-hidden="true" />
            <button
              onClick={onToggleEdit}
              aria-label={isEditing ? "View rendered" : "Edit source"}
              className={`${btn} ${isEditing ? activeBg : iconHover} ${isEditing ? textColor : iconColor}`}
            >
              {isEditing ? <Eye className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>
      <div className="flex items-center h-full pr-1">
        <ExportMenu onSelect={onExportSelect} disabled={!activeFile} />
        <div className="w-px h-4 bg-[var(--border-main)] mx-1" aria-hidden="true" />
        <ThemeMenu />
      </div>
    </div>
  );
}
