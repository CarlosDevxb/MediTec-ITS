---
name: API REST MediTec-ITS
description: Usar al crear o modificar endpoints, controladores, servicios, validaciones o autenticación en backend/ (Express 5 + mysql2 + Zod + JWT). Cubre la arquitectura en capas ruta → controlador → servicio, las convenciones en español, SQL parametrizado y manejo de errores.
metadata:
  opencode/autoinvoke: false
---

# API REST · backend/

Guía para trabajar en la API de MediTec-ITS. **Nunca** pongas SQL en controladores ni
validación en servicios: respeta las tres capas.

## Arquitectura

```
src/routes/*.routes.ts        Define las rutas y monta middlewares
  → src/controllers/*.controller.ts   Valida entrada, arma respuesta HTTP
    → src/services/*.service.ts       Único lugar con SQL (mysql2, sin ORM)
```

- `src/routes/index.ts` monta los módulos: `rutas.use('/auth', authRoutes)`.
  Cada módulo nuevo se registra ahí, nunca en `src/index.ts`.
- `src/index.ts` solo configura Express: `helmet`, `cors`, `express.json`,
  rate limiting y los manejadores `noEncontrado` / `manejarErrores`.
- El controlador **nunca** lanza errores: envuélvelos en `try/catch` y llama `next(error)`.

## Convenciones

- **Todo en español**: archivos (`auth.routes.ts`), identificadores (`buscarUsuarioPorControl`,
  `numeroControl`, `contrasenaHash`), comentarios y mensajes al cliente.
- Los JSON de la API van en **camelCase**; las columnas de la BD en `snake_case`.
  El mapeo se hace a mano en el servicio (ver `auth.service.ts`).
- Códigos HTTP: `200` ok, `201` creado, `400` validación, `401` no autenticado,
  `403` sin permiso o cuenta inactiva, `404` no encontrado, `409` conflicto.
- Errores siempre con forma `{ error: string, detalles?: [{ campo, mensaje }] }`.

## SQL

- **Consultas parametrizadas siempre** (`WHERE u.numero_control = ?`, valores en el array).
  Jamás interpoles variables del request en el string del SQL.
- Usa el pool compartido `import pool from '../db/pool'`; no crees conexiones nuevas.
- Los `SELECT *` devuelven `RowDataPacket` tipado como desconocido: castea
  `(filas as Array<Record<string, unknown>>)` y normaliza con `Number()` / `String()`.
- `LIMIT 1` y un alias claro (`r.nombre AS rol`) en las consultas de usuario.

## Validación (Zod)

```ts
// src/validaciones/<modulo>.validacion.ts
export const loginSchema = z.object({
  numeroControl: z.string().min(1, 'El número de control es obligatorio.'),
  contrasena: z.string().min(1, 'La contraseña es obligatoria.'),
});
export type DatosLogin = z.infer<typeof loginSchema>;
```

En la ruta: `router.post('/login', validar(loginSchema), login)` — el middleware `validar`
reemplaza `req.body` por los datos ya saneados.

## Autenticación y roles

- `verificarToken`: exige `Authorization: Bearer <token>` y deja el usuario en `req.usuario`
  (`{ id, numeroControl, nombre, rol }`). El payload **nunca** lleva la contraseña.
- `requerirRol(...roles)`: úsalo en cada ruta que no sea pública, incluso si hoy
  solo hay un panel: `router.get('/', verificarToken, requerirRol('Administrador'), listar)`.
- Los roles son: `Administrador`, `Personal médico`, `Enfermería`, `Recepción`, `Paciente`.
- No pongas rutas de depuración sin autenticación (`/api/roles` es temporal y debe eliminarse).

## Lista de verificación antes de terminar un endpoint

- [ ] Validación Zod con mensajes en español
- [ ] SQL parametrizado y `try/catch` con `next(error)`
- [ ] Ruta protegida con `verificarToken` + `requerirRol` según corresponda
- [ ] No se devuelven campos sensibles (`contrasena`, tokens)
- [ ] Módulo montado en `src/routes/index.ts`
- [ ] `cd backend && npm run typecheck` sin errores
- [ ] Comentarios de bloque explicando el *qué* y el *por qué*, no el *cómo*

## Patrones ya establecidos en el proyecto

### Errores HTTP (`src/utils/erroresHttp.ts`)

Lanza errores con código y mensaje en español; `manejarErrores` los respeta:

```ts
throw errorNoEncontrado('El rol no existe.');     // 404
throw errorConflicto('Ese correo ya está registrado.'); // 409
throw errorValidacion('Datos inválidos.', detalles);    // 400
```

Nunca dejes que un mensaje interno de MySQL llegue al cliente.

### Parámetros de ruta (Express 5)

`req.params` es `string | string[]`: léelo siempre con `textoObligatorio(req.params.id)`
(`src/utils/parametros.ts`).

### Transacciones

Cuando una operación escribe en dos tablas (usuarios + personal_medico), usa
`pool.getConnection()` con `beginTransaction` / `commit` / `rollback` y `release()`
en el `finally`, como en `services/usuarios.service.ts`.

### Catálogos genéricos (`src/config/catalogos.ts`)

Los nombres de tabla y columna **nunca** vienen del cliente: se resuelven en un
mapa (lista blanca) y el id de la URL solo sirve para buscar en él. Si agregas un
catálogo, registra su definición y también sus `uso` (qué tablas lo referencian)
para poder impedir borrar valores asignados.

### Contraseñas y datos sensibles

- Solo la consulta de login recupera `contrasena`; ninguna otra la selecciona.
- Usa `hashearContrasena` de `utils/contrasenas.ts`.
- Los usuarios no pueden eliminarse a sí mismos ni si tienen expediente clínico:
  en esos casos se responde 409 y se sugiere deshabilitar la cuenta.
