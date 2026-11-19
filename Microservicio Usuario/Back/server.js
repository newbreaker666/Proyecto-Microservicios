// ============================================================
// SERVIDOR PRINCIPAL: MS-Usuarios (SmartGym)
// Microservicio de Usuarios, Identidad y Salud Deportiva
// Autor: Wiley Fabian Guerra Rios
// Universidad Nacional de Ucayali
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { connectDB } = require('./config/database');
const { limiterGeneral } = require('./middlewares/rateLimitMiddleware');
const responseHelper = require('./utils/responseHelper');

// Controladores y rutas
const { healthCheck } = require('./controllers/internoController');
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const entrenadorRoutes = require('./routes/entrenadorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const internoRoutes = require('./routes/internoRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// 1. Middlewares Globales de Seguridad y Utilidades
// ============================================================

// Helmet: Configuración permisiva para servir el frontend Angular
// desde el mismo servidor (requiere scripts inline y estilos)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS: Permite localhost (desarrollo) y cualquier subdominio ngrok (túnel público)
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:4200',
  'http://localhost:3001',
  /\.ngrok-free\.app$/
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (curl, Postman, mismo servidor)
    if (!origin) return callback(null, true);
    // Verificar contra lista de orígenes permitidos
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) return callback(null, true);
    callback(null, true); // Permisivo para desarrollo/túnel
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'ngrok-skip-browser-warning']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(limiterGeneral);

// ============================================================
// 2. Rutas de Monitoreo y Salud (Health Check)
// ============================================================
app.get('/health', healthCheck);
app.get('/api/v1/health', healthCheck);

// ============================================================
// 3. Montaje de Módulos de la API REST (v1)
// ============================================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/clientes', clienteRoutes);
app.use('/api/v1/entrenador', entrenadorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/interno', internoRoutes);

// ============================================================
// 4. Servir Frontend Angular (build de producción)
//    Permite que un solo túnel ngrok sirva TODO (API + UI)
// ============================================================
const FRONTEND_DIST = path.join(__dirname, '..', 'Front', 'dist', 'smartgym-usuarios-front', 'browser');
app.use(express.static(FRONTEND_DIST));

// Cualquier ruta que NO sea /api/* ni /health se redirige al index.html
// (requerido para el enrutamiento client-side de Angular)
app.get('*', (req, res) => {
  // Si es una ruta de API que no existió, devolver 404 JSON
  if (req.path.startsWith('/api/')) {
    return responseHelper.error(
      res,
      `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      404
    );
  }
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// ============================================================
// 5. Manejador Global de Errores No Capturados (500)
// ============================================================
app.use((err, req, res, next) => {
  console.error('💥 Error inesperado en el servidor:', err);
  return responseHelper.error(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error interno en el servidor'
      : err.message,
    500
  );
});

// ============================================================
// 6. Inicialización de Base de Datos y Arranque del Servidor
// ============================================================
const startServer = async () => {
  try {
    console.log('====================================================');
    console.log('🏋️  SMARTGYM - MICROSERVICIO DE USUARIOS E IDENTIDAD');
    console.log('====================================================');

    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
      console.log(`🩺 Health Check disponible en: http://localhost:${PORT}/health`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🌐 Frontend servido desde: ${FRONTEND_DIST}`);
      console.log('====================================================');
      console.log('💡 Para exponer públicamente con ngrok:');
      console.log(`   ngrok http ${PORT}`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el microservicio:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
