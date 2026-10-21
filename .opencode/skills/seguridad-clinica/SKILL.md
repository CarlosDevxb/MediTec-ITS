---
name: Seguridad y datos clínicos MediTec-ITS
description: Usar antes de modificar autenticación, permisos, sesión o cualquier código que lea o escriba expedientes y datos de salud (alergias, signos vitales, consultas, cuestionario). Cubre RBAC con los cinco roles, protección del expediente, JWT y buenas prácticas.
metadata:
  opencode/autoinvoke: false
---

# Seguridad · datos clínicos

MediTec-ITS maneja **información sensible de salud**. Trata cada cambio como si
pudiera exponer un expediente completo.

## Los cinco roles

`Administrador` · `Personal médico` · `Enfermería` · `Recepción` · `Paciente`

Reglas de oro:

1. **El paciente solo ve lo suyo.** Nunca filtres en el cliente: la consulta SQL
   debe acotar por `pacientes_id_usuarios = req.usuario.id`. Un endpoint que
   devuelva todos los expedientes "porque el front ya filtra" es una vulnerabilidad.
2. **Acceso a la clínica por rol.** Consultas y signos vitales son de `Personal médico`
   / `Enfermería`; inventario, usuarios y horarios son del `Administrador`.
3. **Un mismo endpoint, respuesta por rol.** Si un dato puede ser sensible
   (diagnóstico, tratamiento), no lo incluyas en la respuesta del paciente.

## Autenticación y sesión

- JWT (HS256) con `expiresIn` de 8h; el backend tiene `verificarToken` y `requerirRol`.
- Login: mensaje idéntico para usuario inexistente y contraseña incorrecta (ya
  implementado en `auth.controller.ts`) y solo revelar "cuenta deshabilitada"
  **después** de verificar la contraseña. No debilites ese comportamiento.
- **No expongas nunca el hash de contraseña.** Solo `buscarUsuarioPorControl`
  recupera `contrasena`; el resto de servicios no debe incluirlo en el `SELECT`.
- El token vive en `localStorage` en el front (expuesto a XSS): no insertes
  contenido de usuario con `dangerouslySetInnerHTML` ni `eval`-equivalente.
- El `useProtegerSesion` valida la sesión **y el rol del panel** (redirige a
  cada usuario a su propio panel si entra por URL a uno que no le corresponde),
  pero sigue siendo solo de vista: el control de acceso real está en la API,
  que valida el rol en cada endpoint.

## Manejo de datos

- **Nunca registres información clínica en `console.log`**: sin nombres de pacientes,
  números de control, diagnósticos ni síntomas en logs o mensajes de error.
- Los errores al cliente son genéricos; el detalle va al log del servidor.
- Validación con Zod en **toda** entrada: número de control, contraseña, campos
  del cuestionario y de consultas.
- Rate limiting ya aplica a `/api`; no lo quites de rutas de login.
- Mantén CORS con lista explícita de orígenes (`ENV.corsOrigen`), nunca `*`.
- Los secretos van en variables de entorno (`backend/.env`, ignorado por git).
  `JWT_SECRET` debe ser único y aleatorio: si está en un valor de ejemplo,
  cámbialo antes de cualquier despliegue.
- Notificaciones de alergias y enfermedades crónicas deben mostrarse en el flujo
  de atención: no las ocultes tras una pestaña opcional.

## Contexto normativo (México)

El expediente clínico y los datos de salud son datos personales sensibles bajo la
**LFPDPPP**: se requiere consentimiento, finalidad declarada y minimización. En la
práctica, antes de producción:

- [ ] Aviso de privacidad visible y aceptación registrada
- [ ] Consentimiento para el cuestionario de salud
- [ ] Cifrado en tránsito (HTTPS) y contraseñas fuertes de BD
- [ ] Roles verificados en el servidor en cada endpoint nuevo
- [ ] Sin datos reales de pacientes en el repositorio ni en la BD de pruebas
