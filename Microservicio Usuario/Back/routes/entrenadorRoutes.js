// ============================================================
// Rutas del Panel del Entrenador (Staff)
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const entrenadorController = require('../controllers/entrenadorController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { autorizar } = require('../middlewares/rbacMiddleware');
const { validarMedicion, manejarErrores } = require('../middlewares/validationMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

router.use(verificarToken);
router.use(autorizar('ENTRENADOR', 'ADMIN'));

// Listar clientes y consultar expediente
router.get('/clientes', entrenadorController.listarClientes);
router.get('/clientes/:id', entrenadorController.verCliente);

// Registrar nueva medición física de un cliente
router.post(
  '/clientes/:id/mediciones',
  validarMedicion,
  manejarErrores,
  auditar('REGISTRAR_MEDICION', 'HistorialMediciones'),
  entrenadorController.registrarMedicion
);

// Agregar observación técnica / nota
router.post(
  '/clientes/:id/observaciones',
  auditar('AGREGAR_OBSERVACION', 'ObservacionesEntrenador'),
  entrenadorController.agregarObservacion
);

// Cambiar objetivo fitness recomendado
router.put(
  '/clientes/:id/objetivo',
  auditar('CAMBIO_OBJETIVO_ENTRENADOR', 'Clientes'),
  entrenadorController.cambiarObjetivo
);

module.exports = router;
