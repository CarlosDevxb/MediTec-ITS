-- ============================================================
-- MIGRACIÓN · Roles con perfil base y restricciones de acciones
-- Fecha: 2026-11 · Aplica sobre BD creadas antes de esta feature
--
-- Qué hace:
--   1) Agrega `roles.perfil` (perfil base heredado: panel y permisos).
--   2) Asigna su perfil a los roles base ya existentes.
--   3) Crea `rol_restricciones` (acciones que un rol NO hereda).
--
-- ⚠️ EJECUTAR UNA SOLA VEZ (el ALTER no es repetible).
-- ⚠️ `SET NAMES utf8mb4` es obligatorio: sin él, los ENUM con acentos
--    ('Personal médico', 'Enfermería') quedan corruptos.
-- ⚠️ Los roles creados a mano en la interfaz quedan con perfil por defecto
--    (Paciente): edítalos desde Catálogos → Roles para darles su perfil.
--
-- En un servidor con docker compose:
--   docker compose exec -T db mysql -u meditec_user -pmeditecpassword meditec_its \
--     < database/migraciones/2026-11_roles-perfil-y-restricciones.sql
-- ============================================================

SET NAMES utf8mb4;

-- 1) Perfil base del rol (define su panel y los permisos que hereda)
ALTER TABLE roles
  ADD COLUMN perfil ENUM('Administrador', 'Personal médico', 'Enfermería', 'Paciente')
  NOT NULL DEFAULT 'Paciente'
  COMMENT 'Perfil base heredado: define el panel y los permisos del rol';

-- 2) Los roles base del sistema quedan en su perfil
UPDATE roles SET perfil = 'Administrador'   WHERE nombre = 'Administrador';
UPDATE roles SET perfil = 'Personal médico' WHERE nombre = 'Personal médico';
UPDATE roles SET perfil = 'Enfermería'      WHERE nombre = 'Enfermería';
UPDATE roles SET perfil = 'Paciente'        WHERE nombre = 'Paciente';

-- 3) Acciones que un rol NO hereda de su perfil (restricciones puntuales)
CREATE TABLE IF NOT EXISTS rol_restricciones (
  roles_id_rol INT UNSIGNED NOT NULL,
  accion VARCHAR(50) NOT NULL COMMENT 'Clave de la acción restringida (ver backend/src/config/permisos.ts)',
  PRIMARY KEY (roles_id_rol, accion),
  CONSTRAINT fk_rol_restricciones_rol
    FOREIGN KEY (roles_id_rol) REFERENCES roles (id_rol)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
