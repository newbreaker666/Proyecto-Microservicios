// ============================================================
// Rutas Inter-Servicio (MS-Membresías, MS-Pagos)
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const internoController = require('../controllers/internoController');
const { verificarApiKey } = require('../middlewares/apiKeyMiddleware');

// Validar perfil biométrico para recomendación de planes (MS-Membresías)
router.get('/usuarios/:id/perfil', verificarApiKey, internoController.perfilPublico);

// Verificar existencia y actividad de usuario para pagos (MS-Pagos)
router.get('/usuarios/:id/existe', verificarApiKey, internoController.verificarExistencia);

// Sincronizar estado de membresía desde MS-Membresías (acepta usuario_id o cliente_id)
router.put('/clientes/:clienteId/membresia', verificarApiKey, internoController.sincronizarMembresia);
router.put('/usuarios/:clienteId/membresia', verificarApiKey, internoController.sincronizarMembresia);

module.exports = router;
