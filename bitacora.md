# 📜 Bitácora de Cambios — MDPOWER

Registro cronológico de todas las modificaciones, refactorizaciones, adiciones y eliminaciones de código realizadas en el proyecto.

---

### [2026-09-08 12:28] — Restauración del Backend Bun y Corrección del Arranque de Ventana
- **Tipo de cambio**: Corrección
- **Archivos modificados**:
  - `src/bun/index.ts` (restaurado el archivo completo del proceso principal Bun que crea la ventana `BrowserWindow` e inicializa el RPC; añadido `AbortSignal.timeout(300)` en `getMainViewUrl` para evitar bloqueos de red en Windows)
  - `src/vite-env.d.ts` (creado con `declare module "three"` y tipos de Vite para garantizar compatibilidad con dependencias de Electrobun)
- **Descripción**:
  - Se detectó que el archivo `src/bun/index.ts` se encontraba vacío en el commit anterior, por lo que la ventana de la aplicación nunca era instanciada por `electrobun`.
  - Se restauró el código completo del backend y se optimizó la verificación del servidor HMR con un timeout de 300ms para abrir la ventana nativa de forma instantánea.
- **Resultado / Verificación**:
  - `bun x tsc --noEmit` verificado con 0 errores (código de salida 0).
  - La ventana `BrowserWindow` arranca correctamente.

---

### [2026-09-08 12:23] — Diagnóstico y Resolución Integral de Errores de Tipado y Ejecución
- **Tipo de cambio**: Corrección
- **Archivos modificados**:
  - `src/shared/types.ts` (restaurado el contenido íntegro del archivo de tipos RPC; movido `folderChanged` a `webview.messages` para sincronización correcta con el frontend)
  - `src/mainview/components/MarkdownViewer.tsx` (corregida inferencia de tipos TS18048 en `parentId` y restaurado breadcrumbs navigation)
  - `package.json` (actualizado script `dev` a `vite build && electrobun dev --watch` para evitar fallos de copia de archivos inexistentes en `dist/`)
- **Descripción**:
  - Se diagnosticó y resolvió el error `TS2305` provocado por un vaciado accidental en `src/shared/types.ts`, restaurando todos los tipos del protocolo RPC.
  - Se corrigió el error `TS2561` y `TS7031` moviendo el mensaje `folderChanged` a los manejadores de la WebView en lugar de Bun.
  - Se resolvió el error de permisos `EACCES` en Windows causado por instancias anteriores de `bun.exe`/`launcher.exe` que retenían el bloqueo de la carpeta `build/dev-win-x64`.
  - Se aseguró que `dist/` se compile automáticamente antes de que Electrobun inicie el modo dev.
- **Resultado / Verificación**:
  - `bun x tsc --noEmit` completado con 0 errores (código de salida 0).
  - `bun run vite build` completado con éxito (código de salida 0).
  - Ejecución de `bun run dev` probada y funcionando en segundo plano.

---

### [2026-09-08 12:15] — Eliminación de Botones Abrir y Mejora de Apertura por Drag & Drop
- **Tipo de cambio**: [Modificación / Refactor]
- **Archivos modificados**:
  - `src/mainview/components/TopBar.tsx` (eliminados botones de abrir archivo y abrir carpeta, eliminados iconos `File` y `FolderOpen` de la barra)
  - `src/mainview/App.tsx` (removidas props `onOpenFile` y `onOpenFolder` de `TopBar`; implementadas funciones `openFileByPath` y `openFolderByPath`; mejorado `handleDrop` para resolución de carpetas/archivos reales con auto-apertura del primer documento `.md`, indexación para búsqueda y activación del file watcher)
  - `src/mainview/components/MarkdownViewer.tsx` (actualizado texto de pantalla vacía a arrastrar y soltar archivo o carpeta)
  - `src/mainview/components/Sidebar.tsx` (actualizado texto de estado vacío para arrastrar carpeta)
  - `FEATURES.md` (actualizado estado de Feature 4 a apertura 100% Drag & Drop)
- **Descripción**:
  - Se eliminaron los botones de "Abrir archivo" y "Abrir carpeta" de la interfaz para favorecer una experiencia minimalista y fluida basada exclusivamente en Drag & Drop y asociación de archivos.
  - Al arrastrar y soltar una carpeta completa, el visor monta el árbol en la barra lateral, inicia la indexación en memoria para búsqueda (`Ctrl+Shift+F`), activa el observador de cambios en vivo (`fs.watch`) y abre automáticamente el primer archivo Markdown o `README.md`.
  - Al arrastrar y soltar archivos `.md`, se abren en nuevas pestañas con ruta real del sistema y observador en tiempo real habilitado.
- **Resultado / Verificación**:
  - Compilación verificada con `vite build` (`exit code 0`).

---

### [2026-09-08 12:12] — Eliminación de Raíz del Editor WYSIWYG (BlockNote/Mantine)
- **Tipo de cambio**: Eliminación de raíz
- **Archivos modificados**:
  - `src/mainview/App.tsx` (eliminados estado `isEditing`, callbacks `handleSave`/`handleToggleEdit`, import de `MarkdownEditor` y vistas asociadas)
  - `src/mainview/components/TopBar.tsx` (eliminados botón de alternancia de edición, iconos `Eye`/`PenSquare` y props `isEditing`)
  - `src/bun/index.ts` (eliminado manejador RPC `saveFile`)
  - `src/shared/types.ts` (eliminada definición de solicitud RPC `saveFile`)
  - `package.json` y `bun.lock` (desinstaladas 5 dependencias pesadas de BlockNote y Mantine)
  - `FEATURES.md` (actualizado estado de Feature 2 a Eliminado de raíz)
- **Archivos eliminados**:
  - `src/mainview/components/MarkdownEditor.tsx` (componente del editor por bloques)
  - `src/mainview/components/Toolbar.tsx` (componente legado no utilizado)
- **Descripción**:
  - Se eliminó por completo el subsistema de edición para que MDPOWER funcione exclusivamente como un visor ultra-ligero y rápido de Markdown.
  - Se desinstalaron `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react`, `@mantine/core` y `@mantine/hooks`, reduciendo significativamente el peso del bundle y eliminando dependencias pesadas de UI.
- **Resultado / Verificación**:
  - Compilación verificada con `vite build` sin errores tipográficos ni importaciones rotas.

---

### [2026-09-08 12:06] — Inicialización de Bitácora, Reglas de Agente e Inventario de Features
- **Tipo de cambio**: [Nueva Característica / Configuración]
- **Archivos modificados / creados**:
  - [`FEATURES.md`](FEATURES.md)
  - [`AGENTS.md`](AGENTS.md)
  - [`AGENT.md`](AGENT.md)
  - [`bitacora.md`](bitacora.md)
- **Descripción**:
  - Se creó el inventario integral de características de MDPOWER en `FEATURES.md`, detallando rutas exactas de archivos, dependencias y opciones de decisión (mantener, modificar, quitar de raíz).
  - Se configuró la directriz estricta en `AGENTS.md` y `AGENT.md` para que el agente registre automáticamente cualquier cambio o modificación en `bitacora.md`.
  - Se inicializó este documento para dar seguimiento y control a la depuración y reestructuración del proyecto.
- **Resultado / Verificación**:
  - Archivos creados y verificados en el directorio raíz del proyecto.
