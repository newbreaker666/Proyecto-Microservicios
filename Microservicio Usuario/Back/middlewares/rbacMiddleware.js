// ============================================================
// Middleware RBAC (Control de Acceso Basado en Roles)
// Microservicio de Usuarios - SmartGym
// ============================================================

const responseHelper = require('../utils/responseHelper');

/**
 * Genera un middleware que restringe el acceso según los roles permitidos.
 * @param  {...string} rolesPermitidos - Ej: 'ADMIN', 'ENTRENADOR', 'CLIENTE'
 */
const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !req.usuario.rol) {
      return responseHelper.error(res, 'Acceso denegado: Identidad de usuario no verificada', 401);
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return responseHelper.error(
        res,
        `Acceso prohibido: Su rol (${req.usuario.rol}) no tiene permisos suficientes para este recurso`,
        403,
        { rolesPermitidos, rolActual: req.usuario.rol }
      );
    }

    next();
  };
};

module.exports = {
  autorizar
};
