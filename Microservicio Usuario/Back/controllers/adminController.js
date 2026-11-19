// ============================================================
// Controlador de Administración del Microservicio
// Microservicio de Usuarios - SmartGym
// ============================================================

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const responseHelper = require('../utils/responseHelper');

/**
 * Listar usuarios del sistema con filtros y paginación
 */
const listarUsuarios = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const rol = req.query.rol || null;
    const activo = req.query.activo !== undefined ? req.query.activo : null;

    const pool = getPool();
    const request = pool.request();

    let whereClause = 'WHERE 1=1';
    if (search) {
      request.input('search', sql.VarChar(100), `%${search}%`);
      whereClause += ' AND (u.nombre LIKE @search OR u.apellido LIKE @search OR u.email LIKE @search)';
    }
    if (rol) {
      request.input('rol', sql.VarChar(50), rol);
      whereClause += ' AND r.nombre = @rol';
    }
    if (activo !== null) {
      request.input('activo', sql.Bit, activo === 'true' || activo === '1' ? 1 : 0);
      whereClause += ' AND u.activo = @activo';
    }

    const countRes = await request.query(`
      SELECT COUNT(*) AS total
      FROM Usuarios u
      INNER JOIN Roles r ON u.rol_id = r.rol_id
      ${whereClause}
    `);
    const total = countRes.recordset[0].total;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);
    const dataRes = await request.query(`
      SELECT u.usuario_id, u.email, u.nombre, u.apellido, u.activo, u.ultimo_login, u.created_at,
             r.nombre AS rol_nombre, r.rol_id,
             c.cliente_id, c.numero_socio, c.dni, c.telefono AS cliente_telefono,
             COALESCE(c.estado_membresia, 'PENDIENTE') AS estado_membresia,
             p.personal_id, p.especialidad, p.telefono AS personal_telefono
      FROM Usuarios u
      INNER JOIN Roles r ON u.rol_id = r.rol_id
      LEFT JOIN Clientes c ON u.usuario_id = c.usuario_id
      LEFT JOIN Personal p ON u.usuario_id = p.usuario_id
      ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return responseHelper.paginated(res, dataRes.recordset, total, page, limit);
  } catch (error) {
    return responseHelper.error(res, 'Error al listar usuarios: ' + error.message, 500);
  }
};

/**
 * Detalle completo de un usuario
 */
const verUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT u.usuario_id, u.email, u.nombre, u.apellido, u.activo, u.email_verificado,
               u.ultimo_login, u.created_at, u.updated_at,
               r.nombre AS rol_nombre, r.rol_id,
               c.cliente_id, c.dni AS cliente_dni, c.numero_socio, c.peso_actual, c.talla_actual, c.imc_actual, c.objetivo_fitness,
               p.personal_id, p.dni AS personal_dni, p.especialidad, p.fecha_contratacion
        FROM Usuarios u
        INNER JOIN Roles r ON u.rol_id = r.rol_id
        LEFT JOIN Clientes c ON u.usuario_id = c.usuario_id
        LEFT JOIN Personal p ON u.usuario_id = p.usuario_id
        WHERE u.usuario_id = @usuario_id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Usuario no encontrado', 404);
    }

    return responseHelper.success(res, resultado.recordset[0], 'Detalle de usuario');
  } catch (error) {
    return responseHelper.error(res, 'Error al consultar usuario: ' + error.message, 500);
  }
};

/**
 * Crear usuario de staff (Admin o Entrenador)
 */
const crearStaff = async (req, res) => {
  try {
    const { email, password, nombre, apellido, rol, dni, especialidad, telefono } = req.body;
    const pool = getPool();

    if (!['ADMIN', 'ENTRENADOR'].includes(rol)) {
      return responseHelper.error(res, 'El rol debe ser ADMIN o ENTRENADOR', 400);
    }

    // Verificar email único
    const existe = await pool.request()
      .input('email', sql.VarChar(150), email.toLowerCase().trim())
      .query('SELECT usuario_id FROM Usuarios WHERE email = @email');

    if (existe.recordset.length > 0) {
      return responseHelper.error(res, 'El correo electrónico ya está registrado', 409);
    }

    // Obtener rol_id
    const rolRes = await pool.request()
      .input('rol_nombre', sql.VarChar(50), rol)
      .query('SELECT rol_id FROM Roles WHERE nombre = @rol_nombre');

    const rolId = rolRes.recordset[0].rol_id;
    const passwordHash = await bcrypt.hash(password || 'SmartGym2026!', 10);
    const usuarioId = uuidv4();

    // Insertar usuario
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuarioId)
      .input('email', sql.VarChar(150), email.toLowerCase().trim())
      .input('password_hash', sql.VarChar(255), passwordHash)
      .input('nombre', sql.VarChar(100), nombre.trim())
      .input('apellido', sql.VarChar(100), apellido.trim())
      .input('rol_id', sql.Int, rolId)
      .query(`
        INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
        VALUES (@usuario_id, @email, @password_hash, @nombre, @apellido, @rol_id, 1, 1)
      `);

    // Si es entrenador, registrar en Personal
    if (rol === 'ENTRENADOR') {
      await pool.request()
        .input('usuario_id', sql.UniqueIdentifier, usuarioId)
        .input('dni', sql.VarChar(8), dni || '00000000')
        .input('especialidad', sql.VarChar(100), especialidad || 'Entrenamiento General')
        .input('telefono', sql.VarChar(15), telefono || null)
        .query(`
          INSERT INTO Personal (usuario_id, dni, especialidad, telefono, activo)
          VALUES (@usuario_id, @dni, @especialidad, @telefono, 1)
        `);
    }

    return responseHelper.success(res, {
      usuario_id: usuarioId,
      email: email.toLowerCase().trim(),
      nombre,
      apellido,
      rol
    }, 'Usuario de staff creado exitosamente', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al crear staff: ' + error.message, 500);
  }
};

/**
 * Editar usuario administrativo o staff (solo datos necesarios para gestión)
 */
const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, activo, telefono, especialidad, dni } = req.body;
    const pool = getPool();

    // 1. Validar unicidad de email si se intenta cambiar
    if (email) {
      const emailCheck = await pool.request()
        .input('email', sql.VarChar(150), email.toLowerCase().trim())
        .input('usuario_id', sql.UniqueIdentifier, id)
        .query('SELECT usuario_id FROM Usuarios WHERE email = @email AND usuario_id <> @usuario_id');

      if (emailCheck.recordset.length > 0) {
        return responseHelper.error(res, 'El correo electrónico ya está registrado por otro usuario', 409);
      }
    }

    // 2. Actualizar datos base en Usuarios (incluyendo estado activo/inactivo)
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .input('nombre', sql.VarChar(100), nombre ? nombre.trim() : null)
      .input('apellido', sql.VarChar(100), apellido ? apellido.trim() : null)
      .input('email', sql.VarChar(150), email ? email.toLowerCase().trim() : null)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : null)
      .query(`
        UPDATE Usuarios SET
          nombre = COALESCE(@nombre, nombre),
          apellido = COALESCE(@apellido, apellido),
          email = COALESCE(@email, email),
          activo = COALESCE(@activo, activo),
          updated_at = GETDATE()
        WHERE usuario_id = @usuario_id
      `);

    // 3. Si es Personal (Entrenador o Staff), actualizar especialidad y teléfono
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .input('especialidad', sql.VarChar(100), especialidad || null)
      .input('telefono', sql.VarChar(15), telefono || null)
      .query(`
        UPDATE Personal SET
          especialidad = COALESCE(@especialidad, especialidad),
          telefono = COALESCE(@telefono, telefono)
        WHERE usuario_id = @usuario_id
      `);

    // 4. Si es Cliente, actualizar DNI, teléfono y membresía administrativa (NO toca datos clínicos/médicos)
    const { estado_membresia } = req.body;
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .input('dni', sql.VarChar(8), dni || null)
      .input('telefono', sql.VarChar(15), telefono || null)
      .input('estado_membresia', sql.VarChar(30), estado_membresia || null)
      .query(`
        UPDATE Clientes SET
          dni = COALESCE(@dni, dni),
          telefono = COALESCE(@telefono, telefono),
          estado_membresia = COALESCE(@estado_membresia, estado_membresia),
          updated_at = GETDATE()
        WHERE usuario_id = @usuario_id
      `);

    return responseHelper.success(res, null, 'Usuario actualizado exitosamente');
  } catch (error) {
    return responseHelper.error(res, 'Error al actualizar usuario: ' + error.message, 500);
  }
};

/**
 * Desactivar usuario (Soft delete)
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .query('UPDATE Usuarios SET activo = 0, updated_at = GETDATE() WHERE usuario_id = @usuario_id');

    return responseHelper.success(res, null, 'Usuario desactivado correctamente');
  } catch (error) {
    return responseHelper.error(res, 'Error al desactivar usuario: ' + error.message, 500);
  }
};

/**
 * Cambiar rol de un usuario
 */
const cambiarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol_nombre } = req.body;
    const pool = getPool();

    const rolRes = await pool.request()
      .input('nombre', sql.VarChar(50), rol_nombre)
      .query('SELECT rol_id FROM Roles WHERE nombre = @nombre');

    if (rolRes.recordset.length === 0) {
      return responseHelper.error(res, 'Rol especificado no existe', 400);
    }

    const rolId = rolRes.recordset[0].rol_id;

    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .input('rol_id', sql.Int, rolId)
      .query('UPDATE Usuarios SET rol_id = @rol_id, updated_at = GETDATE() WHERE usuario_id = @usuario_id');

    return responseHelper.success(res, { usuario_id: id, nuevo_rol: rol_nombre }, 'Rol actualizado');
  } catch (error) {
    return responseHelper.error(res, 'Error al cambiar rol: ' + error.message, 500);
  }
};

/**
 * Consultar bitácora de auditoría
 */
const auditoria = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const accion = req.query.accion || null;

    const pool = getPool();
    const request = pool.request();

    let whereClause = 'WHERE 1=1';
    if (accion) {
      request.input('accion', sql.VarChar(50), accion);
      whereClause += ' AND a.accion = @accion';
    }

    const countRes = await request.query(`SELECT COUNT(*) AS total FROM Auditoria a ${whereClause}`);
    const total = countRes.recordset[0].total;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);
    const dataRes = await request.query(`
      SELECT a.auditoria_id, a.usuario_id, a.accion, a.entidad, a.entidad_id,
             a.detalle, a.ip_address, a.user_agent, a.created_at,
             u.nombre, u.apellido, u.email
      FROM Auditoria a
      LEFT JOIN Usuarios u ON a.usuario_id = u.usuario_id
      ${whereClause}
      ORDER BY a.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return responseHelper.paginated(res, dataRes.recordset, total, page, limit);
  } catch (error) {
    return responseHelper.error(res, 'Error al consultar auditoría: ' + error.message, 500);
  }
};

/**
 * Dashboard de Estadísticas y Métricas del Microservicio
 */
const estadisticas = async (req, res) => {
  try {
    const pool = getPool();

    // 1. Usuarios por rol
    const rolesRes = await pool.request().query(`
      SELECT r.nombre AS rol, COUNT(u.usuario_id) AS total
      FROM Roles r
      LEFT JOIN Usuarios u ON r.rol_id = u.rol_id AND u.activo = 1
      GROUP BY r.nombre
    `);

    // 2. Clientes por objetivo fitness
    const objRes = await pool.request().query(`
      SELECT COALESCE(objetivo_fitness, 'SIN_DEFINIR') AS objetivo, COUNT(*) AS total
      FROM Clientes
      GROUP BY objetivo_fitness
    `);

    // 3. Distribución por nivel de riesgo PAR-Q
    const riesgoRes = await pool.request().query(`
      SELECT COALESCE(nivel_riesgo, 'SIN_EVALUAR') AS nivel, COUNT(*) AS total
      FROM FichaMedicaPARQ
      GROUP BY nivel_riesgo
    `);

    // 4. Totales globales
    const globalesRes = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Usuarios) AS total_usuarios,
        (SELECT COUNT(*) FROM Usuarios WHERE activo = 1) AS usuarios_activos,
        (SELECT COUNT(*) FROM Clientes) AS total_socios,
        (SELECT COUNT(*) FROM HistorialMediciones) AS total_mediciones_registradas,
        (SELECT COUNT(*) FROM ObservacionesEntrenador) AS total_observaciones_realizadas
    `);

    return responseHelper.success(res, {
      metricas_globales: globalesRes.recordset[0],
      usuarios_por_rol: rolesRes.recordset,
      distribucion_objetivos: objRes.recordset,
      distribucion_salud_parq: riesgoRes.recordset
    }, 'Estadísticas del microservicio obtenidas');
  } catch (error) {
    return responseHelper.error(res, 'Error al obtener estadísticas: ' + error.message, 500);
  }
};

module.exports = {
  listarUsuarios,
  verUsuario,
  crearStaff,
  editarUsuario,
  eliminarUsuario,
  cambiarRol,
  auditoria,
  estadisticas
};
