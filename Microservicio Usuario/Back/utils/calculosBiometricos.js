// ============================================================
// Funciones de cálculos biométricos y de salud
// Microservicio de Usuarios - SmartGym
// ============================================================

/**
 * Calcula el Índice de Masa Corporal (IMC).
 * Fórmula: peso / (talla_m)^2
 * @param {number} pesoKg - Peso en kilogramos
 * @param {number} tallaCm - Talla en centímetros
 * @returns {number} IMC redondeado a 2 decimales
 */
const calcularIMC = (pesoKg, tallaCm) => {
  const tallaM = tallaCm / 100;
  const imc = pesoKg / (tallaM * tallaM);
  return parseFloat(imc.toFixed(2));
};

/**
 * Clasifica el IMC según los rangos de la OMS.
 * @param {number} imc - Valor del IMC
 * @returns {string} Clasificación del IMC
 */
const clasificarIMC = (imc) => {
  if (imc < 18.5) return 'BAJO_PESO';
  if (imc < 25) return 'NORMAL';
  if (imc < 30) return 'SOBREPESO';
  if (imc < 35) return 'OBESIDAD_I';
  if (imc < 40) return 'OBESIDAD_II';
  return 'OBESIDAD_III';
};

/**
 * Calcula la Tasa Metabólica Basal (TMB) usando la ecuación de Mifflin-St Jeor.
 * Hombre: 88.362 + (13.397 × peso) + (4.799 × talla_cm) - (5.677 × edad)
 * Mujer: 447.593 + (9.247 × peso) + (3.098 × talla_cm) - (4.330 × edad)
 * @param {number} pesoKg - Peso en kilogramos
 * @param {number} tallaCm - Talla en centímetros
 * @param {number} edadAnios - Edad en años
 * @param {string} sexo - 'M' para masculino, 'F' para femenino
 * @returns {number} TMB redondeada a 2 decimales
 */
const calcularTMB = (pesoKg, tallaCm, edadAnios, sexo) => {
  let tmb;
  if (sexo === 'M') {
    tmb = 88.362 + (13.397 * pesoKg) + (4.799 * tallaCm) - (5.677 * edadAnios);
  } else {
    tmb = 447.593 + (9.247 * pesoKg) + (3.098 * tallaCm) - (4.330 * edadAnios);
  }
  return parseFloat(tmb.toFixed(2));
};

/**
 * Calcula la edad en años a partir de la fecha de nacimiento.
 * @param {string|Date} fechaNacimiento - Fecha de nacimiento
 * @returns {number} Edad en años enteros
 */
const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - nacimiento.getMonth();

  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return edad;
};

/**
 * Factores de actividad física para el cálculo del TDEE.
 */
const FACTORES_ACTIVIDAD = {
  SEDENTARIO: 1.2,
  LIGERO: 1.375,
  MODERADO: 1.55,
  ACTIVO: 1.725,
  MUY_ACTIVO: 1.9
};

/**
 * Calcula el Gasto Energético Total Diario (TDEE).
 * TDEE = TMB × Factor de actividad
 * @param {number} tmb - Tasa Metabólica Basal
 * @param {string} factorActividad - Nivel de actividad (SEDENTARIO, LIGERO, MODERADO, ACTIVO, MUY_ACTIVO)
 * @returns {number} TDEE redondeado a 2 decimales
 */
const calcularTDEE = (tmb, factorActividad) => {
  const factor = FACTORES_ACTIVIDAD[factorActividad] || 1.2;
  const tdee = tmb * factor;
  return parseFloat(tdee.toFixed(2));
};

/**
 * Distribución de macronutrientes según el objetivo fitness.
 */
const DISTRIBUCION_MACROS = {
  PERDER_PESO: { ajuste: -400, proteinas: 0.40, carbohidratos: 0.35, grasas: 0.25 },
  GANAR_MUSCULO: { ajuste: 300, proteinas: 0.35, carbohidratos: 0.45, grasas: 0.20 },
  GANAR_FUERZA: { ajuste: 200, proteinas: 0.35, carbohidratos: 0.40, grasas: 0.25 },
  RESISTENCIA: { ajuste: 0, proteinas: 0.25, carbohidratos: 0.50, grasas: 0.25 },
  SALUD_GENERAL: { ajuste: 0, proteinas: 0.30, carbohidratos: 0.40, grasas: 0.30 }
};

/**
 * Calcula la distribución de macronutrientes según el objetivo fitness.
 * @param {number} tdee - Gasto Energético Total Diario
 * @param {string} objetivoFitness - Objetivo de fitness
 * @returns {Object} Distribución de macronutrientes en gramos
 */
const calcularMacronutrientes = (tdee, objetivoFitness) => {
  const distribucion = DISTRIBUCION_MACROS[objetivoFitness] || DISTRIBUCION_MACROS.SALUD_GENERAL;
  const caloriasObjetivo = tdee + distribucion.ajuste;

  return {
    calorias_objetivo: parseFloat(caloriasObjetivo.toFixed(2)),
    proteinas_g: parseFloat(((caloriasObjetivo * distribucion.proteinas) / 4).toFixed(2)),
    carbohidratos_g: parseFloat(((caloriasObjetivo * distribucion.carbohidratos) / 4).toFixed(2)),
    grasas_g: parseFloat(((caloriasObjetivo * distribucion.grasas) / 9).toFixed(2))
  };
};

/**
 * Evalúa el nivel de riesgo según el cuestionario PAR-Q.
 * @param {Object} respuestas - Objeto con las respuestas p1 a p7 (booleanos)
 * @returns {string} Nivel de riesgo: 'APTO', 'PRECAUCION' o 'REQUIERE_EVALUACION'
 */
const evaluarRiesgoPARQ = (respuestas) => {
  const totalSi = Object.values(respuestas).filter(r => r === true).length;

  if (totalSi === 0) return 'APTO';
  if (totalSi <= 2) return 'PRECAUCION';
  return 'REQUIERE_EVALUACION';
};

/**
 * Genera un número de socio con formato SMART-YYYY-XXXX.
 * @returns {string} Número de socio generado
 */
const generarNumeroSocio = () => {
  const anio = new Date().getFullYear();
  const sufijo = Math.floor(1000 + Math.random() * 9000); // Número aleatorio de 4 dígitos
  return `SMART-${anio}-${sufijo}`;
};

module.exports = {
  calcularIMC,
  clasificarIMC,
  calcularTMB,
  calcularEdad,
  calcularTDEE,
  calcularMacronutrientes,
  evaluarRiesgoPARQ,
  generarNumeroSocio,
  FACTORES_ACTIVIDAD,
  DISTRIBUCION_MACROS
};
