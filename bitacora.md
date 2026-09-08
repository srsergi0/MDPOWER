# 📜 Bitácora de Cambios — MDPOWER

Registro cronológico de todas las modificaciones, refactorizaciones, adiciones y eliminaciones de código realizadas en el proyecto.

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
