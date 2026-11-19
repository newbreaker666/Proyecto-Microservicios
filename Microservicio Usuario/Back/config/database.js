// ============================================================
// Configuración de conexión a SQL Server
// Microservicio de Usuarios - SmartGym
// ============================================================

const sql = require('mssql');

let pool = null;

/**
 * Parsea la variable DB_SERVER para extraer el servidor y la instancia.
 * Ejemplo: 'localhost\\SQLEXPRESS' → server: 'localhost', instanceName: 'SQLEXPRESS'
 */
const parsearServidor = () => {
  const dbServer = process.env.DB_SERVER || '127.0.0.1';
  const partes = dbServer.split('\\');
  return {
    servidor: partes[0] === 'localhost' ? '127.0.0.1' : partes[0],
    instancia: partes[1] || undefined
  };
};

/**
 * Configuración de conexión a la base de datos
 */
const obtenerConfig = () => {
  const { servidor, instancia } = parsearServidor();

  const cfg = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '1234567',
    server: servidor,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME || 'BBDD_SmartGym_Usuarios',
    options: {
      encrypt: false,
      trustServerCertificate: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  if (instancia && !process.env.DB_PORT) {
    cfg.options.instanceName = instancia;
  }

  return cfg;
};

/**
 * Conecta a la base de datos y retorna el pool de conexiones.
 * @returns {Promise<sql.ConnectionPool>} Pool de conexiones activo
 */
const connectDB = async () => {
  try {
    if (pool) {
      return pool;
    }

    const config = obtenerConfig();
    console.log(`🔌 Conectando a SQL Server: ${config.server}\\${config.options.instanceName}`);
    console.log(`📦 Base de datos: ${config.database}`);

    pool = await new sql.ConnectionPool(config).connect();

    console.log('✅ Conexión a SQL Server establecida exitosamente');

    // Manejar errores de conexión del pool
    pool.on('error', (err) => {
      console.error('❌ Error en el pool de conexiones de SQL Server:', err.message);
      pool = null;
    });

    return pool;
  } catch (error) {
    console.error('❌ Error al conectar a SQL Server:', error.message);
    pool = null;
    throw error;
  }
};

/**
 * Obtiene el pool de conexiones activo.
 * @returns {sql.ConnectionPool} Pool de conexiones
 * @throws {Error} Si no hay conexión establecida
 */
const getPool = () => {
  if (!pool) {
    throw new Error('No hay conexión a la base de datos. Ejecute connectDB() primero.');
  }
  return pool;
};

module.exports = {
  connectDB,
  getPool,
  sql
};
