import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { ENV } from './config/env';
import rutas from './routes';
import { limitadorGlobal } from './middleware/limitadorAuth';
import { manejarErrores, noEncontrado } from './middleware/manejarErrores';

const app = express();

/* ================= SEGURIDAD ================= */
// Cabeceras HTTP seguras (X-Frame, HSTS, XSS, etc.)
app.use(helmet());

// CORS restringido a los orígenes configurados (nunca comodín)
app.use(cors({ origin: ENV.corsOrigen, credentials: true }));

// Cuerpo JSON con límite de tamaño (evita payloads abusivos)
app.use(express.json({ limit: '1mb' }));

// Límite general de peticiones por IP
app.use('/api', limitadorGlobal);

/* ================= RUTAS ================= */
app.use('/api', rutas);

/* ================= MANEJO DE ERRORES ================= */
app.use(noEncontrado);
app.use(manejarErrores);

app.listen(ENV.puerto, () => {
  console.log(`MediTec-ITS API escuchando en http://localhost:${ENV.puerto}`);
});
