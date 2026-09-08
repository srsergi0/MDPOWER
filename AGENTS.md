# Reglas de Trabajo para el Agente (MDPOWER)

## 📌 Regla Obligatoria: Registro en Bitácora (`bitacora.md`)

Cada vez que se realice **cualquier cambio, modificación, adición o eliminación de código, archivos o configuración** en el proyecto, el agente debe **actualizar inmediatamente el archivo [`bitacora.md`](bitacora.md)**.

### Formato de Registro Requerido en `bitacora.md`:

Cada entrada debe agregarse al inicio (orden cronológico inverso) bajo el siguiente esquema:

```markdown
### [YYYY-MM-DD HH:mm] — [Título breve de la modificación]
- **Tipo de cambio**: [Eliminación de raíz | Modificación | Nueva Característica | Refactor | Corrección]
- **Archivos modificados**:
  - `ruta/al/archivo1`
  - `ruta/al/archivo2`
- **Descripción**:
  - Explicación concisa y clara de qué se cambió, qué dependencias o funciones se eliminaron o modificaron, y el motivo del cambio.
- **Resultado / Verificación**:
  - Cómo se validó o el estado en que quedó el cambio.
```

---

## Directrices de Desarrollo para MDPOWER

1. **Rendimiento ante todo**: MDPOWER busca ser ultra-rápido (<50ms startup, bajo consumo de RAM). Evitar dependencias innecesarias o pesadas.
2. **Eliminación limpia ("De raíz")**: Al quitar una funcionalidad, eliminar por completo su componente, llamadas en `App.tsx`, manejadores en el backend (`src/bun/index.ts`), tipos en `src/shared/types.ts` y desinstalar las dependencias de `package.json` y `bun.lock`.
3. **Mantenimiento de Documentación**: Reflejar los cambios en `FEATURES.md` y documentar en `bitacora.md`.
