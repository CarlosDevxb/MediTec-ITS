import dotenv from 'dotenv';

// Carga las variables del archivo backend/.env
dotenv.config();

/** Valida que una variable obligatoria exista y corta el arranque si falta */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`[config] Falta la variable de entorno ${nombre} en backend/.env`);
    process.exit(1);
  }
  return valor;
}

/**
 * Configuración central de la API.
 * Todo lo sensible se lee desde variables de entorno (nunca se versiona).
 */
export const ENV = {
  puerto: Number(process.env.PORT ?? 3000),
  corsOrigen: (process.env.CORS_ORIGEN ?? 'http://localhost:4321')
    .split(',')
    .map((origen) => origen.trim()),

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    puerto: Number(process.env.DB_PORT ?? 3307),
    usuario: requerida('DB_USER'),
    password: requerida('DB_PASSWORD'),
    nombre: requerida('DB_NAME'),
  },

  jwt: {
    secreto: requerida('JWT_SECRET'),
    expiracion: process.env.JWT_EXPIRACION ?? '8h',
  },

  bcrypt: {
    rondas: Number(process.env.BCRYPT_RONDAS ?? 10),
  },
};
