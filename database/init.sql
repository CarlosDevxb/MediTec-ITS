-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: meditec_its
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cat_alergias`
--

DROP TABLE IF EXISTS `cat_alergias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_alergias` (
  `id_alergia` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_alergia`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_alergias`
--

LOCK TABLES `cat_alergias` WRITE;
/*!40000 ALTER TABLE `cat_alergias` DISABLE KEYS */;
/*!40000 ALTER TABLE `cat_alergias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_carreras`
--

DROP TABLE IF EXISTS `cat_carreras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_carreras` (
  `id_carrera` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL COMMENT 'Ej: Ing. en Sistemas, Ing. Industrial, Lic. en Administración',
  PRIMARY KEY (`id_carrera`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_carreras`
--

LOCK TABLES `cat_carreras` WRITE;
/*!40000 ALTER TABLE `cat_carreras` DISABLE KEYS */;
/*!40000 ALTER TABLE `cat_carreras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_enfermedades`
--

DROP TABLE IF EXISTS `cat_enfermedades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_enfermedades` (
  `id_enfermedad` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_enfermedad`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_enfermedades`
--

LOCK TABLES `cat_enfermedades` WRITE;
/*!40000 ALTER TABLE `cat_enfermedades` DISABLE KEYS */;
/*!40000 ALTER TABLE `cat_enfermedades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_tipo_paciente`
--

DROP TABLE IF EXISTS `cat_tipo_paciente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_tipo_paciente` (
  `id_tipo` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL COMMENT 'Ej: Alumno, Docente, Administrativo, Enfermería',
  PRIMARY KEY (`id_tipo`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_tipo_paciente`
--

LOCK TABLES `cat_tipo_paciente` WRITE;
/*!40000 ALTER TABLE `cat_tipo_paciente` DISABLE KEYS */;
/*!40000 ALTER TABLE `cat_tipo_paciente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_unidades_medida`
--

DROP TABLE IF EXISTS `cat_unidades_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_unidades_medida` (
  `id_unidad` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `abreviatura` varchar(10) NOT NULL,
  PRIMARY KEY (`id_unidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_unidades_medida`
--

LOCK TABLES `cat_unidades_medida` WRITE;
/*!40000 ALTER TABLE `cat_unidades_medida` DISABLE KEYS */;
/*!40000 ALTER TABLE `cat_unidades_medida` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cita`
--

DROP TABLE IF EXISTS `cita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cita` (
  `id_cita` int unsigned NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` int unsigned NOT NULL,
  `pacientes_id_paciente` int unsigned NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `tipo_cita` enum('Programada','Emergencia') NOT NULL DEFAULT 'Programada',
  `estatus` enum('Pendiente','Confirmada','Cancelada','Completada') DEFAULT 'Pendiente',
  PRIMARY KEY (`id_cita`),
  KEY `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico`),
  KEY `pacientes_id_paciente` (`pacientes_id_paciente`),
  CONSTRAINT `cita_ibfk_1` FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `personal_medico` (`id_personal_medico`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cita_ibfk_2` FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cita`
--

LOCK TABLES `cita` WRITE;
/*!40000 ALTER TABLE `cita` DISABLE KEYS */;
/*!40000 ALTER TABLE `cita` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consulta`
--

DROP TABLE IF EXISTS `consulta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consulta` (
  `id_consulta` int unsigned NOT NULL AUTO_INCREMENT,
  `cita_id_cita` int unsigned NOT NULL COMMENT 'Toda consulta debe derivar de una cita, incluso emergencias',
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP,
  `sintomas` text NOT NULL,
  `exploracion` text,
  `diagnostico` varchar(255) NOT NULL,
  `tratamiento` text NOT NULL,
  PRIMARY KEY (`id_consulta`),
  UNIQUE KEY `cita_id_cita_UNIQUE` (`cita_id_cita`),
  CONSTRAINT `consulta_ibfk_1` FOREIGN KEY (`cita_id_cita`) REFERENCES `cita` (`id_cita`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consulta`
--

LOCK TABLES `consulta` WRITE;
/*!40000 ALTER TABLE `consulta` DISABLE KEYS */;
/*!40000 ALTER TABLE `consulta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consulta_insumo`
--

DROP TABLE IF EXISTS `consulta_insumo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consulta_insumo` (
  `consulta_id_consulta` int unsigned NOT NULL,
  `medicamentos_id_medicamento` int unsigned NOT NULL,
  `cantidad_usada` decimal(10,2) NOT NULL,
  PRIMARY KEY (`consulta_id_consulta`,`medicamentos_id_medicamento`),
  KEY `medicamentos_id_medicamento` (`medicamentos_id_medicamento`),
  CONSTRAINT `consulta_insumo_ibfk_1` FOREIGN KEY (`consulta_id_consulta`) REFERENCES `consulta` (`id_consulta`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `consulta_insumo_ibfk_2` FOREIGN KEY (`medicamentos_id_medicamento`) REFERENCES `medicamentos` (`id_medicamento`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consulta_insumo`
--

LOCK TABLES `consulta_insumo` WRITE;
/*!40000 ALTER TABLE `consulta_insumo` DISABLE KEYS */;
/*!40000 ALTER TABLE `consulta_insumo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cuestionario_salud`
--

DROP TABLE IF EXISTS `cuestionario_salud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cuestionario_salud` (
  `id_cuestionario` int unsigned NOT NULL AUTO_INCREMENT,
  `pacientes_id_paciente` int unsigned NOT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `talla` decimal(4,2) DEFAULT NULL,
  `medicamentos_actuales` text,
  `cirugias_previas` text,
  `alergia_otra` varchar(100) DEFAULT NULL,
  `enfermedad_otra` varchar(100) DEFAULT NULL,
  `actividad_fisica` enum('Ninguna','Leve','Moderada','Intensa') DEFAULT NULL,
  `tabaco` enum('Nunca','Ex-fumador','Fumador') DEFAULT NULL,
  `alcohol` enum('Nunca','Ocasional','Frecuente') DEFAULT NULL,
  `horas_sueno` tinyint unsigned DEFAULT NULL,
  `sintomas_actuales` text,
  `comentarios` text,
  `fecha_llenado` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cuestionario`),
  UNIQUE KEY `pacientes_id_paciente_UNIQUE` (`pacientes_id_paciente`),
  CONSTRAINT `cuestionario_salud_ibfk_1` FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cuestionario_salud`
--

LOCK TABLES `cuestionario_salud` WRITE;
/*!40000 ALTER TABLE `cuestionario_salud` DISABLE KEYS */;
/*!40000 ALTER TABLE `cuestionario_salud` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `horarios`
--

DROP TABLE IF EXISTS `horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios` (
  `id_horario` int unsigned NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` int unsigned NOT NULL,
  `dia_semana` tinyint unsigned NOT NULL COMMENT '1=Lunes a 7=Domingo',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_horario`),
  KEY `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `personal_medico` (`id_personal_medico`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `horarios`
--

LOCK TABLES `horarios` WRITE;
/*!40000 ALTER TABLE `horarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medicamentos`
--

DROP TABLE IF EXISTS `medicamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicamentos` (
  `id_medicamento` int unsigned NOT NULL AUTO_INCREMENT,
  `cat_unidades_medida_id_unidad` int unsigned NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descripcion` text,
  PRIMARY KEY (`id_medicamento`),
  KEY `fk_unidad_medida_idx` (`cat_unidades_medida_id_unidad`),
  CONSTRAINT `fk_medicamento_unidad` FOREIGN KEY (`cat_unidades_medida_id_unidad`) REFERENCES `cat_unidades_medida` (`id_unidad`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medicamentos`
--

LOCK TABLES `medicamentos` WRITE;
/*!40000 ALTER TABLE `medicamentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `medicamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paciente_alergias`
--

DROP TABLE IF EXISTS `paciente_alergias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paciente_alergias` (
  `pacientes_id_paciente` int unsigned NOT NULL,
  `cat_alergias_id_alergia` int unsigned NOT NULL,
  PRIMARY KEY (`pacientes_id_paciente`,`cat_alergias_id_alergia`),
  KEY `fk_alergia_paciente` (`cat_alergias_id_alergia`),
  CONSTRAINT `fk_alergia_paciente` FOREIGN KEY (`cat_alergias_id_alergia`) REFERENCES `cat_alergias` (`id_alergia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_paciente_alergia` FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paciente_alergias`
--

LOCK TABLES `paciente_alergias` WRITE;
/*!40000 ALTER TABLE `paciente_alergias` DISABLE KEYS */;
/*!40000 ALTER TABLE `paciente_alergias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paciente_enfermedades`
--

DROP TABLE IF EXISTS `paciente_enfermedades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paciente_enfermedades` (
  `pacientes_id_paciente` int unsigned NOT NULL,
  `cat_enfermedades_id_enfermedad` int unsigned NOT NULL,
  PRIMARY KEY (`pacientes_id_paciente`,`cat_enfermedades_id_enfermedad`),
  KEY `fk_enfermedad_paciente` (`cat_enfermedades_id_enfermedad`),
  CONSTRAINT `fk_enfermedad_paciente` FOREIGN KEY (`cat_enfermedades_id_enfermedad`) REFERENCES `cat_enfermedades` (`id_enfermedad`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_paciente_enfermedad` FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paciente_enfermedades`
--

LOCK TABLES `paciente_enfermedades` WRITE;
/*!40000 ALTER TABLE `paciente_enfermedades` DISABLE KEYS */;
/*!40000 ALTER TABLE `paciente_enfermedades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacientes`
--

DROP TABLE IF EXISTS `pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacientes` (
  `id_paciente` int unsigned NOT NULL AUTO_INCREMENT,
  `usuarios_id_usuarios` int unsigned NOT NULL,
  `cat_tipo_paciente_id_tipo` int unsigned NOT NULL,
  `cat_carreras_id_carrera` int unsigned DEFAULT NULL COMMENT 'Solo se llena si el tipo de paciente es Alumno',
  `tipo_sangre` enum('O+','O-','A+','A-','B+','B-','AB+','AB-') DEFAULT NULL,
  `apertura_expediente` datetime DEFAULT CURRENT_TIMESTAMP,
  `antecedentes` text,
  PRIMARY KEY (`id_paciente`),
  UNIQUE KEY `usuarios_id_usuarios` (`usuarios_id_usuarios`),
  KEY `fk_tipo_paciente_idx` (`cat_tipo_paciente_id_tipo`),
  KEY `fk_carrera_paciente_idx` (`cat_carreras_id_carrera`),
  CONSTRAINT `fk_pacientes_carrera` FOREIGN KEY (`cat_carreras_id_carrera`) REFERENCES `cat_carreras` (`id_carrera`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pacientes_tipo` FOREIGN KEY (`cat_tipo_paciente_id_tipo`) REFERENCES `cat_tipo_paciente` (`id_tipo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pacientes_ibfk_1` FOREIGN KEY (`usuarios_id_usuarios`) REFERENCES `usuarios` (`id_usuarios`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacientes`
--

LOCK TABLES `pacientes` WRITE;
/*!40000 ALTER TABLE `pacientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `pacientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_medico`
--

DROP TABLE IF EXISTS `personal_medico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_medico` (
  `id_personal_medico` int unsigned NOT NULL AUTO_INCREMENT,
  `usuarios_id_usuarios` int unsigned NOT NULL,
  `cedula` varchar(50) NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  PRIMARY KEY (`id_personal_medico`),
  UNIQUE KEY `usuarios_id_usuarios` (`usuarios_id_usuarios`),
  UNIQUE KEY `cedula` (`cedula`),
  CONSTRAINT `personal_medico_ibfk_1` FOREIGN KEY (`usuarios_id_usuarios`) REFERENCES `usuarios` (`id_usuarios`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_medico`
--

LOCK TABLES `personal_medico` WRITE;
/*!40000 ALTER TABLE `personal_medico` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_medico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_alimenticio`
--

DROP TABLE IF EXISTS `plan_alimenticio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_alimenticio` (
  `id_plan` int unsigned NOT NULL AUTO_INCREMENT,
  `personal_medico_id_personal_medico` int unsigned NOT NULL,
  `pacientes_id_paciente` int unsigned NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `descripcion_dieta` text NOT NULL,
  `calorias_diarias` int unsigned NOT NULL,
  PRIMARY KEY (`id_plan`),
  KEY `personal_medico_id_personal_medico` (`personal_medico_id_personal_medico`),
  KEY `pacientes_id_paciente` (`pacientes_id_paciente`),
  CONSTRAINT `plan_alimenticio_ibfk_1` FOREIGN KEY (`personal_medico_id_personal_medico`) REFERENCES `personal_medico` (`id_personal_medico`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `plan_alimenticio_ibfk_2` FOREIGN KEY (`pacientes_id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_alimenticio`
--

LOCK TABLES `plan_alimenticio` WRITE;
/*!40000 ALTER TABLE `plan_alimenticio` DISABLE KEYS */;
/*!40000 ALTER TABLE `plan_alimenticio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL COMMENT 'Breve descripción de los permisos o función del rol',
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signos_vitales`
--

DROP TABLE IF EXISTS `signos_vitales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signos_vitales` (
  `id_signos_vitales` int unsigned NOT NULL AUTO_INCREMENT,
  `consulta_id_consulta` int unsigned NOT NULL,
  `ta` varchar(10) DEFAULT NULL,
  `fc` smallint unsigned DEFAULT NULL,
  `fr` smallint unsigned DEFAULT NULL,
  `temp` decimal(3,1) DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `talla` decimal(4,2) DEFAULT NULL,
  PRIMARY KEY (`id_signos_vitales`),
  UNIQUE KEY `consulta_id_consulta_UNIQUE` (`consulta_id_consulta`),
  CONSTRAINT `signos_vitales_ibfk_1` FOREIGN KEY (`consulta_id_consulta`) REFERENCES `consulta` (`id_consulta`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signos_vitales`
--

LOCK TABLES `signos_vitales` WRITE;
/*!40000 ALTER TABLE `signos_vitales` DISABLE KEYS */;
/*!40000 ALTER TABLE `signos_vitales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuarios` int unsigned NOT NULL AUTO_INCREMENT,
  `roles_id_rol` int unsigned NOT NULL,
  `numero_control` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `contraseña` varchar(255) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` enum('Masculino','Femenino','Otro') NOT NULL,
  `estatus` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_usuarios`),
  UNIQUE KEY `numero_control` (`numero_control`),
  UNIQUE KEY `correo` (`correo`),
  KEY `roles_id_rol` (`roles_id_rol`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`roles_id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13 16:40:18
