// ============================================================
// SUITE DE PRUEBAS DE INTEGRACIÓN: MS-Usuarios
// Microservicio de Usuarios e Identidad (SmartGym)
// ============================================================

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const API_KEY = 'smartgym_api_key_2026_interservice';

let tokenAdmin = '';
let tokenCliente = '';
let nuevoToken = '';
let nuevoUsuarioId = '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const request = async (method, path, body = null, headers = {}) => {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(
      url,
      {
        method,
        headers: defaultHeaders
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const assert = (condition, description) => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASÓ: ${description}`);
  } else {
    failedTests++;
    console.error(`  ❌ FALLÓ: ${description}`);
  }
};

const runAllTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS: MS-USUARIOS (SMARTGYM)');
  console.log('======================================================\n');

  try {
    // 1. Health Check
    console.log('🔹 1. Monitoreo y Salud del Microservicio:');
    const resHealth = await request('GET', '/health');
    assert(resHealth.status === 200, 'GET /health retorna código HTTP 200');
    assert(resHealth.body.status === 'UP', 'Status del microservicio es UP');
    assert(resHealth.body.database === 'CONNECTED', 'Conexión a base de datos CONNECTED');
    assert(resHealth.body.servicio === 'MS-Usuarios', 'Identificador de servicio correcto');

    // 2. Login Admin
    console.log('\n🔹 2. Autenticación de Administrador:');
    const resLoginAdmin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@smartgym.pe',
      password: 'Admin123!'
    });
    assert(resLoginAdmin.status === 200, 'POST /auth/login retorna HTTP 200');
    assert(resLoginAdmin.body.data.token != null, 'Emisión de token JWT exitosa');
    assert(resLoginAdmin.body.data.usuario.rol === 'ADMIN', 'Rol identificado: ADMIN');
    tokenAdmin = resLoginAdmin.body.data.token;

    // 3. Login Cliente
    console.log('\n🔹 3. Autenticación de Socio / Cliente:');
    const resLoginCli = await request('POST', '/api/v1/auth/login', {
      email: 'cliente1@smartgym.pe',
      password: 'Cliente123!'
    });
    assert(resLoginCli.status === 200, 'Login de cliente retorna HTTP 200');
    assert(resLoginCli.body.data.usuario.numero_socio === 'SMART-2026-0001', 'Número de socio verificado');
    tokenCliente = resLoginCli.body.data.token;

    // 4. Auto-registro de nuevo cliente (Digital Onboarding)
    console.log('\n🔹 4. Auto-Registro de Nuevo Cliente (Self-Service):');
    const ts = Date.now();
    const resReg = await request('POST', '/api/v1/auth/register', {
      email: `socio.demo.${ts}@smartgym.pe`,
      password: 'Password123!',
      nombre: 'David',
      apellido: 'Paredes'
    });
    assert(resReg.status === 201, 'POST /auth/register retorna HTTP 201');
    assert(resReg.body.data.token != null, 'Token JWT emitido para nueva cuenta');
    nuevoToken = resReg.body.data.token;
    nuevoUsuarioId = resReg.body.data.usuario.usuario_id;

    // 5. Onboarding biométrico inteligente
    console.log('\n🔹 5. Onboarding Biométrico y Cálculos Científicos (IMC, TMB, TDEE, Macros):');
    const dniRnd = String(Math.floor(10000000 + Math.random() * 89999999));
    const resBio = await request('POST', '/api/v1/onboarding/perfil-biometrico', {
      dni: dniRnd,
      fecha_nacimiento: '1995-04-10',
      sexo: 'M',
      telefono: '961888777',
      peso: 80.0,
      talla: 175,
      objetivo_fitness: 'GANAR_MUSCULO',
      nivel_experiencia: 'INTERMEDIO',
      factor_actividad: 'ACTIVO'
    }, { Authorization: `Bearer ${nuevoToken}` });

    assert(resBio.status === 201, 'POST /onboarding/perfil-biometrico retorna HTTP 201');
    assert(resBio.body.data.imc === 26.12, `IMC calculado correctamente: ${resBio.body.data?.imc}`);
    assert(resBio.body.data.clasificacion_imc === 'SOBREPESO', 'Clasificación de IMC asignada');
    assert(resBio.body.data.tmb > 1700, 'TMB calculada con Harris-Benedict');
    assert(resBio.body.data.tdee > 2500, 'TDEE calculado con factor de actividad');
    assert(resBio.body.data.macronutrientes_sugeridos.proteinas_g > 0, 'Distribución de macronutrientes generada');
    assert(resBio.body.data.numero_socio.startsWith('SMART-2026-'), 'Número de socio generado');

    // 6. Consulta de perfil y expediente propio
    console.log('\n🔹 6. Consulta de Perfil del Cliente Autenticado:');
    const resPerfil = await request('GET', '/api/v1/clientes/mi-perfil', null, {
      Authorization: `Bearer ${tokenCliente}`
    });
    assert(resPerfil.status === 200, 'GET /clientes/mi-perfil retorna HTTP 200');
    assert(resPerfil.body.data.dni === '72345601', 'DNI del cliente verificado');
    assert(resPerfil.body.data.total_mediciones >= 3, 'Historial longitudinal de mediciones presente');

    // 7. Carnet digital y credencial QR
    console.log('\n🔹 7. Carnet Digital y Credencial de Acceso QR:');
    const resCarnet = await request('GET', '/api/v1/clientes/mi-carnet', null, {
      Authorization: `Bearer ${tokenCliente}`
    });
    assert(resCarnet.status === 200, 'GET /clientes/mi-carnet retorna HTTP 200');
    assert(resCarnet.body.data.qr_code_data != null, 'Payload para código QR generado');

    // 8. Panel del Entrenador
    console.log('\n🔹 8. Panel del Entrenador (Seguimiento de Clientes):');
    const resTrainer = await request('POST', '/api/v1/auth/login', {
      email: 'entrenador1@smartgym.pe',
      password: 'Trainer123!'
    });
    const tokenTrainer = resTrainer.body.data.token;

    const resListCli = await request('GET', '/api/v1/entrenador/clientes', null, {
      Authorization: `Bearer ${tokenTrainer}`
    });
    assert(resListCli.status === 200, 'GET /entrenador/clientes retorna HTTP 200');
    assert(resListCli.body.data.length >= 5, 'Lista de clientes con datos biométricos retornada');

    // 9. Dashboard de Estadísticas Admin
    console.log('\n🔹 9. Dashboard de Métricas y Estadísticas de Administración:');
    const resStats = await request('GET', '/api/v1/admin/estadisticas', null, {
      Authorization: `Bearer ${tokenAdmin}`
    });
    assert(resStats.status === 200, 'GET /admin/estadisticas retorna HTTP 200');
    assert(resStats.body.data.metricas_globales.total_usuarios >= 6, 'Total de usuarios contabilizado');
    assert(resStats.body.data.distribucion_objetivos.length > 0, 'Distribución por objetivos generada');

    // 10. Inter-Servicio con API Key (MS-Membresías / MS-Pagos)
    console.log('\n🔹 10. Comunicación Inter-Servicio con X-API-Key:');
    const resInter = await request('GET', `/api/v1/interno/usuarios/C0000001-0000-0000-0000-000000000001/perfil`, null, {
      'X-API-Key': API_KEY
    });
    assert(resInter.status === 200, 'GET /interno/usuarios/:id/perfil retorna HTTP 200');
    assert(resInter.body.data.objetivo_fitness === 'PERDER_PESO', 'Objetivo fitness expuesto a MS-Membresías');
    assert(resInter.body.data.clasificacion_imc === 'NORMAL', 'IMC expuesto correctamente');

  } catch (error) {
    console.error('💥 Error inesperado durante las pruebas:', error);
  } finally {
    console.log('\n======================================================');
    console.log(`📊 RESULTADOS: ${passedTests}/${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
    if (failedTests > 0) {
      console.log(`❌ Pruebas fallidas: ${failedTests}`);
      process.exit(1);
    } else {
      console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('======================================================\n');
      process.exit(0);
    }
  }
};

runAllTests();
