import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Sun, Moon, Plus } from "lucide-react";
import { useTheme } from "../App";

export default function ThemeMenu() {
  const { themeId, setThemeId, themes, refreshThemes, installThemeUrl } = useTheme();
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeIndexRef = useRef(0);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleItemClick = useCallback((id: string) => {
    setThemeId(id);
    setOpen(false);
    triggerRef.current?.focus();
  }, [setThemeId]);

  useEffect(() => {
    if (open) refreshThemes();
  }, [open, refreshThemes]);

  useEffect(() => {
    if (!open) return;
    const currentIdx = themes.findIndex((t) => t.id === themeId);
    activeIndexRef.current = currentIdx >= 0 ? currentIdx : 0;
    itemsRef.current[activeIndexRef.current]?.focus();

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, themeId, close, themes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndexRef.current + dir + themes.length) % themes.length;
      activeIndexRef.current = next;
      itemsRef.current[next]?.focus();
    }
  }, [close, themes.length]);

  const handleInstall = useCallback(async () => {
    const url = window.prompt("Pega la URL https del repo del tema (ej. https://github.com/usuario/mi-tema):");
    if (!url) return;
    setInstalling(true);
    setInstallError(null);
    const res = await installThemeUrl(url.trim());
    setInstalling(false);
    if (!res.ok) {
      setInstallError(res.error || "No se pudo instalar el tema.");
    }
  }, [installThemeUrl]);

  const activeTheme = themes.find((t) => t.id === themeId) || themes[0];
  const lightThemes = themes.filter((t) => !t.isDark);
  const darkThemes = themes.filter((t) => t.isDark);

  const renderGroup = (list: typeof themes) => list.map((item) => {
    const index = themes.findIndex((t) => t.id === item.id);
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
  });

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
        {activeTheme && activeTheme.isDark ? (
          <Moon className="w-4 h-4 text-[var(--accent-blue)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme selector"
          className="absolute right-0 top-full mt-1.5 w-60 max-h-[calc(100vh-50px)] overflow-y-auto custom-scrollbar bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl shadow-xl z-50 py-1.5 flex flex-col gap-0.5"
          onKeyDown={handleKeyDown}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Light Themes
          </div>
          {renderGroup(lightThemes)}

          <div className="h-px bg-[var(--border-main)] my-1" />

          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Dark Themes
          </div>
          {renderGroup(darkThemes)}

          <div className="h-px bg-[var(--border-main)] my-1" />

          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--accent-hover)] hover:text-[var(--text-main)] disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{installing ? "Instalando…" : "Instalar tema desde URL"}</span>
          </button>
          {installError && (
            <div className="px-3 py-1 text-[10px] text-red-400">{installError}</div>
          )}
          <div className="px-3 py-1 text-[10px] text-[var(--text-muted)]">
            Temas de comunidad en <span className="font-mono">themes/</span> (“●” = usuario)
          </div>
        </div>
      )}
    </div>
  );
}
