// ============================================================
// Helpers para respuestas HTTP estandarizadas
// Microservicio de Usuarios - SmartGym
// ============================================================

/**
 * Respuesta exitosa estándar.
 * @param {Object} res - Objeto response de Express
 * @param {*} data - Datos a enviar
 * @param {string} message - Mensaje descriptivo
 * @param {number} statusCode - Código HTTP (por defecto 200)
 */
const success = (res, data, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Respuesta de error estándar.
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (por defecto 400)
 * @param {Array|null} errors - Lista de errores detallados
 */
const error = (res, message = 'Error en la operación', statusCode = 400, errors = null) => {
  const respuesta = {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(respuesta);
};

/**
 * Respuesta paginada estándar.
 * @param {Object} res - Objeto response de Express
 * @param {Array} data - Datos paginados
 * @param {number} total - Total de registros
 * @param {number} page - Página actual
 * @param {number} limit - Límite por página
 */
const paginated = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  success,
  error,
  paginated
};
