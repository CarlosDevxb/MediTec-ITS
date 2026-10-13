<div align="center">

<img src="frontend/public/logo-meditec.png" alt="Logo MediTec-ITS" width="280" />

# MediTec-ITS

**Sistema de gestión clínica y de enfermería**

Plataforma integral para la operación de una clínica de salud: atención médica,
nutrición, administración del sistema y un portal web para los pacientes.

</div>

---

## Descripción general

MediTec-ITS es una aplicación web diseñada para digitalizar la operación diaria de
un centro de salud ligado a un instituto tecnológico. El sistema cubre el flujo
completo: desde el alta de un paciente y su expediente, pasando por la consulta
clínica y los planes alimenticios, hasta la gestión del personal, el inventario y
la agenda — todo desde paneles especializados por rol.

Los datos que hoy se muestran son de demostración; la interfaz está lista para
conectarse al backend, el cual consume MySQL directamente (SQL nativo, sin ORM).

## Los cuatro paneles del sistema

| Panel | Ruta | Usuario | Enfoque |
|---|---|---|---|
| Atención médica | `/` | Personal médico | Odontología: consultas, citas, pacientes, expedientes |
| Nutrición | `/nutricion` | Nutricionista | Planes alimenticios y seguimiento nutricional |
| Administrador | `/admin` | Personal administrativo | Roles, usuarios, horarios, inventario y reportes |
| Portal del paciente | `/paciente` | Paciente | Consulta de su información y gestión de sus citas |

### Atención médica (Odontología)

- **Inicio** con indicadores del día (citas, atendidos, próxima cita), agenda en
  línea de tiempo y accesos rápidos.
- **Nueva consulta**: selección de paciente con buscador, alertas visibles de
  alergias y enfermedades crónicas, captura de signos vitales, evaluación
  clínica, diagnóstico CIE-10 y receta.
- **Citas**: listado con filtros, alta y edición, confirmación y cancelación con
  acciones rápidas por fila.
- **Pacientes**: control de la base de pacientes con filtros de alertas clínicas
  (alergias, crónicas), alta y edición de expedientes.
- **Historial clínico**: buscador de expedientes que carga la ficha completa del
  paciente y la línea de tiempo de sus consultas con signos vitales.
- **Configuración**: actualización de contacto y cambio de contraseña.

### Nutrición

- **Inicio** con planes vigentes, calorías promedio y pacientes en control.
- **Nuevo plan alimenticio**: periodo, calorías diarias y descripción de la dieta.
- **Planes**: listado con estado dinámico (vigente / por iniciar / finalizado).
- **Pacientes** e **historial nutricional** con la línea de tiempo de planes
  asignados por paciente.

### Administrador

- **Roles** y **Usuarios** con acciones rápidas: editar, habilitar/deshabilitar y
  recuperación de contraseña; alta con doble validación de contraseña.
- **Horarios**: calendario semanal por horas y días, con bloques por turno,
  iconos por especialidad y soporte de **turnos compartidos** (varias personas
  apiladas en el mismo bloque).
- **Medicamentos**: inventario con alertas visuales de stock bajo.
- **Reportes**: selector de reportes predeterminados (actividad, usuarios por rol,
  inventario, carga de horarios) con **descarga de PDF** generada en el navegador.

### Portal del paciente

- Interfaz con **barra superior** (distinta a los paneles con menú lateral).
- **Inicio** con saludo, próxima cita destacada y alertas propias.
- **Mis citas**: solicitud de citas en Odontología o Nutrición y cancelación.
- **Historial de citas** filtrado por área de especialidad.
- **Mi información**: consulta del expediente propio y actualización del
  auto-reporte clínico (alergias, enfermedades, antecedentes).

## Arquitectura

```
MediTec-ITS/
├── frontend/                 Aplicación web (Astro + React)
│   ├── src/
│   │   ├── pages/            Rutas: index, login, admin, nutricion, paciente
│   │   ├── styles/           Tailwind v4 con tokens de marca (@theme)
│   │   └── components/
│   │       ├── ui/           Design system (primitivas reutilizables)
│   │       ├── layout/       Sidebar colapsable, AppShell, TopBarShell
│   │       ├── clinica/      Panel de odontología
│   │       ├── administrador/ Panel administrativo
│   │       ├── nutricion/    Panel de nutrición
│   │       ├── paciente/     Portal del paciente
│   │       └── sesion/       Login
│   └── public/               Logos e imágenes
├── backend/
│   └── src/                  API Express: pool MySQL + endpoints
├── database/
│   └── init.sql              Esquema completo (17 tablas)
└── docker-compose.yml        Servicio MySQL 8.0
```

**Frontend:** Astro con la integración de React, TypeScript en modo estricto y
Tailwind CSS v4 (configuración CSS-first con tokens en `@theme`). Los paneles son
componentes React montados con hidratación selectiva; la navegación interna es
por estado, con layouts compartidos (`AppShell` con sidebar para los paneles
internos y `TopBarShell` para el portal del paciente).

**Backend:** API en Express ejecutada sobre Bun, con acceso directo a MySQL
mediante `mysql2` — **sin ORM**: SQL nativo y respuestas con claves en español
(`mensaje`, `datos`). Incluye CORS y manejo de variables de entorno.

**Base de datos:** MySQL 8.0 sobre Docker con un esquema normalizado en cuatro
bloques: **catálogos** (`cat_alergias`, `cat_enfermedades`, `cat_tipo_paciente`,
`cat_carreras`, `cat_unidades_medida`), **cuentas y expedientes** (`roles`,
`usuarios` como base de `pacientes` y `personal_medico`, con alergias y
enfermedades en tablas puente), **operación clínica** (`horarios`, `cita`,
`consulta`, `plan_alimenticio`) e **insumos** (`medicamentos` y el pivote
`consulta_insumo`).

## Design system

Toda la interfaz comparte un sistema de diseño propio, centrado en la paleta azul
institucional:

```
brand-950 #0a335c   sidebar y acciones principales
brand-800 #15467a   menú activo y botones primarios
brand-600 #2a62a3   acentos
brand-50  #eff4f9   fondos sutiles
```

**Primitivas** (`components/ui/`): `Button`, `Card`, `Field`/`Input`/`Textarea`/
`Select`/`PasswordInput` (con ojo integrado), `Badge` de estatus, `StatCard`,
`PageHeader`, `DataTable`, `EmptyState`, `IconButton`, `Aviso` + hook `useAviso`
para confirmaciones, y layouts `Sidebar` (colapsable y persistente), `AppShell` y
`TopBarShell`.

**Lenguaje visual:** contenedores con borde fino sin sombras, radios jerárquicos,
tipografía con cifras tabulares para horarios y datos clínicos, alertas de
alergias y enfermedades siempre visibles en los flujos de atención, y
accesibilidad con foco visible, etiquetas ARIA y respeto a
`prefers-reduced-motion`.

## Modelo de datos

**Catálogos**

| Tabla | Contenido |
|---|---|
| `cat_alergias` | Alergias registradas en el sistema |
| `cat_enfermedades` | Enfermedades crónicas del catálogo |
| `cat_tipo_paciente` | Tipo de paciente (Alumno, Docente, Administrativo, Enfermería) |
| `cat_carreras` | Carreras del instituto (se llena cuando el paciente es Alumno) |
| `cat_unidades_medida` | Unidades y abreviaturas para medicamentos |

**Cuentas y expedientes**

| Tabla | Contenido |
|---|---|
| `roles` | Perfiles de acceso con descripción |
| `usuarios` | Cuenta base: número de control, nombre, correo, contraseña, género, fecha de nacimiento y estatus |
| `personal_medico` | 1:1 con usuarios: cédula y especialidad |
| `pacientes` | 1:1 con usuarios: tipo de paciente, carrera, tipo de sangre, antecedentes y apertura de expediente |
| `paciente_alergias` | Puente paciente ↔ alergias |
| `paciente_enfermedades` | Puente paciente ↔ enfermedades crónicas |

**Operación clínica**

| Tabla | Contenido |
|---|---|
| `horarios` | Disponibilidad por día (1 = lunes … 7 = domingo) y turno |
| `cita` | Fecha, hora, motivo, tipo (Programada o Emergencia) y estatus (Pendiente, Confirmada, Cancelada, Completada) |
| `consulta` | Registro clínico derivado de una cita: síntomas, tratamiento y signos vitales |
| `plan_alimenticio` | Dietas por paciente: periodo, calorías diarias y descripción |

**Insumos**

| Tabla | Contenido |
|---|---|
| `medicamentos` | Catálogo con unidad de medida, stock y descripción |
| `consulta_insumo` | Cantidad de cada medicamento usada en una consulta |

---

<div align="center">

<img src="frontend/public/logo-cuchipu.png" alt="Cuchipu Cloud" width="120" />

*Sistema de Gestión de Enfermería MediTec-ITS · 2026*

</div>
