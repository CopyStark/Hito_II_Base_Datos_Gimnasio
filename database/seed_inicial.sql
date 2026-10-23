-- =====================================================================================
-- GimnasioDB - Script T-SQL de Carga Inicial de Datos de Prueba (Seed)
-- Responsable: Persona 1 (Esqueleto de Base de Datos y Datos de Prueba)
-- 
-- Reglas:
-- 1. Pure T-SQL sin ORM.
-- 2. Manejo de integridad referencial usando variables y SCOPE_IDENTITY().
-- 3. Ejecución dentro de una transacción segura con TRY...CATCH.
-- =====================================================================================

USE GimnasioDB;
GO

SET NOCOUNT ON;

-- -------------------------------------------------------------------------------------
-- DDL DE RESPALDO: Asegurar que las tablas existan con sus claves foráneas
-- (Si ya fueron creadas, este bloque no las altera)
-- -------------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Region')
BEGIN
    CREATE TABLE Region (
        id_region INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Provincia')
BEGIN
    CREATE TABLE Provincia (
        id_provincia INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        id_region INT NOT NULL FOREIGN KEY REFERENCES Region(id_region)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Comuna')
BEGIN
    CREATE TABLE Comuna (
        id_comuna INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        id_provincia INT NOT NULL FOREIGN KEY REFERENCES Provincia(id_provincia)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Ciudad')
BEGIN
    CREATE TABLE Ciudad (
        id_ciudad INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        id_comuna INT NOT NULL FOREIGN KEY REFERENCES Comuna(id_comuna)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Sede')
BEGIN
    CREATE TABLE Sede (
        id_sede INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        direccion VARCHAR(200) NOT NULL,
        telefono VARCHAR(25) NULL,
        id_comuna INT NOT NULL FOREIGN KEY REFERENCES Comuna(id_comuna)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlanMembresia')
BEGIN
    CREATE TABLE PlanMembresia (
        id_plan INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255) NULL,
        duracion_meses INT NOT NULL,
        precio DECIMAL(10, 2) NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Instructor')
BEGIN
    CREATE TABLE Instructor (
        id_instructor INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        rut VARCHAR(20) NOT NULL UNIQUE,
        especialidad VARCHAR(100) NOT NULL,
        email VARCHAR(150) NULL,
        telefono VARCHAR(25) NULL,
        id_sede INT NOT NULL FOREIGN KEY REFERENCES Sede(id_sede)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Socio')
BEGIN
    CREATE TABLE Socio (
        id_socio INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        rut VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL,
        telefono VARCHAR(25) NULL,
        fecha_nacimiento DATE NULL,
        fecha_registro DATETIME DEFAULT GETDATE(),
        estado VARCHAR(20) DEFAULT 'activo',
        id_comuna INT NULL FOREIGN KEY REFERENCES Comuna(id_comuna),
        id_sede INT NOT NULL FOREIGN KEY REFERENCES Sede(id_sede),
        id_plan INT NOT NULL FOREIGN KEY REFERENCES PlanMembresia(id_plan)
    );
END
GO

-- -------------------------------------------------------------------------------------
-- INSERCIÓN ATÓMICA DE DATOS DE PRUEBA (SEED)
-- -------------------------------------------------------------------------------------
BEGIN TRANSACTION;
BEGIN TRY

    -- Variables para almacenar los IDs generados dinámicamente
    DECLARE @id_region INT;
    DECLARE @id_provincia INT;
    DECLARE @id_comuna INT;
    DECLARE @id_ciudad INT;

    DECLARE @id_sede_centro INT;
    DECLARE @id_sede_norte INT;

    DECLARE @id_plan_smart INT;
    DECLARE @id_plan_black INT;

    -- =================================================================================
    -- 1. JERARQUÍA GEOGRÁFICA (1 Región -> 1 Provincia -> 1 Comuna -> 1 Ciudad)
    -- =================================================================================
    INSERT INTO Region (nombre) 
    VALUES ('Región Metropolitana de Santiago');
    SET @id_region = SCOPE_IDENTITY();

    INSERT INTO Provincia (nombre, id_region) 
    VALUES ('Provincia de Santiago', @id_region);
    SET @id_provincia = SCOPE_IDENTITY();

    INSERT INTO Comuna (nombre, id_provincia) 
    VALUES ('Santiago Centro', @id_provincia);
    SET @id_comuna = SCOPE_IDENTITY();

    INSERT INTO Ciudad (nombre, id_comuna) 
    VALUES ('Santiago', @id_comuna);
    SET @id_ciudad = SCOPE_IDENTITY();

    PRINT 'Jerarquía geográfica insertada correctamente.';

    -- =================================================================================
    -- 2. SEDES (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO Sede (nombre, direccion, telefono, id_comuna) 
    VALUES ('Sede Central Moneda', 'Calle Moneda 1020, Piso 2', '+56 2 2345 6789', @id_comuna);
    SET @id_sede_centro = SCOPE_IDENTITY();

    INSERT INTO Sede (nombre, direccion, telefono, id_comuna) 
    VALUES ('Sede Providencia Norte', 'Av. Providencia 1450', '+56 2 2987 6543', @id_comuna);
    SET @id_sede_norte = SCOPE_IDENTITY();

    PRINT '2 Sedes insertadas correctamente.';

    -- =================================================================================
    -- 3. PLANES DE MEMBRESÍA (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO PlanMembresia (nombre, descripcion, duracion_meses, precio) 
    VALUES ('Plan Mensual Smart', 'Acceso ilimitado a máquinas y cardio en sede de inscripción', 1, 29990.00);
    SET @id_plan_smart = SCOPE_IDENTITY();

    INSERT INTO PlanMembresia (nombre, descripcion, duracion_meses, precio) 
    VALUES ('Plan Anual Black VIP', 'Acceso multi-sede, clases grupales y evaluación nutricional', 12, 289990.00);
    SET @id_plan_black = SCOPE_IDENTITY();

    PRINT '2 Planes de membresía insertados correctamente.';

    -- =================================================================================
    -- 4. INSTRUCTORES (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO Instructor (nombre, apellido, rut, especialidad, email, telefono, id_sede) 
    VALUES ('Carlos', 'Gutiérrez', '15.432.876-1', 'CrossFit & Halterofilia', 'carlos.gutierrez@gimnasiodb.cl', '+56 9 8111 2233', @id_sede_centro);

    INSERT INTO Instructor (nombre, apellido, rut, especialidad, email, telefono, id_sede) 
    VALUES ('Valentina', 'Ríos', '16.789.012-3', 'Spinning & Yoga Funcional', 'valentina.rios@gimnasiodb.cl', '+56 9 8222 3344', @id_sede_norte);

    PRINT '2 Instructores insertados correctamente.';

    -- =================================================================================
    -- 5. SOCIOS (Exactamente 3 registros: Daniel Matus, Emilia Osorio y Yulissa Ulloa)
    -- =================================================================================
    -- Socio 1: Daniel Matus
    INSERT INTO Socio (nombre, apellido, rut, email, telefono, fecha_nacimiento, fecha_registro, estado, id_comuna, id_sede, id_plan) 
    VALUES (
        'Daniel', 
        'Matus', 
        '18.765.432-K', 
        'daniel.matus@alumnos.cl', 
        '+56 9 9333 4455', 
        '1999-04-12', 
        GETDATE(), 
        'activo', 
        @id_comuna, 
        @id_sede_centro, 
        @id_plan_black
    );

    -- Socio 2: Emilia Osorio
    INSERT INTO Socio (nombre, apellido, rut, email, telefono, fecha_nacimiento, fecha_registro, estado, id_comuna, id_sede, id_plan) 
    VALUES (
        'Emilia', 
        'Osorio', 
        '19.123.456-7', 
        'emilia.osorio@alumnos.cl', 
        '+56 9 9444 5566', 
        '2000-08-25', 
        GETDATE(), 
        'activo', 
        @id_comuna, 
        @id_sede_norte, 
        @id_plan_black
    );

    -- Socio 3: Yulissa Ulloa
    INSERT INTO Socio (nombre, apellido, rut, email, telefono, fecha_nacimiento, fecha_registro, estado, id_comuna, id_sede, id_plan) 
    VALUES (
        'Yulissa', 
        'Ulloa', 
        '19.987.654-3', 
        'yulissa.ulloa@alumnos.cl', 
        '+56 9 9555 6677', 
        '2001-01-18', 
        GETDATE(), 
        'activo', 
        @id_comuna, 
        @id_sede_centro, 
        @id_plan_smart
    );

    PRINT '3 Socios de prueba (Daniel Matus, Emilia Osorio y Yulissa Ulloa) insertados correctamente.';

    -- Confirmación de la transacción
    COMMIT TRANSACTION;
    PRINT '=======================================================';
    PRINT 'Seed Inicial de GimnasioDB completado exitosamente.';
    PRINT '=======================================================';

END TRY
BEGIN CATCH
    -- En caso de error, se revierte todo para evitar datos corruptos o parciales
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END

    PRINT '=======================================================';
    PRINT 'ERROR: No se pudo completar la carga del Seed inicial.';
    PRINT 'Detalle del Error: ' + ERROR_MESSAGE();
    PRINT 'Número de Error: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
    PRINT 'Línea del Error: ' + CAST(ERROR_LINE() AS VARCHAR(10));
    PRINT '=======================================================';
    THROW;
END CATCH;
GO

-- -------------------------------------------------------------------------------------
-- VERIFICACIÓN VISUAL DE LOS REGISTROS INSERTADOS
-- -------------------------------------------------------------------------------------
SELECT 'Sedes Insertadas' AS Entidad, COUNT(*) AS Cantidad FROM Sede;
SELECT 'Planes Insertados' AS Entidad, COUNT(*) AS Cantidad FROM PlanMembresia;
SELECT 'Instructores Insertados' AS Entidad, COUNT(*) AS Cantidad FROM Instructor;
SELECT 'Socios Insertados' AS Entidad, COUNT(*) AS Cantidad FROM Socio;

SELECT s.id_socio, s.nombre, s.apellido, s.rut, s.email, p.nombre AS plan_actual, sed.nombre AS sede_inscrita
FROM Socio s
INNER JOIN PlanMembresia p ON s.id_plan = p.id_plan
INNER JOIN Sede sed ON s.id_sede = sed.id_sede;
GO
