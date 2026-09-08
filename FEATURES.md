# 📋 Inventario y Diagnóstico de Features — MDPOWER

Documento de referencia para auditoría, depuración y refactorización. Cada sección detalla el comportamiento, los archivos involucrados con sus rutas exactas, dependencias asociadas y el espacio para definir la acción a tomar (*Mantener*, *Modificar*, *Quitar de raíz*).

---

## 1. 📖 Visor y Renderizado Markdown

- **Descripción**: 
  - Compilación y análisis de Markdown de ultra-alto rendimiento ejecutada en Rust mediante el motor nativo de Bun (`Bun.markdown.render` / `Bun.markdown.html`).
  - Renderizado compatible con GitHub Flavored Markdown (tablas GFM completas, checklists con checkboxes estilizados, citas de bloque, encabezados con IDs automáticos).
  - Resaltado de sintaxis ligero y modular mediante `PrismJS` con soporte para TypeScript, JavaScript, Python, Bash, Rust, JSON, CSS, SQL, YAML y Markdown.
  - Botón interactivo de copiado en cabecera de bloques de código ("Copy" / "Copied!").
  - Diagramas Mermaid integrados con soporte nativo de bloques `.mermaid-block`.
  - Resolución y apertura de enlaces locales hacia otros archivos `.md` / `.markdown` en nueva pestaña (soporta `./`, `../`, `#anclas`, `?query`, `%20`, mayúsculas), scroll suave a `#anclas` locales, y apertura de enlaces externos (`http/https`, `mailto:`, etc.) en navegador vía `openExternalUrl`.
  - Resaltado visual pulsante (`highlight-pulse`) al navegar directamente a una línea objetivo desde la búsqueda.
- **Archivos involucrados**:
  - `src/bun/index.ts` (`compileMarkdownWithBun`, `Bun.markdown.render`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\bun\index.ts`)
  - `src/mainview/components/MarkdownViewer.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\MarkdownViewer.tsx`)
  - `src/mainview/components/MermaidRenderer.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\MermaidRenderer.tsx`)
  - `src/mainview/index.css` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\index.css`)
- **Dependencias en `package.json`**:
  - `prismjs`
  - `@types/prismjs`
  - `mermaid`
- **Dependencias eliminadas de raíz**:
  - `react-markdown`
  - `remark-gfm`
  - `react-syntax-highlighter`
  - `@types/react-syntax-highlighter`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [x] **Modificado (Migrado a Bun.markdown en Rust)**
  - [ ] Quitar de raíz

---

## 2. ✍️ Editor WYSIWYG / Enriquecido (BlockNote) — [ELIMINADO DE RAÍZ]

- **Estado**: **Eliminado de raíz** (2026-09-08).
- **Acción ejecutada**:
  - Eliminado componente `src/mainview/components/MarkdownEditor.tsx` y archivo huérfano `src/mainview/components/Toolbar.tsx`.
  - Eliminado estado `isEditing`, funciones de guardado `handleSave` y alternancia `handleToggleEdit` en `src/mainview/App.tsx`.
  - Eliminado botón de edición y props en `src/mainview/components/TopBar.tsx`.
  - Eliminado endpoint RPC `saveFile` en `src/bun/index.ts` y definición de tipo en `src/shared/types.ts`.
  - Desinstaladas dependencias de `package.json` y `bun.lock`: `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react`, `@mantine/core`, `@mantine/hooks`.
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [x] **Quitar de raíz (Completado)**

---

## 3. 📑 Sistema de Pestañas (Tabs)

- **Descripción**:
  - Apertura simultánea de múltiples documentos `.md`.
  - Reordenación interactiva de pestañas mediante arrastrar y soltar (Drag and Drop nativo).
  - Navegación con atajos de teclado (`ArrowLeft`, `ArrowRight`, `Home`, `End`).
  - Cierre individual de pestañas con botón `X`.
  - Persistencia de sesión en `localStorage` (`md-reader-session`): restaura pestañas abiertas y pestaña activa al reiniciar la aplicación.
- **Archivos involucrados**:
  - `src/mainview/components/TabBar.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\TabBar.tsx`)
  - `src/mainview/App.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\App.tsx`)
- **Dependencias en `package.json`**:
  - `lucide-react`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [ ] Quitar de raíz

---

## 4. 🗂️ Explorador de Archivos y Espacios de Trabajo (Sidebar)

- **Descripción**:
  - Barra lateral retráctil con animación suave para explorar carpetas abiertas.
  - Árbol de archivos recursivo e interactivo con navegación por teclado (`ArrowRight` para expandir, `ArrowLeft` para colapsar).
  - Filtrado estricto: solo lista `.md` y `.markdown`, excluyendo automáticamente `node_modules` y carpetas ocultas (`.*`).
  - **Apertura exclusiva por Drag & Drop**: Se eliminaron los botones manuales de "Abrir archivo" y "Abrir carpeta" de la barra superior. Arrastrar y soltar cualquier archivo `.md` o carpeta completa sobre la ventana abre automáticamente el contenido, activa el observador en tiempo real y monta el árbol en el explorador.
- **Archivos involucrados**:
  - `src/mainview/components/Sidebar.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\Sidebar.tsx`)
  - `src/mainview/components/TopBar.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\TopBar.tsx`)
  - `src/mainview/App.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\App.tsx`)
  - `src/bun/index.ts` (`scanDir`, `readFolder`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\bun\index.ts`)
- **Dependencias en `package.json`**:
  - `lucide-react`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [x] **Modificado (Botones eliminados, apertura 100% por Drag & Drop)**
  - [ ] Quitar de raíz

---

## 5. 🔄 Observador en Tiempo Real (Live File & Folder Watcher)

- **Descripción**:
  - Monitoreo del archivo activo actual con `fs.watch` en el proceso Bun: recarga automáticamente el contenido si un proceso externo (Obsidian, VS Code, IA, etc.) edita el fichero.
  - Monitoreo recursivo de la carpeta abierta: si se crean, borran o renombran archivos `.md`, el árbol de la barra lateral se refresca con un debounce de 400ms.
  - Conexión bidireccional mediante el sistema RPC de Electrobun (`fileChanged`, `folderChanged`).
- **Archivos involucrados**:
  - `src/bun/index.ts` (`startWatching`, `stopWatching`, `startWatchingFolder`, `stopWatchingFolder`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\bun\index.ts`)
  - `src/mainview/App.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\App.tsx`)
  - `src/shared/types.ts` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\shared\types.ts`)
- **Dependencias en `package.json`**:
  - `electrobun`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [ ] Quitar de raíz

---

## 6. 🔍 Buscador Global en el Espacio de Trabajo (Full-Text Search) — [ELIMINADO DE RAÍZ]

- **Estado**: **Eliminado de raíz** (2026-09-08).
- **Acción ejecutada**:
  - Eliminado componente `src/mainview/components/SearchPanel.tsx`.
  - Eliminada clase `SearchIndexer` e indexación de archivos en memoria en `src/bun/index.ts`.
  - Eliminado endpoint RPC `searchInFolder` en `src/bun/index.ts` y su tipado en `src/shared/types.ts`.
  - Eliminado botón de búsqueda en `src/mainview/components/TopBar.tsx`, atajo de teclado `Ctrl+Shift+F`, y estados `searchOpen` / `scrollTarget` en `src/mainview/App.tsx`.
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [x] **Quitar de raíz (Completado)**

---

## 7. 🖨️ Motor de Impresión y Exportación (PDF & HTML) [ELIMINADO DE RAÍZ]

- **Descripción**:
  - Eliminado por completo a petición del usuario. La aplicación se enfoca exclusivamente en ser un visor ultra-rápido de Markdown local sin sobrecargas de impresión, navegadores headless o utilidades de exportación.
- **Archivos eliminados de raíz**:
  - `src/mainview/components/ExportMenu.tsx`
  - `src/mainview/components/SettingsModal.tsx`
  - `src/mainview/components/Modal.tsx`
  - `src/mainview/utils/print.ts`
  - `src/shared/buildPrintHTML.ts`
  - `src/bun/findChromium.ts`
  - `scripts/batch-pdf.ts`
- **Manejadores RPC eliminados**:
  - `savePdf`, `getPrintHtml`, `saveHtml`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [x] **Quitado de raíz**

---

## 8. 🎨 Motor de Temas y Personalización Visual

- **Descripción**:
  - Menú desplegable en el TopBar (`ThemeMenu`) con vista previa circular de colores.
  - 16 temas predeterminados:
    - **Claros (7)**: GitHub Light, One Light, Solarized Light, Ayu Light, Gruvbox Light, Everforest Light, Rosé Pine Dawn.
    - **Oscuros (9)**: One Dark Pro, Dracula, GitHub Dark, Nord, Tokyo Night, Gruvbox Dark, Rosé Pine, SynthWave '84, Night Owl.
  - Botón de alternancia rápida entre claro y oscuro (Sol / Luna).
  - Persistencia de la selección en `localStorage` (`md-reader-theme-id`).
  - Variables CSS completas aplicadas dinámicamente en el elemento raíz HTML (`--bg-editor`, `--bg-sidebar`, `--accent-blue`, etc.).
- **Archivos involucrados**:
  - `src/mainview/components/ThemeMenu.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\ThemeMenu.tsx`)
  - `src/mainview/index.css` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\index.css`)
  - `src/mainview/App.tsx` (`ThemeContext`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\App.tsx`)
- **Dependencias en `package.json`**:
  - `lucide-react`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar (ej. reducir a 2 o 4 temas esenciales)
  - [ ] Quitar de raíz

---

## 9. 🔔 Verificador de Actualizaciones y Notificaciones (Toasts)

- **Descripción**:
  - Consulta automática al arrancar la app a la API pública de GitHub (`api.github.com/repos/srsergi0/MDPOWER/releases/latest`).
  - Compara `__APP_VERSION__` con el último tag de release.
  - Notificación emergente decorada con degradado (`UpdateToast`) invitando a descargar la última versión con botón directo que abre el navegador externo (`openExternalUrl`).
  - Componente de toast simple (`Toast.tsx`) para mensajes del sistema ("Saved!", "HTML exported!").
- **Archivos involucrados**:
  - `src/mainview/components/UpdateToast.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\UpdateToast.tsx`)
  - `src/mainview/components/Toast.tsx` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\components\Toast.tsx`)
  - `src/mainview/App.tsx` (`checkForUpdates`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\mainview\App.tsx`)
  - `src/bun/index.ts` (`openExternalUrl`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\bun\index.ts`)
- **Dependencias en `package.json`**:
  - `lucide-react`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [ ] Quitar de raíz

---

## 10. 🪟 Integración con el Sistema Operativo y Scripts de Compilación

- **Descripción**:
  - Soporte de paso de parámetros CLI: al hacer doble clic sobre un `.md` o ejecutar `MDPOWER archivo.md`, el proceso Bun detecta el argumento en `process.argv` y envía el mensaje IPC `initialFile` a la vista.
  - Script para registrar la asociación de extensiones `.md` y `.markdown` en el Registro de Windows (`HKCU:\Software\Classes`).
  - Script post-build de Windows (`fix-icons.ps1`) que usa `rcedit` para incrustar el icono en el ejecutable y re-empaquetar los artefactos `.tar.zst` y `.zip`.
  - Script para generar iconos PNG en múltiples resoluciones (`generate-icons.ts`).
- **Archivos involucrados**:
  - `src/bun/index.ts` (`getInitialFilePath`) (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\src\bun\index.ts`)
  - `electrobun.config.ts` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\electrobun.config.ts`)
  - `scripts/register-dev.ps1` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\scripts\register-dev.ps1`)
  - `scripts/fix-icons.ps1` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\scripts\fix-icons.ps1`)
  - `scripts/generate-icons.ts` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\scripts\generate-icons.ts`)
- **Dependencias en `package.json`**:
  - `electrobun`
- **Estado / Decisión**:
  - [ ] Mantener intacto
  - [ ] Modificar
  - [ ] Quitar de raíz

---

## 11. 👻 Dependencias No Utilizadas / Mencionadas pero Inexistentes

- **`gray-matter`**:
  - Declarada en `package.json`, pero no está importada en ningún archivo del código fuente.
  - Archivo: `package.json` (`d:\Project\Web-Apps\LaTeX-Documentos\MDPOWER\package.json`)
- **KaTeX / MathJax**:
  - Se anuncia en `README.md` y `presentacion.md`, pero no está instalado ni implementado en el visor (`MarkdownViewer.tsx`).
- **Estado / Decisión**:
  - [ ] Quitar `gray-matter` de raíz
  - [ ] Implementar soporte real de KaTeX o eliminarlo de la documentación
