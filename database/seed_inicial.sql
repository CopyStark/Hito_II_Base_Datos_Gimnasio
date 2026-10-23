-- =====================================================================================
-- GimnasioDB - Script T-SQL de Carga Inicial de Datos de Prueba (Seed)
-- 100% Sincronizado con el modelo oficial DDL (Hito 1)
-- 
-- Reglas:
-- 1. Pure T-SQL sin ORM.
-- 2. Manejo de integridad referencial con variables y SCOPE_IDENTITY().
-- 3. Transacción atómica segura con TRY...CATCH.
-- =====================================================================================

USE GimnasioDB;
GO

SET NOCOUNT ON;

BEGIN TRANSACTION;
BEGIN TRY

    -- Variables para capturar las identidades generadas
    DECLARE @id_region INT;
    DECLARE @id_provincia INT;
    DECLARE @id_comuna INT;
    DECLARE @id_ciudad INT;

    DECLARE @id_sede_central INT;
    DECLARE @id_sede_norte INT;

    DECLARE @id_plan_smart INT;
    DECLARE @id_plan_black INT;

    DECLARE @id_instructor_1 INT;
    DECLARE @id_instructor_2 INT;

    DECLARE @id_socio_daniel INT;
    DECLARE @id_socio_emilia INT;
    DECLARE @id_socio_yulissa INT;

    DECLARE @id_clase_crossfit INT;
    DECLARE @id_clase_spinning INT;

    DECLARE @id_sesion_1 INT;
    DECLARE @id_sesion_2 INT;

    DECLARE @id_contrato_daniel INT;
    DECLARE @id_contrato_emilia INT;

    -- =================================================================================
    -- 1. JERARQUÍA GEOGRÁFICA (1 Región -> 1 Provincia -> 1 Comuna -> 1 Ciudad)
    -- =================================================================================
    INSERT INTO Region (nombre) 
    VALUES (N'Región Metropolitana de Santiago');
    SET @id_region = SCOPE_IDENTITY();

    INSERT INTO Provincia (id_region, nombre) 
    VALUES (@id_region, N'Provincia de Santiago');
    SET @id_provincia = SCOPE_IDENTITY();

    INSERT INTO Comuna (id_provincia, nombre) 
    VALUES (@id_provincia, N'Santiago Centro');
    SET @id_comuna = SCOPE_IDENTITY();

    INSERT INTO Ciudad (id_comuna, nombre) 
    VALUES (@id_comuna, N'Santiago');
    SET @id_ciudad = SCOPE_IDENTITY();

    PRINT 'Jerarquía geográfica insertada correctamente.';

    -- =================================================================================
    -- 2. SEDES (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO Sede (nombre, direccion_calle, id_ciudad, telefono) 
    VALUES (N'Sede Central Moneda', N'Calle Moneda 1020', @id_ciudad, '+56 2 2345 6789');
    SET @id_sede_central = SCOPE_IDENTITY();

    INSERT INTO Sede (nombre, direccion_calle, id_ciudad, telefono) 
    VALUES (N'Sede Providencia Norte', N'Av. Providencia 1450', @id_ciudad, '+56 2 2987 6543');
    SET @id_sede_norte = SCOPE_IDENTITY();

    PRINT '2 Sedes insertadas correctamente.';

    -- =================================================================================
    -- 3. PLANES DE MEMBRESÍA (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO PlanMembresia (nombre, duracion_meses, precio_vigente) 
    VALUES (N'Plan Mensual Smart', 1, 29990.00);
    SET @id_plan_smart = SCOPE_IDENTITY();

    INSERT INTO PlanMembresia (nombre, duracion_meses, precio_vigente) 
    VALUES (N'Plan Anual Black VIP', 12, 289990.00);
    SET @id_plan_black = SCOPE_IDENTITY();

    PRINT '2 Planes de membresía insertados correctamente.';

    -- =================================================================================
    -- 4. INSTRUCTORES (Exactamente 2 registros)
    -- =================================================================================
    INSERT INTO Instructor (rut, nombre_completo, correo, telefono, id_sede_habitual) 
    VALUES ('15.432.876-1', N'Carlos Gutiérrez', 'carlos.gutierrez@gimnasiodb.cl', '+56 9 8111 2233', @id_sede_central);
    SET @id_instructor_1 = SCOPE_IDENTITY();

    INSERT INTO Instructor (rut, nombre_completo, correo, telefono, id_sede_habitual) 
    VALUES ('16.789.012-3', N'Valentina Ríos', 'valentina.rios@gimnasiodb.cl', '+56 9 8222 3344', @id_sede_norte);
    SET @id_instructor_2 = SCOPE_IDENTITY();

    PRINT '2 Instructores insertados correctamente.';

    -- =================================================================================
    -- 5. SOCIOS (Exactamente 3 registros: Daniel Matus, Emilia Osorio y Yulissa Ulloa)
    -- =================================================================================
    INSERT INTO Socio (rut, nombre_completo, fecha_nacimiento, correo, telefono, id_sede_registro, acepta_promociones, activo) 
    VALUES ('18.765.432-K', N'Daniel Matus', '1999-04-12', 'daniel.matus@alumnos.cl', '+56 9 9333 4455', @id_sede_central, 1, 1);
    SET @id_socio_daniel = SCOPE_IDENTITY();

    INSERT INTO Socio (rut, nombre_completo, fecha_nacimiento, correo, telefono, id_sede_registro, acepta_promociones, activo) 
    VALUES ('19.123.456-7', N'Emilia Osorio', '2000-08-25', 'emilia.osorio@alumnos.cl', '+56 9 9444 5566', @id_sede_norte, 1, 1);
    SET @id_socio_emilia = SCOPE_IDENTITY();

    INSERT INTO Socio (rut, nombre_completo, fecha_nacimiento, correo, telefono, id_sede_registro, acepta_promociones, activo) 
    VALUES ('19.987.654-3', N'Yulissa Ulloa', '2001-01-18', 'yulissa.ulloa@alumnos.cl', '+56 9 9555 6677', @id_sede_central, 0, 1);
    SET @id_socio_yulissa = SCOPE_IDENTITY();

    PRINT '3 Socios insertados correctamente (Daniel Matus, Emilia Osorio, Yulissa Ulloa).';

    -- =================================================================================
    -- 6. CLASES Y SESIONES (Datos para Persona 2)
    -- =================================================================================
    INSERT INTO Clase (nombre, duracion_minutos, nivel_exigencia) 
    VALUES (N'CrossFit Intensivo', 60, 'Avanzado');
    SET @id_clase_crossfit = SCOPE_IDENTITY();

    INSERT INTO Clase (nombre, duracion_minutos, nivel_exigencia) 
    VALUES (N'Spinning Cardio', 45, 'Intermedio');
    SET @id_clase_spinning = SCOPE_IDENTITY();

    INSERT INTO Sesion (id_clase, id_sede, id_instructor, fecha, hora, cupo_maximo) 
    VALUES (@id_clase_crossfit, @id_sede_central, @id_instructor_1, CAST(GETDATE() AS DATE), '09:00:00', 20);
    SET @id_sesion_1 = SCOPE_IDENTITY();

    INSERT INTO Sesion (id_clase, id_sede, id_instructor, fecha, hora, cupo_maximo) 
    VALUES (@id_clase_spinning, @id_sede_norte, @id_instructor_2, CAST(GETDATE() AS DATE), '18:30:00', 15);
    SET @id_sesion_2 = SCOPE_IDENTITY();

    PRINT 'Clases y Sesiones insertadas correctamente.';

    -- =================================================================================
    -- 7. CONTRATOS Y PAGOS (Datos para Persona 3)
    -- NOTA: Los contratos deben insertarse ANTES que las inscripciones
    --       porque el trigger trg_Inscripcion_Validaciones exige contrato vigente.
    -- =================================================================================
    INSERT INTO Contrato (id_socio, id_plan, fecha_inicio, fecha_termino, estado, precio_pactado) 
    VALUES (@id_socio_daniel, @id_plan_black, CAST(GETDATE() AS DATE), DATEADD(YEAR, 1, CAST(GETDATE() AS DATE)), 'Vigente', 289990.00);
    SET @id_contrato_daniel = SCOPE_IDENTITY();

    INSERT INTO Contrato (id_socio, id_plan, fecha_inicio, fecha_termino, estado, precio_pactado) 
    VALUES (@id_socio_emilia, @id_plan_smart, CAST(GETDATE() AS DATE), DATEADD(MONTH, 1, CAST(GETDATE() AS DATE)), 'Vigente', 29990.00);
    SET @id_contrato_emilia = SCOPE_IDENTITY();

    -- Pago de prueba
    INSERT INTO Pago (id_contrato, fecha_pago, monto_cancelado, medio_pago) 
    VALUES (@id_contrato_daniel, SYSDATETIME(), 289990.00, 'Transferencia');

    PRINT 'Contratos y Pagos insertados correctamente.';

    -- =================================================================================
    -- 8. INSCRIPCIONES (van después de los contratos, por el trigger de validación)
    -- =================================================================================
    -- Inscripción de prueba (Daniel ya tiene contrato vigente aquí)
    INSERT INTO Inscripcion (id_socio, id_sesion, fecha_inscripcion, asistio, observaciones, estado) 
    VALUES (@id_socio_daniel, @id_sesion_1, SYSDATETIME(), NULL, N'Inscripción inicial', 'Inscrito');

    PRINT 'Inscripciones insertadas correctamente.';

    -- Confirmación de la transacción
    COMMIT TRANSACTION;
    PRINT '=======================================================';
    PRINT 'Seed Inicial de GimnasioDB completado exitosamente.';
    PRINT '=======================================================';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END

    PRINT '=======================================================';
    PRINT 'ERROR durante la ejecución del Seed inicial:';
    PRINT ERROR_MESSAGE();
    PRINT '=======================================================';
    THROW;
END CATCH;
GO

-- -------------------------------------------------------------------------------------
-- COMPROBACIÓN VISUAL DE REGISTROS
-- -------------------------------------------------------------------------------------
SELECT 'Sedes' AS Entidad, COUNT(*) AS Total FROM Sede;
SELECT 'Planes' AS Entidad, COUNT(*) AS Total FROM PlanMembresia;
SELECT 'Instructores' AS Entidad, COUNT(*) AS Total FROM Instructor;
SELECT 'Socios' AS Entidad, COUNT(*) AS Total FROM Socio;
SELECT 'Clases' AS Entidad, COUNT(*) AS Total FROM Clase;
SELECT 'Sesiones' AS Entidad, COUNT(*) AS Total FROM Sesion;
SELECT 'Contratos' AS Entidad, COUNT(*) AS Total FROM Contrato;
SELECT 'Pagos' AS Entidad, COUNT(*) AS Total FROM Pago;
GO
