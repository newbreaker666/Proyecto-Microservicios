// ============================================================
// Controlador de Autenticación e Identidad
// Microservicio de Usuarios - SmartGym
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const responseHelper = require('../utils/responseHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'smartgym_jwt_secret_key_2026_ultra_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) || 7;

/**
 * Registro de un nuevo socio/cliente (Self-Service)
 */
const registrar = async (req, res) => {
  try {
    const { email, password, nombre, apellido } = req.body;
    const pool = getPool();

    // 1. Verificar si el email ya existe
    const existe = await pool.request()
      .input('email', sql.VarChar(150), email.toLowerCase().trim())
      .query('SELECT usuario_id FROM Usuarios WHERE email = @email');

    if (existe.recordset.length > 0) {
      return responseHelper.error(res, 'El correo electrónico ya se encuentra registrado', 409);
    }

    // 2. Hash de contraseña y generación de ID
    const passwordHash = await bcrypt.hash(password, 10);
    const usuarioId = uuidv4();

    // 3. Insertar usuario con rol CLIENTE (rol_id = 3)
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuarioId)
      .input('email', sql.VarChar(150), email.toLowerCase().trim())
      .input('password_hash', sql.VarChar(255), passwordHash)
      .input('nombre', sql.VarChar(100), nombre.trim())
      .input('apellido', sql.VarChar(100), apellido.trim())
      .input('rol_id', sql.Int, 3) // 3 = CLIENTE
      .query(`
        INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
        VALUES (@usuario_id, @email, @password_hash, @nombre, @apellido, @rol_id, 1, 0)
      `);

    // 4. Generar JWT y Refresh Token
    const payload = {
      usuario_id: usuarioId,
      email: email.toLowerCase().trim(),
      rol: 'CLIENTE',
      rol_id: 3
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const refreshToken = uuidv4();
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + REFRESH_DAYS);

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuarioId)
      .input('refresh_token_hash', sql.VarChar(255), refreshToken)
      .input('ip_address', sql.VarChar(45), ip.substring(0, 45))
      .input('user_agent', sql.VarChar(500), userAgent.substring(0, 500))
      .input('dispositivo', sql.VarChar(100), 'Navegador Web')
      .input('expira_en', sql.DateTime, expiraEn)
      .query(`
        INSERT INTO SesionesActivas (usuario_id, refresh_token_hash, ip_address, user_agent, dispositivo, expira_en, activa)
        VALUES (@usuario_id, @refresh_token_hash, @ip_address, @user_agent, @dispositivo, @expira_en, 1)
      `);

    return responseHelper.success(res, {
      token,
      refreshToken,
      usuario: {
        usuario_id: usuarioId,
        email: email.toLowerCase().trim(),
        nombre,
        apellido,
        rol: 'CLIENTE',
        onboarding_completado: false
      }
    }, 'Usuario registrado con éxito. Bienvenido a SmartGym.', 201);
  } catch (error) {
    console.error('❌ Error en registrar:', error);
    return responseHelper.error(res, 'Error al procesar el registro: ' + error.message, 500);
  }
};

/**
 * Inicio de sesión
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = getPool();

    // 1. Buscar usuario y su rol
    const resultado = await pool.request()
      .input('email', sql.VarChar(150), email.toLowerCase().trim())
      .query(`
        SELECT u.usuario_id, u.email, u.password_hash, u.nombre, u.apellido, u.activo, u.rol_id,
               r.nombre AS rol_nombre,
               c.cliente_id, c.numero_socio, c.objetivo_fitness
        FROM Usuarios u
        INNER JOIN Roles r ON u.rol_id = r.rol_id
        LEFT JOIN Clientes c ON u.usuario_id = c.usuario_id
        WHERE u.email = @email
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Credenciales incorrectas: Correo o contraseña no válidos', 401);
    }

    const user = resultado.recordset[0];

    if (!user.activo) {
      return responseHelper.error(res, 'Su cuenta ha sido desactivada. Comuníquese con la administración.', 403);
    }

    // 2. Comparar contraseña
    const esValida = await bcrypt.compare(password, user.password_hash);
    if (!esValida) {
      return responseHelper.error(res, 'Credenciales incorrectas: Correo o contraseña no válidos', 401);
    }

    // 3. Actualizar último login
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, user.usuario_id)
      .query('UPDATE Usuarios SET ultimo_login = GETDATE() WHERE usuario_id = @usuario_id');

    // 4. Generar JWT y Refresh Token
    const payload = {
      usuario_id: user.usuario_id,
      email: user.email,
      rol: user.rol_nombre,
      rol_id: user.rol_id
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const refreshToken = uuidv4();
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + REFRESH_DAYS);

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, user.usuario_id)
      .input('refresh_token_hash', sql.VarChar(255), refreshToken)
      .input('ip_address', sql.VarChar(45), ip.substring(0, 45))
      .input('user_agent', sql.VarChar(500), userAgent.substring(0, 500))
      .input('dispositivo', sql.VarChar(100), 'Navegador Web')
      .input('expira_en', sql.DateTime, expiraEn)
      .query(`
        INSERT INTO SesionesActivas (usuario_id, refresh_token_hash, ip_address, user_agent, dispositivo, expira_en, activa)
        VALUES (@usuario_id, @refresh_token_hash, @ip_address, @user_agent, @dispositivo, @expira_en, 1)
      `);

    return responseHelper.success(res, {
      token,
      refreshToken,
      usuario: {
        usuario_id: user.usuario_id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol_nombre,
        cliente_id: user.cliente_id || null,
        numero_socio: user.numero_socio || null,
        objetivo_fitness: user.objetivo_fitness || null,
        onboarding_completado: !!user.cliente_id
      }
    }, 'Inicio de sesión exitoso');
  } catch (error) {
    console.error('❌ Error en login:', error);
    return responseHelper.error(res, 'Error al autenticar: ' + error.message, 500);
  }
};

/**
 * Renovar token de acceso usando refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: tokenEntrante } = req.body;
    if (!tokenEntrante) {
      return responseHelper.error(res, 'El refreshToken es obligatorio', 400);
    }

    const pool = getPool();
    const resultado = await pool.request()
      .input('token', sql.VarChar(255), tokenEntrante)
      .query(`
        SELECT s.sesion_id, s.usuario_id, s.expira_en, s.activa,
               u.email, u.activo, r.nombre AS rol_nombre, u.rol_id
        FROM SesionesActivas s
        INNER JOIN Usuarios u ON s.usuario_id = u.usuario_id
        INNER JOIN Roles r ON u.rol_id = r.rol_id
        WHERE s.refresh_token_hash = @token
      `);

    if (resultado.recordset.length === 0) {
      return responseHelper.error(res, 'Sesión no válida o expirada', 401);
    }

    const sesion = resultado.recordset[0];

    if (!sesion.activa || new Date() > new Date(sesion.expira_en) || !sesion.activo) {
      return responseHelper.error(res, 'La sesión ha expirado o fue revocada', 401);
    }

    // Actualizar última actividad
    await pool.request()
      .input('sesion_id', sql.Int, sesion.sesion_id)
      .query('UPDATE SesionesActivas SET last_activity = GETDATE() WHERE sesion_id = @sesion_id');

    const payload = {
      usuario_id: sesion.usuario_id,
      email: sesion.email,
      rol: sesion.rol_nombre,
      rol_id: sesion.rol_id
    };
    const nuevoToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return responseHelper.success(res, { token: nuevoToken }, 'Token renovado con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error al renovar sesión: ' + error.message, 500);
  }
};

/**
 * Cambio de contraseña del usuario autenticado
 */
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const { usuario_id } = req.usuario;

    if (!passwordActual || !passwordNueva) {
      return responseHelper.error(res, 'Debe ingresar la contraseña actual y la nueva contraseña', 400);
    }

    if (passwordNueva.length < 8) {
      return responseHelper.error(res, 'La nueva contraseña debe tener mínimo 8 caracteres', 400);
    }

    const pool = getPool();
    const resUser = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .query('SELECT password_hash FROM Usuarios WHERE usuario_id = @usuario_id');

    if (resUser.recordset.length === 0) {
      return responseHelper.error(res, 'Usuario no encontrado', 404);
    }

    const coincide = await bcrypt.compare(passwordActual, resUser.recordset[0].password_hash);
    if (!coincide) {
      return responseHelper.error(res, 'La contraseña actual ingresada es incorrecta', 400);
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .input('password_hash', sql.VarChar(255), nuevoHash)
      .query('UPDATE Usuarios SET password_hash = @password_hash, updated_at = GETDATE() WHERE usuario_id = @usuario_id');

    return responseHelper.success(res, null, 'Contraseña actualizada con éxito');
  } catch (error) {
    return responseHelper.error(res, 'Error al cambiar contraseña: ' + error.message, 500);
  }
};

/**
 * Validar token JWT (Endpoint de verificación)
 */
const validarToken = async (req, res) => {
  return responseHelper.success(res, {
    valid: true,
    usuario: req.usuario
  }, 'Token válido');
};

module.exports = {
  registrar,
  login,
  refreshToken,
  cambiarPassword,
  validarToken
};
