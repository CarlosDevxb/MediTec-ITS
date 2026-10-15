---
name: Base de datos MySQL MediTec-ITS
description: Usar al modificar database/init.sql, agregar tablas, columnas, catálogos o datos semilla, y al trabajar con la base MySQL en Docker (contenedor meditec_mysql, puerto 3307). Incluye la trampa de que init.sql solo se ejecuta al crear el contenedor por primera vez.
metadata:
  opencode/autoinvoke: false
---

# Base de datos · MySQL 8.0

## Entorno Docker

```bash
docker compose up -d            # levanta MySQL (container meditec_mysql)
docker compose exec db mysql -u meditec_user -pmeditecpassword meditec_its
docker compose down             # detener
docker compose down -v          # BORRA los datos y reinicia desde init.sql
```

- Host: `localhost` · Puerto del host: **3307** · Usuario app: `meditec_user`
  · Base: `meditec_its`. El usuario `root` usa la contraseña de `docker-compose.yml`
  (solo desarrollo local, nunca producción).
- El backend se conecta con esas mismas variables de `backend/.env`
  (`DB_HOST`, `DB_PORT`, `DB_USUARIO`, `DB_CONTRASENA`, `DB_NOMBRE`).

## ⚠️ `init.sql` solo corre la primera vez

El script está montado en `/docker-entrypoint-initdb.d/` y MySQL **lo ejecuta
únicamente al inicializar el volumen de datos**. Si cambias `init.sql` y solo haces
`docker compose up -d`, no verás el cambio:

```bash
docker compose down -v && docker compose up -d
```

Advierte al usuario antes de `-v`: destruye los datos actuales.

## Convenciones del esquema

- Normalización 3NF con catálogos (`cat_*`), entidades y **tablas puente**
  (`paciente_alergias`, `paciente_enfermedades`, `consulta_insumo`).
- `usuarios` es supertipo y `personal_medico` subtipo (`cedula`, `especialidad`).
- Claves primarias `id_<tabla>` (p. ej. `id_usuarios`, `id_rol`) y foráneas
  `<tabla>_id_<tabla>` (`roles_id_rol`, `pacientes_id_usuarios`).
- Tablas, columnas y *constraints* en `snake_case`; el backend ya mapea a camelCase.
- InnoDB + `utf8mb4` (necesario para acentos y emojis).
- `estatus` como `TINYINT(1)` (1 activo, 0 inactivo); fechas `DATE`, instantes `DATETIME`.

## Cambios de esquema

No edites columnas existentes en silencio si hay datos: documenta el cambio
con `ALTER TABLE` y piensa si hace falta script de migración para producción.
Si agregas tablas, añade también los índices de búsqueda por `numero_control`
y por clave foránea.

## Datos semilla

`init.sql` **no tiene ningún `INSERT`**: una BD recién creada tiene `roles` vacío
y nadie puede iniciar sesión. Para crear roles y el primer administrador:

```bash
cd backend && npm run crear:admin
```

Es idempotente: crea los 5 roles y el usuario `AD-0001` / `admin@meditec.mx`
(la contraseña se imprime una sola vez). Si agregas un rol nuevo al sistema,
actualiza también `backend/src/utils/crearAdmin.ts`.

## Checklist

- [ ] Los cambios son compatibles con los servicios ya escritos (nombres de columna)
- [ ] El script se verificó tras `docker compose down -v && docker compose up -d`
- [ ] Los datos de demostración del frontend siguen reflejando el esquema real
- [ ] No hay datos personales reales ni contraseñas reales en el repositorio
