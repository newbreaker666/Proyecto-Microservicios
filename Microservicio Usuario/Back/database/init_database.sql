-- ============================================================
-- SCRIPT DE INICIALIZACION: BBDD_SmartGym_Usuarios
-- Microservicio de Usuarios e Identidad (SmartGym)
-- Autor: Wiley Fabian Guerra Rios
-- ============================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'BBDD_SmartGym_Usuarios')
BEGIN
    ALTER DATABASE BBDD_SmartGym_Usuarios SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE BBDD_SmartGym_Usuarios;
    PRINT 'Base de datos anterior eliminada para creación limpia.';
END
GO

CREATE DATABASE BBDD_SmartGym_Usuarios;
PRINT 'Base de datos BBDD_SmartGym_Usuarios creada con éxito.';
GO

USE BBDD_SmartGym_Usuarios;
GO

-- 1. TABLA ROLES
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        rol_id INT PRIMARY KEY IDENTITY(1,1),
        nombre VARCHAR(50) NOT NULL UNIQUE, -- 'ADMIN', 'ENTRENADOR', 'CLIENTE'
        descripcion VARCHAR(200) NULL,
        activo BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE()
    );
    PRINT 'Tabla Roles creada.';
END
GO

-- 2. TABLA USUARIOS
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Usuarios')
BEGIN
    CREATE TABLE Usuarios (
        usuario_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        rol_id INT NOT NULL,
        activo BIT DEFAULT 1,
        email_verificado BIT DEFAULT 0,
        ultimo_login DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (rol_id) REFERENCES Roles(rol_id)
    );
    CREATE INDEX IX_Usuarios_Email ON Usuarios(email);
    PRINT 'Tabla Usuarios creada.';
END
GO

-- 3. TABLA CLIENTES
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Clientes')
BEGIN
    CREATE TABLE Clientes (
        cliente_id INT PRIMARY KEY IDENTITY(1,1),
        usuario_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
        dni VARCHAR(8) NOT NULL UNIQUE,
        fecha_nacimiento DATE NOT NULL,
        sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
        telefono VARCHAR(15) NULL,
        direccion VARCHAR(300) NULL,
        contacto_emergencia VARCHAR(150) NULL,
        telefono_emergencia VARCHAR(15) NULL,
        peso_actual DECIMAL(5,2) NULL, -- kg
        talla_actual DECIMAL(5,2) NULL, -- cm
        imc_actual DECIMAL(5,2) NULL,
        tmb_actual DECIMAL(7,2) NULL, -- Harris-Benedict
        tdee_actual DECIMAL(7,2) NULL, -- Gasto Energético Total Diario
        objetivo_fitness VARCHAR(30) NULL CHECK (objetivo_fitness IN ('PERDER_PESO', 'GANAR_MUSCULO', 'GANAR_FUERZA', 'RESISTENCIA', 'SALUD_GENERAL')),
        nivel_experiencia VARCHAR(20) DEFAULT 'PRINCIPIANTE' CHECK (nivel_experiencia IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO')),
        factor_actividad VARCHAR(20) DEFAULT 'MODERADO' CHECK (factor_actividad IN ('SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY_ACTIVO')),
        numero_socio VARCHAR(20) UNIQUE NULL, -- Formato: SMART-2026-XXXX
        estado_membresia VARCHAR(30) DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'ACTIVA', 'VENCIDA', 'CANCELADA' (Sincronizado desde MS-Membresías)
        avatar_url VARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Clientes_Usuarios FOREIGN KEY (usuario_id) REFERENCES Usuarios(usuario_id)
    );
    CREATE INDEX IX_Clientes_DNI ON Clientes(dni);
    CREATE INDEX IX_Clientes_NumeroSocio ON Clientes(numero_socio);
    PRINT 'Tabla Clientes creada.';
END
GO

-- 4. TABLA PERSONAL (Entrenadores y Staff)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Personal')
BEGIN
    CREATE TABLE Personal (
        personal_id INT PRIMARY KEY IDENTITY(1,1),
        usuario_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
        dni VARCHAR(8) NOT NULL UNIQUE,
        especialidad VARCHAR(100) NULL,
        telefono VARCHAR(15) NULL,
        fecha_contratacion DATE DEFAULT GETDATE(),
        activo BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Personal_Usuarios FOREIGN KEY (usuario_id) REFERENCES Usuarios(usuario_id)
    );
    PRINT 'Tabla Personal creada.';
END
GO

-- 5. TABLA HISTORIAL DE MEDICIONES
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HistorialMediciones')
BEGIN
    CREATE TABLE HistorialMediciones (
        medicion_id INT PRIMARY KEY IDENTITY(1,1),
        cliente_id INT NOT NULL,
        peso DECIMAL(5,2) NOT NULL,
        talla DECIMAL(5,2) NOT NULL,
        imc DECIMAL(5,2) NOT NULL,
        tmb DECIMAL(7,2) NOT NULL,
        porcentaje_grasa DECIMAL(5,2) NULL,
        registrado_por VARCHAR(100) NOT NULL, -- UUID de Entrenador o 'SELF'
        notas VARCHAR(500) NULL,
        fecha_medicion DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_HistorialMediciones_Clientes FOREIGN KEY (cliente_id) REFERENCES Clientes(cliente_id) ON DELETE CASCADE
    );
    CREATE INDEX IX_HistorialMediciones_ClienteID ON HistorialMediciones(cliente_id);
    PRINT 'Tabla HistorialMediciones creada.';
END
GO

-- 6. TABLA OBSERVACIONES ENTRENADOR
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ObservacionesEntrenador')
BEGIN
    CREATE TABLE ObservacionesEntrenador (
        observacion_id INT PRIMARY KEY IDENTITY(1,1),
        cliente_id INT NOT NULL,
        personal_id INT NOT NULL,
        tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('PROGRESO', 'RECOMENDACION', 'CAMBIO_OBJETIVO', 'ALERTA')),
        contenido TEXT NOT NULL,
        objetivo_anterior VARCHAR(30) NULL,
        objetivo_nuevo VARCHAR(30) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Observaciones_Clientes FOREIGN KEY (cliente_id) REFERENCES Clientes(cliente_id) ON DELETE CASCADE,
        CONSTRAINT FK_Observaciones_Personal FOREIGN KEY (personal_id) REFERENCES Personal(personal_id)
    );
    CREATE INDEX IX_Observaciones_ClienteID ON ObservacionesEntrenador(cliente_id);
    PRINT 'Tabla ObservacionesEntrenador creada.';
END
GO

-- 7. TABLA FICHA MEDICA PAR-Q (Salud y Aptitud Física)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FichaMedicaPARQ')
BEGIN
    CREATE TABLE FichaMedicaPARQ (
        ficha_id INT PRIMARY KEY IDENTITY(1,1),
        cliente_id INT NOT NULL UNIQUE,
        p1_cardiopatia BIT DEFAULT 0,
        p2_dolor_pecho_actividad BIT DEFAULT 0,
        p3_dolor_pecho_reposo BIT DEFAULT 0,
        p4_mareos BIT DEFAULT 0,
        p5_problemas_oseos BIT DEFAULT 0,
        p6_medicacion BIT DEFAULT 0,
        p7_otra_razon BIT DEFAULT 0,
        nivel_riesgo VARCHAR(30) DEFAULT 'APTO' CHECK (nivel_riesgo IN ('APTO', 'PRECAUCION', 'REQUIERE_EVALUACION')),
        tipo_sangre VARCHAR(5) NULL,
        alergias VARCHAR(300) NULL,
        lesiones_previas VARCHAR(500) NULL,
        notas_medicas TEXT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_FichaPARQ_Clientes FOREIGN KEY (cliente_id) REFERENCES Clientes(cliente_id) ON DELETE CASCADE
    );
    PRINT 'Tabla FichaMedicaPARQ creada.';
END
GO

-- 8. TABLA METAS PERSONALES (Gamificación y Objetivos)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MetasPersonales')
BEGIN
    CREATE TABLE MetasPersonales (
        meta_id INT PRIMARY KEY IDENTITY(1,1),
        cliente_id INT NOT NULL,
        tipo_meta VARCHAR(30) NOT NULL CHECK (tipo_meta IN ('PESO_OBJETIVO', 'ASISTENCIA_SEMANAL', 'PORCENTAJE_GRASA', 'PERSONALIZADA')),
        descripcion VARCHAR(300) NOT NULL,
        valor_inicial DECIMAL(7,2) NULL,
        valor_objetivo DECIMAL(7,2) NULL,
        valor_actual DECIMAL(7,2) NULL,
        unidad VARCHAR(20) NULL,
        fecha_inicio DATE DEFAULT GETDATE(),
        fecha_limite DATE NULL,
        estado VARCHAR(20) DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'COMPLETADA', 'ABANDONADA', 'PAUSADA')),
        porcentaje_avance DECIMAL(5,2) DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_MetasPersonales_Clientes FOREIGN KEY (cliente_id) REFERENCES Clientes(cliente_id) ON DELETE CASCADE
    );
    CREATE INDEX IX_MetasPersonales_ClienteID ON MetasPersonales(cliente_id);
    PRINT 'Tabla MetasPersonales creada.';
END
GO

-- 9. TABLA PREFERENCIAS DEPORTIVAS
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PreferenciasDeportivas')
BEGIN
    CREATE TABLE PreferenciasDeportivas (
        preferencia_id INT PRIMARY KEY IDENTITY(1,1),
        cliente_id INT NOT NULL UNIQUE,
        disciplinas VARCHAR(500) NULL, -- 'PESAS,CARDIO,CROSSFIT'
        horario_preferido VARCHAR(20) CHECK (horario_preferido IN ('MANANA', 'TARDE', 'NOCHE', 'FLEXIBLE')),
        dias_semana VARCHAR(100) NULL, -- 'LUN,MAR,MIE,VIE'
        frecuencia_semanal INT DEFAULT 3,
        experiencia_previa TEXT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Preferencias_Clientes FOREIGN KEY (cliente_id) REFERENCES Clientes(cliente_id) ON DELETE CASCADE
    );
    PRINT 'Tabla PreferenciasDeportivas creada.';
END
GO

-- 10. TABLA SESIONES ACTIVAS (Seguridad y Tokens)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SesionesActivas')
BEGIN
    CREATE TABLE SesionesActivas (
        sesion_id INT PRIMARY KEY IDENTITY(1,1),
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        dispositivo VARCHAR(100) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        last_activity DATETIME DEFAULT GETDATE(),
        expira_en DATETIME NOT NULL,
        activa BIT DEFAULT 1,
        CONSTRAINT FK_Sesiones_Usuarios FOREIGN KEY (usuario_id) REFERENCES Usuarios(usuario_id) ON DELETE CASCADE
    );
    CREATE INDEX IX_Sesiones_UsuarioID ON SesionesActivas(usuario_id);
    PRINT 'Tabla SesionesActivas creada.';
END
GO

-- 11. TABLA AUDITORIA (Trazabilidad y Seguridad)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Auditoria')
BEGIN
    CREATE TABLE Auditoria (
        auditoria_id BIGINT PRIMARY KEY IDENTITY(1,1),
        usuario_id UNIQUEIDENTIFIER NULL,
        accion VARCHAR(50) NOT NULL,
        entidad VARCHAR(50) NULL,
        entidad_id VARCHAR(100) NULL,
        detalle TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Auditoria_Usuarios FOREIGN KEY (usuario_id) REFERENCES Usuarios(usuario_id) ON DELETE SET NULL
    );
    CREATE INDEX IX_Auditoria_Fecha ON Auditoria(created_at);
    PRINT 'Tabla Auditoria creada.';
END
GO
