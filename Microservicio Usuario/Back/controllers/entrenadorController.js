// ============================================================
// Controlador del Panel del Entrenador (Staff)
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
 * Listar clientes asignados o del gimnasio con filtros y paginación
 */
const listarClientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const objetivo = req.query.objetivo || null;
    const nivel = req.query.nivel || null;

    const pool = getPool();
    const request = pool.request();

    let whereClause = 'WHERE u.activo = 1';
    if (search) {
      request.input('search', sql.VarChar(100), `%${search}%`);
      whereClause += ' AND (u.nombre LIKE @search OR u.apellido LIKE @search OR c.dni LIKE @search OR u.email LIKE @search OR c.numero_socio LIKE @search)';
    }
    if (objetivo) {
      request.input('objetivo', sql.VarChar(30), objetivo);
      whereClause += ' AND c.objetivo_fitness = @objetivo';
    }
    if (nivel) {
      request.input('nivel', sql.VarChar(20), nivel);
      whereClause += ' AND c.nivel_experiencia = @nivel';
    }

    // Contar total
    const countRes = await request.query(`
      SELECT COUNT(*) AS total
      FROM Clientes c
      INNER JOIN Usuarios u ON c.usuario_id = u.usuario_id
      ${whereClause}
    `);
    const total = countRes.recordset[0].total;

    // Obtener paginados
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);
    const dataRes = await request.query(`
      SELECT c.cliente_id, c.numero_socio, c.dni, u.nombre, u.apellido, u.email,
             c.sexo, c.fecha_nacimiento, c.peso_actual, c.talla_actual, c.imc_actual,
             c.objetivo_fitness, c.nivel_experiencia, c.factor_actividad,
             f.nivel_riesgo,
             (SELECT COUNT(*) FROM HistorialMediciones WHERE cliente_id = c.cliente_id) AS total_mediciones,
             (SELECT MAX(fecha_medicion) FROM HistorialMediciones WHERE cliente_id = c.cliente_id) AS ultima_medicion
      FROM Clientes c
      INNER JOIN Usuarios u ON c.usuario_id = u.usuario_id
      LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
      ${whereClause}
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const clientes = dataRes.recordset.map((c) => ({
      ...c,
      edad: calcularEdad(c.fecha_nacimiento),
      clasificacion_imc: clasificarIMC(c.imc_actual)
    }));

    return responseHelper.paginated(res, clientes, total, page, limit);
  } catch (error) {
    console.error('❌ Error en listarClientes:', error);
    return responseHelper.error(res, 'Error al listar clientes: ' + error.message, 500);
  }
};

/**
 * Ver expediente completo de un cliente
 */
const verCliente = async (req, res) => {
  try {
    const { id } = req.params; // cliente_id
    const pool = getPool();

    // 1. Datos principales
    const clienteRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query(`
        SELECT c.*, u.nombre, u.apellido, u.email, u.activo AS usuario_activo,
               f.p1_cardiopatia, f.p2_dolor_pecho_actividad, f.p3_dolor_pecho_reposo,
               f.p4_mareos, f.p5_problemas_oseos, f.p6_medicacion, f.p7_otra_razon,
               f.nivel_riesgo, f.tipo_sangre, f.alergias, f.lesiones_previas, f.notas_medicas,
               p.disciplinas, p.horario_preferido, p.dias_semana, p.frecuencia_semanal, p.experiencia_previa
        FROM Clientes c
        INNER JOIN Usuarios u ON c.usuario_id = u.usuario_id
        LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
        LEFT JOIN PreferenciasDeportivas p ON c.cliente_id = p.cliente_id
        WHERE c.cliente_id = @cliente_id
      `);

    if (clienteRes.recordset.length === 0) {
      return responseHelper.error(res, 'Cliente no encontrado', 404);
    }

    const cliente = clienteRes.recordset[0];
    const edad = calcularEdad(cliente.fecha_nacimiento);
    const clasificacionIMC = clasificarIMC(cliente.imc_actual);
    const macros = calcularMacronutrientes(cliente.tdee_actual, cliente.objetivo_fitness);

    // 2. Últimas 10 mediciones
    const medicionesRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query(`
        SELECT TOP 10 * FROM HistorialMediciones
        WHERE cliente_id = @cliente_id
        ORDER BY fecha_medicion DESC
      `);

    // 3. Últimas 10 observaciones del entrenador
    const obsRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query(`
        SELECT o.*, u.nombre AS entrenador_nombre, u.apellido AS entrenador_apellido
        FROM ObservacionesEntrenador o
        INNER JOIN Personal p ON o.personal_id = p.personal_id
        INNER JOIN Usuarios u ON p.usuario_id = u.usuario_id
        WHERE o.cliente_id = @cliente_id
        ORDER BY o.created_at DESC
      `);

    // 4. Metas activas
    const metasRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query(`
        SELECT * FROM MetasPersonales
        WHERE cliente_id = @cliente_id
        ORDER BY created_at DESC
      `);

    return responseHelper.success(res, {
      cliente: {
        ...cliente,
        edad,
        clasificacion_imc: clasificacionIMC,
        macronutrientes_sugeridos: macros
      },
      historial_mediciones: medicionesRes.recordset.map((m) => ({
        ...m,
        clasificacion_imc: clasificarIMC(m.imc)
      })),
      observaciones: obsRes.recordset,
      metas: metasRes.recordset
    }, 'Expediente del cliente cargado');
  } catch (error) {
    return responseHelper.error(res, 'Error al consultar expediente: ' + error.message, 500);
  }
};

/**
 * Registrar nueva medición física de un cliente (Peso, talla, grasa)
 */
const registrarMedicion = async (req, res) => {
  try {
    const { id } = req.params; // cliente_id
    const { peso, talla, porcentaje_grasa, notas } = req.body;
    const { usuario_id } = req.usuario;
    const pool = getPool();

    // 1. Obtener cliente actual para calcular
    const clienteRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query('SELECT fecha_nacimiento, sexo, factor_actividad, objetivo_fitness FROM Clientes WHERE cliente_id = @cliente_id');

    if (clienteRes.recordset.length === 0) {
      return responseHelper.error(res, 'Cliente no encontrado', 404);
    }

    const { fecha_nacimiento, sexo, factor_actividad, objetivo_fitness } = clienteRes.recordset[0];
    const edad = calcularEdad(fecha_nacimiento);
    const pesoNum = parseFloat(peso);
    const tallaNum = parseFloat(talla);

    const imc = calcularIMC(pesoNum, tallaNum);
    const tmb = calcularTMB(pesoNum, tallaNum, edad, sexo);
    const tdee = calcularTDEE(tmb, factor_actividad || 'MODERADO');

    // 2. Insertar en HistorialMediciones
    const insertMed = await pool.request()
      .input('cliente_id', sql.Int, id)
      .input('peso', sql.Decimal(5, 2), pesoNum)
      .input('talla', sql.Decimal(5, 2), tallaNum)
      .input('imc', sql.Decimal(5, 2), imc)
      .input('tmb', sql.Decimal(7, 2), tmb)
      .input('porcentaje_grasa', sql.Decimal(5, 2), porcentaje_grasa ? parseFloat(porcentaje_grasa) : null)
      .input('registrado_por', sql.VarChar(100), usuario_id)
      .input('notas', sql.VarChar(500), notas || 'Medición y seguimiento por entrenador')
      .query(`
        INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas)
        OUTPUT INSERTED.*
        VALUES (@cliente_id, @peso, @talla, @imc, @tmb, @porcentaje_grasa, @registrado_por, @notas)
      `);

    // 3. Actualizar datos actuales en Clientes
    await pool.request()
      .input('cliente_id', sql.Int, id)
      .input('peso', sql.Decimal(5, 2), pesoNum)
      .input('talla', sql.Decimal(5, 2), tallaNum)
      .input('imc', sql.Decimal(5, 2), imc)
      .input('tmb', sql.Decimal(7, 2), tmb)
      .input('tdee', sql.Decimal(7, 2), tdee)
      .query(`
        UPDATE Clientes SET
          peso_actual = @peso, talla_actual = @talla,
          imc_actual = @imc, tmb_actual = @tmb, tdee_actual = @tdee,
          updated_at = GETDATE()
        WHERE cliente_id = @cliente_id
      `);

    // 4. Auto-actualizar metas de peso si existen
    const metaPeso = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query(`
        SELECT meta_id, valor_objetivo
        FROM MetasPersonales
        WHERE cliente_id = @cliente_id AND tipo_meta = 'PESO_OBJETIVO' AND estado = 'ACTIVA'
      `);

    if (metaPeso.recordset.length > 0) {
      for (const m of metaPeso.recordset) {
        const diff = Math.abs(pesoNum - m.valor_objetivo);
        const avance = Math.max(0, Math.min(100, Math.round(100 - (diff / pesoNum) * 100)));
        await pool.request()
          .input('meta_id', sql.Int, m.meta_id)
          .input('valor_actual', sql.Decimal(7, 2), pesoNum)
          .input('avance', sql.Decimal(5, 2), avance)
          .query(`
            UPDATE MetasPersonales SET
              valor_actual = @valor_actual, porcentaje_avance = @avance, updated_at = GETDATE()
            WHERE meta_id = @meta_id
          `);
      }
    }

    return responseHelper.success(res, {
      medicion: insertMed.recordset[0],
      imc_calculado: imc,
      clasificacion_imc: clasificarIMC(imc),
      tmb_calculada: tmb,
      tdee_calculado: tdee
    }, 'Medición registrada exitosamente', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al registrar medición: ' + error.message, 500);
  }
};

/**
 * Agregar observación técnica o recomendación sobre el cliente
 */
const agregarObservacion = async (req, res) => {
  try {
    const { id } = req.params; // cliente_id
    const { tipo, contenido, objetivo_nuevo } = req.body;
    const { usuario_id } = req.usuario;
    const pool = getPool();

    // Obtener personal_id del entrenador autenticado
    const personalRes = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT personal_id FROM Personal WHERE usuario_id = @usuario_id');

    if (personalRes.recordset.length === 0) {
      return responseHelper.error(res, 'El usuario autenticado no está registrado como personal', 403);
    }

    const personalId = personalRes.recordset[0].personal_id;

    // Obtener objetivo actual si aplica
    let objAnterior = null;
    if (tipo === 'CAMBIO_OBJETIVO' && objetivo_nuevo) {
      const cliRes = await pool.request()
        .input('cliente_id', sql.Int, id)
        .query('SELECT objetivo_fitness FROM Clientes WHERE cliente_id = @cliente_id');
      if (cliRes.recordset.length > 0) {
        objAnterior = cliRes.recordset[0].objetivo_fitness;
        await pool.request()
          .input('cliente_id', sql.Int, id)
          .input('nuevo_obj', sql.VarChar(30), objetivo_nuevo)
          .query('UPDATE Clientes SET objetivo_fitness = @nuevo_obj, updated_at = GETDATE() WHERE cliente_id = @cliente_id');
      }
    }

    const insertObs = await pool.request()
      .input('cliente_id', sql.Int, id)
      .input('personal_id', sql.Int, personalId)
      .input('tipo', sql.VarChar(30), tipo)
      .input('contenido', sql.Text, contenido)
      .input('obj_anterior', sql.VarChar(30), objAnterior)
      .input('obj_nuevo', sql.VarChar(30), objetivo_nuevo || null)
      .query(`
        INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, objetivo_anterior, objetivo_nuevo)
        OUTPUT INSERTED.*
        VALUES (@cliente_id, @personal_id, @tipo, @contenido, @obj_anterior, @obj_nuevo)
      `);

    return responseHelper.success(res, insertObs.recordset[0], 'Observación guardada con éxito', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al guardar observación: ' + error.message, 500);
  }
};

/**
 * Cambiar objetivo fitness recomendado de un cliente
 */
const cambiarObjetivo = async (req, res) => {
  try {
    const { id } = req.params; // cliente_id
    const { objetivo_nuevo, motivo } = req.body;
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const cliRes = await pool.request()
      .input('cliente_id', sql.Int, id)
      .query('SELECT objetivo_fitness FROM Clientes WHERE cliente_id = @cliente_id');

    if (cliRes.recordset.length === 0) {
      return responseHelper.error(res, 'Cliente no encontrado', 404);
    }

    const objetivoAnterior = cliRes.recordset[0].objetivo_fitness;

    // Actualizar cliente
    await pool.request()
      .input('cliente_id', sql.Int, id)
      .input('objetivo', sql.VarChar(30), objetivo_nuevo)
      .query('UPDATE Clientes SET objetivo_fitness = @objetivo, updated_at = GETDATE() WHERE cliente_id = @cliente_id');

    // Registrar en observaciones si el entrenador existe
    const perRes = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT personal_id FROM Personal WHERE usuario_id = @usuario_id');

    if (perRes.recordset.length > 0) {
      await pool.request()
        .input('cliente_id', sql.Int, id)
        .input('personal_id', sql.Int, perRes.recordset[0].personal_id)
        .input('tipo', sql.VarChar(30), 'CAMBIO_OBJETIVO')
        .input('contenido', sql.Text, motivo || `Cambio de objetivo de ${objetivoAnterior} a ${objetivo_nuevo}`)
        .input('obj_anterior', sql.VarChar(30), objetivoAnterior)
        .input('obj_nuevo', sql.VarChar(30), objetivo_nuevo)
        .query(`
          INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, objetivo_anterior, objetivo_nuevo)
          VALUES (@cliente_id, @personal_id, @tipo, @contenido, @obj_anterior, @obj_nuevo)
        `);
    }

    return responseHelper.success(res, {
      objetivo_anterior: objetivoAnterior,
      objetivo_nuevo
    }, 'Objetivo fitness actualizado exitosamente');
  } catch (error) {
    return responseHelper.error(res, 'Error al cambiar objetivo: ' + error.message, 500);
  }
};

module.exports = {
  listarClientes,
  verCliente,
  registrarMedicion,
  agregarObservacion,
  cambiarObjetivo
};
