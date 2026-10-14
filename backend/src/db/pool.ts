import mysql from 'mysql2/promise';
import { ENV } from '../config/env';

/**
 * Pool de conexiones MySQL (promesas).
 * Se usa SQL nativo: no hay ORM en este proyecto.
 */
const pool = mysql.createPool({
  host: ENV.db.host,
  port: ENV.db.puerto,
  user: ENV.db.usuario,
  password: ENV.db.password,
  database: ENV.db.nombre,
  // Codificación explícita: sin esto, identificadores como
  // `contraseña` o datos con acentos se corrompen en la conexión
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
