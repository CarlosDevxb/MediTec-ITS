# AGENTS · MediTec-ITS

Sistema de gestión clínica y de enfermería (odontología, nutrición, administración
y portal del paciente). Repositorio con tres proyectos independientes, **sin
monorepo ni workspaces**: cada uno se instala y ejecuta por separado.

## Arranque rápido

```bash
docker compose up -d                 # MySQL 8.0 con esquema de database/init.sql
cd backend && npm run crear:admin    # roles + primer administrador (idempotente)
cd backend && npm run dev            # API en http://localhost:3000
cd frontend && npm run dev           # Web en http://localhost:4321 (o astro dev --background)
```

## Skills disponibles (cárgalos con el tool `skill`)

| ID | Cuándo usarlo |
|---|---|
| `api-express` | Endpoints, controladores, servicios SQL, validación, auth en `backend/` |
| `ui-astro` | Pantallas y componentes en `frontend/` (Astro + React + Tailwind v4) |
| `db-mysql` | `database/init.sql`, tablas, catálogos, seeds y MySQL en Docker |
| `seguridad-clinica` | Auth, roles, permisos y cualquier manejo de expedientes |
| `ux-calidad` | Estándar UX: modales de confirmación y validación en tiempo real (duplicados, formatos) al crear o retocar pantallas y formularios |

También aplica `frontend/AGENTS.md` (servidor Astro en segundo plano) si trabajas
en la interfaz.

## Reglas que aplican siempre

1. **Código y comentarios en español**, incluidos los mensajes al cliente. La BD usa
   `snake_case`, el código TS `camelCase`.
2. **Respeta las capas**: rutas → controladores → servicios (SQL). El SQL solo vive
   en `src/services/`.
3. **Nunca** inventes endpoints ni columnas: revisa `database/init.sql` primero.
4. **El design system manda**: componentes de `frontend/src/components/ui/` antes que
   HTML crudo, y tokens `brand-*` antes que colores sueltos.
   Componentes disponibles: `Button`, `Card`, `DataTable<T>`, `Badge`, `Input` (+ `Field`,
   `Textarea`, `Select`, `PasswordInput`), `PageHeader`, `StatCard`, `EmptyState`,
   `IconButton`, `Aviso`/`useAviso`, `Modal`, `ModalResultado` y `EstadoVista`.
5. **Cumple `ESPECIFICACIONES.md`**: toda acción confirma su resultado (aviso o modal)
   y ninguna vista aparece de golpe (animación `entrada` / `entrada-modal`).
6. **Accesibilidad obligatoria**: foco visible, estados con texto además de color,
   `label` en todo campo.
7. **Sin datos personales reales** en código, pruebas ni commits; sin credenciales
   reales en el repositorio.
8. **No rompas el login**: sus mensajes genéricos y el orden de validación son
   deliberados (ver `seguridad-clinica`).
9. Verifica tu trabajo: `cd backend && npm run typecheck` y compila la pantalla
   afectada.

## Estado actual (referencia)

**Con backend ya conectado:** `/api/roles`, `/api/usuarios`, `/api/catalogos`,
`/api/personal-medico`, `/api/horarios`, `/api/medicamentos`, `/api/pacientes`,
`/api/citas` y `/api/consultas` (las tres de inventario incluyen alta masiva
vía `/importar` desde Excel). Los paneles `/admin`, `/doctor` y `/enfermeria`
leen y escriben en MySQL; no usan datos de demostración.

Reglas de negocio ya implementadas: la clínica solo opera de lunes a viernes,
los turnos duplicados exactos se rechazan, los medicamentos no se eliminan (el
stock en 0 los deja no disponibles para consultas) y **toda consulta deriva de
una cita**: al atender sin cita previa (doctor y enfermería) el alta crea antes
la auto-cita `Atención directa` y enseguida la consulta, en una transacción con
descuento de insumos.

**Paneles por rol:** `/doctor` (Personal médico) y `/enfermeria` (Enfermería;
Recepción entra aquí de forma provisional). Los componentes clínicos
compartidos viven en `frontend/src/components/atencion/` (flujo de atención,
expediente, cuestionario) y el cliente API en `src/services/atencion.service.ts`.
La configuración de la propia cuenta (teléfono y contraseña) está en
`components/cuenta/ConfiguracionPerfil.tsx` y el saludo de inicio en
`components/layout/SaludoInicio.tsx`.

Módulos del panel del doctor: **Inicio** (saludo por hora + nombre y
especialidad), **Nueva consulta** (atención directa), **Historial de
consultas**, **Pacientes** (expedientes) y **Configuración** (teléfono y
contraseña propia; el correo no se cambia). La agenda de citas **no** forma
parte de este panel: es trabajo de enfermería (`/api/citas`).

Módulos del panel de enfermería: **Inicio** (mismo saludo), **Nueva consulta**
(su consulta propia: intervención de enfermería y solo insumos de las
categorías 'Insumo' y 'Medicamento común'), **Pacientes** (altas y expedientes
en solo lectura con descarga del PDF), **Agenda** (citas con el personal de
Odontología y Nutrición) y **Configuración**.

Portal de nutrición (`/nutricion`, Personal médico con especialidad de
Nutrición): **Inicio**, **Agenda** (sus citas con la regla de espaciado),
**Atención** (sesiones mediante cita agendada, nunca de llegada),
**Planes** (pacientes con **plan activo**; de ahí se abre la **ficha de
nutrición** con plan, avance de peso/talla, sesiones y descarga del **avance**
y del **expediente de nutrición** en PDF) y **Configuración**
(`components/nutricion/`). Sus sesiones son consultas de tipo `Nutrición`
**sin síntomas, exploración ni insumos**: capturan diagnóstico nutricional,
indicaciones y **el plan alimenticio se registra en la misma transacción que
la consulta** (`plan_alimenticio`, `/api/planes`); el **historial de peso y
talla solo incluye las mediciones de las sesiones de la nutrióloga**
(`/api/pacientes/:id/seguimiento`). Los PDFs clínicos comparten la base
`services/documentosPdf.ts` (encabezados MediTeC-ITS y pies con los
logotipos de empresa y software). El ruteo por **especialidad** vive en
`rutaSegunRol(rol, especialidad)` (la especialidad viaja en el JWT del login).

Portal de odontología (`/odontologia`, Personal médico con especialidad de
Odontología): **Inicio** (saludo, indicadores y aviso de citas pendientes),
**Agenda** (las mismas reglas de espaciado que nutrición), **Atención**
(consultas **por cita agendada** con contenido tipo doctor pero a nivel
bucal: síntomas y exploración bucales, diagnóstico y tratamiento; insumos
de las categorías Medicamento común, Medicamento especial e **Insumo
dental**), **Historial de consultas**, **Pacientes** y **Configuración**
(`components/odontologia/`). Sus consultas son de tipo `Odontología` y
comparten con nutrición los módulos `atencion/AgendaEspecialista.tsx` y
`atencion/AtencionEspecialista.tsx`.

**Presentación de la agenda:** las citas se muestran **agrupadas por día**
(`atencion/AgendaPorDia.tsx`), de hoy en adelante, con la sección de **citas
anteriores** (completadas o canceladas) hasta el final. **Atender solo está
disponible para las citas del día de hoy** (el backend lo exige al ligar la
consulta a su cita); confirmar y cancelar aplican a las citas por venir.

Portal del paciente (`/paciente`, rol Paciente): **Inicio** (saludo, próximas
citas y accesos), **Mis citas** (agenda con Odontología y Nutrición respetando
las reglas de la agenda —el paciente consulta `GET /api/personal-medico` y
`/api/horarios` para elegir especialista, día y hora, sin cédulas—; sus citas
nacen **Pendientes** hasta que el especialista las confirme y solo él puede
cancelarlas), **Mi expediente** (`atencion/ExpedienteVista`, solo lectura con
PDF), **Mi plan alimenticio** (plan vigente y avance de peso/talla de sus
sesiones) y **Mi información** (teléfono, contraseña y datos del expediente:
tipo de sangre y antecedentes; el correo no se modifica). **Cuestionario
obligatorio:** si el paciente no tiene su cuestionario de salud inicial, se
presenta a pantalla completa antes del portal (`CuestionarioSalud` con contexto
`portal`) y al guardarlo entra al portal; solo aplica si no lo tiene
(`components/paciente/`, ya sin datos de demostración).

Reglas de agenda y consultas: las citas programadas solo se agendan con
**Odontología o Nutrición**, dentro de los horarios registrados del especialista
(tabla `horarios`) y **sin juntarse ni empalmarse**: cada cita dura 30 minutos
con 30 de respiro (quedan cada 60 minutos). **No se agendan citas en el
pasado** (ni el día, ni la hora de hoy) y solo se puede elegir fecha en los
**días con horario de atención** del especialista; al **cambiar de día**, las
citas que no se atendieron se marcan automáticamente como **Canceladas**. El
**estatus de la cita sigue su ciclo**: al registrar su consulta queda
**Completada**; si la agenda el propio especialista nace **Confirmada** y si la
agenda otra persona (enfermería) nace **Pendiente** hasta que el especialista la
confirme —el panel le avisa de sus citas pendientes al entrar—. Solo se pueden
marcar las **citas propias** (o las que gestiona Administrador/Enfermería) y los
paneles muestran **solo las consultas propias** (el expediente del paciente sí
conserva su historial completo). El **tipo de consulta lo determinan el rol y la
especialidad**: el personal médico captura diagnóstico y tratamiento (todo el
inventario como insumo); enfermería captura su intervención y no puede usar
medicamentos especiales (categoría del inventario en `medicamentos.categoria`,
que administra el administrador desde Medicamentos); nutrición captura
diagnóstico nutricional e indicaciones y **siempre requiere cita agendada**
(igual que odontología, cuya consulta es a nivel bucal con insumos dentales).

Cuestionario de salud (`POST /api/pacientes/:id/cuestionario`): único por
paciente, se llena al primer acceso del paciente a su portal o antes de su
primera consulta cuando llega de manera directa (el flujo de atención lo exige
antes de abrir el formulario de consulta). Las alergias y enfermedades que no
existan en los catálogos se dan de alta al guardarlo y se vinculan al paciente
como alertas (`components/atencion/CuestionarioSalud.tsx`, reutilizable por el
futuro portal del paciente, que solo podrá llenar el suyo).

Expediente en PDF (`frontend/src/services/expedientePdf.ts`): documento tipo
expediente con encabezado MediTeC-ITS, identificación, alertas clínicas,
antecedentes, cuestionario e historial de consultas completo; el pie lleva los
logotipos de la empresa (`logo-cuchipu.png`) y del software
(`logo-meditec.png`, ambos en `frontend/public/`). Se descarga desde
Pacientes → Expediente.

Importación / exportación en Excel (`frontend/src/services/excel.service.ts` +
`ImportadorExcel.tsx`): plantilla descargable, avisos previos de captura,
confirmación con modal y resultado por fila; las contraseñas no se exportan
nunca y las temporales del alta masiva se muestran una sola vez.

Reportes del administrador: todos leen de MySQL (usuarios, inventario,
horarios y **Actividad de la enfermería**, con selector de periodo que se
imprime en el PDF). El administrador puede **restablecer contraseñas** desde
Usuarios (`PATCH /api/usuarios/:id/contrasena`); si no captura una, se genera
temporal y se muestra una sola vez. Las acciones destructivas cierran con un
`ModalResultado` que confirma el resultado.

**Pendientes de conectar:** los planes de nutrición y el portal del paciente
siguen con datos de ejemplo; los componentes demo que comparten están en
`frontend/src/components/clinica/` (solo los usan nutrición y paciente).

**Regla al conectar una sección nueva:** empieza por el servicio (SQL), sigue por el
controlador y la ruta, y al final sustituye el fixture de la vista. Usa `apiFetch`
del servicio `src/services/administracion.service.ts` como referencia, con estados
de carga (`EstadoVista`), confirmación (`Modal`) y avisos (`useAviso`).
