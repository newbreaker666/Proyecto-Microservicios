// ============================================================
// Middleware de Autenticación Inter-Servicio (API Key)
// Microservicio de Usuarios - SmartGym
// ============================================================

const responseHelper = require('../utils/responseHelper');

/**
 * Middleware que valida el encabezado X-API-Key para llamadas
 * máquina-a-máquina entre microservicios (MS-Membresías, MS-Pagos).
 */
const verificarApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY_INTERSERVICIO || 'smartgym_api_key_2026_interservice';

  if (!apiKey) {
    return responseHelper.error(
      res,
      'Acceso inter-servicio denegado: Encabezado X-API-Key requerido',
      401
    );
  }

  if (apiKey !== expectedKey) {
    return responseHelper.error(
      res,
      'Acceso inter-servicio denegado: API Key inválida',
      403
    );
  }

  next();
};

module.exports = {
  verificarApiKey
};
