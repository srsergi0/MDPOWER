import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Sun, Moon } from "lucide-react";
import { useTheme, type ThemeId } from "../App";

type ThemeItem = {
  id: ThemeId;
  label: string;
  isDark: boolean;
  editorColor: string;
  sidebarColor: string;
};

const THEMES: ThemeItem[] = [
  // Light Themes
  { id: "github-light", label: "GitHub Light", isDark: false, editorColor: "#ffffff", sidebarColor: "#f6f8fa" },
  { id: "one-light", label: "One Light", isDark: false, editorColor: "#fafafa", sidebarColor: "#f0f0f0" },
  { id: "solarized-light", label: "Solarized Light", isDark: false, editorColor: "#fdf6e3", sidebarColor: "#eee8d5" },
  { id: "ayu-light", label: "Ayu Light", isDark: false, editorColor: "#fdfdfd", sidebarColor: "#f8f9fa" },
  { id: "gruvbox-light", label: "Gruvbox Light", isDark: false, editorColor: "#fbf1c7", sidebarColor: "#f2e5bc" },
  { id: "everforest-light", label: "Everforest Light", isDark: false, editorColor: "#fdf6e3", sidebarColor: "#f3ecc8" },
  { id: "rose-pine-dawn", label: "Rosé Pine Dawn", isDark: false, editorColor: "#faf4ed", sidebarColor: "#f2e9e1" },
  // Dark Themes
  { id: "one-dark", label: "One Dark Pro", isDark: true, editorColor: "#282c34", sidebarColor: "#21252b" },
  { id: "dracula", label: "Dracula", isDark: true, editorColor: "#282a36", sidebarColor: "#191a21" },
  { id: "github-dark", label: "GitHub Dark", isDark: true, editorColor: "#0d1117", sidebarColor: "#161b22" },
  { id: "nord", label: "Nord", isDark: true, editorColor: "#2e3440", sidebarColor: "#242933" },
  { id: "tokyo-night", label: "Tokyo Night", isDark: true, editorColor: "#1a1b26", sidebarColor: "#16161e" },
  { id: "gruvbox-dark", label: "Gruvbox Dark", isDark: true, editorColor: "#282828", sidebarColor: "#1d2021" },
  { id: "rose-pine", label: "Rosé Pine", isDark: true, editorColor: "#191724", sidebarColor: "#1f1d2e" },
  { id: "synthwave84", label: "SynthWave '84", isDark: true, editorColor: "#2b213a", sidebarColor: "#241b2f" },
  { id: "night-owl", label: "Night Owl", isDark: true, editorColor: "#011627", sidebarColor: "#010e1a" },
];

export default function ThemeMenu() {
  const { themeId, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeIndexRef = useRef(0);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleItemClick = useCallback((id: ThemeId) => {
    setThemeId(id);
    setOpen(false);
    triggerRef.current?.focus();
  }, [setThemeId]);

  useEffect(() => {
    if (!open) return;
    const currentIdx = THEMES.findIndex((t) => t.id === themeId);
    activeIndexRef.current = currentIdx >= 0 ? currentIdx : 0;
    itemsRef.current[activeIndexRef.current]?.focus();

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, themeId, close]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndexRef.current + dir + THEMES.length) % THEMES.length;
      activeIndexRef.current = next;
      itemsRef.current[next]?.focus();
    }
  }, [close]);

  const activeTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((p) => !p)}
        aria-label="Select theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1.5 rounded-md transition-colors active:scale-95 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
      >
        {activeTheme.isDark ? (
          <Moon className="w-4 h-4 text-[var(--accent-blue)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme selector"
          className="absolute right-0 top-full mt-1.5 w-56 max-h-[calc(100vh-50px)] overflow-y-auto custom-scrollbar bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl shadow-xl z-50 py-1.5 flex flex-col gap-0.5"
          onKeyDown={handleKeyDown}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Light Themes
          </div>
          {THEMES.filter((t) => !t.isDark).map((item) => {
            const index = THEMES.findIndex((t) => t.id === item.id);
            const isSelected = item.id === themeId;
            return (
              <button
                key={item.id}
                ref={(el) => { itemsRef.current[index] = el; }}
                role="menuitem"
                onClick={() => handleItemClick(item.id)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all duration-150 flex items-center justify-between hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  isSelected
                    ? "text-[var(--accent-blue)] bg-[var(--accent-hover)] font-semibold"
                    : "text-[var(--text-main)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-[var(--border-main)] flex overflow-hidden shrink-0"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    <span className="w-1/2 h-full" style={{ backgroundColor: item.sidebarColor }} />
                    <span className="w-1/2 h-full" style={{ backgroundColor: item.editorColor }} />
                  </span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-blue)]" />}
              </button>
            );
          })}

          <div className="h-px bg-[var(--border-main)] my-1" />

          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Dark Themes
          </div>
          {THEMES.filter((t) => t.isDark).map((item) => {
            const index = THEMES.findIndex((t) => t.id === item.id);
            const isSelected = item.id === themeId;
            return (
              <button
                key={item.id}
                ref={(el) => { itemsRef.current[index] = el; }}
                role="menuitem"
                onClick={() => handleItemClick(item.id)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all duration-150 flex items-center justify-between hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  isSelected
                    ? "text-[var(--accent-blue)] bg-[var(--accent-hover)] font-semibold"
                    : "text-[var(--text-main)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-[var(--border-main)] flex overflow-hidden shrink-0"
                    style={{ transform: "rotate(-45deg)" }}
                  >
                    <span className="w-1/2 h-full" style={{ backgroundColor: item.sidebarColor }} />
                    <span className="w-1/2 h-full" style={{ backgroundColor: item.editorColor }} />
                  </span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-blue)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
