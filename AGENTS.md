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
   `IconButton`, `Aviso`/`useAviso`, `Modal` y `EstadoVista`.
5. **Accesibilidad obligatoria**: foco visible, estados con texto además de color,
   `label` en todo campo.
6. **Sin datos personales reales** en código, pruebas ni commits; sin credenciales
   reales en el repositorio.
7. **No rompas el login**: sus mensajes genéricos y el orden de validación son
   deliberados (ver `seguridad-clinica`).
8. Verifica tu trabajo: `cd backend && npm run typecheck` y compila la pantalla
   afectada.

## Estado actual (referencia)

**Con backend ya conectado:** `/api/roles`, `/api/usuarios`, `/api/catalogos`,
`/api/personal-medico`, `/api/horarios` y `/api/medicamentos` (incluyen alta
masiva vía `/importar` desde Excel). Las secciones Roles, Usuarios, Catálogos,
Horarios, Medicamentos y Reportes del panel `/admin` leen y escriben en MySQL;
no usan datos de demostración.

Reglas de negocio del módulo Operación ya implementadas: la clínica solo opera
de lunes a viernes, los turnos duplicados exactos (mismo personal, día y rango)
se rechazan y los medicamentos no se eliminan — el stock en 0 los deja no
disponibles para consultas futuras.

Importación / exportación en Excel (`frontend/src/services/excel.service.ts` +
`ImportadorExcel.tsx`): plantilla descargable, avisos previos de captura,
confirmación con modal y resultado por fila; las contraseñas no se exportan
nunca y las temporales del alta masiva se muestran una sola vez.

**Pendientes de conectar:** el reporte "Actividad de la clínica" sigue con datos
de demostración (falta el módulo de consultas) y los paneles de clínica,
nutrición y paciente funcionan con datos de ejemplo.

**Regla al conectar una sección nueva:** empieza por el servicio (SQL), sigue por el
controlador y la ruta, y al final sustituye el fixture de la vista. Usa `apiFetch`
del servicio `src/services/administracion.service.ts` como referencia, con estados
de carga (`EstadoVista`), confirmación (`Modal`) y avisos (`useAviso`).
