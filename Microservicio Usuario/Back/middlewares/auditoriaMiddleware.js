// ============================================================
// Middleware de Auditoría y Trazabilidad
// Microservicio de Usuarios - SmartGym
// ============================================================

const { getPool, sql } = require('../config/database');

/**
 * Registra una acción en la tabla Auditoria de forma no bloqueante.
 * @param {string} accion - Acción realizada (LOGIN, REGISTRO, etc.)
 * @param {string} entidad - Entidad afectada (Usuarios, Clientes, etc.)
 */
const auditar = (accion, entidad) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      // Solo auditar si la respuesta fue exitosa (2xx o 3xx)
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const pool = getPool();
          const usuarioId = req.usuario ? req.usuario.usuario_id : null;
          const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
          const userAgent = req.headers['user-agent'] || 'Desconocido';
          const entidadId = req.params.id || (req.body && req.body.cliente_id) || null;

          const detalle = JSON.stringify({
            metodo: req.method,
            ruta: req.originalUrl,
            status: res.statusCode,
            timestamp: new Date().toISOString()
          });

          await pool.request()
            .input('usuario_id', sql.UniqueIdentifier, usuarioId)
            .input('accion', sql.VarChar(50), accion)
            .input('entidad', sql.VarChar(50), entidad)
            .input('entidad_id', sql.VarChar(100), entidadId ? String(entidadId) : null)
            .input('detalle', sql.Text, detalle)
            .input('ip_address', sql.VarChar(45), ip.substring(0, 45))
            .input('user_agent', sql.VarChar(500), userAgent.substring(0, 500))
            .query(`
              INSERT INTO Auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip_address, user_agent)
              VALUES (@usuario_id, @accion, @entidad, @entidad_id, @detalle, @ip_address, @user_agent)
            `);
        } catch (err) {
          console.error('⚠️ Error al registrar auditoría:', err.message);
        }
      }
    });

    next();
  };
};

module.exports = {
  auditar
};
