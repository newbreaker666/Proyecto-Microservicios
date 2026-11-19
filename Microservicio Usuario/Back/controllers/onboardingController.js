// ============================================================
// Controlador de Onboarding Digital del Cliente
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
  calcularMacronutrientes,
  evaluarRiesgoPARQ,
  generarNumeroSocio
} = require('../utils/calculosBiometricos');

/**
 * Paso 1: Completar perfil biométrico inicial
 */
const completarPerfilBiometrico = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const {
      dni,
      fecha_nacimiento,
      sexo,
      telefono,
      direccion,
      contacto_emergencia,
      telefono_emergencia,
      peso,
      talla,
      objetivo_fitness,
      nivel_experiencia,
      factor_actividad
    } = req.body;

    const pool = getPool();

    // 1. Verificar si ya tiene perfil de cliente
    const clienteExistente = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT cliente_id FROM Clientes WHERE usuario_id = @usuario_id');

    if (clienteExistente.recordset.length > 0) {
      return responseHelper.error(res, 'El usuario ya completó su perfil biométrico previamente', 409);
    }

    // 2. Verificar DNI único
    const dniExistente = await pool.request()
      .input('dni', sql.VarChar(8), dni)
      .query('SELECT cliente_id FROM Clientes WHERE dni = @dni');

    if (dniExistente.recordset.length > 0) {
      return responseHelper.error(res, 'El DNI ingresado ya pertenece a otro cliente', 409);
    }

    // 3. Cálculos automáticos de salud y biometría
    const edad = calcularEdad(fecha_nacimiento);
    const pesoNum = parseFloat(peso);
    const tallaNum = parseFloat(talla);
    const factorAct = factor_actividad || 'MODERADO';

    const imc = calcularIMC(pesoNum, tallaNum);
    const clasificacionIMC = clasificarIMC(imc);
    const tmb = calcularTMB(pesoNum, tallaNum, edad, sexo);
    const tdee = calcularTDEE(tmb, factorAct);
    const macros = calcularMacronutrientes(tdee, objetivo_fitness);
    const numeroSocio = generarNumeroSocio();

    // 4. Insertar cliente
    const insertCliente = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .input('dni', sql.VarChar(8), dni)
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento)
      .input('sexo', sql.Char(1), sexo)
      .input('telefono', sql.VarChar(15), telefono || null)
      .input('direccion', sql.VarChar(300), direccion || null)
      .input('contacto_emergencia', sql.VarChar(150), contacto_emergencia || null)
      .input('telefono_emergencia', sql.VarChar(15), telefono_emergencia || null)
      .input('peso_actual', sql.Decimal(5, 2), pesoNum)
      .input('talla_actual', sql.Decimal(5, 2), tallaNum)
      .input('imc_actual', sql.Decimal(5, 2), imc)
      .input('tmb_actual', sql.Decimal(7, 2), tmb)
      .input('tdee_actual', sql.Decimal(7, 2), tdee)
      .input('objetivo_fitness', sql.VarChar(30), objetivo_fitness)
      .input('nivel_experiencia', sql.VarChar(20), nivel_experiencia || 'PRINCIPIANTE')
      .input('factor_actividad', sql.VarChar(20), factorAct)
      .input('numero_socio', sql.VarChar(20), numeroSocio)
      .query(`
        INSERT INTO Clientes (
          usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion,
          contacto_emergencia, telefono_emergencia, peso_actual, talla_actual,
          imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia,
          factor_actividad, numero_socio
        )
        OUTPUT INSERTED.cliente_id
        VALUES (
          @usuario_id, @dni, @fecha_nacimiento, @sexo, @telefono, @direccion,
          @contacto_emergencia, @telefono_emergencia, @peso_actual, @talla_actual,
          @imc_actual, @tmb_actual, @tdee_actual, @objetivo_fitness, @nivel_experiencia,
          @factor_actividad, @numero_socio
        )
      `);

    const clienteId = insertCliente.recordset[0].cliente_id;

    // 5. Registrar primera medición en el historial
    await pool.request()
      .input('cliente_id', sql.Int, clienteId)
      .input('peso', sql.Decimal(5, 2), pesoNum)
      .input('talla', sql.Decimal(5, 2), tallaNum)
      .input('imc', sql.Decimal(5, 2), imc)
      .input('tmb', sql.Decimal(7, 2), tmb)
      .input('registrado_por', sql.VarChar(100), 'SELF')
      .input('notas', sql.VarChar(500), 'Evaluación biométrica inicial en auto-registro web')
      .query(`
        INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, registrado_por, notas)
        VALUES (@cliente_id, @peso, @talla, @imc, @tmb, @registrado_por, @notas)
      `);

    return responseHelper.success(res, {
      cliente_id: clienteId,
      numero_socio: numeroSocio,
      edad,
      peso: pesoNum,
      talla: tallaNum,
      imc,
      clasificacion_imc: clasificacionIMC,
      tmb,
      tdee,
      macronutrientes_sugeridos: macros,
      objetivo_fitness
    }, 'Perfil biométrico registrado exitosamente', 201);
  } catch (error) {
    console.error('❌ Error en completarPerfilBiometrico:', error);
    return responseHelper.error(res, 'Error al registrar perfil biométrico: ' + error.message, 500);
  }
};

/**
 * Paso 2: Ficha Médica y Cuestionario PAR-Q
 */
const completarFichaMedica = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    // Obtener cliente_id
    const clienteRes = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT cliente_id FROM Clientes WHERE usuario_id = @usuario_id');

    if (clienteRes.recordset.length === 0) {
      return responseHelper.error(res, 'Debe completar primero su perfil biométrico básico', 400);
    }

    const clienteId = clienteRes.recordset[0].cliente_id;
    const {
      p1_cardiopatia,
      p2_dolor_pecho_actividad,
      p3_dolor_pecho_reposo,
      p4_mareos,
      p5_problemas_oseos,
      p6_medicacion,
      p7_otra_razon,
      tipo_sangre,
      alergias,
      lesiones_previas,
      notas_medicas
    } = req.body;

    // Evaluar nivel de riesgo con el estándar PAR-Q
    const respuestas = {
      p1_cardiopatia,
      p2_dolor_pecho_actividad,
      p3_dolor_pecho_reposo,
      p4_mareos,
      p5_problemas_oseos,
      p6_medicacion,
      p7_otra_razon
    };
    const nivelRiesgo = evaluarRiesgoPARQ(respuestas);

    // Upsert ficha médica
    await pool.request()
      .input('cliente_id', sql.Int, clienteId)
      .input('p1', sql.Bit, p1_cardiopatia ? 1 : 0)
      .input('p2', sql.Bit, p2_dolor_pecho_actividad ? 1 : 0)
      .input('p3', sql.Bit, p3_dolor_pecho_reposo ? 1 : 0)
      .input('p4', sql.Bit, p4_mareos ? 1 : 0)
      .input('p5', sql.Bit, p5_problemas_oseos ? 1 : 0)
      .input('p6', sql.Bit, p6_medicacion ? 1 : 0)
      .input('p7', sql.Bit, p7_otra_razon ? 1 : 0)
      .input('nivel_riesgo', sql.VarChar(30), nivelRiesgo)
      .input('tipo_sangre', sql.VarChar(5), tipo_sangre || null)
      .input('alergias', sql.VarChar(300), alergias || null)
      .input('lesiones_previas', sql.VarChar(500), lesiones_previas || null)
      .input('notas_medicas', sql.Text, notas_medicas || null)
      .query(`
        IF EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @cliente_id)
        BEGIN
          UPDATE FichaMedicaPARQ SET
            p1_cardiopatia = @p1, p2_dolor_pecho_actividad = @p2, p3_dolor_pecho_reposo = @p3,
            p4_mareos = @p4, p5_problemas_oseos = @p5, p6_medicacion = @p6, p7_otra_razon = @p7,
            nivel_riesgo = @nivel_riesgo, tipo_sangre = @tipo_sangre, alergias = @alergias,
            lesiones_previas = @lesiones_previas, notas_medicas = @notas_medicas,
            updated_at = GETDATE()
          WHERE cliente_id = @cliente_id
        END
        ELSE
        BEGIN
          INSERT INTO FichaMedicaPARQ (
            cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo,
            p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo,
            tipo_sangre, alergias, lesiones_previas, notas_medicas
          )
          VALUES (
            @cliente_id, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @nivel_riesgo,
            @tipo_sangre, @alergias, @lesiones_previas, @notas_medicas
          )
        END
      `);

    return responseHelper.success(res, {
      cliente_id: clienteId,
      nivel_riesgo: nivelRiesgo,
      observacion: nivelRiesgo === 'REQUIERE_EVALUACION'
        ? 'Alerta: Su cuestionario presenta condiciones que requieren autorización médica antes de ejercicio extenuante.'
        : 'Cuestionario de salud procesado exitosamente.'
    }, 'Ficha médica PAR-Q guardada', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al guardar ficha médica: ' + error.message, 500);
  }
};

/**
 * Paso 3: Preferencias deportivas y disponibilidad
 */
const completarPreferencias = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const clienteRes = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT cliente_id FROM Clientes WHERE usuario_id = @usuario_id');

    if (clienteRes.recordset.length === 0) {
      return responseHelper.error(res, 'Debe completar primero su perfil biométrico básico', 400);
    }

    const clienteId = clienteRes.recordset[0].cliente_id;
    const { disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa } = req.body;

    await pool.request()
      .input('cliente_id', sql.Int, clienteId)
      .input('disciplinas', sql.VarChar(500), Array.isArray(disciplinas) ? disciplinas.join(',') : disciplinas)
      .input('horario_preferido', sql.VarChar(20), horario_preferido)
      .input('dias_semana', sql.VarChar(100), Array.isArray(dias_semana) ? dias_semana.join(',') : dias_semana)
      .input('frecuencia_semanal', sql.Int, parseInt(frecuencia_semanal, 10) || 3)
      .input('experiencia_previa', sql.Text, experiencia_previa || null)
      .query(`
        IF EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @cliente_id)
        BEGIN
          UPDATE PreferenciasDeportivas SET
            disciplinas = @disciplinas, horario_preferido = @horario_preferido,
            dias_semana = @dias_semana, frecuencia_semanal = @frecuencia_semanal,
            experiencia_previa = @experiencia_previa, updated_at = GETDATE()
          WHERE cliente_id = @cliente_id
        END
        ELSE
        BEGIN
          INSERT INTO PreferenciasDeportivas (
            cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa
          )
          VALUES (@cliente_id, @disciplinas, @horario_preferido, @dias_semana, @frecuencia_semanal, @experiencia_previa)
        END
      `);

    return responseHelper.success(res, {
      cliente_id: clienteId,
      disciplinas,
      horario_preferido,
      dias_semana,
      frecuencia_semanal
    }, 'Preferencias deportivas guardadas con éxito', 201);
  } catch (error) {
    return responseHelper.error(res, 'Error al guardar preferencias: ' + error.message, 500);
  }
};

/**
 * Estado general del proceso de Onboarding
 */
const statusOnboarding = async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const pool = getPool();

    const resultado = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query(`
        SELECT c.cliente_id, c.numero_socio,
               CASE WHEN f.ficha_id IS NOT NULL THEN 1 ELSE 0 END AS tiene_ficha,
               CASE WHEN p.preferencia_id IS NOT NULL THEN 1 ELSE 0 END AS tiene_preferencias
        FROM Clientes c
        LEFT JOIN FichaMedicaPARQ f ON c.cliente_id = f.cliente_id
        LEFT JOIN PreferenciasDeportivas p ON c.cliente_id = p.cliente_id
        WHERE c.usuario_id = @usuario_id
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.success(res, {
        perfil_biometrico: false,
        ficha_medica: false,
        preferencias: false,
        completado: false
      }, 'Onboarding pendiente');
    }

    const row = resultado.recordset[0];
    const tienePerfil = true;
    const tieneFicha = !!row.tiene_ficha;
    const tienePreferencias = !!row.tiene_preferencias;
    const completado = tienePerfil && tieneFicha && tienePreferencias;

    return responseHelper.success(res, {
      cliente_id: row.cliente_id,
      numero_socio: row.numero_socio,
      perfil_biometrico: tienePerfil,
      ficha_medica: tieneFicha,
      preferencias: tienePreferencias,
      completado
    }, 'Estado del onboarding obtenido');
  } catch (error) {
    return responseHelper.error(res, 'Error al consultar estado de onboarding: ' + error.message, 500);
  }
};

module.exports = {
  completarPerfilBiometrico,
  completarFichaMedica,
  completarPreferencias,
  statusOnboarding
};
