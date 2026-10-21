import { Router } from 'express';
import authRoutes from './auth.routes';
import rolesRoutes from './roles.routes';
import usuariosRoutes from './usuarios.routes';
import catalogosRoutes from './catalogos.routes';
import personalRoutes from './personal.routes';
import horariosRoutes from './horarios.routes';
import medicamentosRoutes from './medicamentos.routes';
import pacientesRoutes from './pacientes.routes';
import citasRoutes from './citas.routes';
import consultasRoutes from './consultas.routes';
import planesRoutes from './planes.routes';

const rutas = Router();

/** Estado de la API */
rutas.get('/health', (_req, res) => {
  res.json({ status: 'MediTec-ITS Backend Operativo' });
});

/** Módulo de autenticación: POST /api/auth/login · GET /api/auth/perfil */
rutas.use('/auth', authRoutes);

/** Administración · roles, usuarios y catálogos (CRUD completo) */
rutas.use('/roles', rolesRoutes);
rutas.use('/usuarios', usuariosRoutes);
rutas.use('/catalogos', catalogosRoutes);

/** Operación · personal clínico, horarios e inventario de medicamentos */
rutas.use('/personal-medico', personalRoutes);
rutas.use('/horarios', horariosRoutes);
rutas.use('/medicamentos', medicamentosRoutes);

/** Atención clínica · expedientes, agenda de citas y consultas */
rutas.use('/pacientes', pacientesRoutes);
rutas.use('/citas', citasRoutes);
rutas.use('/consultas', consultasRoutes);

/** Nutrición · planes alimenticios de los pacientes */
rutas.use('/planes', planesRoutes);

export default rutas;
