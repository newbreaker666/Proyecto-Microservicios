// ============================================================
// Middleware de Validaciones de Entrada (express-validator)
// Microservicio de Usuarios - SmartGym
// ============================================================

const { body, param, query, validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

/**
 * Middleware que verifica el resultado de las validaciones y retorna error 422 si falla
 */
const manejarErrores = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      campo: err.path || err.param,
      mensaje: err.msg,
      valor: err.value
    }));
    return responseHelper.error(res, 'Datos de entrada inválidos o incompletos', 422, formattedErrors);
  }
  next();
};

/**
 * Validador para registro de nuevo usuario
 */
const validarRegistro = [
  body('email')
    .trim()
    .isEmail().withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número'),
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ min: 2, max: 100 }).withMessage('El apellido debe tener entre 2 y 100 caracteres')
];

/**
 * Validador para login
 */
const validarLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
];

/**
 * Validador para perfil biométrico en onboarding
 */
const validarPerfilBiometrico = [
  body('dni')
    .trim()
    .matches(/^[0-9]{8}$/).withMessage('El DNI debe contener exactamente 8 dígitos numéricos'),
  body('fecha_nacimiento')
    .isISO8601().withMessage('Fecha de nacimiento inválida (formato YYYY-MM-DD)'),
  body('sexo')
    .isIn(['M', 'F']).withMessage('El sexo debe ser M (masculino) o F (femenino)'),
  body('peso')
    .isFloat({ min: 30, max: 300 }).withMessage('El peso debe estar entre 30 kg y 300 kg'),
  body('talla')
    .isFloat({ min: 100, max: 250 }).withMessage('La talla debe estar entre 100 cm y 250 cm'),
  body('objetivo_fitness')
    .isIn(['PERDER_PESO', 'GANAR_MUSCULO', 'GANAR_FUERZA', 'RESISTENCIA', 'SALUD_GENERAL'])
    .withMessage('Objetivo fitness inválido'),
  body('nivel_experiencia')
    .optional()
    .isIn(['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'])
    .withMessage('Nivel de experiencia inválido'),
  body('factor_actividad')
    .optional()
    .isIn(['SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY_ACTIVO'])
    .withMessage('Factor de actividad inválido')
];

/**
 * Validador para registro de nueva medición física
 */
const validarMedicion = [
  body('peso')
    .isFloat({ min: 30, max: 300 }).withMessage('El peso debe estar entre 30 kg y 300 kg'),
  body('talla')
    .isFloat({ min: 100, max: 250 }).withMessage('La talla debe estar entre 100 cm y 250 cm'),
  body('porcentaje_grasa')
    .optional({ nullable: true })
    .isFloat({ min: 3, max: 60 }).withMessage('El porcentaje de grasa debe estar entre 3% y 60%'),
  body('notas')
    .optional({ nullable: true })
    .isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres')
];

/**
 * Validador para cuestionario PAR-Q y salud
 */
const validarFichaPARQ = [
  body('p1_cardiopatia').isBoolean().withMessage('p1_cardiopatia debe ser verdadero o falso'),
  body('p2_dolor_pecho_actividad').isBoolean().withMessage('p2_dolor_pecho_actividad debe ser booleano'),
  body('p3_dolor_pecho_reposo').isBoolean().withMessage('p3_dolor_pecho_reposo debe ser booleano'),
  body('p4_mareos').isBoolean().withMessage('p4_mareos debe ser booleano'),
  body('p5_problemas_oseos').isBoolean().withMessage('p5_problemas_oseos debe ser booleano'),
  body('p6_medicacion').isBoolean().withMessage('p6_medicacion debe ser booleano'),
  body('p7_otra_razon').isBoolean().withMessage('p7_otra_razon debe ser booleano'),
  body('tipo_sangre')
    .optional({ nullable: true })
    .isIn(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'])
    .withMessage('Tipo de sangre no válido'),
  body('alergias').optional({ nullable: true }).isLength({ max: 300 }),
  body('lesiones_previas').optional({ nullable: true }).isLength({ max: 500 })
];

/**
 * Validador para metas personales
 */
const validarMeta = [
  body('tipo_meta')
    .isIn(['PESO_OBJETIVO', 'ASISTENCIA_SEMANAL', 'PORCENTAJE_GRASA', 'PERSONALIZADA'])
    .withMessage('Tipo de meta inválido'),
  body('descripcion')
    .trim()
    .notEmpty().withMessage('La descripción de la meta es obligatoria')
    .isLength({ max: 300 }),
  body('valor_objetivo')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('El valor objetivo debe ser un número positivo'),
  body('fecha_limite')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha límite inválida (YYYY-MM-DD)')
];

/**
 * Validador para preferencias deportivas
 */
const validarPreferencias = [
  body('disciplinas')
    .notEmpty().withMessage('Debe seleccionar al menos una disciplina de interés'),
  body('horario_preferido')
    .isIn(['MANANA', 'TARDE', 'NOCHE', 'FLEXIBLE'])
    .withMessage('Horario preferido inválido'),
  body('dias_semana')
    .notEmpty().withMessage('Debe indicar los días preferidos'),
  body('frecuencia_semanal')
    .isInt({ min: 1, max: 7 }).withMessage('La frecuencia semanal debe estar entre 1 y 7 días')
];

module.exports = {
  manejarErrores,
  validarRegistro,
  validarLogin,
  validarPerfilBiometrico,
  validarMedicion,
  validarFichaPARQ,
  validarMeta,
  validarPreferencias
};
