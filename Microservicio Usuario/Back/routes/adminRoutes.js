// ============================================================
// Rutas de Administración del Microservicio
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { autorizar } = require('../middlewares/rbacMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

router.use(verificarToken);
router.use(autorizar('ADMIN'));

// CRUD de usuarios
router.get('/usuarios', adminController.listarUsuarios);
router.get('/usuarios/:id', adminController.verUsuario);
router.post('/usuarios', auditar('CREAR_STAFF', 'Usuarios'), adminController.crearStaff);
router.put('/usuarios/:id', auditar('EDITAR_USUARIO', 'Usuarios'), adminController.editarUsuario);
router.delete('/usuarios/:id', auditar('DESACTIVAR_USUARIO', 'Usuarios'), adminController.eliminarUsuario);
router.put('/usuarios/:id/rol', auditar('CAMBIAR_ROL', 'Usuarios'), adminController.cambiarRol);

// Auditoría y Estadísticas
router.get('/auditoria', adminController.auditoria);
router.get('/estadisticas', adminController.estadisticas);

module.exports = router;
