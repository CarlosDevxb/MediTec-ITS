---
name: UI Astro + React MediTec-ITS
description: Usar al crear o modificar pantallas, componentes, formularios o estilos en frontend/ (Astro 7 con islas de React 19, Tailwind CSS v4, design system propio, accesibilidad). Incluye el ciclo de vida del servidor de desarrollo en segundo plano indicado por AGENTS.md.
metadata:
  opencode/autoinvoke: false
---

# UI · frontend/

## Servidor de desarrollo

Según `frontend/AGENTS.md`, arranca el servidor en **segundo plano**:

```bash
cd frontend
astro dev --background
astro dev status      # comprobar que sigue vivo
astro dev logs        # ver la salida
astro dev stop        # detener
```

## Arquitectura

- Cada `.astro` en `src/pages/` es una cáscara que hidrata **una sola isla React**
  con `client:load`. La navegación entre secciones de un panel es cambio de vista con
  `useState`, **no** rutas nuevas de Astro.
- `src/pages/index.astro` redirige según el rol (`rutaSegunRol` en `services/sesion.ts`).
- Datos del servidor: `src/services/api.ts` (`apiFetch<T>`) — nunca `fetch` directo.

## Design system (`src/components/ui/`)

No recrees controles: usa los existentes.

| Componente | Uso |
|---|---|
| `Button` | variant: primary \| secondary \| ghost \| danger; size: sm \| md \| lg; `icon`, `loading`, `fullWidth` |
| `Card` | Contenedor de secciones y formularios |
| `DataTable<T>` | Tabla genérica, recibe columnas y filas tipadas |
| `Badge` | Estado con punto de color **+ etiqueta de texto** (nunca solo color) |
| `Input` | Campo de texto/numérico, con `label` y `error` |
| `PageHeader` | Título + descripción + acciones de la vista |
| `StatCard` | Indicador numérico del panel |
| `EmptyState` | Estado vacío con icono y mensaje |
| `IconButton` | Acción iconográfica, requiere `aria-label` |
| `Aviso` / `useAviso` | Toasts en línea: `mostrar(mensaje, 'exito' | 'error' | 'info')` |
| `Modal` | Diálogo de confirmación: cierra con Escape, fondo y botón; recibe `acciones` como pie |
| `EstadoVista` | Envuelve una sección y muestra por sí sola el estado "cargando" o el de error, con botón de reintentar |

## Convenciones

- **Todo en español**: nombres de componentes (`CuestionarioSalud.tsx`), variables,
  estados, textos de UI y mensajes de error.
- Componentes función con `interface XxxProps` tipada y **export default**.
- **Hooks siempre antes de cualquier `return` temprano** (subpáginas, estados de
  carga…): un render con menos hooks que el anterior lanza una excepción de
  React y deja la pantalla en blanco. Calcula los `useMemo`/`useState` arriba y
  deja los `if (...) return ...` después de todos los hooks.
- Encabezado de bloque en cada archivo:
  `/* ==== NOMBRE · descripción breve ==== */` (una línea de `=` por lado).
- Clases Tailwind compuestas, siguiendo el patrón existente:
  ```tsx
  className={[...].filter(Boolean).join(' ')}
  ```
- Iconos siempre de `lucide-react`; no mezcles librerías de iconos.
- Formularios controlados con `useState`; al enviar, valida y muestra el error con `Aviso`.
- Los datos de demostración viven en `datos.ts` / `tipos.ts` junto al panel y se
  anotan con la tabla real de `database/init.sql` que representan.

## Accesibilidad (requisito, no opcional)

- Todo control interactivo con `focus-visible:` visible.
- Estados no comunicados solo con color: texto o icono además.
- `aria-current="page"`, `aria-expanded` / `aria-controls` en el menú colapsable.
- Inputs con `label` asociado; errores anunciados con el campo.

## Estilos

- Tailwind v4 con tokens en `src/styles/global.css` (`@theme`, `--color-brand-50…950`).
  Usa `brand-*` en lugar de grises/azules arbitrarios para mantener la identidad.
- Respeta `prefers-reduced-motion` (ya cubierto en `global.css`); no añadas
  animaciones que lo ignoren.
- `frontend/tailwind.config.mjs` es de la era v3 y Tailwind v4 lo ignora: no lo edites.

## Antes de dar por terminada una pantalla

- [ ] Usa el design system, no HTML crudo con estilos ad hoc
- [ ] Funciona con teclado y con lector de pantalla
- [ ] Estados cubiertos: cargando, vacío y error
- [ ] Textos en español y sin datos clínicos reales en código
- [ ] Revisado en `/clinica`, `/nutricion`, `/admin` y `/paciente` si es compartido
