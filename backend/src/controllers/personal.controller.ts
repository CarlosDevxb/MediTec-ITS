import type { Request, Response, NextFunction } from 'express';
import * as servicio from '../services/personal.service';

/**
 * Controlador del personal clínico (fichas de `personal_medico`).
 * Solo lectura: las fichas se crean y editan desde la sección Usuarios.
 */

/** GET /api/personal-medico */
export async function listarPersonal(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarPersonal();
    // Minimización de datos: el paciente solo necesita nombre y especialidad
    // para elegir a su especialista al agendar citas
    const respuesta =
      req.usuario?.rol === 'Paciente'
        ? datos.map((persona) => ({ ...persona, cedula: '' }))
        : datos;
    res.json({ datos: respuesta });
  } catch (error) {
    next(error);
  }
}
