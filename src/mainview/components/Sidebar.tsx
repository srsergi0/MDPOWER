import { useState, useCallback } from "react";
import type { FileEntry } from "../../shared/types";
import { ChevronRight, Folder, File } from "lucide-react";

type Props = {
  files: FileEntry[];
  activePath: string | null;
  onSelectFile: (entry: FileEntry) => void;
  open: boolean;
};

function TreeItem({
  entry,
  activePath,
  onSelectFile,
  depth,
}: {
  entry: FileEntry;
  activePath: string | null;
  onSelectFile: (entry: FileEntry) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDirKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setExpanded(true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setExpanded(false); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((p) => !p); }
  }, []);

  const isSelected = activePath === entry.path;

  if (entry.isDirectory) {
    const hasChildren = entry.children && entry.children.length > 0;
    return (
      <div role="treeitem" aria-expanded={expanded} className="flex flex-col">
        <button
          onClick={() => {
            if (hasChildren) {
              setExpanded((p) => !p);
            }
          }}
          onKeyDown={hasChildren ? handleDirKeyDown : undefined}
          className={`group w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-blue-500 ${
            expanded
              ? "text-[var(--text-main)] font-medium"
              : "text-[var(--text-muted)]"
          } ${
            hasChildren
              ? "hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)] hover:translate-x-0.5 active:scale-[0.98]"
              : ""
          }`}
        >
          {hasChildren ? (
            <ChevronRight
              className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
                expanded ? "rotate-90 text-[var(--text-main)]" : ""
              }`}
            />
          ) : (
            <div className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <Folder className="w-4 h-4 flex-shrink-0 text-amber-500 dark:text-amber-400 fill-amber-500/10 dark:fill-amber-400/5" />
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <div
            role="group"
            className="ml-3.5 pl-3 border-l border-[var(--border-main)] flex flex-col gap-0.5 mt-0.5"
          >
            {entry.children.map((child) => (
              <TreeItem
                key={child.path}
                entry={child}
                activePath={activePath}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      role="treeitem"
      onClick={() => onSelectFile(entry)}
      className={`group w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all duration-200 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.98] ${
        isSelected
          ? "bg-[var(--accent-hover)] text-[var(--accent-blue)] font-semibold shadow-[inset_0_0_0_1px_var(--accent-blue)]"
          : "text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
      }`}
    >
      <div className="w-3.5 h-3.5 flex-shrink-0" />
      <File
        className={`w-4 h-4 flex-shrink-0 transition-colors ${
          isSelected
            ? "text-[var(--accent-blue)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"
        }`}
      />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export default function Sidebar({ files, activePath, onSelectFile, open }: Props) {
  return (
    <div
      role="tree"
      aria-label="File explorer"
      className={`flex-shrink-0 h-full bg-[var(--bg-sidebar)] flex flex-col select-none relative transition-[width,opacity] duration-150 ease-out ${
        open
          ? "w-64 border-r border-[var(--border-main)] opacity-100"
          : "w-0 border-r-0 opacity-0 pointer-events-none overflow-hidden"
      }`}
    >
      <div className="flex-1 overflow-y-auto pt-3 pb-3 px-2.5 custom-scrollbar min-w-[256px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] gap-3 px-4 animate-fade-in">
            <div className="p-4 rounded-full bg-[var(--accent-hover)] border border-[var(--border-main)]">
              <Folder className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[var(--text-main)]">No workspace open</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[160px] mx-auto leading-relaxed">
                Open a folder to see your files here
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 animate-fade-in">
            {files.map((entry) => (
              <TreeItem
                key={entry.path}
                entry={entry}
                activePath={activePath}
                onSelectFile={onSelectFile}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
