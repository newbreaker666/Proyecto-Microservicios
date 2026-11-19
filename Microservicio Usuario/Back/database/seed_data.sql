-- ============================================================
-- SCRIPT DE SEED DATA: BBDD_SmartGym_Usuarios
-- Datos de prueba para MS-Usuarios (SmartGym)
-- Autor: Wiley Fabian Guerra Rios
-- ============================================================

USE BBDD_SmartGym_Usuarios;
GO

-- 1. INSERTAR ROLES
SET IDENTITY_INSERT Roles ON;
IF NOT EXISTS (SELECT * FROM Roles WHERE rol_id = 1)
    INSERT INTO Roles (rol_id, nombre, descripcion, activo) VALUES 
    (1, 'ADMIN', 'Administrador total del sistema de usuarios', 1),
    (2, 'ENTRENADOR', 'Personal del gimnasio que asesora y mide a los clientes', 1),
    (3, 'CLIENTE', 'Usuario socio del gimnasio con auto-servicio digital', 1);
SET IDENTITY_INSERT Roles OFF;
GO

-- 2. INSERTAR USUARIOS (Hashes generados con bcrypt)
-- Password Admin: Admin123!
-- Password Entrenadores: Trainer123!
-- Password Clientes: Cliente123!

DECLARE @admin_hash VARCHAR(255) = '$2a$10$0R0alstbxuCqUL6Fi362zemmtStt.gi4G/Cp7vKAi7wu15NQVO17C';
DECLARE @trainer_hash VARCHAR(255) = '$2a$10$hz/34bw/t3PvbBIia1T3tOSQ49i26AqMPMsxB/nLrDA.udfLcZfE6';
DECLARE @cliente_hash VARCHAR(255) = '$2a$10$JHQ8M3HZp7bmnhltwBHLsuoDkr4N8zdXhUY1CWB/NzflTk3zi9ZZe';

-- Admin
IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'admin@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('A0000001-0000-0000-0000-000000000001', 'admin@smartgym.pe', @admin_hash, 'Carlos', 'Mendoza', 1, 1, 1);

-- Entrenadores
IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'entrenador1@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('E0000001-0000-0000-0000-000000000001', 'entrenador1@smartgym.pe', @trainer_hash, 'María', 'García', 2, 1, 1);

IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'entrenador2@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('E0000002-0000-0000-0000-000000000002', 'entrenador2@smartgym.pe', @trainer_hash, 'Pedro', 'Sánchez', 2, 1, 1);

-- Clientes
IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'cliente1@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('C0000001-0000-0000-0000-000000000001', 'cliente1@smartgym.pe', @cliente_hash, 'Ana', 'López', 3, 1, 1);

IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'cliente2@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('C0000002-0000-0000-0000-000000000002', 'cliente2@smartgym.pe', @cliente_hash, 'Juan', 'Torres', 3, 1, 1);

IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'cliente3@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('C0000003-0000-0000-0000-000000000003', 'cliente3@smartgym.pe', @cliente_hash, 'Rosa', 'Díaz', 3, 1, 1);

IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'cliente4@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('C0000004-0000-0000-0000-000000000004', 'cliente4@smartgym.pe', @cliente_hash, 'Luis', 'Ramírez', 3, 1, 1);

IF NOT EXISTS (SELECT * FROM Usuarios WHERE email = 'cliente5@smartgym.pe')
    INSERT INTO Usuarios (usuario_id, email, password_hash, nombre, apellido, rol_id, activo, email_verificado)
    VALUES ('C0000005-0000-0000-0000-000000000005', 'cliente5@smartgym.pe', @cliente_hash, 'Sofía', 'Vargas', 3, 1, 1);
GO

-- 3. INSERTAR PERSONAL
IF NOT EXISTS (SELECT * FROM Personal WHERE dni = '44556677')
    INSERT INTO Personal (usuario_id, dni, especialidad, telefono, fecha_contratacion, activo)
    VALUES ('E0000001-0000-0000-0000-000000000001', '44556677', 'Musculación y Entrenamiento Funcional', '987111222', '2025-01-15', 1);

IF NOT EXISTS (SELECT * FROM Personal WHERE dni = '55667788')
    INSERT INTO Personal (usuario_id, dni, especialidad, telefono, fecha_contratacion, activo)
    VALUES ('E0000002-0000-0000-0000-000000000002', '55667788', 'Cardio, HIIT y CrossFit', '987333444', '2025-03-01', 1);
GO

-- 4. INSERTAR CLIENTES (Datos biométricos calculados)
-- Cliente 1: Ana López (F, 1995-03-15 = 31 años, 67.0kg, 165cm) -> IMC=24.61 (Normal), TMB=1454, TDEE=2000
IF NOT EXISTS (SELECT * FROM Clientes WHERE dni = '72345601')
    INSERT INTO Clientes (usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion, contacto_emergencia, telefono_emergencia, peso_actual, talla_actual, imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia, factor_actividad, numero_socio)
    VALUES ('C0000001-0000-0000-0000-000000000001', '72345601', '1995-03-15', 'F', '961234501', 'Av. San Martín 123, Pucallpa', 'Rosa López (Madre)', '961999881', 67.00, 165.00, 24.61, 1454.40, 2000.00, 'PERDER_PESO', 'PRINCIPIANTE', 'LIGERO', 'SMART-2026-0001');

-- Cliente 2: Juan Torres (M, 1992-08-20 = 34 años, 88.0kg, 178cm) -> IMC=27.77 (Sobrepeso músculo), TMB=1928, TDEE=3325
IF NOT EXISTS (SELECT * FROM Clientes WHERE dni = '72345602')
    INSERT INTO Clientes (usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion, contacto_emergencia, telefono_emergencia, peso_actual, talla_actual, imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia, factor_actividad, numero_socio)
    VALUES ('C0000002-0000-0000-0000-000000000002', '72345602', '1992-08-20', 'M', '961234502', 'Jr. Ucayali 456, Pucallpa', 'Elena Torres (Hermana)', '961999882', 88.00, 178.00, 27.77, 1928.00, 3325.00, 'GANAR_MUSCULO', 'INTERMEDIO', 'ACTIVO', 'SMART-2026-0002');

-- Cliente 3: Rosa Díaz (F, 1998-11-05 = 28 años, 55.2kg, 160cm) -> IMC=21.56 (Normal), TMB=1332, TDEE=2065
IF NOT EXISTS (SELECT * FROM Clientes WHERE dni = '72345603')
    INSERT INTO Clientes (usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion, contacto_emergencia, telefono_emergencia, peso_actual, talla_actual, imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia, factor_actividad, numero_socio)
    VALUES ('C0000003-0000-0000-0000-000000000003', '72345603', '1998-11-05', 'F', '961234503', 'Calle Las Palmeras 789, Yarinacocha', 'Miguel Díaz (Padre)', '961999883', 55.20, 160.00, 21.56, 1332.00, 2065.00, 'SALUD_GENERAL', 'PRINCIPIANTE', 'MODERADO', 'SMART-2026-0003');

-- Cliente 4: Luis Ramírez (M, 1990-01-28 = 36 años, 89.0kg, 175cm) -> IMC=29.06 (Sobrepeso), TMB=1890, TDEE=2268
IF NOT EXISTS (SELECT * FROM Clientes WHERE dni = '72345604')
    INSERT INTO Clientes (usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion, contacto_emergencia, telefono_emergencia, peso_actual, talla_actual, imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia, factor_actividad, numero_socio)
    VALUES ('C0000004-0000-0000-0000-000000000004', '72345604', '1990-01-28', 'M', '961234504', 'Av. Centenario Km 4, Pucallpa', 'Patricia Gómez (Esposa)', '961999884', 89.00, 175.00, 29.06, 1890.00, 2268.00, 'PERDER_PESO', 'PRINCIPIANTE', 'SEDENTARIO', 'SMART-2026-0004');

-- Cliente 5: Sofía Vargas (F, 1997-06-10 = 29 años, 61.5kg, 168cm) -> IMC=21.79 (Normal), TMB=1420, TDEE=2698
IF NOT EXISTS (SELECT * FROM Clientes WHERE dni = '72345605')
    INSERT INTO Clientes (usuario_id, dni, fecha_nacimiento, sexo, telefono, direccion, contacto_emergencia, telefono_emergencia, peso_actual, talla_actual, imc_actual, tmb_actual, tdee_actual, objetivo_fitness, nivel_experiencia, factor_actividad, numero_socio)
    VALUES ('C0000005-0000-0000-0000-000000000005', '72345605', '1997-06-10', 'F', '961234505', 'Jr. Raymondi 321, Pucallpa', 'Carlos Vargas (Hermano)', '961999885', 61.50, 168.00, 21.79, 1420.00, 2698.00, 'GANAR_FUERZA', 'AVANZADO', 'MUY_ACTIVO', 'SMART-2026-0005');
GO

-- 5. INSERTAR FICHAS MEDICAS PAR-Q
DECLARE @c1 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345601');
DECLARE @c2 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345602');
DECLARE @c3 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345603');
DECLARE @c4 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345604');
DECLARE @c5 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345605');

IF NOT EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @c1)
    INSERT INTO FichaMedicaPARQ (cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo, p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo, tipo_sangre, alergias, lesiones_previas, notas_medicas)
    VALUES (@c1, 0, 0, 0, 0, 0, 0, 0, 'APTO', 'O+', 'Ninguna', 'Ninguna', 'Apta para actividad física sin restricciones.');

IF NOT EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @c2)
    INSERT INTO FichaMedicaPARQ (cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo, p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo, tipo_sangre, alergias, lesiones_previas, notas_medicas)
    VALUES (@c2, 0, 0, 0, 0, 0, 0, 0, 'APTO', 'A+', 'Polvo', 'Esguince de tobillo derecho hace 2 años (recuperado)', 'Entrenamiento de alta intensidad permitido.');

IF NOT EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @c3)
    INSERT INTO FichaMedicaPARQ (cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo, p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo, tipo_sangre, alergias, lesiones_previas, notas_medicas)
    VALUES (@c3, 0, 0, 0, 0, 0, 0, 0, 'APTO', 'B+', 'Ninguna', 'Ninguna', 'Excelente estado general.');

IF NOT EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @c4)
    INSERT INTO FichaMedicaPARQ (cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo, p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo, tipo_sangre, alergias, lesiones_previas, notas_medicas)
    VALUES (@c4, 0, 0, 0, 0, 1, 1, 0, 'PRECAUCION', 'O+', 'Penicilina', 'Dolor lumbar leve crónico', 'Supervisión en ejercicios de impacto y sentadillas pesadas. Medicación para presión controlada.');

IF NOT EXISTS (SELECT * FROM FichaMedicaPARQ WHERE cliente_id = @c5)
    INSERT INTO FichaMedicaPARQ (cliente_id, p1_cardiopatia, p2_dolor_pecho_actividad, p3_dolor_pecho_reposo, p4_mareos, p5_problemas_oseos, p6_medicacion, p7_otra_razon, nivel_riesgo, tipo_sangre, alergias, lesiones_previas, notas_medicas)
    VALUES (@c5, 0, 0, 0, 0, 0, 0, 0, 'APTO', 'O-', 'Ninguna', 'Ninguna', 'Atleta con excelente condición física.');
GO

-- 6. INSERTAR PREFERENCIAS DEPORTIVAS
DECLARE @c1 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345601');
DECLARE @c2 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345602');
DECLARE @c3 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345603');
DECLARE @c4 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345604');
DECLARE @c5 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345605');

IF NOT EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @c1)
    INSERT INTO PreferenciasDeportivas (cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa)
    VALUES (@c1, 'CARDIO,FUNCIONAL,SPINNING', 'MANANA', 'LUN,MIE,VIE', 3, 'Hacía caminatas y zumba ocasional');

IF NOT EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @c2)
    INSERT INTO PreferenciasDeportivas (cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa)
    VALUES (@c2, 'PESAS,CROSSFIT', 'TARDE', 'LUN,MAR,MIE,JUE,VIE', 5, '2 años de experiencia en musculación');

IF NOT EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @c3)
    INSERT INTO PreferenciasDeportivas (cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa)
    VALUES (@c3, 'YOGA,CARDIO,FUNCIONAL', 'MANANA', 'MAR,JUE,SAB', 3, 'Practicó yoga en casa');

IF NOT EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @c4)
    INSERT INTO PreferenciasDeportivas (cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa)
    VALUES (@c4, 'CARDIO,FUNCIONAL', 'NOCHE', 'LUN,MIE,VIE', 3, 'Sedentario en los últimos 3 años');

IF NOT EXISTS (SELECT * FROM PreferenciasDeportivas WHERE cliente_id = @c5)
    INSERT INTO PreferenciasDeportivas (cliente_id, disciplinas, horario_preferido, dias_semana, frecuencia_semanal, experiencia_previa)
    VALUES (@c5, 'PESAS,CROSSFIT,BOXEO', 'NOCHE', 'LUN,MAR,MIE,VIE,SAB', 5, 'Atleta de powerlifting aficionada');
GO

-- 7. INSERTAR HISTORIAL DE MEDICIONES (Simulando 3 meses de progreso)
DECLARE @c1 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345601');
DECLARE @c2 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345602');
DECLARE @c3 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345603');
DECLARE @c4 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345604');
DECLARE @c5 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345605');

-- Ana López: 72.5 -> 70.0 -> 68.5 -> 67.0
IF NOT EXISTS (SELECT * FROM HistorialMediciones WHERE cliente_id = @c1)
BEGIN
    INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas, fecha_medicion) VALUES
    (@c1, 72.50, 165.00, 26.63, 1505.00, 31.5, 'SELF', 'Medición inicial en registro web', '2026-08-15'),
    (@c1, 70.00, 165.00, 25.71, 1482.00, 29.8, 'E0000001-0000-0000-0000-000000000001', 'Control mensual con entrenadora María', '2026-09-15'),
    (@c1, 68.50, 165.00, 25.16, 1468.00, 28.2, 'E0000001-0000-0000-0000-000000000001', 'Buena pérdida de grasa y mejor tono', '2026-10-15'),
    (@c1, 67.00, 165.00, 24.61, 1454.40, 26.5, 'E0000001-0000-0000-0000-000000000001', '¡Meta casi alcanzada! Estado óptimo', '2026-11-05');
END

-- Juan Torres: 85.0 -> 86.5 -> 87.0 -> 88.0 (Hipertrofia)
IF NOT EXISTS (SELECT * FROM HistorialMediciones WHERE cliente_id = @c2)
BEGIN
    INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas, fecha_medicion) VALUES
    (@c2, 85.00, 178.00, 26.83, 1888.00, 16.0, 'SELF', 'Registro inicial web', '2026-08-10'),
    (@c2, 86.50, 178.00, 27.30, 1908.00, 15.8, 'E0000002-0000-0000-0000-000000000002', 'Aumento de masa muscular limpia', '2026-09-12'),
    (@c2, 87.00, 178.00, 27.46, 1915.00, 15.5, 'E0000002-0000-0000-0000-000000000002', 'Excelente respuesta a sobrecarga progresiva', '2026-10-10'),
    (@c2, 88.00, 178.00, 27.77, 1928.00, 15.2, 'E0000002-0000-0000-0000-000000000002', 'Control actual. 3kg de músculo ganados', '2026-11-02');
END

-- Rosa Díaz: Estable 55.0 -> 55.2
IF NOT EXISTS (SELECT * FROM HistorialMediciones WHERE cliente_id = @c3)
BEGIN
    INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas, fecha_medicion) VALUES
    (@c3, 55.00, 160.00, 21.48, 1330.00, 22.0, 'SELF', 'Registro inicial', '2026-08-20'),
    (@c3, 55.50, 160.00, 21.68, 1335.00, 21.8, 'E0000001-0000-0000-0000-000000000001', 'Mejora en resistencia cardiovascular', '2026-09-20'),
    (@c3, 55.20, 160.00, 21.56, 1332.00, 21.5, 'E0000001-0000-0000-0000-000000000001', 'Mantenimiento perfecto y mejor postura', '2026-10-25');
END

-- Luis Ramírez: 95.0 -> 93.0 -> 91.5 -> 89.0
IF NOT EXISTS (SELECT * FROM HistorialMediciones WHERE cliente_id = @c4)
BEGIN
    INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas, fecha_medicion) VALUES
    (@c4, 95.00, 175.00, 31.02, 1970.00, 34.0, 'SELF', 'Registro inicial - Obesidad grado I', '2026-08-01'),
    (@c4, 93.00, 175.00, 30.37, 1944.00, 32.5, 'E0000001-0000-0000-0000-000000000001', 'Adaptación cardio sin impacto en espalda', '2026-09-02'),
    (@c4, 91.50, 175.00, 29.88, 1923.00, 31.0, 'E0000001-0000-0000-0000-000000000001', 'Bajó de obesidad a sobrepeso', '2026-10-05'),
    (@c4, 89.00, 175.00, 29.06, 1890.00, 29.5, 'E0000001-0000-0000-0000-000000000001', 'Progreso sobresaliente, 6kg perdidos', '2026-11-04');
END

-- Sofía Vargas: 60.0 -> 61.5
IF NOT EXISTS (SELECT * FROM HistorialMediciones WHERE cliente_id = @c5)
BEGIN
    INSERT INTO HistorialMediciones (cliente_id, peso, talla, imc, tmb, porcentaje_grasa, registrado_por, notas, fecha_medicion) VALUES
    (@c5, 60.00, 168.00, 21.26, 1406.00, 19.5, 'SELF', 'Registro inicial', '2026-08-15'),
    (@c5, 60.80, 168.00, 21.54, 1413.00, 19.0, 'E0000002-0000-0000-0000-000000000002', 'Aumento de carga en sentadilla y peso muerto', '2026-09-18'),
    (@c5, 61.50, 168.00, 21.79, 1420.00, 18.5, 'E0000002-0000-0000-0000-000000000002', 'Fuerza máxima superada en todos los lifts', '2026-10-22');
END
GO

-- 8. INSERTAR METAS PERSONALES
DECLARE @c1 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345601');
DECLARE @c2 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345602');
DECLARE @c3 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345603');
DECLARE @c4 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345604');
DECLARE @c5 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345605');

IF NOT EXISTS (SELECT * FROM MetasPersonales WHERE cliente_id = @c1)
    INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
    VALUES (@c1, 'PESO_OBJETIVO', 'Alcanzar 65 kg para fin de año', 65.00, 67.00, 'kg', '2026-12-31', 'ACTIVA', 73.33);

IF NOT EXISTS (SELECT * FROM MetasPersonales WHERE cliente_id = @c2)
    INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
    VALUES (@c2, 'PESO_OBJETIVO', 'Alcanzar 90 kg de masa magra', 90.00, 88.00, 'kg', '2026-12-31', 'ACTIVA', 60.00);

IF NOT EXISTS (SELECT * FROM MetasPersonales WHERE cliente_id = @c3)
    INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
    VALUES (@c3, 'ASISTENCIA_SEMANAL', 'Asistir mínimo 3 días por semana', 3.00, 3.00, 'dias', '2026-12-31', 'ACTIVA', 100.00);

IF NOT EXISTS (SELECT * FROM MetasPersonales WHERE cliente_id = @c4)
    INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
    VALUES (@c4, 'PESO_OBJETIVO', 'Llegar a 82 kg y salir de sobrepeso', 82.00, 89.00, 'kg', '2026-12-31', 'ACTIVA', 46.15);

IF NOT EXISTS (SELECT * FROM MetasPersonales WHERE cliente_id = @c5)
    INSERT INTO MetasPersonales (cliente_id, tipo_meta, descripcion, valor_objetivo, valor_actual, unidad, fecha_limite, estado, porcentaje_avance)
    VALUES (@c5, 'PORCENTAJE_GRASA', 'Reducir porcentaje graso a 17%', 17.00, 18.50, '%', '2026-12-31', 'ACTIVA', 80.00);
GO

-- 9. INSERTAR OBSERVACIONES DE ENTRENADOR
DECLARE @c1 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345601');
DECLARE @c2 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345602');
DECLARE @c4 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345604');
DECLARE @c5 INT = (SELECT cliente_id FROM Clientes WHERE dni = '72345605');

DECLARE @p1 INT = (SELECT personal_id FROM Personal WHERE dni = '44556677');
DECLARE @p2 INT = (SELECT personal_id FROM Personal WHERE dni = '55667788');

IF NOT EXISTS (SELECT * FROM ObservacionesEntrenador WHERE cliente_id = @c1)
BEGIN
    INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, created_at) VALUES
    (@c1, @p1, 'PROGRESO', 'Excelente adherencia y disciplina con el cardio y déficit calórico.', '2026-09-15'),
    (@c1, @p1, 'RECOMENDACION', 'Se sugiere agregar 2 sesiones semanales de fuerza para preservar masa muscular.', '2026-10-15');
END

IF NOT EXISTS (SELECT * FROM ObservacionesEntrenador WHERE cliente_id = @c2)
BEGIN
    INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, created_at) VALUES
    (@c2, @p2, 'PROGRESO', 'Incremento sustancial de fuerza en press banca (80kg a 105kg). Excelente forma.', '2026-09-12'),
    (@c2, @p2, 'RECOMENDACION', 'Mantener superávit de 300 kcal e hidratación adecuada.', '2026-10-10');
END

IF NOT EXISTS (SELECT * FROM ObservacionesEntrenador WHERE cliente_id = @c4)
BEGIN
    INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, created_at) VALUES
    (@c4, @p1, 'ALERTA', 'Evitar sentadillas libres y peso muerto con carga pesada debido a molestia lumbar.', '2026-09-02'),
    (@c4, @p1, 'PROGRESO', 'Gran mejora cardiovascular, tolera 30 min de elíptica con baja frecuencia cardíaca.', '2026-10-05');
END

IF NOT EXISTS (SELECT * FROM ObservacionesEntrenador WHERE cliente_id = @c5)
BEGIN
    INSERT INTO ObservacionesEntrenador (cliente_id, personal_id, tipo, contenido, created_at) VALUES
    (@c5, @p2, 'PROGRESO', 'Récord personal en peso muerto: 130kg completados con postura impecable.', '2026-10-22');
END
GO

-- 10. INSERTAR SESIONES ACTIVAS DE PRUEBA
IF NOT EXISTS (SELECT * FROM SesionesActivas WHERE usuario_id = 'A0000001-0000-0000-0000-000000000001')
    INSERT INTO SesionesActivas (usuario_id, refresh_token_hash, ip_address, user_agent, dispositivo, expira_en, activa)
    VALUES ('A0000001-0000-0000-0000-000000000001', 'token_hash_admin_simulado', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', 'Chrome en Windows 11', DATEADD(day, 7, GETDATE()), 1);

IF NOT EXISTS (SELECT * FROM SesionesActivas WHERE usuario_id = 'C0000001-0000-0000-0000-000000000001')
    INSERT INTO SesionesActivas (usuario_id, refresh_token_hash, ip_address, user_agent, dispositivo, expira_en, activa)
    VALUES ('C0000001-0000-0000-0000-000000000001', 'token_hash_cliente1_simulado', '190.236.45.12', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'Safari en iPhone 15', DATEADD(day, 7, GETDATE()), 1);
GO

-- 11. INSERTAR AUDITORIA INICIAL
IF NOT EXISTS (SELECT * FROM Auditoria)
BEGIN
    INSERT INTO Auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip_address, user_agent) VALUES
    ('A0000001-0000-0000-0000-000000000001', 'INICIALIZACION_SISTEMA', 'Sistema', '0', '{"mensaje": "Base de datos y roles creados correctamente"}', '127.0.0.1', 'SeedScript/1.0'),
    ('A0000001-0000-0000-0000-000000000001', 'CREAR_STAFF', 'Personal', 'E0000001-0000-0000-0000-000000000001', '{"nombre": "María García", "rol": "ENTRENADOR"}', '127.0.0.1', 'SeedScript/1.0'),
    ('C0000001-0000-0000-0000-000000000001', 'AUTO_REGISTRO', 'Usuarios', 'C0000001-0000-0000-0000-000000000001', '{"email": "cliente1@smartgym.pe", "origen": "Web Onboarding"}', '190.236.45.12', 'Safari/iOS'),
    ('C0000001-0000-0000-0000-000000000001', 'ONBOARDING_BIOMETRICO', 'Clientes', '72345601', '{"peso": 72.5, "talla": 165, "imc": 26.63, "objetivo": "PERDER_PESO"}', '190.236.45.12', 'Safari/iOS'),
    ('E0000001-0000-0000-0000-000000000001', 'NUEVA_MEDICION', 'HistorialMediciones', '1', '{"cliente": "Ana López", "peso_nuevo": 67.0, "peso_anterior": 68.5}', '192.168.1.105', 'Chrome/Windows');
END
GO

PRINT 'Datos de prueba (seed data) insertados con éxito.';
GO
