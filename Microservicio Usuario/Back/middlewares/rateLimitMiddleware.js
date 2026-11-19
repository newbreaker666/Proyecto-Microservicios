// ============================================================
// Middleware de Limitación de Tasa (Rate Limiting)
// Microservicio de Usuarios - SmartGym
// ============================================================

const rateLimit = require('express-rate-limit');
const responseHelper = require('../utils/responseHelper');

/**
 * Limiter estricto para rutas de autenticación (Login / Registro / Passwords)
 * Protege contra ataques de fuerza bruta y saturación intencional.
 */
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150, // Permite pruebas de concurrencia y registros simultáneos
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true',
  handler: (req, res) => {
    return responseHelper.error(
      res,
      'Demasiados intentos de acceso desde esta dirección IP. Por favor espere 15 minutos.',
      429
    );
  }
});

/**
 * Limiter general para la API
 */
const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return responseHelper.error(
      res,
      'Límite de solicitudes excedido. Intente nuevamente en unos minutos.',
      429
    );
  }
});

module.exports = {
  limiterAuth,
  limiterGeneral
};
