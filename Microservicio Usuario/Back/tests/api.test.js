// ============================================================
// Pruebas de Integración End-to-End: MS-Usuarios
// ============================================================

const request = require('supertest');
const app = require('../server');
const { getPool } = require('../config/database');

describe('MS-Usuarios API Suite', () => {
  let tokenAdmin = '';
  let tokenCliente = '';
  let nuevoToken = '';
  let nuevoUsuarioId = '';

  test('1. GET /health - Monitoreo y estado del microservicio', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.servicio).toBe('MS-Usuarios');
    expect(res.body.database).toBe('CONNECTED');
  });

  test('2. POST /api/v1/auth/login - Login exitoso de Administrador', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@smartgym.pe',
        password: 'Admin123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.usuario.rol).toBe('ADMIN');
    tokenAdmin = res.body.data.token;
  });

  test('3. POST /api/v1/auth/login - Login exitoso de Cliente con perfil', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'cliente1@smartgym.pe',
        password: 'Cliente123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.usuario.rol).toBe('CLIENTE');
    expect(res.body.data.usuario.numero_socio).toBe('SMART-2026-0001');
    tokenCliente = res.body.data.token;
  });

  test('4. POST /api/v1/auth/register - Auto-registro de nuevo cliente (High Concurrency capability)', async () => {
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `nuevo.socio.${timestamp}@correo.com`,
        password: 'Password123!',
        nombre: 'Mateo',
        apellido: 'Silva'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    nuevoToken = res.body.data.token;
    nuevoUsuarioId = res.body.data.usuario.usuario_id;
  });

  test('5. POST /api/v1/onboarding/perfil-biometrico - Completar perfil y cálculos automáticos (IMC, TMB, TDEE)', async () => {
    const dniRandom = String(Math.floor(10000000 + Math.random() * 90000000));
    const res = await request(app)
      .post('/api/v1/onboarding/perfil-biometrico')
      .set('Authorization', `Bearer ${nuevoToken}`)
      .send({
        dni: dniRandom,
        fecha_nacimiento: '1996-05-12',
        sexo: 'M',
        telefono: '961000111',
        peso: 82.5,
        talla: 176,
        objetivo_fitness: 'PERDER_PESO',
        nivel_experiencia: 'INTERMEDIO',
        factor_actividad: 'ACTIVO'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imc).toBe(26.63);
    expect(res.body.data.clasificacion_imc).toBe('SOBREPESO');
    expect(res.body.data.tmb).toBeGreaterThan(1500);
    expect(res.body.data.tdee).toBeGreaterThan(2000);
    expect(res.body.data.macronutrientes_sugeridos).toBeDefined();
    expect(res.body.data.numero_socio).toMatch(/^SMART-2026-/);
  });

  test('6. GET /api/v1/clientes/mi-perfil - Cliente consulta su expediente y macros', async () => {
    const res = await request(app)
      .get('/api/v1/clientes/mi-perfil')
      .set('Authorization', `Bearer ${tokenCliente}`);

    expect(res.status).toBe(200);
    expect(res.body.data.dni).toBe('72345601');
    expect(res.body.data.clasificacion_imc).toBe('NORMAL');
    expect(res.body.data.macronutrientes_sugeridos.proteinas_g).toBeGreaterThan(0);
  });

  test('7. GET /api/v1/clientes/mi-carnet - Carnet digital con código QR de acceso', async () => {
    const res = await request(app)
      .get('/api/v1/clientes/mi-carnet')
      .set('Authorization', `Bearer ${tokenCliente}`);

    expect(res.status).toBe(200);
    expect(res.body.data.numero_socio).toBe('SMART-2026-0001');
    expect(res.body.data.qr_code_data).toBeDefined();
  });

  test('8. GET /api/v1/admin/estadisticas - Métricas globales del microservicio', async () => {
    const res = await request(app)
      .get('/api/v1/admin/estadisticas')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metricas_globales.total_usuarios).toBeGreaterThan(5);
    expect(res.body.data.distribucion_objetivos.length).toBeGreaterThan(0);
  });

  test('9. GET /api/v1/interno/usuarios/:id/perfil - Llamada Inter-Servicio con X-API-Key', async () => {
    const res = await request(app)
      .get(`/api/v1/interno/usuarios/C0000001-0000-0000-0000-000000000001/perfil`)
      .set('X-API-Key', 'smartgym_api_key_2026_interservice');

    expect(res.status).toBe(200);
    expect(res.body.data.objetivo_fitness).toBe('PERDER_PESO');
    expect(res.body.data.imc).toBe(24.61);
  });
});
