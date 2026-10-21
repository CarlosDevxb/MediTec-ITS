---
name: Calidad de experiencia (UX) MediTec-ITS
description: Usar al diseñar o modificar pantallas, formularios o flujos de usuario en frontend/ (cualquier módulo). Cubre el estándar de diseño de UI del proyecto, los modales de confirmación para acciones destructivas y la validación temprana o en tiempo real mientras se escribe (duplicados, formatos, rangos), con los patrones concretos ya usados en el design system.
metadata:
  opencode/autoinvoke: false
---

# Calidad de experiencia · UX

En MediTec-ITS **la interfaz es el único canal de captura de datos**: nada entra
a la base por fuera de la aplicación. Por eso la UI no solo debe verse bien:
debe **prevenir errores mientras el usuario escribe**, no únicamente rechazarlos
al guardar. Una pantalla está terminada cuando cumple este estándar, no cuando
"ya funciona".

> El detalle completo de las reglas de interacción vive en
> **`ESPECIFICACIONES.md`** (raíz del repositorio): confirmación de toda acción
> y ausencia de transiciones bruscas. Ante conflicto, manda ese archivo.

## 1. Diseño de UI

- **Design system primero**: componentes de `frontend/src/components/ui/`
  (`Button`, `Card`, `DataTable`, `Badge`, `Input`/`Field`, `PageHeader`,
  `StatCard`, `EmptyState`, `IconButton`, `Aviso`, `Modal`, `EstadoVista`).
  Nunca HTML crudo con estilos propios ni controles nuevos si ya existe uno.
- Tokens `brand-*` de `src/styles/global.css`; iconos solo de `lucide-react`.
- Jerarquía visual clara: `PageHeader` para el título de la vista, `Card` para
  agrupar, `StatCard` para indicadores de resumen cuando la vista tiene datos
  cuantiosos (inventarios, turnos, listados).
- Las vistas con datos cubren **siempre** los tres estados: cargando, vacío y
  error — con `EstadoVista` + `EmptyState`, con mensaje y acción de recuperación.
- Densidad y alineación consistentes con las pantallas vecinas (mismos paddings
  `p-10 xl:p-12`, mismas tablas `DataTable`, mismos encabezados de columna).
- Estados visuales **nunca solo con color**: punto + texto (`Badge`), icono +
  leyenda. El color acompaña; no comunica solo.

## 2. Modales de confirmación (obligatorio)

Toda acción destructiva o difícil de deshacer pasa por `Modal` antes de ejecutarse:
eliminaciones, bajas lógicas, cancelaciones, borrado de turnos, cambios que
pierden información.

- Título en forma de pregunta con el nombre del registro: *"¿Eliminar el turno de
  Dra. Paola Janeth?"*.
- Descripción que explique la **consecuencia**: qué deja de pasar o qué se pierde.
- Pie con `acciones`: `Cancelar` (variant `secondary`) a la izquierda y la acción
  definitiva a la derecha (`variant="danger"` para destrucción) con `loading`
  mientras se ejecuta y `disabled` en el botón de cancelar durante el guardado.
- Nunca una eliminación con un solo clic desde la tabla.
- **Después de ejecutar la acción, confirma el resultado de forma visible** con
  `ModalResultado` (usuario deshabilitado, rol eliminado…): el usuario debe ver
  que la operación se hizo, no solo suponerlo. Los cambios no destructivos
  (crear, editar) pueden confirmarse con `Aviso`.
- Confirmaciones que no son destructivas (habilitar/deshabilitar) usan el mismo
  patrón con `variant="primary"` en la acción.

## 3. Alertas tempranas y validación en tiempo real

El objetivo: **el usuario no debería poder llegar a un error de servidor**
salvo condiciones que solo la base conoce. Se valida mientras se escribe y el
servidor vuelve a validar todo (Zod) como última barrera.

### 3.1 Validar mientras se escribe

- Los errores de formato se calculan en cada cambio (nombre vacío o muy largo,
  stock negativo, horas invertidas, fecha imposible) y se muestran junto al
  campo con `Field error={...}` más `aria-invalid` en el control.
- No grites desde el primer render: muestra el error de un campo cuando ya fue
  editado o perdió el foco (`tocado`), pero muestra **de inmediato** los
  conflictos de unicidad (ver 3.2), porque son la alerta temprana valiosa.
- Mientras el formulario tenga errores, el envío se bloquea con el mensaje
  visible, no con un `alert`.

### 3.2 Detección de duplicados en tiempo real

Cuando un dato debe ser único (nombre de medicamento, turno exacto de un
personal, número de control, correo), compáralo **mientras se escribe** contra
la lista ya cargada de la vista:

```tsx
const duplicado = existentes.some(
  (m) => m.id !== medicamento?.id && m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
);
// <Field label="Nombre" error={duplicado ? 'Ya existe un medicamento con ese nombre.' : ...}>
```

- El mensaje nombra el registro en conflicto y sugiere la salida: *"Ese turno ya
  existe el lunes para Dra. Paola Janeth (08:00–14:00). Quita el día o cambia el
  horario."*.
- Si la lista no está disponible, consulta la API con debounce o deja que el
  servidor responda 409; nunca esperes al envío sin avisar cuando se puede saber antes.
- El servidor siempre revalida y responde `409` con mensaje equivalente: es la
  autoridad; el front solo adelanta el aviso para no malgastar el intento.

### 3.3 Errores del servidor mapeados al formulario

```tsx
} catch (error) {
  const porCampo = detallesDe(error);          // 400 → errores por campo
  if (Object.keys(porCampo).length > 0) setErrores(porCampo);
  else setErrorGeneral(mensajeDeError(error)); // 409 / red → resumen
}
```

- Los `detalles` de Zod (`{ campo, mensaje }`) se pintan en su `Field`.
- Los 409 (duplicados) y errores de red se muestran como resumen general con
  `Aviso` (`tipo="error"`) o párrafo `role="alert"` en el formulario.
- Mensajes siempre en español, sin tecnicismos de MySQL ni datos sensibles.

### 3.4 Durante el guardado

- Botón de guardar con `loading` y envío bloqueado (sin doble submit).
- Éxito: se regresa a la lista y `useAviso` confirma con el nombre del registro
  (*"Medicamento 'Amoxicilina 500 mg' actualizado."*).
- El estado de la tabla se actualiza en memoria con la respuesta de la API, sin
  recargar la vista entera.

## 4. Sin transiciones bruscas

Ninguna vista, formulario, paso de captura ni resultado aparece de golpe: todo
usa la clase `entrada` (y `entrada-modal` los diálogos), definida en
`frontend/src/styles/global.css` y desactivable con `prefers-reduced-motion`.
Las secciones de los paneles se envuelven con `key={vista}` para reiniciar la
animación en cada cambio.

## 5. Accesibilidad inseparable de la calidad

- `label` visible en todo campo (`Field`), `aria-invalid` cuando hay error y el
  error junto al campo, no solo en un resumen.
- Todo control interactivo con `focus-visible:` visible; modales y toggles con
  `aria-label` / `aria-pressed` / `role` correctos.
- Estados (stock bajo, agotado, duplicado) con texto o icono además del color.

## Checklist antes de dar una pantalla por terminada

- [ ] Usa el design system y los tokens `brand-*`
- [ ] Estados cargando / vacío / error cubiertos
- [ ] Validación en tiempo real de formatos y rangos
- [ ] Duplicados detectados mientras se escribe, no solo al guardar
- [ ] Acciones destructivas tras `Modal` de confirmación con consecuencias claras
- [ ] Errores del servidor (`detallesDe` / `mensajeDeError`) pintados en su campo
- [ ] Botón con `loading` y sin doble envío; éxito confirmado con `Aviso`
- [ ] Accesible con teclado y lector de pantalla
- [ ] Todo en español
