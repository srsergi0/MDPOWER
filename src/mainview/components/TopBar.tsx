import { Search } from "lucide-react";
import ThemeMenu from "./ThemeMenu";

type Props = {
  hasFolder: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
};

const btn = "p-2 rounded-md transition-colors active:scale-95";

export default function TopBar({
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
      <div className="flex items-center gap-1 px-2 flex-1 min-w-0">
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
      </div>
      <div className="flex items-center h-full pr-1">
        <ThemeMenu />
      </div>
    </div>
  );
}
