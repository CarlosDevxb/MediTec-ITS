# ============================================================
# Web de MediTec-ITS · imagen de producción
# 1) Construye el sitio estático de Astro.
# 2) nginx lo sirve y proxea /api al backend (mismo origen:
#    el navegador nunca ve CORS ni URLs absolutas).
# Se ejecuta con: docker compose up
# ============================================================

# ---------- Etapa de construcción ----------
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Misma origen: el navegador llama a /api/... y nginx lo lleva al backend
ARG PUBLIC_API_URL=
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN npm run build

# ---------- Etapa de servicio ----------
FROM nginx:alpine

# Configuración: sitio estático + proxy de /api al servicio "backend"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
