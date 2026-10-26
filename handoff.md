# Handoff · MediTec-ITS

Documento de contexto del proyecto para quien continúe el desarrollo (persona o
asistente). Fecha de corte: **octubre 2026**. Complementa a `AGENTS.md`
(reglas de trabajo), `ESPECIFICACIONES.md` (reglas de interacción) y las
skills de `.opencode/skills/`.

---

## 1. Objetivo

**MediTec-ITS** es un sistema de gestión clínica y de enfermería para la
clínica del instituto: portal de administración, portales de atención médica
(doctor, enfermería, nutrición y odontología) y portal del paciente.

Principios que definen el proyecto:

- **Toda la información entra por la interfaz gráfica**: la base de datos nunca
  se llena a mano (ni `INSERT`s de datos de negocio). Solo existe el bootstrap
  `npm run crear:admin` (roles + primer administrador).
- **Datos sensibles de salud** (LFPDPPP): roles verificados en cada endpoint,
  minimización de datos y "solo lo suyo" para los pacientes.
- **Todo en español**: código, comentarios, textos y mensajes de la API.
- **Un solo comando levanta todo**: `docker compose up -d --build`.

---

## 2. Qué quedó hecho

### Base de datos (`database/init.sql`, MySQL 8.0)
Esquema 3NF completo: `roles`, `usuarios`, `personal_medico`, `pacientes`
(+ `paciente_alergias`/`paciente_enfermedades`), `cuestionario_salud`,
`cita`, `consulta`, `signos_vitales`, `medicamentos` (+ categorías),
`consulta_insumo`, `plan_alimenticio`, `horarios` y catálogos (`cat_*`).
ENUMs clave: `cita.tipo_cita` (Programada/Emergencia/**Atención directa**),
`consulta.tipo_consulta` (Médica/Enfermería/Nutrición/Odontología),
`medicamentos.categoria` (Insumo/Medicamento común/Medicamento especial/**Insumo dental**).

### Backend (Express + mysql2 + Zod + JWT)
Arquitectura **rutas → controladores → servicios** (el SQL solo vive en
`src/services/`). Endpoints:

| Módulo | Endpoints | Notas |
|---|---|---|
| auth | `POST /login`, `GET/PATCH /auth/perfil` | Login con mensajes genéricos; perfil propio (teléfono/contraseña; el correo no se cambia) |
| roles · usuarios · catálogos | CRUD | Incluye `POST /usuarios/importar` (Excel) y `PATCH /usuarios/:id/contrasena` (restablecer) |
| horarios | CRUD + `GET` | L-V, sin duplicados exactos; lectura abierta al personal y al paciente (disponibilidad) |
| medicamentos | `GET/POST/PUT` + `POST /importar` | Sin DELETE: stock 0 = agotado (no disponible para consultas) |
| personal-medico | `GET` | Al paciente solo se le expone nombre y especialidad |
| pacientes | `GET`, `POST`, `PATCH /:id/expediente`, `POST /:id/cuestionario`, `GET /:id/seguimiento` | "Solo lo suyo" para el rol Paciente |
| citas | `GET`, `GET /disponibilidad`, `POST`, `PUT /:id` (reagendar), `PATCH /:id/estatus` | Ciclo de estatus completo (ver decisiones) |
| consultas | `POST`, `GET`, `GET /:id` | La consulta se registra en transacción con auto-cita, signos, insumos y plan alimenticio |
| planes | CRUD | Planes alimenticios (nutrición); el paciente consulta el suyo |

### Portales (frontend Astro 7 + React 19 + Tailwind v4)
| Ruta | Panel | Secciones |
|---|---|---|
| `/admin` | Administración | Roles, Usuarios (import/export Excel, restablecer contraseñas), Catálogos, Horarios, Medicamentos (con categoría), Reportes (usuarios, inventario, horarios y **Actividad de la enfermería** con periodo → PDF) |
| `/doctor` | Personal médico | Inicio (saludo), Nueva consulta (atención directa), Historial de consultas (propio), Pacientes (expediente + PDF), Configuración |
| `/enfermeria` | Enfermería (+ Recepción provisional) | Inicio, Nueva consulta (intervención de enfermería), Pacientes (altas, expediente solo lectura + PDF, cuestionario), Agenda (citas con Odontología/Nutrición), Configuración |
| `/nutricion` | Personal médico · Nutrición | Inicio, Agenda, Atención por cita (+ plan alimenticio en la misma transacción), Planes (pacientes con plan activo → ficha con avance de peso/talla, sesiones y PDFs), Configuración |
| `/odontologia` | Personal médico · Odontología | Inicio, Agenda, Atención por cita (consulta bucal + insumos dentales), Historial, Pacientes, Configuración |
| `/paciente` | Paciente | **Cuestionario obligatorio de primer login**, Mis citas (agendar/reagendar/cancelar), Mi expediente (+PDF), Mi plan alimenticio, Mi información |

### Reglas de negocio ya implementadas
- **Consulta → cita**: toda consulta deriva de una cita. Doctor/enfermería
  atienden sin cita previa (auto-cita `Atención directa`); nutrición y
  odontología **siempre** requieren cita agendada.
- **Agenda**: solo Odontología/Nutrición; dentro del horario laboral
  (`horarios`), de lunes a viernes, **cada cita dura 30 min con 30 de respiro**
  (cada 60 min), sin empalmes, **sin agendar en el pasado** y solo en **días
  con horario**. Al **cambiar de día**, las citas sin atender se cancelan.
- **Estatus de citas**: al registrar su consulta queda `Completada`; si la crea
  el propio especialista nace `Confirmada`, si la crea otro (enfermería o el
  paciente) nace `Pendiente` hasta que el especialista la confirme —el panel le
  avisa de sus pendientes al entrar—. **Atender solo el día de hoy**.
  **Reagendar** cambia fecha/hora (deja `Pendiente` si no la mueve el
  especialista). Solo se marcan las citas propias (Administrador/Enfermería
  gestionan la agenda).
- **Consultas por tipo**: Médica (diagnóstico+tratamiento, todo el inventario),
  Enfermería (intervención + solo Insumo/Medicamento común), Nutrición
  (diagnóstico nutricional+indicaciones, sin síntomas/exploración/insumos, con
  plan alimenticio en la misma transacción), Odontología (campos bucales +
  insumos comunes/especiales/dentales). Los paneles muestran **solo las
  consultas propias** (el expediente del paciente conserva su historial
  completo).
- **Cuestionario de salud**: único por paciente; se llena al primer login del
  paciente o antes de su primera consulta; las alergias/enfermedades nuevas se
  dan de alta solas en los catálogos y se vinculan como alertas clínicas.
- **Inventario**: los medicamentos no se eliminan (stock 0 = agotado y no
  disponible para consultas); el stock se descuenta al registrar la consulta.
- **Excel**: import/export de usuarios y medicamentos (plantilla descargable,
  avisos previos, resultado por fila, contraseñas temporales de una sola vez;
  nunca se exportan contraseñas).

### Documentos PDF (identidad compartida en `documentosPdf.ts`)
Expediente clínico, expediente de nutrición y avance de peso/talla (encabezado
MediTec-ITS, pie con logotipos de **Cuchipu Cloud** y **MediTec-ITS**, firmas y
nota LFPDPPP) + reportes PDF del administrador con periodo.

### Calidad UX (`ESPECIFICACIONES.md`)
Toda acción confirma su resultado (`ModalResultado` para destructivas, `Aviso`
para el resto), validación en tiempo real (duplicados, formatos, rangos),
transiciones suaves (`entrada`/`entrada-modal`, sin cambios bruscos), modales a
pantalla completa (portal al body) y accesibilidad (estados con texto, labels,
foco).

### Infraestructura
`docker compose up -d --build` → `db` (MySQL + healthcheck), `backend`
(node:22-slim + tsx, puerto 3000), `frontend` (Astro estático + nginx con proxy
`/api`, puertos **4321** y 8080). Volumen `mysql_data` persistente.

---

## 3. Qué falta

**Pendientes directos (del roadmap previsto):**
- **Panel de Recepción**: hoy entra provisionalmente a `/enfermeria`. Su papel
  natural: alta de pacientes y agenda pública de citas.
- **Portales de nutrición/odontología avanzados**: evolución dental por pieza,
  tratamientos por diente, fotos/clínica; en nutrición, reportes de avance más
  ricos.
- **Reportes**: el de "Actividad de la enfermería" podría ampliarse (por
  especialista, exportar a Excel); faltan reportes por módulo.

**Deuda técnica / producción:**
- **Pruebas automatizadas** (hoy la verificación es manual + typecheck + build).
- **Migraciones de esquema**: los cambios se aplican con `ALTER` documentados y
  `init.sql` actualizado; para producción conviene un sistema de migraciones.
- **Despliegue real**: HTTPS, secretos de producción, backups de `mysql_data`,
  aviso de privacidad y captura de consentimientos (checklist LFPDPPP en la
  skill `seguridad-clinica`).
- **Notificaciones** (recordatorios de cita por correo/SMS) y **recuperación de
  contraseña** por el propio usuario.
- El JWT caduca a las 8h y no hay refresh; las contraseñas se restablecen desde
  el admin (por diseño actual).

**En curso:** fase de **correcciones de errores** por prueba manual del
usuario (se van reportando y resolviendo; los fixes de esta fase aún no están
commiteados).

---

## 4. Decisiones tomadas

| Área | Decisión |
|---|---|
| Datos | Ningún dato de negocio entra por SQL directo: todo pasa por la interfaz |
| API | Rutas → controladores → servicios; SQL solo en servicios; Zod en toda entrada; JSON camelCase / BD snake_case |
| Roles | 5 roles fijos (Administrador, Personal médico, Enfermería, Recepción, Paciente) + **la especialidad del personal médico decide su portal** (viaja en el JWT del login) |
| Consulta→cita | Toda consulta deriva de una cita (`cita_id_cita` UNIQUE); auto-cita `Atención directa` para llegadas; nutrición/odontología exigen cita |
| Tipos de consulta | ENUM `tipo_consulta` derivado del rol+especialidad; cada tipo captura campos distintos |
| Agenda | Sesión de 30 min + 30 de respiro (citas cada 60 min); días con horario; sin pasado; cancelación automática al cambiar de día; atender solo hoy |
| Insumos | Categoría por medicamento; matriz de categorías permitidas por tipo de consulta (en cliente y servidor) |
| Inventario | Sin DELETE: stock 0 = agotado; descuento en la misma transacción de la consulta |
| Planes | El plan alimenticio se registra **junto con la sesión de nutrición** (una transacción) |
| Cuestionario | Único por paciente (upsert); obligatorio en el primer login del paciente; alergias/enfermedades nuevas → catálogos automáticamente |
| Contraseñas | Temporales de una sola vez (se muestran una vez); nunca se exportan ni se devuelven en respuestas |
| Citas del paciente | Nacen Pendientes; solo puede agendar/reagendar/cancelar las suyas |
| PDFs | Una sola base (`documentosPdf.ts`) para toda la identidad visual |
| Docker | nginx proxea `/api` (mismo origen, sin CORS); `absolute_redirect off` para no perder el puerto en redirecciones; secretos solo en `backend/.env` |
| BD portable | Identificadores **ASCII** (`contrasena`, no `contraseña`), **sin `VISIBLE`** en índices y `SET NAMES utf8mb4` al inicio: `init.sql` corre en MariaDB/MySQL ligeros y con cualquier charset de servidor |
| UX | `ESPECIFICACIONES.md` manda: confirmación de toda acción, sin transiciones bruscas, validación en tiempo real |

---

## 5. Archivos importantes

### Raíz / infraestructura
| Archivo | Qué es |
|---|---|
| `docker-compose.yml` | Orquesta db + backend + frontend (4321/8080/3000/3307) |
| `database/init.sql` | Esquema completo (fuente de verdad; sin datos) |
| `AGENTS.md` | Reglas de trabajo y estado actual del proyecto |
| `ESPECIFICACIONES.md` | Reglas de interacción (confirmaciones, transiciones, accesibilidad) |
| `backend/.env.example` | Plantilla de configuración (copiar a `backend/.env`) |
| `.opencode/skills/*` | Skills de contexto: `api-express`, `ui-astro`, `db-mysql`, `seguridad-clinica`, `ux-calidad` |

### Backend (`backend/src/`)
| Archivo | Qué es |
|---|---|
| `routes/index.ts` | Registro de todos los módulos |
| `middleware/verificarToken.ts` · `requerirRol.ts` · `validar.ts` | Auth JWT, roles por endpoint, validación Zod |
| `utils/erroresHttp.ts` · `parametros.ts` · `fechas.ts` · `contrasenas.ts` | Errores HTTP, parámetros Express 5, fechas, bcrypt + temporales |
| `config/roles.ts` · `config/catalogos.ts` · `config/env.ts` | Roles base, definiciones de catálogos (lista blanca), entorno |
| `services/usuarios.service.ts` · `pacientes.service.ts` | Altas transaccionales con fichas (personal/pacientes) |
| `services/consultas.service.ts` | El corazón: cita + consulta + signos + insumos + plan en una transacción |
| `services/citas.service.ts` | Reglas de agenda (espaciado, horarios, estatus, reagendar, cancelación por día) |
| `services/planes.service.ts` · `cuestionarios.service.ts` · `medicamentos.service.ts` | Planes alimenticios, cuestionario único, inventario |
| `services/importacion.service.ts` | Alta masiva desde Excel (reutiliza las reglas del alta manual) |

### Frontend (`frontend/src/`)
| Archivo | Qué es |
|---|---|
| `services/atencion.service.ts` | Cliente API clínico + utilidades de agenda (días/horas disponibles) |
| `services/documentosPdf.ts` · `expedientePdf.ts` · `nutricionPdf.ts` | Base de PDFs con identidad + documentos clínicos |
| `services/excel.service.ts` · `administracion.service.ts` · `operacion.service.ts` | Excel, administración, inventario/horarios |
| `services/sesion.ts` · `auth.service.ts` | Sesión/JWT y `rutaSegunRol(rol, especialidad)` |
| `components/atencion/*` | Piezas clínicas compartidas: `Atencion`, `AtencionForm`, `CuestionarioSalud`, `ExpedienteVista`, `FichaPaciente`, `DetalleConsulta`, `SelectorPaciente`, `AgendaPorDia`, `AgendaEspecialista`, `AtencionEspecialista`, `ReagendarCita` |
| `components/ui/*` | Design system (incluye `ModalResultado`, `EstadoVista`, `Aviso`) |
| `components/{administrador,doctor,enfermeria,nutricion,odontologia,paciente,cuenta,layout}` | Los 6 portales + configuración de cuenta + shell |
| `hooks/useProtegerSesion.ts` | Redirige a cada usuario a su panel (rol+especialidad) |
| `styles/global.css` | Tokens `brand-*`, `prefers-reduced-motion`, animaciones `entrada`/`entrada-modal` |
| `pages/*.astro` | Una página por portal (islas React con `client:load`) |

### Cómo se verifica un cambio
```bash
cd backend && npm run typecheck        # regla 9 de AGENTS.md
cd frontend && ../backend/node_modules/.bin/tsc --noEmit -p tsconfig.json
cd frontend && npm run build           # o probar en caliente con npm run dev
# SQL nuevo: validar contra el esquema real (SELECT/EXPLAIN) antes de usarlo
```
