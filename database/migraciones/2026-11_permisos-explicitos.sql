-- ============================================================
-- MIGRACIÓN · Permisos explícitos por rol (sin herencia)
-- Fecha: 2026-11 · Aplica sobre BD que ya tengan roles.perfil y
--                   rol_restricciones (migración anterior)
--
-- Qué hace:
--   1) Crea `rol_permisos`: lo que un rol SÍ puede hacer.
--   2) Convierte los roles existentes: permiso concedido = acción de
--      su perfil MENOS las restricciones que tenía.
--   3) Elimina `rol_restricciones` (modelo anterior, de herencia).
--
-- ⚠️ EJECUTAR UNA SOLA VEZ.
-- ⚠️ `SET NAMES utf8mb4` es obligatorio: sin él, los valores con
--    acentos ('Personal médico', 'Enfermería') quedan corruptos.
-- ⚠️ Si la BD aún no tiene `roles.perfil`, aplica primero
--    2026-11_roles-perfil-y-restricciones.sql.
--
-- En un servidor con docker compose:
--   docker compose exec -T db mysql -u meditec_user -pmeditecpassword meditec_its \
--     < database/migraciones/2026-11_permisos-explicitos.sql
-- ============================================================

SET NAMES utf8mb4;

-- 1) Permisos explícitos del rol
CREATE TABLE IF NOT EXISTS rol_permisos (
  roles_id_rol INT UNSIGNED NOT NULL,
  accion VARCHAR(50) NOT NULL COMMENT 'Clave de la acción permitida (ver backend/src/config/permisos.ts)',
  PRIMARY KEY (roles_id_rol, accion),
  CONSTRAINT fk_rol_permisos_rol
    FOREIGN KEY (roles_id_rol) REFERENCES roles (id_rol)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 2) Conversión: concedidas = acciones del perfil − restricciones que tenía.
--    (Las acciones que hoy existen, por perfil; mismo catálogo que
--     backend/src/config/permisos.ts)
INSERT INTO rol_permisos (roles_id_rol, accion)
SELECT r.id_rol, cat.accion
  FROM roles r
  JOIN (
            SELECT 'Administrador' AS perfil, 'usuarios' AS accion
    UNION ALL SELECT 'Administrador', 'restablecer_contrasenas'
    UNION ALL SELECT 'Administrador', 'roles'
    UNION ALL SELECT 'Administrador', 'catalogos'
    UNION ALL SELECT 'Administrador', 'horarios'
    UNION ALL SELECT 'Administrador', 'eliminar_horarios'
    UNION ALL SELECT 'Administrador', 'medicamentos'
    UNION ALL SELECT 'Administrador', 'reportes'
    UNION ALL SELECT 'Personal médico', 'consultas'
    UNION ALL SELECT 'Personal médico', 'historial'
    UNION ALL SELECT 'Personal médico', 'pacientes'
    UNION ALL SELECT 'Personal médico', 'citas'
    UNION ALL SELECT 'Personal médico', 'planes'
    UNION ALL SELECT 'Enfermería', 'consultas'
    UNION ALL SELECT 'Enfermería', 'pacientes'
    UNION ALL SELECT 'Enfermería', 'citas'
    UNION ALL SELECT 'Paciente', 'citas'
  ) cat ON cat.perfil = r.perfil
  LEFT JOIN rol_restricciones rr
         ON rr.roles_id_rol = r.id_rol AND rr.accion = cat.accion
 WHERE rr.accion IS NULL;

-- 3) El modelo anterior de herencia ya no se usa
DROP TABLE IF EXISTS rol_restricciones;
