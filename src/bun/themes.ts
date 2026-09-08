import { readdir, mkdir, stat } from "fs/promises";
import { join, basename } from "path";

export type ThemeMode = "light" | "dark";

export type ThemeDefinition = {
  id: string;
  name: string;
  mode: ThemeMode;
  author: string;
  version: string;
  colors: Record<string, string>;
  ui: Record<string, string>;
  markdown: Record<string, Record<string, string>>;
  source: "bundled" | "user";
  hasPreview: boolean;
};

export type ThemeSummary = {
  id: string;
  name: string;
  mode: ThemeMode;
  editorColor: string;
  sidebarColor: string;
  source: "bundled" | "user";
  hasPreview: boolean;
};

export const THEME_NAME_RE = /^[a-z0-9_][a-z0-9._+\-]*$/;
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA_RE = /^rgba?\(/i;

function isColorLike(v: string): boolean {
  return HEX_RE.test(v.trim()) || RGBA_RE.test(v.trim());
}

function parseToml(text: string): any {
  const anyBun = Bun as any;
  if (anyBun?.TOML?.parse) {
    return anyBun.TOML.parse(text);
  }
  const out: any = {};
  let section: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      section = secMatch[1].trim().split(".");
      let cur = out;
      for (const part of section) {
        cur[part] = cur[part] || {};
        cur = cur[part];
      }
      continue;
    }
    const kvMatch = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;
    let val: any = kvMatch[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (val === "true" || val === "false") {
      val = val === "true";
    }
    let cur = out;
    for (const part of section) cur = cur[part];
    cur[kvMatch[1]] = String(val);
  }
  return out;
}

function resolvePlaceholders(value: string, colors: Record<string, string>): string {
  return value.replace(/\{([a-zA-Z0-9_\-]+)\}/g, (_, key) => colors[key] ?? colors[key.replace("-", "_")] ?? `{${key}}`);
}

function escCssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

function escCssContent(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function getBundledThemesDir(): string {
  const candidates = [
    join(process.cwd(), "themes"),
    join(import.meta.dir, "../../themes"),
  ];
  return candidates[0];
}

export function getBundledThemesCandidates(): string[] {
  return [join(process.cwd(), "themes"), join(import.meta.dir, "../../themes")];
}

export function getUserThemesDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  if (process.platform === "win32") {
    const base = process.env.APPDATA || join(home, "AppData", "Roaming");
    return join(base, "MDPOWER", "themes");
  }
  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", "MDPOWER", "themes");
  }
  const base = process.env.XDG_CONFIG_HOME || join(home, ".config");
  return join(base, "MDPOWER", "themes");
}

function toSummary(def: ThemeDefinition): ThemeSummary {
  const ui = def.ui;
  return {
    id: def.id,
    name: def.name,
    mode: def.mode,
    editorColor: ui["bg-editor"] || def.colors["background"] || "#ffffff",
    sidebarColor: ui["bg-sidebar"] || def.colors["darker_background"] || def.colors["background"] || "#ffffff",
    source: def.source,
    hasPreview: def.hasPreview,
  };
}

function defaultUiFromColors(colors: Record<string, string>, mode: ThemeMode): Record<string, string> {
  const bg = colors["background"] || (mode === "dark" ? "#1e1e1e" : "#ffffff");
  const fg = colors["foreground"] || (mode === "dark" ? "#d4d4d4" : "#24292f");
  const accent = colors["accent"] || "#4078f2";
  const muted = colors["muted"] || colors["dark_foreground"] || fg;
  const sidebar = colors["darker_background"] || colors["dark_background"] || bg;
  const header = colors["lighter_background"] || sidebar;
  const border = colors["selection"] || muted;
  const hover = mode === "dark" ? hexToRgba(accent, 0.15) : hexToRgba(accent, 0.08);
  return {
    "bg-editor": bg,
    "bg-sidebar": sidebar,
    "bg-header": header,
    "text-main": fg,
    "text-muted": muted,
    "border-main": border,
    "accent-blue": accent,
    "accent-hover": hover,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export async function loadThemeFromDir(dir: string, source: "bundled" | "user"): Promise<ThemeDefinition | null> {
  try {
    const file = Bun.file(join(dir, "theme.toml"));
    if (!(await file.exists())) return null;
    const parsed = parseToml(await file.text());
    const meta = parsed?.meta || {};
    const rawId = String(meta.id || basename(dir)).toLowerCase();
    if (!THEME_NAME_RE.test(rawId)) return null;
    const mode: ThemeMode = meta.mode === "light" ? "light" : "dark";
    const colors: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed?.colors || {})) {
      colors[k] = String(v);
    }
    if (!colors["background"] || !colors["foreground"] || !colors["accent"]) return null;
    const ui = { ...defaultUiFromColors(colors, mode) };
    for (const [k, v] of Object.entries(parsed?.ui || {})) {
      ui[k] = resolvePlaceholders(String(v), colors);
    }
    const markdown: Record<string, Record<string, string>> = {};
    for (const [el, props] of Object.entries(parsed?.markdown || {})) {
      if (typeof props !== "object" || !props) continue;
      markdown[el] = {};
      for (const [pk, pv] of Object.entries(props as Record<string, unknown>)) {
        markdown[el][pk] = resolvePlaceholders(String(pv), { ...colors, ...ui });
      }
    }
    let hasPreview = false;
    try {
      const st = await stat(join(dir, "preview.png"));
      hasPreview = st.isFile();
    } catch { }
    return {
      id: rawId,
      name: String(meta.name || rawId),
      mode,
      author: String(meta.author || "community"),
      version: String(meta.version || "1.0.0"),
      colors,
      ui,
      markdown,
      source,
      hasPreview,
    };
  } catch {
    return null;
  }
}

async function scanOneDir(root: string, source: "bundled" | "user"): Promise<ThemeDefinition[]> {
  const out: ThemeDefinition[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith(".")) continue;
      const def = await loadThemeFromDir(join(root, e.name), source);
      if (def) out.push(def);
    }
  } catch { }
  return out;
}

export async function listThemes(): Promise<ThemeDefinition[]> {
  const byId = new Map<string, ThemeDefinition>();
  for (const dir of getBundledThemesCandidates()) {
    for (const t of await scanOneDir(dir, "bundled")) {
      if (!byId.has(t.id)) byId.set(t.id, t);
    }
  }
  try {
    await mkdir(getUserThemesDir(), { recursive: true });
  } catch { }
  for (const t of await scanOneDir(getUserThemesDir(), "user")) {
    byId.set(t.id, t);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === "light" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function summarizeThemes(defs: ThemeDefinition[]): ThemeSummary[] {
  return defs.map(toSummary);
}

const MD_SELECTOR: Record<string, string> = {
  h1: ".heading-1",
  h2: ".heading-2",
  h3: ".heading-3",
  h4: ".heading-4",
  h5: ".heading-5",
  h6: ".heading-6",
  p: "p",
  code: ".code-block",
  codespan: "code:not(.code-block code)",
  blockquote: "blockquote",
  a: "a.md-link",
  table: "table",
  hr: "hr",
  li: "li",
};

const MD_PROP: Record<string, string> = {
  size: "font-size",
  weight: "font-weight",
  color: "color",
  bg: "background-color",
  align: "text-align",
  "border-bottom": "border-bottom",
  "border-left": "border-left",
  radius: "border-radius",
  prefix: "__prefix__",
  italic: "__italic__",
  underline: "__underline__",
};

export function buildThemeCSS(def: ThemeDefinition): string {
  const sel = `.theme-${escCssId(def.id)}`;
  const lines: string[] = [];
  lines.push(`${sel} {`);
  for (const [k, v] of Object.entries(def.ui)) {
    if (!v) continue;
    lines.push(`  --${k}: ${v};`);
  }
  lines.push(`}`);
  for (const [el, props] of Object.entries(def.markdown)) {
    const target = MD_SELECTOR[el];
    if (!target) continue;
    const decls: string[] = [];
    for (const [pk, pv] of Object.entries(props)) {
      const cssProp = MD_PROP[pk];
      if (!cssProp || !pv) continue;
      if (cssProp === "__prefix__") continue;
      if (cssProp === "__italic__") {
        if (pv === "true") decls.push(`font-style: italic`);
        continue;
      }
      if (cssProp === "__underline__") {
        if (pv === "true") decls.push(`text-decoration: underline`);
        continue;
      }
      if ((cssProp === "color" || cssProp === "background-color") && !isColorLike(pv) && !pv.startsWith("var(")) continue;
      decls.push(`${cssProp}: ${pv}`);
    }
    if (decls.length > 0) {
      lines.push(`${sel} ${target} { ${decls.join("; ")}; }`);
    }
    const prefix = props["prefix"];
    if (prefix && (el === "h1" || el === "h2" || el === "h3")) {
      lines.push(`${sel} ${target}::before { content: "${escCssContent(prefix)}"; margin-right: 0.35em; }`);
    }
  }
  return lines.join("\n");
}

let cssCache: { key: string; css: string } | null = null;

export async function getAllThemesCSS(): Promise<string> {
  const defs = await listThemes();
  const key = defs.map((d) => `${d.id}@${d.version}:${d.source}`).join("|");
  if (cssCache && cssCache.key === key) return cssCache.css;
  const css = defs.map(buildThemeCSS).join("\n\n");
  cssCache = { key, css };
  return css;
}

export function invalidateThemesCache(): void {
  cssCache = null;
}

const ALLOWED_EXT = new Set([".toml", ".png", ".md", ".jpg", ".jpeg"]);
const ALLOWED_BASE = new Set(["theme.toml", "preview.png", "README.md"]);

export async function sanitizeThemeDir(dir: string): Promise<void> {
  const rm: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "backgrounds") {
          const sub = await readdir(p, { withFileTypes: true });
          for (const s of sub) {
            const ext = "." + (s.name.split(".").pop() || "").toLowerCase();
            if (!s.isFile() || !ALLOWED_EXT.has(ext)) {
              rm.push(join(p, s.name));
            }
          }
        } else {
          rm.push(p);
        }
        continue;
      }
      const lower = e.name.toLowerCase();
      const ext = "." + (lower.split(".").pop() || "");
      if (!ALLOWED_EXT.has(ext) || (!ALLOWED_BASE.has(lower) && lower !== "theme.toml" && !lower.endsWith(".png") && !lower.endsWith(".md"))) {
        if (lower !== "theme.toml") rm.push(p);
      }
      if (lower.endsWith(".lua") || lower.endsWith(".js") || lower.endsWith(".ts") || lower.endsWith(".exe") || lower.endsWith(".sh") || lower.endsWith(".ps1")) {
        rm.push(p);
      }
    }
  } catch { return; }
  const { rm: remove } = await import("fs/promises");
  for (const p of new Set(rm)) {
    try {
      await remove(p, { recursive: true, force: true });
    } catch { }
  }
}

export function deriveDirNameFromUrl(url: string): string | null {
  const m = url.trim().replace(/\/$/, "").match(/\/([^/]+?)(?:\.git)?$/);
  if (!m) return null;
  let name = m[1].toLowerCase();
  name = name.replace(/^omarchy-/, "").replace(/-theme$/, "");
  if (!THEME_NAME_RE.test(name)) return null;
  return name;
}

export async function installThemeFromUrl(url: string): Promise<ThemeDefinition> {
  if (!/^https:\/\/[a-zA-Z0-9._\-/:]+\/?(?:\.git)?$/.test(url.trim())) {
    throw new Error("URL de git no válida (solo https)");
  }
  const name = deriveDirNameFromUrl(url);
  if (!name) throw new Error("No se pudo derivar un nombre de tema válido de la URL");
  const target = join(getUserThemesDir(), name);
  await mkdir(getUserThemesDir(), { recursive: true });
  const proc = Bun.spawn(["git", "clone", "--depth", "1", url.trim(), target], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text().catch(() => "");
    throw new Error(`git clone falló: ${err.slice(0, 300)}`);
  }
  await sanitizeThemeDir(target);
  invalidateThemesCache();
  const def = await loadThemeFromDir(target, "user");
  if (!def) throw new Error("El repositorio no contiene un theme.toml válido");
  return def;
}

export async function installThemeFromPath(srcPath: string): Promise<ThemeDefinition> {
  const base = basename(srcPath).toLowerCase();
  if (!THEME_NAME_RE.test(base)) throw new Error(`Nombre de carpeta no válido: ${base}`);
  const target = join(getUserThemesDir(), base);
  await mkdir(getUserThemesDir(), { recursive: true });
  const proc = process.platform === "win32"
    ? Bun.spawn(["cmd", "/c", "xcopy", srcPath, target + "\\", "/E", "/I", "/Y"], { stdout: "pipe", stderr: "pipe" })
    : Bun.spawn(["cp", "-r", srcPath + "/.", target], { stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  if (code !== 0) throw new Error("No se pudo copiar la carpeta del tema");
  await sanitizeThemeDir(target);
  invalidateThemesCache();
  const def = await loadThemeFromDir(target, "user");
  if (!def) throw new Error("La carpeta no contiene un theme.toml válido");
  return def;
}
