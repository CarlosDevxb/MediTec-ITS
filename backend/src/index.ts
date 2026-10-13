import express from 'express';
import cors from 'cors';
import pool from './db/pool'; // <-- Importamos nuestra conexión

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de prueba inicial
app.get('/api/health', (req, res) => {
  res.json({ status: 'MediTec-ITS Backend Operativo en Linux' });
});

// Nuevo endpoint para probar la base de datos
app.get('/api/roles', async (req, res) => {
  try {
    // Ejecutamos SQL puro. 
    // Desestructuramos [rows] porque mysql2 devuelve un arreglo donde el primer elemento son los datos.
    const [rows] = await pool.query('SELECT * FROM roles');
    
    res.json({
      mensaje: '¡Conexión exitosa a MySQL!',
      datos: rows
    });
  } catch (error) {
    console.error('Error conectando a MySQL:', error);
    res.status(500).json({ error: 'Error interno de la base de datos' });
  }
});

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});