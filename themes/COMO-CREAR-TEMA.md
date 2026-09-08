# Cómo crear un tema para MDPOWER

Copia una carpeta existente de `themes/` (ej. `themes/nord/`) y edita su `theme.toml`.
No necesitas programar: es un TOML declarativo (con comentarios, sin dependencias nuevas).

## Instalación

1. **Manual:** copia tu carpeta a la carpeta de temas del usuario y reinicia (o abre el menú de temas, hay hot-reload con 400ms de debounce):
   - Windows: `%APPDATA%\MDPOWER\themes\mi-tema\theme.toml`
   - Linux: `~/.config/MDPOWER/themes/mi-tema/theme.toml`
   - macOS: `~/Library/Application Support/MDPOWER/themes/mi-tema/theme.toml`
2. **Desde URL:** en el menú de temas → “Instalar tema desde URL”, pega el `https://` del repo git.
   Equivale a `omarchy theme install`: clona con `--depth 1`, el nombre se deriva del repo
   (se quitan prefijos `omarchy-` y sufijos `-theme`) y debe cumplir `^[a-z0-9_][a-z0-9._+\-]*$`.
3. **Distribuir:** súbelo a un git público (recomendado `mdpower-<nombre>-theme`).

## Estructura mínima

```
mi-tema/
  theme.toml    # obligatorio
  preview.png   # opcional, 800x500
  README.md     # opcional
```

## Formato `theme.toml`

```toml
[meta]
id = "mi-tema"          # debe coincidir con la carpeta, minúsculas
name = "Mi Tema"
mode = "dark"           # light | dark
author = "tu-nombre"
version = "1.0.0"

# Paleta base estilo Omarchy: la única fuente de verdad
[colors]
background = "#1a1b26"
foreground = "#a9b1d6"
accent = "#7aa2f7"
muted = "#565f89"
darker_background = "#16161e"

# UI estilo VSCode workbench. Puedes usar {background}, {foreground}, {accent}, {muted}
# Si omites una clave, se deriva de [colors]
[ui]
bg-editor = "{background}"
bg-sidebar = "{darker_background}"
bg-header = "{darker_background}"
text-main = "{foreground}"
text-muted = "{muted}"
border-main = "#24283b"
accent-blue = "{accent}"
accent-hover = "rgba(122, 162, 247, 0.15)"

# Cómo renderiza el Markdown, no solo colores
[markdown.h1]
size = "2.2em"
weight = "800"
color = "{foreground}"
border-bottom = "2px solid {accent}"
# prefix = "# "     # texto delante del título (h1/h2/h3)
# align = "center"  # left | center | right (h1/h2/h3)

[markdown.h2]
size = "1.5em"
weight = "700"
color = "{accent}"

[markdown.h3]
size = "1.2em"
weight = "700"
color = "{foreground}"

[markdown.code]
bg = "{darker_background}"
radius = "8px"

[markdown.blockquote]
border-left = "4px solid {accent}"
italic = "true"

[markdown.a]
color = "{accent}"
underline = "true"
```

Elementos soportados: `h1..h6`, `p`, `code`, `codespan`, `blockquote`, `a`, `table`, `hr`, `li`.

## Seguridad (como Omarchy)

Al instalar desde URL se conserva solo lo visual (`theme.toml`, `*.png`, `*.md`).
Se eliminan ejecutables y código: `.lua`, `.js/.ts`, `.sh`, `.ps1`, `.exe` y carpetas extra
(solo se respeta `backgrounds/` para imágenes). Un tema cambia cómo se ve MDPOWER, nunca lo que ejecuta.
