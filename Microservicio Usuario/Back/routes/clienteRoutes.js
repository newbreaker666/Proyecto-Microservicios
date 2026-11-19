// ============================================================
// Rutas del Portal de Cliente (Self-Service)
// Microservicio de Usuarios - SmartGym
// ============================================================

const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { autorizar } = require('../middlewares/rbacMiddleware');
const { validarMeta, manejarErrores } = require('../middlewares/validationMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

router.use(verificarToken);
router.use(autorizar('CLIENTE'));

// Perfil personal y biométrico
router.get('/mi-perfil', clienteController.miPerfil);
router.put('/mi-perfil', auditar('ACTUALIZAR_PERFIL', 'Clientes'), clienteController.editarPerfil);

// Historial de progreso
router.get('/mi-progreso', clienteController.miProgreso);

// Carnet digital y credencial QR
router.get('/mi-carnet', clienteController.miCarnetDigital);

// Metas personales (Gamificación)
router.get('/mis-metas', clienteController.misMetas);
router.post('/mis-metas', validarMeta, manejarErrores, auditar('CREAR_META', 'MetasPersonales'), clienteController.crearMeta);
router.put('/mis-metas/:metaId', auditar('ACTUALIZAR_META', 'MetasPersonales'), clienteController.actualizarMeta);
router.delete('/mis-metas/:metaId', auditar('ELIMINAR_META', 'MetasPersonales'), clienteController.eliminarMeta);

// Calculadora interactiva TDEE y simulador de macros
router.post('/calculadora-tdee', clienteController.calculadoraTDEE);

// Centro de seguridad: Sesiones activas
router.get('/mis-sesiones', clienteController.misSesiones);
router.delete('/mis-sesiones/:sesionId', auditar('REVOCAR_SESION', 'SesionesActivas'), clienteController.cerrarSesion);

module.exports = router;
