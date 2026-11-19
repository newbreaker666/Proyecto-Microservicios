// ============================================================
// Controlador del Portal de Cliente (Self-Service)
// Microservicio de Usuarios - SmartGym
// ============================================================

const { getPool, sql } = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const {
  calcularIMC,
  clasificarIMC,
  calcularTMB,
  calcularEdad,
  calcularTDEE,
  calcularMacronutrientes
} = require('../utils/calculosBiometricos');

/**
 * Obtener mi perfil completo (Datos personales, biométricos, ficha médica y preferencias)
 */
const miPerfil = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT u.usuario_id, u.email, u.nombre, u.apellido, u.activo, u.created_at AS usuario_desde,
               c.cliente_id, c.dni, c.fecha_nacimiento, c.sexo, c.telefono, c.direccion,
               c.contacto_emergencia, c.telefono_emergencia, c.peso_actual, c.talla_actual,
               c.imc_actual, c.tmb_actual, c.tdee_actual, c.objetivo_fitness, c.nivel_experiencia,
               c.factor_actividad, c.numero_socio, COALESCE(c.estado_membresia, 'PENDIENTE') AS estado_membresia, c.avatar_url,
               f.nivel_riesgo, f.tipo_sangre, f.alergias, f.lesiones_previas,
               p.disciplinas, p.horario_preferido, p.dias_semana, p.frecuencia_semanal,
               (SELECT COUNT(*) FROM HistorialMediciones WHERE cliente_id = c.cliente_id) AS total_mediciones,
               (SELECT COUNT(*) FROM MetasPersonales WHERE cliente_id = c.cliente_id AND estado = 'ACTIVA') AS metas_activas
        FROM Usuarios u
        LEFT JOIN Clientes c ON u.usuario_id = c.usuario_id
        LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
        LEFT JOIN PreferenciasDeportivas p ON c.cliente_id = p.cliente_id
        WHERE u.usuario_id = @usuario_id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Usuario no encontrado', 404);
    }

    const row = resultado.recordset[0];
    if (!row.cliente_id) {
      return responseHelper.success(res, {
        usuario_id: row.usuario_id,
        email: row.email,
        nombre: row.nombre,
        apellido: row.apellido,
        onboarding_completado: false
      }, 'Perfil de usuario sin registro biométrico');
    }

    const edad = calcularEdad(row.fecha_nacimiento);
    const clasificacionIMC = clasificarIMC(row.imc_actual);
    const macros = calcularMacronutrientes(row.tdee_actual, row.objetivo_fitness);

    return responseHelper.success(res, {
      ...row,
      edad,
      clasificacion_imc: clasificacionIMC,
      macronutrientes_sugeridos: macros,
      onboarding_completado: true
    }, 'Perfil completo obtenido');
  } catch (error) {
    return responseHelper.error(res, 'Error al obtener perfil: ' + error.message, 500);
  }
};

/**
 * Actualizar datos de contacto personales del cliente
 */
const editarPerfil = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const { telefono, direccion, contacto_emergencia, telefono_emergencia, avatar_url, email, nombre, apellido } = req.body;
    const pool = getPool();

    // 1. Si se envía email, validar que no esté ocupado por otro usuario y actualizar en Usuarios
    if (email) {
      const emailNorm = email.toLowerCase().trim();
      const existeEmail = await pool.request()
        .input('email', sql.VarChar(150), emailNorm)
        .input('usuario_id', sql.UniqueIdentifier, usuario_id)
        .query('SELECT usuario_id FROM Usuarios WHERE email = @email AND usuario_id <> @usuario_id');

      if (existeEmail.recordset.length > 0) {
        return responseHelper.error(res, 'El correo electrónico ya está registrado por otro usuario', 409);
      }

      await pool.request()
        .input('usuario_id', sql.UniqueIdentifier, usuario_id)
        .input('email', sql.VarChar(150), emailNorm)
        .query('UPDATE Usuarios SET email = @email, updated_at = GETDATE() WHERE usuario_id = @usuario_id');
    }

    // 2. Si se envía nombre o apellido, actualizar en Usuarios
    if (nombre || apellido) {
      await pool.request()
        .input('usuario_id', sql.UniqueIdentifier, usuario_id)
        .input('nombre', sql.VarChar(100), nombre ? nombre.trim() : null)
        .input('apellido', sql.VarChar(100), apellido ? apellido.trim() : null)
        .query(`
          UPDATE Usuarios SET
            nombre = COALESCE(@nombre, nombre),
            apellido = COALESCE(@apellido, apellido),
            updated_at = GETDATE()
          WHERE usuario_id = @usuario_id
        `);
    }

    // 3. Actualizar datos en Clientes (solo campos de contacto y emergencia, NO peso/talla)
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .input('telefono', sql.VarChar(15), telefono || null)
      .input('direccion', sql.VarChar(300), direccion || null)
      .input('contacto_emergencia', sql.VarChar(150), contacto_emergencia || null)
      .input('telefono_emergencia', sql.VarChar(15), telefono_emergencia || null)
      .input('avatar_url', sql.VarChar(500), avatar_url || null)
      .query(`
        UPDATE Clientes SET
          telefono = COALESCE(@telefono, telefono),
          direccion = COALESCE(@direccion, direccion),
          contacto_emergencia = COALESCE(@contacto_emergencia, contacto_emergencia),
          telefono_emergencia = COALESCE(@telefono_emergencia, telefono_emergencia),
          avatar_url = COALESCE(@avatar_url, avatar_url),
          updated_at = GETDATE()
        WHERE usuario_id = @usuario_id
      `);

    return responseHelper.success(res, null, 'Datos personales y de contacto actualizados con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error al actualizar perfil: ' + error.message, 500);
  }
};

/**
 * Historial de mediciones físicas (Progreso y evolución)
 */
const miProgreso = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT m.medicion_id, m.peso, m.talla, m.imc, m.tmb, m.porcentaje_grasa,
               m.registrado_por, m.notas, m.fecha_medicion
        FROM HistorialMediciones m
        INNER JOIN Clientes c ON m.cliente_id = c.cliente_id
        WHERE c.usuario_id = @usuario_id
        ORDER BY m.fecha_medicion DESC
      `);

    const data = resultado.recordset.map((item) => ({
      ...item,
      clasificacion_imc: clasificarIMC(item.imc)
    }));

    return responseHelper.success(res, data, 'Historial de progreso obtenido');
  } catch (error) {
    return responseHelper.error(res, 'Error al obtener progreso: ' + error.message, 500);
  }
};

/**
 * Helper para calcular avance porcentual lógico hacia el 100%
 */
const calcularAvanceLogico = (tipoMeta, valInicial, valActual, valObjetivo) => {
  if (valObjetivo === undefined || valObjetivo === null || isNaN(valObjetivo)) return 0;
  const obj = parseFloat(valObjetivo);
  const actual = parseFloat(valActual || 0);
  const inicial = parseFloat(valInicial !== undefined && valInicial !== null ? valInicial : actual);

  if (inicial === obj) return 100;

  // Si el objetivo es una reducción (ej. bajar de peso o bajar % de grasa)
  if (obj < inicial) {
    const reduccionTotal = inicial - obj;
    const reduccionLograda = inicial - actual;
    if (reduccionLograda <= 0) return 0;
    if (actual <= obj) return 100;
    return Math.max(0, Math.min(100, Math.round((reduccionLograda / reduccionTotal) * 100)));
  } else {
    // Si el objetivo es un incremento (ej. flexiones, repeticiones, subir masa, asistencia semanal)
    const aumentoTotal = obj - inicial;
    const aumentoLogrado = actual - inicial;
    if (aumentoLogrado <= 0) return 0;
    if (actual >= obj) return 100;
    return Math.max(0, Math.min(100, Math.round((aumentoLogrado / aumentoTotal) * 100)));
  }
};

/**
 * Listar metas personales
 */
const misMetas = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT m.meta_id, m.tipo_meta, m.descripcion, m.valor_inicial, m.valor_objetivo, m.valor_actual,
               m.unidad, m.fecha_inicio, m.fecha_limite, m.estado, m.porcentaje_avance
        FROM MetasPersonales m
        INNER JOIN Clientes c ON m.cliente_id = c.cliente_id
        WHERE c.usuario_id = @usuario_id
        ORDER BY m.created_at DESC
      `);

    return responseHelper.success(res, resultado.recordset, 'Metas personales obtenidas');
  } catch (error) {
    return responseHelper.error(res, 'Error al obtener metas: ' + error.message, 500);
  }
};

/**
 * Crear nueva meta personal con cálculo lógico de avance
 */
const crearMeta = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const { tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite } = req.body;
    const pool = getPool();

    const clienteRes = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT cliente_id, peso_actual FROM Clientes WHERE usuario_id = @usuario_id');

    if (clienteRes.recordset.length === 0) {
      return responseHelper.error(res, 'Perfil de cliente no encontrado', 404);
    }

    const { cliente_id, peso_actual } = clienteRes.recordset[0];
    
    // Determinar tipo de meta válido según CHECK constraint: ('PESO_OBJETIVO', 'ASISTENCIA_SEMANAL', 'PORCENTAJE_GRASA', 'PERSONALIZADA')
    const tipoValido = ['PESO_OBJETIVO', 'ASISTENCIA_SEMANAL', 'PORCENTAJE_GRASA', 'PERSONALIZADA'].includes(tipo_meta)
      ? tipo_meta
      : 'PERSONALIZADA';

    const valObj = valor_objetivo !== undefined && valor_objetivo !== null ? parseFloat(valor_objetivo) : 0;
    
    // Asignar unidad de forma fija según el tipo de meta (no editable por el usuario)
    let valActual = 0;
    let valInicial = req.body.valor_inicial !== undefined && req.body.valor_inicial !== null ? parseFloat(req.body.valor_inicial) : null;
    let unidadFinal = 'kg';

    if (tipoValido === 'PESO_OBJETIVO') {
      unidadFinal = 'kg';
      valActual = valor_actual !== undefined && valor_actual !== null ? parseFloat(valor_actual) : (peso_actual ? parseFloat(peso_actual) : 70);
      if (valInicial === null) valInicial = valActual;
    } else if (tipoValido === 'ASISTENCIA_SEMANAL') {
      unidadFinal = 'días/sem';
      valActual = valor_actual !== undefined && valor_actual !== null ? parseFloat(valor_actual) : 1;
      if (valInicial === null) valInicial = 0;
    } else if (tipoValido === 'PORCENTAJE_GRASA') {
      unidadFinal = '%';
      valActual = valor_actual !== undefined && valor_actual !== null ? parseFloat(valor_actual) : 25;
      if (valInicial === null) valInicial = valActual;
    } else {
      // PERSONALIZADA (Ej. flexiones, repeticiones)
      unidadFinal = 'reps';
      valActual = valor_actual !== undefined && valor_actual !== null ? parseFloat(valor_actual) : 0;
      if (valInicial === null) valInicial = 0;
    }

    // Calcular avance porcentual lógico hacia el 100%
    const avance = calcularAvanceLogico(tipoValido, valInicial, valActual, valObj);
    const estado = avance >= 100 ? 'COMPLETADA' : 'ACTIVA';

    const insertRes = await pool.request()
      .input('cliente_id', sql.Int, cliente_id)
      .input('tipo_meta', sql.VarChar(30), tipoValido)
      .input('descripcion', sql.VarChar(300), descripcion)
      .input('valor_inicial', sql.Decimal(7, 2), valInicial)
      .input('valor_objetivo', sql.Decimal(7, 2), valObj || null)
      .input('valor_actual', sql.Decimal(7, 2), valActual || null)
      .input('unidad', sql.VarChar(20), unidadFinal)
      .input('fecha_limite', sql.Date, fecha_limite || null)
      .input('estado', sql.VarChar(20), estado)
      .input('porcentaje_avance', sql.Decimal(5, 2), avance)
      .query(`
        INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_inicial, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
        OUTPUT INSERTED.*
        VALUES (@cliente_id, @tipo_meta, @descripcion, @valor_inicial, @valor_objetivo, @valor_actual, @unidad, @fecha_limite, @estado, @porcentaje_avance)
      `);

    return responseHelper.success(res, insertRes.recordset[0], 'Meta creada exitosamente', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al crear meta: ' + error.message, 500);
  }
};

/**
 * Actualizar avance de una meta
 */
const actualizarMeta = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const { metaId } = req.params;
    const { valor_actual, estado } = req.body;
    const pool = getPool();

    // Validar propiedad de la meta y estado
    const checkMeta = await pool.request()
      .input('meta_id', sql.Int, metaId)
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT m.meta_id, m.valor_inicial, m.valor_objetivo, m.tipo_meta, m.valor_actual, m.estado, m.porcentaje_avance
        FROM MetasPersonales m
        INNER JOIN Clientes c ON m.cliente_id = c.cliente_id
        WHERE m.meta_id = @meta_id AND c.usuario_id = @usuario_id
      `);

    if (checkMeta.recordset.length === 0) {
      return responseHelper.error(res, 'Meta no encontrada o no pertenece al usuario', 404);
    }

    const meta = checkMeta.recordset[0];

    // Regla de negocio: Si la meta ya está completada, no se puede modificar
    if (meta.estado === 'COMPLETADA' || meta.porcentaje_avance >= 100) {
      return responseHelper.error(res, 'Esta meta ya ha sido cumplida y forma parte de tu récord de logros alcanzados; ya no puede ser modificada.', 400);
    }

    const nuevoValActual = valor_actual !== undefined ? parseFloat(valor_actual) : meta.valor_actual;
    const valObj = meta.valor_objetivo ? parseFloat(meta.valor_objetivo) : 0;
    const valInicial = meta.valor_inicial !== null ? parseFloat(meta.valor_inicial) : meta.valor_actual;

    const nuevoAvance = calcularAvanceLogico(meta.tipo_meta, valInicial, nuevoValActual, valObj);
    const estadoFinal = nuevoAvance >= 100 ? 'COMPLETADA' : (estado || 'ACTIVA');

    await pool.request()
      .input('meta_id', sql.Int, metaId)
      .input('valor_actual', sql.Decimal(7, 2), nuevoValActual)
      .input('estado', sql.VarChar(20), estadoFinal)
      .input('porcentaje_avance', sql.Decimal(5, 2), nuevoAvance)
      .query(`
        UPDATE MetasPersonales SET
          valor_actual = @valor_actual,
          estado = @estado,
          porcentaje_avance = @porcentaje_avance,
          updated_at = GETDATE()
        WHERE meta_id = @meta_id
      `);

    return responseHelper.success(res, {
      meta_id: parseInt(metaId),
      valor_actual: nuevoValActual,
      porcentaje_avance: nuevoAvance,
      estado: estadoFinal
    }, 'Avance de meta actualizado');
  } catch (error) {
    return responseHelper.error(res, 'Error al actualizar meta: ' + error.message, 500);
  }
};

/**
 * Eliminar una meta personal
 */
const eliminarMeta = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const { metaId } = req.params;
    const pool = getPool();

    // Validar propiedad de la meta y verificar si ya fue completada
    const checkMeta = await pool.request()
      .input('meta_id', sql.Int, metaId)
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT m.meta_id, m.estado, m.porcentaje_avance
        FROM MetasPersonales m
        INNER JOIN Clientes c ON m.cliente_id = c.cliente_id
        WHERE m.meta_id = @meta_id AND c.usuario_id = @usuario_id
      `);

    if (checkMeta.recordset.length === 0) {
      return responseHelper.error(res, 'Meta no encontrada o no pertenece al usuario', 404);
    }

    const meta = checkMeta.recordset[0];

    // Regla de negocio: Si la meta ya está completada, no se puede eliminar
    if (meta.estado === 'COMPLETADA' || meta.porcentaje_avance >= 100) {
      return responseHelper.error(res, 'Esta meta ya ha sido cumplida y forma parte de tu récord histórico de logros; no puede ser eliminada.', 400);
    }

    await pool.request()
      .input('meta_id', sql.Int, metaId)
      .query('DELETE FROM MetasPersonales WHERE meta_id = @meta_id');

    return responseHelper.success(res, { meta_id: parseInt(metaId) }, 'Meta eliminada con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error al eliminar meta: ' + error.message, 500);
  }
};

/**
 * Carnet digital y credencial QR de socio
 */
const miCarnetDigital = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT u.nombre, u.apellido, u.email,
               c.cliente_id, c.numero_socio, c.dni, c.objetivo_fitness,
               COALESCE(c.estado_membresia, 'PENDIENTE') AS estado_membresia, c.avatar_url,
               c.created_at AS socio_desde, f.nivel_riesgo
        FROM Usuarios u
        INNER JOIN Clientes c ON u.usuario_id = c.usuario_id
        LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
        WHERE u.usuario_id = @usuario_id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Perfil de socio no encontrado', 404);
    }

    const data = resultado.recordset[0];
    const qrPayload = JSON.stringify({
      socio: data.numero_socio,
      dni: data.dni,
      usuario_id,
      timestamp: Date.now()
    });

    return responseHelper.success(res, {
      ...data,
      qr_code_data: qrPayload,
      estado_membresia: data.estado_membresia || 'PENDIENTE',
      sede_principal: 'Pucallpa Central'
    }, 'Carnet digital emitido');
  } catch (error) {
    return responseHelper.error(res, 'Error al generar carnet: ' + error.message, 500);
  }
};

/**
 * Calculadora interactiva TDEE y simulador de calorías/macros
 */
const calculadoraTDEE = async (req, res) => {
  try {
    const { peso, talla, edad, sexo, factor_actividad, objetivo_fitness } = req.body;

    const pesoNum = parseFloat(peso);
    const tallaNum = parseFloat(talla);
    const edadNum = parseInt(edad, 10);
    const factor = factor_actividad || 'MODERADO';
    const objetivo = objetivo_fitness || 'SALUD_GENERAL';

    const imc = calcularIMC(pesoNum, tallaNum);
    const tmb = calcularTMB(pesoNum, tallaNum, edadNum, sexo);
    const tdee = calcularTDEE(tmb, factor);
    const macros = calcularMacronutrientes(tdee, objetivo);

    return responseHelper.success(res, {
      imc,
      clasificacion_imc: clasificarIMC(imc),
      tmb,
      tdee,
      calorias_objetivo: macros.calorias_objetivo,
      macronutrientes: macros
    }, 'Cálculo TDEE y macronutrientes completado');
  } catch (error) {
    return responseHelper.error(res, 'Error en calculadora: ' + error.message, 500);
  }
};

/**
 * Listar sesiones activas del usuario
 */
const misSesiones = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT sesion_id, ip_address, user_agent, dispositivo, created_at, last_activity, activa
        FROM SesionesActivas
        WHERE usuario_id = @usuario_id AND activa = 1
        ORDER BY last_activity DESC
      `);

    return responseHelper.success(res, resultado.recordset, 'Sesiones activas obtenidas');
  } catch (error) {
    return responseHelper.error(res, 'Error al consultar sesiones: ' + error.message, 500);
  }
};

/**
 * Cerrar sesión en un dispositivo específico
 */
const cerrarSesion = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const { sesionId } = req.params;
    const pool = getPool();

    await pool.request()
      .input('sesion_id', sql.Int, sesionId)
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('UPDATE SesionesActivas SET activa = 0 WHERE sesion_id = @sesion_id AND usuario_id = @usuario_id');

    return responseHelper.success(res, null, 'Sesión revocada exitosamente');
  } catch (error) {
    return responseHelper.error(res, 'Error al revocar sesión: ' + error.message, 500);
  }
};

module.exports = {
  miPerfil,
  editarPerfil,
  miProgreso,
  misMetas,
  crearMeta,
  actualizarMeta,
  eliminarMeta,
  miCarnetDigital,
  calculadoraTDEE,
  misSesiones,
  cerrarSesion
};
