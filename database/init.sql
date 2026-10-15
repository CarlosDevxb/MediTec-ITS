-- MySQL Script Normalizado a 3NF Completo (Versión Final con Interfaces)
-- Schema meditec_its

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- Codificación explícita: sin esta línea, el init de Docker puede
-- interpretar el script como latin1 y guardar acentos/ñ duplicados
SET NAMES utf8mb4;

CREATE SCHEMA IF NOT EXISTS `meditec_its` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `meditec_its` ;

-- -----------------------------------------------------
-- 1. Tablas Base (Catálogos Independientes)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`roles` (
  `id_rol` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Breve descripción de los permisos o función del rol',
  PRIMARY KEY (`id_rol`))
ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cat_alergias` (
  `id_alergia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_alergia`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cat_enfermedades` (
  `id_enfermedad` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_enfermedad`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cat_unidades_medida` (
  `id_unidad` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `abreviatura` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`id_unidad`))
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cat_tipo_paciente` (
  `id_tipo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL COMMENT 'Ej: Alumno, Docente, Administrativo, Enfermería',
  PRIMARY KEY (`id_tipo`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cat_carreras` (
  `id_carrera` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Ej: Ing. en Sistemas, Ing. Industrial, Lic. en Administración',
  PRIMARY KEY (`id_carrera`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- 2. Usuarios (Supertipo) y Personal Médico
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`usuarios` (
  `id_usuarios` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `roles_id_rol` INT UNSIGNED NOT NULL,
  `numero_control` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(150) NOT NULL,
  `telefono` VARCHAR(20) NULL DEFAULT NULL,
  `contraseña` VARCHAR(255) NOT NULL,
  `fecha_nacimiento` DATE NOT NULL,
  `genero` ENUM('Masculino', 'Femenino', 'Otro') NOT NULL,
  `estatus` TINYINT(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_usuarios`),
  UNIQUE INDEX `numero_control` (`numero_control` ASC) VISIBLE,
  UNIQUE INDEX `correo` (`correo` ASC) VISIBLE,
  INDEX `roles_id_rol` (`roles_id_rol` ASC) VISIBLE,
  CONSTRAINT `usuarios_ibfk_1`
    FOREIGN KEY (`roles_id_rol`) REFERENCES `meditec_its`.`roles` (`id_rol`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`personal_medico` (
  `id_personal_medico` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuarios_id_usuarios` INT UNSIGNED NOT NULL,
  `cedula` VARCHAR(50) NOT NULL,
  `especialidad` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_personal_medico`),
  UNIQUE INDEX `usuarios_id_usuarios` (`usuarios_id_usuarios` ASC) VISIBLE,
  UNIQUE INDEX `cedula` (`cedula` ASC) VISIBLE,
  CONSTRAINT `personal_medico_ibfk_1`
    FOREIGN KEY (`usuarios_id_usuarios`) REFERENCES `meditec_its`.`usuarios` (`id_usuarios`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- 3. Pacientes (Subtipo) y Relaciones Clínicas
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`pacientes` (
  `id_paciente` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuarios_id_usuarios` INT UNSIGNED NOT NULL,
  `cat_tipo_paciente_id_tipo` INT UNSIGNED NOT NULL,
  `cat_carreras_id_carrera` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Solo se llena si el tipo de paciente es Alumno',
  `tipo_sangre` ENUM('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-') NULL DEFAULT NULL,
  `apertura_expediente` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `antecedentes` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_paciente`),
  UNIQUE INDEX `usuarios_id_usuarios` (`usuarios_id_usuarios` ASC) VISIBLE,
  INDEX `fk_tipo_paciente_idx` (`cat_tipo_paciente_id_tipo` ASC) VISIBLE,
  INDEX `fk_carrera_paciente_idx` (`cat_carreras_id_carrera` ASC) VISIBLE,
  CONSTRAINT `pacientes_ibfk_1`
    FOREIGN KEY (`usuarios_id_usuarios`) REFERENCES `meditec_its`.`usuarios` (`id_usuarios`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pacientes_tipo`
    FOREIGN KEY (`cat_tipo_paciente_id_tipo`) REFERENCES `meditec_its`.`cat_tipo_paciente` (`id_tipo`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pacientes_carrera`
    FOREIGN KEY (`cat_carreras_id_carrera`) REFERENCES `meditec_its`.`cat_carreras` (`id_carrera`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`paciente_alergias` (
  `pacientes_id_paciente` INT UNSIGNED NOT NULL,
  `cat_alergias_id_alergia` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`pacientes_id_paciente`, `cat_alergias_id_alergia`),
  CONSTRAINT `fk_paciente_alergia`
    FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `meditec_its`.`pacientes` (`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_alergia_paciente`
    FOREIGN KEY (`cat_alergias_id_alergia`) REFERENCES `meditec_its`.`cat_alergias` (`id_alergia`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`paciente_enfermedades` (
  `pacientes_id_paciente` INT UNSIGNED NOT NULL,
  `cat_enfermedades_id_enfermedad` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`pacientes_id_paciente`, `cat_enfermedades_id_enfermedad`),
  CONSTRAINT `fk_paciente_enfermedad`
    FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `meditec_its`.`pacientes` (`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_enfermedad_paciente`
    FOREIGN KEY (`cat_enfermedades_id_enfermedad`) REFERENCES `meditec_its`.`cat_enfermedades` (`id_enfermedad`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`cuestionario_salud` (
  `id_cuestionario` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pacientes_id_paciente` INT UNSIGNED NOT NULL,
  `peso` DECIMAL(5,2) NULL DEFAULT NULL,
  `talla` DECIMAL(4,2) NULL DEFAULT NULL,
  `medicamentos_actuales` TEXT NULL DEFAULT NULL,
  `cirugias_previas` TEXT NULL DEFAULT NULL,
  `alergia_otra` VARCHAR(100) NULL DEFAULT NULL,
  `enfermedad_otra` VARCHAR(100) NULL DEFAULT NULL,
  `actividad_fisica` ENUM('Ninguna', 'Leve', 'Moderada', 'Intensa') NULL DEFAULT NULL,
  `tabaco` ENUM('Nunca', 'Ex-fumador', 'Fumador') NULL DEFAULT NULL,
  `alcohol` ENUM('Nunca', 'Ocasional', 'Frecuente') NULL DEFAULT NULL,
  `horas_sueno` TINYINT UNSIGNED NULL DEFAULT NULL,
  `sintomas_actuales` TEXT NULL DEFAULT NULL,
  `comentarios` TEXT NULL DEFAULT NULL,
  `fecha_llenado` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `estatus` ENUM('Borrador', 'Completado') NOT NULL DEFAULT 'Borrador',
  PRIMARY KEY (`id_cuestionario`),
  UNIQUE INDEX `pacientes_id_paciente_UNIQUE` (`pacientes_id_paciente` ASC) VISIBLE,
  CONSTRAINT `cuestionario_salud_ibfk_1`
    FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `meditec_its`.`pacientes` (`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- 4. Operación Clínica: Citas, Consultas y Signos Vitales
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`cita` (
  `id_cita` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` INT UNSIGNED NOT NULL,
  `pacientes_id_paciente` INT UNSIGNED NOT NULL,
  `fecha` DATE NOT NULL,
  `hora` TIME NOT NULL,
  `motivo` VARCHAR(255) NOT NULL,
  `tipo_cita` ENUM('Programada', 'Emergencia', 'Atención directa') NOT NULL DEFAULT 'Programada' COMMENT 'Atención directa = cita creada automáticamente al atender sin cita previa (doctor y enfermería)',
  `estatus` ENUM('Pendiente', 'Confirmada', 'Cancelada', 'Completada') NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`id_cita`),
  INDEX `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico` ASC) VISIBLE,
  INDEX `pacientes_id_paciente` (`pacientes_id_paciente` ASC) VISIBLE,
  CONSTRAINT `cita_ibfk_1`
    FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `meditec_its`.`personal_medico` (`id_personal_medico`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cita_ibfk_2`
    FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `meditec_its`.`pacientes` (`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`consulta` (
  `id_consulta` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cita_id_cita` INT UNSIGNED NOT NULL COMMENT 'Toda consulta debe derivar de una cita',
  `fecha_hora` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `sintomas` TEXT NOT NULL,
  `exploracion` TEXT NULL DEFAULT NULL,
  `diagnostico` VARCHAR(255) NOT NULL,
  `tratamiento` TEXT NOT NULL,
  PRIMARY KEY (`id_consulta`),
  UNIQUE INDEX `cita_id_cita_UNIQUE` (`cita_id_cita` ASC) VISIBLE,
  CONSTRAINT `consulta_ibfk_1`
    FOREIGN KEY (`cita_id_cita`) REFERENCES `meditec_its`.`cita` (`id_cita`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`signos_vitales` (
  `id_signos_vitales` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consulta_id_consulta` INT UNSIGNED NOT NULL,
  `ta` VARCHAR(10) NULL DEFAULT NULL,
  `fc` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `fr` SMALLINT UNSIGNED NULL DEFAULT NULL,
  `temp` DECIMAL(3,1) NULL DEFAULT NULL,
  `peso` DECIMAL(5,2) NULL DEFAULT NULL,
  `talla` DECIMAL(4,2) NULL DEFAULT NULL,
  PRIMARY KEY (`id_signos_vitales`),
  UNIQUE INDEX `consulta_id_consulta_UNIQUE` (`consulta_id_consulta` ASC) VISIBLE,
  CONSTRAINT `signos_vitales_ibfk_1`
    FOREIGN KEY (`consulta_id_consulta`) REFERENCES `meditec_its`.`consulta` (`id_consulta`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- 5. Inventario de Medicamentos
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`medicamentos` (
  `id_medicamento` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cat_unidades_medida_id_unidad` INT UNSIGNED NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `stock` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `descripcion` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id_medicamento`),
  INDEX `fk_unidad_medida_idx` (`cat_unidades_medida_id_unidad` ASC) VISIBLE,
  CONSTRAINT `fk_medicamento_unidad`
    FOREIGN KEY (`cat_unidades_medida_id_unidad`) REFERENCES `meditec_its`.`cat_unidades_medida` (`id_unidad`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`consulta_insumo` (
  `consulta_id_consulta` INT UNSIGNED NOT NULL,
  `medicamentos_id_medicamento` INT UNSIGNED NOT NULL,
  `cantidad_usada` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`consulta_id_consulta`, `medicamentos_id_medicamento`),
  INDEX `medicamentos_id_medicamento` (`medicamentos_id_medicamento` ASC) VISIBLE,
  CONSTRAINT `consulta_insumo_ibfk_1`
    FOREIGN KEY (`consulta_id_consulta`) REFERENCES `meditec_its`.`consulta` (`id_consulta`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `consulta_insumo_ibfk_2`
    FOREIGN KEY (`medicamentos_id_medicamento`) REFERENCES `meditec_its`.`medicamentos` (`id_medicamento`)
    ON DELETE RESTRICT ON UPDATE CASCADE)
ENGINE = InnoDB;

-- -----------------------------------------------------
-- 6. Horarios y Planes Alimenticios
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `meditec_its`.`horarios` (
  `id_horario` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` INT UNSIGNED NOT NULL,
  `dia_semana` TINYINT UNSIGNED NOT NULL COMMENT '1=Lunes a 7=Domingo',
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  PRIMARY KEY (`id_horario`),
  INDEX `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico` ASC) VISIBLE,
  CONSTRAINT `horarios_ibfk_1`
    FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `meditec_its`.`personal_medico` (`id_personal_medico`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `meditec_its`.`plan_alimenticio` (
  `id_plan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` INT UNSIGNED NOT NULL,
  `pacientes_id_paciente` INT UNSIGNED NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `descripcion_dieta` TEXT NOT NULL,
  `calorias_diarias` INT UNSIGNED NOT NULL,
  `estatus` ENUM('Por iniciar', 'Vigente', 'Finalizado', 'Cancelado') NOT NULL DEFAULT 'Por iniciar',
  PRIMARY KEY (`id_plan`),
  INDEX `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico` ASC) VISIBLE,
  INDEX `pacientes_id_paciente` (`pacientes_id_paciente` ASC) VISIBLE,
  CONSTRAINT `plan_alimenticio_ibfk_1`
    FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `meditec_its`.`personal_medico` (`id_personal_medico`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `plan_alimenticio_ibfk_2`
    FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `meditec_its`.`pacientes` (`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE)
ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;