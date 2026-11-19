// ============================================================
// Rutas de Autenticación
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { limiterAuth } = require('../middlewares/rateLimitMiddleware');
const {
  validarRegistro,
  validarLogin,
  manejarErrores
} = require('../middlewares/validationMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

// Registro de clientes (Self-Service)
router.post(
  '/register',
  limiterAuth,
  validarRegistro,
  manejarErrores,
  auditar('REGISTRO_CLIENTE', 'Usuarios'),
  authController.registrar
);

// Inicio de sesión
router.post(
  '/login',
  limiterAuth,
  validarLogin,
  manejarErrores,
  auditar('LOGIN', 'Usuarios'),
  authController.login
);

// Renovar token de acceso
router.post('/refresh', authController.refreshToken);

// Cambiar contraseña del usuario autenticado
router.post(
  '/change-password',
  verificarToken,
  auditar('CAMBIO_PASSWORD', 'Usuarios'),
  authController.cambiarPassword
);

// Validar token actual
router.get('/validate', verificarToken, authController.validarToken);

module.exports = router;
