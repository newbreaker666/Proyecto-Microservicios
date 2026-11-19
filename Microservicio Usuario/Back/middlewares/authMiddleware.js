// ============================================================
// Middleware de Autenticación JWT
// Microservicio de Usuarios - SmartGym
// ============================================================

const jwt = require('jsonwebtoken');
const responseHelper = require('../utils/responseHelper');

/**
 * Middleware que verifica el token JWT presente en el encabezado Authorization.
 * Formato esperado: Bearer <token>
 */
const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return responseHelper.error(res, 'Acceso no autorizado: No se proporcionó token de autenticación', 401);
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return responseHelper.error(res, 'Formato de token inválido. Use: Bearer <token>', 401);
    }

    const token = partes[1];
    const jwtSecret = process.env.JWT_SECRET || 'smartgym_jwt_secret_key_2026_ultra_secure';

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return responseHelper.error(res, 'El token de sesión ha expirado', 401, { expired: true });
        }
        return responseHelper.error(res, 'Token inválido o manipulado', 401);
      }

      req.usuario = {
        usuario_id: decoded.usuario_id,
        email: decoded.email,
        rol: decoded.rol,
        rol_id: decoded.rol_id
      };
      next();
    });
  } catch (error) {
    return responseHelper.error(res, 'Error al verificar autenticación: ' + error.message, 500);
  }
};

module.exports = {
  verificarToken
};
