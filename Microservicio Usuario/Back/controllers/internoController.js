// ============================================================
// Controlador de Endpoints Inter-Servicio y Salud
// Microservicio de Usuarios - SmartGym
// ============================================================

const { getPool, sql } = require('../config/database');
const responseHelper = require('../utils/responseHelper');
const {
  clasificarIMC,
  calcularEdad,
  calcularMacronutrientes
} = require('../utils/calculosBiometricos');

/**
 * Endpoint consumido por MS-Membresías para obtener el perfil completo, biométrico y preferencias
 * para alimentar su motor de recomendación de planes, promociones y descuentos personalizados.
 * GET /api/v1/interno/usuarios/:id/perfil
 */
const perfilPublico = async (req, res) => {
  try {
    const { id } = req.params; // usuario_id, cliente_id o numero_socio
    const pool = getPool();

    const resultado = await pool.request()
      .input('id', sql.VarChar(50), id)
      .query(`
        SELECT u.usuario_id, u.email, u.nombre, u.apellido, u.activo, u.created_at AS usuario_desde,
               c.cliente_id, c.numero_socio, c.dni, c.sexo, c.fecha_nacimiento,
               c.peso_actual, c.talla_actual, c.imc_actual, c.tmb_actual, c.tdee_actual,
               c.objetivo_fitness, c.nivel_experiencia, c.factor_actividad,
               COALESCE(c.estado_membresia, 'PENDIENTE') AS estado_membresia,
               f.nivel_riesgo, f.tipo_sangre, f.alergias, f.lesiones_previas,
               p.disciplinas, p.horario_preferido, p.dias_semana, p.frecuencia_semanal
        FROM Usuarios u
        INNER JOIN Clientes c ON u.usuario_id = c.usuario_id
        LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
        LEFT JOIN PreferenciasDeportivas p ON c.cliente_id = p.cliente_id
        WHERE u.usuario_id = TRY_CAST(@id AS UNIQUEIDENTIFIER)
           OR c.cliente_id = TRY_CAST(@id AS INT)
           OR c.numero_socio = @id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Perfil de socio no encontrado para el identificador proporcionado', 404);
    }

    const c = resultado.recordset[0];
    const edad = calcularEdad(c.fecha_nacimiento);
    const macros = calcularMacronutrientes(c.tdee_actual, c.objetivo_fitness);
    const antiguedadDias = Math.floor((Date.now() - new Date(c.usuario_desde).getTime()) / (1000 * 60 * 60 * 24));

    return responseHelper.success(res, {
      usuario_id: c.usuario_id,
      cliente_id: c.cliente_id,
      numero_socio: c.numero_socio,
      nombre_completo: `${c.nombre} ${c.apellido}`,
      email: c.email,
      sexo: c.sexo,
      edad,
      antiguedad_dias: antiguedadDias,
      estado_cuenta: c.activo ? 'ACTIVO' : 'SUSPENDIDO',
      estado_membresia_actual: c.estado_membresia,

      // Perfil Biométrico y Condición Física
      peso: c.peso_actual,
      talla: c.talla_actual,
      imc: c.imc_actual,
      clasificacion_imc: clasificarIMC(c.imc_actual),
      tmb: c.tmb_actual,
      tdee: c.tdee_actual,
      objetivo_fitness: c.objetivo_fitness,
      nivel_experiencia: c.nivel_experiencia,
      factor_actividad: c.factor_actividad,
      nivel_riesgo_salud: c.nivel_riesgo || 'NO_EVALUADO',
      alergias: c.alergias || 'NINGUNA',
      lesiones_previas: c.lesiones_previas || 'NINGUNA',

      // Preferencias Deportivas (Determinante para asignación de planes y promociones)
      preferencias: {
        disciplinas: c.disciplinas ? c.disciplinas.split(',') : ['PESAS'],
        horario_preferido: c.horario_preferido || 'FLEXIBLE',
        dias_semana: c.dias_semana ? c.dias_semana.split(',') : ['LUN', 'MIE', 'VIE'],
        frecuencia_semanal: c.frecuencia_semanal || 3
      },

      macronutrientes: macros
    }, 'Perfil biométrico y preferencias para MS-Membresías obtenido con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error en perfil inter-servicio: ' + error.message, 500);
  }
};

/**
 * Endpoint consumido por MS-Pagos para validar existencia y estado del usuario
 */
const verificarExistencia = async (req, res) => {
  try {
    const { id } = req.params; // usuario_id
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT u.usuario_id, u.nombre, u.apellido, u.activo, u.email,
               r.nombre AS rol, c.cliente_id, c.numero_socio, c.dni
        FROM Usuarios u
        INNER JOIN Roles r ON u.rol_id = r.rol_id
        LEFT JOIN Clientes c ON u.usuario_id = c.usuario_id
        WHERE u.usuario_id = @usuario_id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.success(res, {
        existe: false,
        activo: false
      }, 'Usuario no encontrado');
    }

    const u = resultado.recordset[0];
    return responseHelper.success(res, {
      existe: true,
      activo: Boolean(u.activo),
      usuario_id: u.usuario_id,
      nombre_completo: `${u.nombre} ${u.apellido}`,
      email: u.email,
      rol: u.rol,
      cliente_id: u.cliente_id || null,
      numero_socio: u.numero_socio || null,
      dni: u.dni || null
    }, 'Usuario verificado');
  } catch (error) {
    return responseHelper.error(res, 'Error al verificar usuario: ' + error.message, 500);
  }
};

/**
 * Endpoint consumido por MS-Membresías para sincronizar el estado de la membresía del socio
 * (activación, renovación, congelamiento, vencimiento o cancelación).
 * PUT /api/v1/interno/clientes/:id/membresia
 */
const sincronizarMembresia = async (req, res) => {
  try {
    const { clienteId } = req.params; // Puede ser cliente_id, usuario_id (UUID) o numero_socio
    const { estado_membresia, plan_nombre, motivo } = req.body;
    const pool = getPool();

    const estadosValidos = ['ACTIVA', 'PENDIENTE', 'VENCIDA', 'CANCELADA', 'CONGELADA', 'SUSPENDIDA'];
    const estado = estadosValidos.includes(estado_membresia?.toUpperCase()) 
      ? estado_membresia.toUpperCase() 
      : 'ACTIVA';

    const resultado = await pool.request()
      .input('id', sql.VarChar(50), clienteId)
      .input('estado_membresia', sql.VarChar(30), estado)
      .query(`
        UPDATE c SET
          c.estado_membresia = @estado_membresia,
          c.updated_at = GETDATE()
        OUTPUT INSERTED.cliente_id, INSERTED.numero_socio, INSERTED.estado_membresia,
               u.nombre, u.apellido, u.email
        FROM Clientes c
        INNER JOIN Usuarios u ON c.usuario_id = u.usuario_id
        WHERE c.cliente_id = TRY_CAST(@id AS INT)
           OR c.usuario_id = TRY_CAST(@id AS UNIQUEIDENTIFIER)
           OR c.numero_socio = @id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Socio no encontrado para sincronizar estado de membresía', 404);
    }

    const reg = resultado.recordset[0];

    return responseHelper.success(res, {
      cliente_id: reg.cliente_id,
      numero_socio: reg.numero_socio,
      socio: `${reg.nombre} ${reg.apellido}`,
      nuevo_estado_membresia: reg.estado_membresia,
      plan: plan_nombre || 'Membresía SmartGym',
      motivo: motivo || 'Sincronización inter-microservicios exitosa',
      sincronizado_en: new Date().toISOString()
    }, 'Estado de membresía sincronizado con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error al sincronizar membresía: ' + error.message, 500);
  }
};

/**
 * Health check para monitoreo y orquestación (Docker / Kubernetes)
 */
const healthCheck = async (req, res) => {
  try {
    const pool = getPool();
    const dbTest = await pool.request().query('SELECT 1 AS ok');
    const dbStatus = dbTest.recordset[0].ok === 1 ? 'CONNECTED' : 'DEGRADED';

    return res.status(200).json({
      status: 'UP',
      servicio: 'MS-Usuarios',
      version: '2.0.0',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'DOWN',
      servicio: 'MS-Usuarios',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  perfilPublico,
  verificarExistencia,
  sincronizarMembresia,
  healthCheck
};
