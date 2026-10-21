# Especificaciones de interfaz · MediTec-ITS

Reglas de interacción que aplican a **todas** las pantallas del sistema
(admin, doctor, enfermería y los paneles futuros: nutrición, odontología,
paciente y recepción). Complementan las skills `ux-calidad`, `ui-astro` y
`seguridad-clinica`; ante conflicto, manda este archivo.

---

## 1. Toda acción confirma su resultado

Siempre que se presione un botón que **guarde, modifique, elimine o ejecute
cualquier operación**, la interfaz debe notificar al usuario que la acción se
realizó. Nunca un cambio silencioso.

| Tipo de acción | Confirmación obligatoria | Componente |
|---|---|---|
| Eliminar / deshabilitar / cualquier acción destructiva | **Modal de confirmación antes** (con consecuencias claras) + **modal de resultado después** | `Modal` + `ModalResultado` |
| Crear / editar (altas, cambios de datos, restablecer contraseña, guardar cuestionario) | **Notificación inmediata** con el nombre del registro afectado | `Aviso` (`useAviso`) |
| Descargas (Excel, plantillas, reportes, PDF) | **Notificación de éxito** o de error | `Aviso` |
| Acciones fallidas | **Siempre notificación de error** en español, visible (nunca silenciosa, nunca un error técnico) | `Aviso` o `role="alert"` |
| Manipulación instantánea dentro de un formulario (agregar/quitar un renglón o un chip) | Cambio visible inmediato en la propia vista (no requiere toast) | — |

Detalles que se cumplen siempre:

- El mensaje **nombra lo que cambió**: *"Rol 'Recepción' eliminado"*, no
  *"Operación exitosa"*.
- Los botones de acción se deshabilitan y muestran `loading` mientras se
  ejecuta (sin doble envío).
- Los formularios con errores muestran el error **junto al campo** y un
  resumen general (`role="alert"`); el servidor vuelve a validar todo y sus
  `detalles` se pintan en su campo.

## 2. Sin transiciones bruscas

Ninguna sección, formulario, paso de captura ni resultado debe aparecer o
reemplazar contenido de golpe.

- Toda vista que aparece usa la clase **`entrada`** (fade + desplazamiento
  sutil). Los diálogos usan **`entrada-modal`**. Ambas están definidas en
  `frontend/src/styles/global.css`.
- Las secciones de los paneles se envuelven con `key={vista}` para que la
  animación se reinicie en cada cambio (`PanelAdmin`, `PanelDoctor`,
  `PanelEnfermeria`).
- Los reemplazos de contenido dentro de una vista (lista → formulario,
  cuestionario → consulta, formulario → resultado) animan su raíz con
  `entrada` automáticamente porque el componente se remonta.
- La animación se desactiva sola con `prefers-reduced-motion` (ya cubierto en
  `global.css`): accesibilidad primero.

## 3. Modales a pantalla completa

El fondo de todo modal (`Modal`, `ModalResultado`) **cubre la página entera**:
se renderizan en el `<body>` con portal de React, nunca dentro del contenedor
de la vista. Un modal embebido en un contenedor con animación o `transform`
quedaría recortado a ese contenedor (el `position: fixed` se vuelve absoluto),
un defecto visual que ya se corrigió: no lo reintroduzcas renderizando modales
fuera del componente `Modal`.

## 4. Validación temprana (resumen)

- Formatos, rangos y obligatoriedades se validan **mientras se escribe**.
- Los duplicados (nombres únicos, turnos repetidos, correos) se detectan
  contra los datos ya cargados **antes de enviar**.
- El servidor revalida todo (Zod) y sus errores se mapean al campo.

## 5. Accesibilidad y lenguaje

- Estados nunca solo con color: siempre texto o icono acompañando.
- `label` visible en todo campo, `aria-invalid` cuando hay error, foco
  visible, `aria-label` en botones de icono.
- Todo el texto de la interfaz y de la API en **español**.

---

## Checklist antes de entregar una pantalla

- [ ] Cada botón de acción confirma su resultado (ver tabla de la sección 1)
- [ ] Las acciones destructivas piden confirmación antes y confirman después
- [ ] Ningún cambio de vista o de contenido aparece de golpe (clase `entrada`)
- [ ] Validación en tiempo real y errores del servidor en su campo
- [ ] Estados cargando / vacío / error cubiertos
- [ ] Accesible con teclado y lector de pantalla
- [ ] Todo en español y sin datos personales reales
