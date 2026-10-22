# ============================================================
# API de MediTec-ITS · imagen de producción
# Se ejecuta con: docker compose up
# La configuración sensible llega por variables de entorno
# (ver docker-compose.yml y backend/.env.example).
# ============================================================
FROM node:22-slim

WORKDIR /app

# Dependencias primero: se cachean mientras no cambie el package.json
COPY package*.json ./
RUN npm ci

# Código de la API
COPY . .

EXPOSE 3000

# tsx ejecuta el TypeScript directamente (sin paso de compilación)
CMD ["npm", "run", "start"]
