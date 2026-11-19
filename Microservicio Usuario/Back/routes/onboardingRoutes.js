// ============================================================
// Rutas de Onboarding Digital del Cliente
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { autorizar } = require('../middlewares/rbacMiddleware');
const {
  validarPerfilBiometrico,
  validarFichaPARQ,
  validarPreferencias,
  manejarErrores
} = require('../middlewares/validationMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

// Todas las rutas de onboarding requieren autenticación de rol CLIENTE
router.use(verificarToken);
router.use(autorizar('CLIENTE'));

// Paso 1: Perfil biométrico inicial
router.post(
  '/perfil-biometrico',
  validarPerfilBiometrico,
  manejarErrores,
  auditar('ONBOARDING_BIOMETRICO', 'Clientes'),
  onboardingController.completarPerfilBiometrico
);

// Paso 2: Ficha médica PAR-Q
router.post(
  '/ficha-medica',
  validarFichaPARQ,
  manejarErrores,
  auditar('ONBOARDING_FICHA_MEDICA', 'FichaMedicaPARQ'),
  onboardingController.completarFichaMedica
);

// Paso 3: Preferencias deportivas
router.post(
  '/preferencias',
  validarPreferencias,
  manejarErrores,
  auditar('ONBOARDING_PREFERENCIAS', 'PreferenciasDeportivas'),
  onboardingController.completarPreferencias
);

// Estado de completitud del onboarding
router.get('/status', onboardingController.statusOnboarding);

module.exports = router;
