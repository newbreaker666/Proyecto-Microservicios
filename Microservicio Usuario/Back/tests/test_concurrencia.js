// ============================================================
// TEST DE ALTA CONCURRENCIA: MS-Usuarios (SmartGym)
// Demostración de escalabilidad y registro masivo simultáneo
// ============================================================

const http = require('http');

const TOTAL_CLIENTES = 50;
const BASE_URL = 'http://localhost:3001/api/v1/auth/register';

const registrarCliente = (index) => {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      email: `concurrente_${index}_${timestamp}@gymtest.pe`,
      password: 'Password123!',
      nombre: `Usuario${index}`,
      apellido: `Test${index}`
    });

    const url = new URL(BASE_URL);
    const start = Date.now();

    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const duration = Date.now() - start;
          resolve({
            index,
            status: res.statusCode,
            duration,
            success: res.statusCode === 201
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        index,
        status: 500,
        duration: Date.now() - start,
        success: false,
        error: err.message
      });
    });

    req.write(payload);
    req.end();
  });
};

const runConcurrencyTest = async () => {
  console.log('===========================================================');
  console.log(`🚀 INICIANDO TEST DE CONCURRENCIA: ${TOTAL_CLIENTES} CLIENTES SIMULTÁNEOS`);
  console.log('===========================================================');
  console.log('Simulando pico de alta demanda (Campaña publicitaria / Apertura)');
  console.log('Disparando peticiones en paralelo con Promise.all()...\n');

  const inicioTotal = Date.now();
  const promesas = [];

  for (let i = 1; i <= TOTAL_CLIENTES; i++) {
    promesas.push(registrarCliente(i));
  }

  const resultados = await Promise.all(promesas);
  const finTotal = Date.now();
  const tiempoTotalMs = finTotal - inicioTotal;

  const exitosos = resultados.filter((r) => r.success).length;
  const fallidos = resultados.filter((r) => !r.success).length;
  const tiempoPromedio = (resultados.reduce((acc, r) => acc + r.duration, 0) / resultados.length).toFixed(1);
  const reqPerSec = ((TOTAL_CLIENTES / tiempoTotalMs) * 1000).toFixed(1);

  console.log('===========================================================');
  console.log('📊 RESULTADOS DEL TEST DE CONCURRENCIA:');
  console.log('===========================================================');
  console.log(`  • Peticiones totales disparadas: ${TOTAL_CLIENTES}`);
  console.log(`  • Registros exitosos (HTTP 201):  ${exitosos} ✅`);
  console.log(`  • Registros fallidos:             ${fallidos} ${fallidos > 0 ? '❌' : '✅'}`);
  console.log(`  • Tiempo total de ejecución:      ${tiempoTotalMs} ms`);
  console.log(`  • Latencia promedio por cliente:  ${tiempoPromedio} ms`);
  console.log(`  • Rendimiento (Throughput):       ${reqPerSec} peticiones/segundo`);
  console.log('===========================================================');

  if (fallidos === 0) {
    console.log('🏆 ¡PRUEBA DE ALTA DEMANDA SUPERADA SIN COLISIONES NI ERRORES!');
  } else {
    console.log('⚠️ Hubo peticiones no completadas.');
  }
};

runConcurrencyTest();
