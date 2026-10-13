import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carga las variables del .env
dotenv.config();

// Crea el pool de conexiones apuntando al puerto 3307
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // <-- Leemos el puerto del .env
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;