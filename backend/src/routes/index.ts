import { Router } from 'express';
import pool from '../db/pool';
import authRoutes from './auth.routes';

const rutas = Router();

/** Estado de la API */
rutas.get('/health', (_req, res) => {
  res.json({ status: 'MediTec-ITS Backend Operativo' });
});

/**
 * Prueba de conexión a MySQL (temporal, se sustituirá por los módulos reales).
 */
rutas.get('/roles', async (_req, res, next) => {
  try {
    const [filas] = await pool.query('SELECT * FROM roles');
    res.json({ mensaje: 'Conexión exitosa a MySQL', datos: filas });
  } catch (error) {
    next(error); // lo maneja el middleware central
  }
});

/** Módulo de autenticación: POST /api/auth/login */
rutas.use('/auth', authRoutes);

export default rutas;
