import { Router } from 'express';
import authRoutes from './auth.routes';
import rolesRoutes from './roles.routes';
import usuariosRoutes from './usuarios.routes';
import catalogosRoutes from './catalogos.routes';
import personalRoutes from './personal.routes';
import horariosRoutes from './horarios.routes';
import medicamentosRoutes from './medicamentos.routes';

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

export default rutas;
