/* =====================================================================================
   GimnasioDB - Módulo de Auditoría y Triggers de Integridad (Triggers Set-Based)
   Archivo    : GimnasioDB_Triggers.sql
   Propósito  : Implementar auditoría automatizada y robusta orientada a conjuntos
                (set-based, multi-row) sobre las tablas críticas del sistema:
                1. LOG_CAMBIO_CONTRATO y Trigger trg_LogCambiosContrato (AFTER INSERT, UPDATE, DELETE).
                   Audita altas, bajas y modificaciones en estado y fecha de término de contratos.
                   La tabla de log NO tiene llave foránea hacia Contrato para conservar evidencia
                   histórica indeleble incluso ante sentencias DELETE.
                2. LOG_CAMBIO_INSCRIPCION y Trigger trg_LogCambiosInscripcion (AFTER INSERT, UPDATE, DELETE).
                   Audita altas, cancelaciones de reservas y cambios en el pase de asistencia
                   (asistio_inscripcion), permitiendo demostrar en vivo auditoría de operaciones web.
                3. Bloque de Pruebas Controladas (Unitarias y Multi-fila) con ROLLBACK
                   al final del script, utilizando proyecciones explícitas (sin SELECT *).
   ===================================================================================== */

USE [GimnasioDB];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- =====================================================================================
-- 1. TABLA DE AUDITORÍA: LOG_CAMBIO_CONTRATO
--    Nota de Diseño: Deliberadamente SIN FK hacia [Contrato] para conservar evidencia
--                    histórica y forense cuando un contrato es eliminado (DELETE).
-- =====================================================================================
IF OBJECT_ID('dbo.LOG_CAMBIO_CONTRATO', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[LOG_CAMBIO_CONTRATO] (
        [id_log]             INT IDENTITY(1,1) NOT NULL,
        [id_contrato]        INT               NOT NULL,
        [tipo_operacion]     VARCHAR(10)       NOT NULL,
        [fecha_cambio]       DATETIME2(7)      NOT NULL CONSTRAINT [DF_LOG_CAMBIO_CONTRATO_FECHA] DEFAULT SYSDATETIME(),
        [usuario_sql]        NVARCHAR(128)     NULL,
        [equipo_origen]      NVARCHAR(128)     NULL,
        [aplicacion_origen]  NVARCHAR(128)     NULL,
        [estado_anterior]    VARCHAR(20)       NULL,
        [estado_nuevo]       VARCHAR(20)       NULL,
        [fecha_fin_anterior] DATE              NULL,
        [fecha_fin_nueva]    DATE              NULL,
        CONSTRAINT [PK_LOG_CAMBIO_CONTRATO] PRIMARY KEY CLUSTERED ([id_log] ASC),
        CONSTRAINT [CK_LOG_CAMBIO_CONTRATO_TIPO] CHECK ([tipo_operacion] IN ('INSERT', 'UPDATE', 'DELETE'))
    );

    PRINT 'Tabla LOG_CAMBIO_CONTRATO creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla LOG_CAMBIO_CONTRATO ya existe. Omitiendo creación.';
END
GO

-- =====================================================================================
-- 2. TRIGGER SET-BASED: trg_LogCambiosContrato
--    Tipo      : AFTER INSERT, UPDATE, DELETE sobre [dbo].[Contrato]
--    Patrón    : Inserción orientada a conjuntos usando FULL OUTER JOIN entre
--                'inserted' (insertado) y 'deleted' (eliminado) por [id_contrato].
--    Auditoría : Registra INSERT, DELETE, o UPDATE cuando cambia estado o fecha de término.
-- =====================================================================================
CREATE OR ALTER TRIGGER [dbo].[trg_LogCambiosContrato]
ON [dbo].[Contrato]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Inserción set-based: procesa operaciones de 1 fila o de N filas simultáneas
    INSERT INTO [dbo].[LOG_CAMBIO_CONTRATO] (
        [id_contrato],
        [tipo_operacion],
        [fecha_cambio],
        [usuario_sql],
        [equipo_origen],
        [aplicacion_origen],
        [estado_anterior],
        [estado_nuevo],
        [fecha_fin_anterior],
        [fecha_fin_nueva]
    )
    SELECT
        COALESCE(insertado.id_contrato, eliminado.id_contrato) AS [id_contrato],
        CASE 
            WHEN eliminado.id_contrato IS NULL THEN 'INSERT'
            WHEN insertado.id_contrato IS NULL THEN 'DELETE'
            ELSE 'UPDATE'
        END AS [tipo_operacion],
        SYSDATETIME() AS [fecha_cambio],
        ORIGINAL_LOGIN() AS [usuario_sql],
        HOST_NAME() AS [equipo_origen],
        APP_NAME() AS [aplicacion_origen],
        eliminado.estado_contrato AS [estado_anterior],
        insertado.estado_contrato AS [estado_nuevo],
        eliminado.fecha_termino_contrato AS [fecha_fin_anterior],
        insertado.fecha_termino_contrato AS [fecha_fin_nueva]
    FROM inserted AS insertado
    FULL OUTER JOIN deleted AS eliminado
        ON insertado.id_contrato = eliminado.id_contrato
    WHERE eliminado.id_contrato IS NULL                                                         -- Operación INSERT
       OR insertado.id_contrato IS NULL                                                         -- Operación DELETE
       OR ISNULL(insertado.estado_contrato, '') <> ISNULL(eliminado.estado_contrato, '')         -- Cambio en estado_contrato
       OR ISNULL(insertado.fecha_termino_contrato, '1900-01-01') <> ISNULL(eliminado.fecha_termino_contrato, '1900-01-01'); -- Cambio en fecha de término
END;
GO

PRINT 'Trigger trg_LogCambiosContrato creado/actualizado exitosamente.';
GO


-- =====================================================================================
-- 3. TABLA DE AUDITORÍA: LOG_CAMBIO_INSCRIPCION
--    Nota de Diseño: Deliberadamente SIN FK hacia [Inscripcion] para conservar
--                    trazabilidad ante desinscripciones o cancelaciones de alumnos.
-- =====================================================================================
IF OBJECT_ID('dbo.LOG_CAMBIO_INSCRIPCION', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[LOG_CAMBIO_INSCRIPCION] (
        [id_log]            INT IDENTITY(1,1) NOT NULL,
        [id_inscripcion]    INT               NOT NULL,
        [tipo_operacion]    VARCHAR(10)       NOT NULL,
        [fecha_cambio]      DATETIME2(7)      NOT NULL CONSTRAINT [DF_LOG_CAMBIO_INSCRIPCION_FECHA] DEFAULT SYSDATETIME(),
        [usuario_sql]       NVARCHAR(128)     NULL,
        [equipo_origen]     NVARCHAR(128)     NULL,
        [aplicacion_origen] NVARCHAR(128)     NULL,
        [estado_anterior]   VARCHAR(20)       NULL,
        [estado_nuevo]      VARCHAR(20)       NULL,
        [asistio_anterior]  BIT               NULL,
        [asistio_nuevo]     BIT               NULL,
        CONSTRAINT [PK_LOG_CAMBIO_INSCRIPCION] PRIMARY KEY CLUSTERED ([id_log] ASC),
        CONSTRAINT [CK_LOG_CAMBIO_INSCRIPCION_TIPO] CHECK ([tipo_operacion] IN ('INSERT', 'UPDATE', 'DELETE'))
    );

    PRINT 'Tabla LOG_CAMBIO_INSCRIPCION creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla LOG_CAMBIO_INSCRIPCION ya existe. Omitiendo creación.';
END
GO

-- =====================================================================================
-- 4. TRIGGER SET-BASED: trg_LogCambiosInscripcion
--    Tipo      : AFTER INSERT, UPDATE, DELETE sobre [dbo].[Inscripcion]
--    Patrón    : Inserción orientada a conjuntos usando FULL OUTER JOIN entre
--                'inserted' (insertado) y 'deleted' (eliminado) por [id_inscripcion].
--    Auditoría : Registra INSERT, DELETE, y UPDATE cuando cambia el estado de inscripción
--                (ej. 'Cancelado' por el socio) o el pase de asistencia (asistio_inscripcion
--                actualizado por el instructor en sala).
-- =====================================================================================
CREATE OR ALTER TRIGGER [dbo].[trg_LogCambiosInscripcion]
ON [dbo].[Inscripcion]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Inserción set-based multi-fila
    INSERT INTO [dbo].[LOG_CAMBIO_INSCRIPCION] (
        [id_inscripcion],
        [tipo_operacion],
        [fecha_cambio],
        [usuario_sql],
        [equipo_origen],
        [aplicacion_origen],
        [estado_anterior],
        [estado_nuevo],
        [asistio_anterior],
        [asistio_nuevo]
    )
    SELECT
        COALESCE(insertado.id_inscripcion, eliminado.id_inscripcion) AS [id_inscripcion],
        CASE 
            WHEN eliminado.id_inscripcion IS NULL THEN 'INSERT'
            WHEN insertado.id_inscripcion IS NULL THEN 'DELETE'
            ELSE 'UPDATE'
        END AS [tipo_operacion],
        SYSDATETIME() AS [fecha_cambio],
        ORIGINAL_LOGIN() AS [usuario_sql],
        HOST_NAME() AS [equipo_origen],
        APP_NAME() AS [aplicacion_origen],
        eliminado.estado_inscripcion AS [estado_anterior],
        insertado.estado_inscripcion AS [estado_nuevo],
        eliminado.asistio_inscripcion AS [asistio_anterior],
        insertado.asistio_inscripcion AS [asistio_nuevo]
    FROM inserted AS insertado
    FULL OUTER JOIN deleted AS eliminado
        ON insertado.id_inscripcion = eliminado.id_inscripcion
    WHERE eliminado.id_inscripcion IS NULL                                                 -- Operación INSERT
       OR insertado.id_inscripcion IS NULL                                                 -- Operación DELETE
       OR ISNULL(insertado.estado_inscripcion, '') <> ISNULL(eliminado.estado_inscripcion, '') -- Cancelación / Reactivación
       OR ISNULL(insertado.asistio_inscripcion, 2) <> ISNULL(eliminado.asistio_inscripcion, 2); -- Pase de Asistencia (NULL -> 1/0)
END;
GO

PRINT 'Trigger trg_LogCambiosInscripcion creado/actualizado exitosamente.';
GO


-- =====================================================================================
-- 5. BLOQUE DE PRUEBAS CONTROLADAS (UNITARIAS Y MULTI-FILA CON ROLLBACK)
--    Regla: Prohibido SELECT *. Se utilizan proyecciones explícitas de atributos.
--    Toda la prueba se ejecuta dentro de transacciones que finalizan con ROLLBACK
--    para no alterar el estado de producción ni dejar registros residuales.
-- =====================================================================================

PRINT '-------------------------------------------------------------------------';
PRINT 'Iniciando Pruebas Controladas de Triggers en GimnasioDB...';
PRINT '-------------------------------------------------------------------------';

-- =====================================================================================
-- PRUEBA 1: Trigger de Contrato - Caso Fila Única (INSERT -> UPDATE -> DELETE)
-- =====================================================================================
PRINT '>> [PRUEBA 1] Contrato: Auditoría de 1 Fila (INSERT, UPDATE y DELETE)...';

BEGIN TRANSACTION;

    DECLARE @id_socio_test INT, @id_plan_test INT;
    SELECT TOP 1 @id_socio_test = id_socio FROM Socio WHERE activo_socio = 1 ORDER BY id_socio;
    SELECT TOP 1 @id_plan_test = id_planmembresia FROM PlanMembresia ORDER BY id_planmembresia;

    -- A) INSERT de 1 Contrato
    DECLARE @id_contrato_creado INT;
    INSERT INTO Contrato (
        id_socio_contrato,
        id_planmembresia_contrato,
        fecha_inicio_contrato,
        fecha_termino_contrato,
        estado_contrato,
        precio_pactado_contrato
    )
    VALUES (
        @id_socio_test,
        @id_plan_test,
        CAST(GETDATE() AS DATE),
        DATEADD(MONTH, 1, CAST(GETDATE() AS DATE)),
        'Vigente',
        29990.00
    );
    SET @id_contrato_creado = SCOPE_IDENTITY();

    -- B) UPDATE de estado y extensión de fecha de término
    UPDATE Contrato
    SET estado_contrato = 'Cancelado',
        fecha_termino_contrato = DATEADD(DAY, 15, fecha_termino_contrato)
    WHERE id_contrato = @id_contrato_creado;

    -- C) DELETE del contrato (demuestra persistencia de evidencia en tabla de log sin FK)
    -- (Eliminamos primero pagos asociados si los hubiera para evitar error de FK en Pago)
    DELETE FROM Pago WHERE id_contrato_pago = @id_contrato_creado;
    DELETE FROM Contrato WHERE id_contrato = @id_contrato_creado;

    -- Verificación de evidencia registrada en LOG_CAMBIO_CONTRATO (Sin SELECT *)
    PRINT 'Resultados auditados en LOG_CAMBIO_CONTRATO para contrato de prueba:';
    SELECT 
        id_log,
        id_contrato,
        tipo_operacion,
        fecha_cambio,
        usuario_sql,
        equipo_origen,
        aplicacion_origen,
        estado_anterior,
        estado_nuevo,
        fecha_fin_anterior,
        fecha_fin_nueva
    FROM LOG_CAMBIO_CONTRATO
    WHERE id_contrato = @id_contrato_creado
    ORDER BY id_log ASC;

ROLLBACK TRANSACTION;
PRINT '>> [PRUEBA 1] Finalizada y revertida exitosamente con ROLLBACK.';


-- =====================================================================================
-- PRUEBA 2: Trigger de Contrato - Caso Multi-Fila (Set-Based Multi-Row)
-- =====================================================================================
PRINT '>> [PRUEBA 2] Contrato: Auditoría Multi-Fila simultánea (Set-Based)...';

BEGIN TRANSACTION;

    DECLARE @plan_multi INT;
    SELECT TOP 1 @plan_multi = id_planmembresia FROM PlanMembresia ORDER BY id_planmembresia;

    -- Tabla temporal para capturar IDs generados en la inserción en bloque
    CREATE TABLE #ContratosMulti (id_contrato INT NOT NULL);

    -- Inserción multi-fila en una sola sentencia SQL
    INSERT INTO Contrato (
        id_socio_contrato,
        id_planmembresia_contrato,
        fecha_inicio_contrato,
        fecha_termino_contrato,
        estado_contrato,
        precio_pactado_contrato
    )
    OUTPUT inserted.id_contrato INTO #ContratosMulti (id_contrato)
    SELECT TOP 3
        id_socio,
        @plan_multi,
        CAST(GETDATE() AS DATE),
        DATEADD(MONTH, 3, CAST(GETDATE() AS DATE)),
        'Vigente',
        49990.00
    FROM Socio
    WHERE activo_socio = 1
    ORDER BY id_socio ASC;

    -- Actualización multi-fila simultánea en una sola sentencia SQL
    UPDATE Contrato
    SET estado_contrato = 'Cancelado'
    WHERE id_contrato IN (SELECT id_contrato FROM #ContratosMulti);

    -- Verificación de evidencia capturada en lote por el trigger
    PRINT 'Resultados auditados multi-fila en LOG_CAMBIO_CONTRATO:';
    SELECT 
        l.id_log,
        l.id_contrato,
        l.tipo_operacion,
        l.fecha_cambio,
        l.estado_anterior,
        l.estado_nuevo,
        l.fecha_fin_anterior,
        l.fecha_fin_nueva
    FROM LOG_CAMBIO_CONTRATO l
    INNER JOIN #ContratosMulti m ON m.id_contrato = l.id_contrato
    ORDER BY l.id_contrato ASC, l.id_log ASC;

    DROP TABLE #ContratosMulti;

ROLLBACK TRANSACTION;
PRINT '>> [PRUEBA 2] Finalizada y revertida exitosamente con ROLLBACK.';


-- =====================================================================================
-- PRUEBA 3: Trigger de Inscripción - Caso Pase de Asistencia y Cancelación
-- =====================================================================================
PRINT '>> [PRUEBA 3] Inscripción: Auditoría de Pase de Asistencia y Cancelación Web...';

BEGIN TRANSACTION;

    DECLARE @socio_ins INT, @sesion_ins INT;
    SELECT TOP 1 @socio_ins = id_socio FROM Socio WHERE activo_socio = 1 ORDER BY id_socio DESC;
    SELECT TOP 1 @sesion_ins = id_sesion FROM Sesion ORDER BY id_sesion DESC;

    -- A) INSERT de Inscripción
    DECLARE @id_inscripcion_creada INT;
    INSERT INTO Inscripcion (
        id_socio_inscripcion,
        id_sesion_inscripcion,
        fecha_inscripcion,
        asistio_inscripcion,
        observaciones_inscripcion,
        estado_inscripcion
    )
    VALUES (
        @socio_ins,
        @sesion_ins,
        SYSDATETIME(),
        NULL, -- Pendiente de pase de asistencia
        N'Inscripción de prueba controlada',
        'Inscrito'
    );
    SET @id_inscripcion_creada = SCOPE_IDENTITY();

    -- B) UPDATE de Pase de Asistencia por el Instructor (asistio = 1)
    UPDATE Inscripcion
    SET asistio_inscripcion = 1,
        observaciones_inscripcion = N'Asistencia registrada en sala'
    WHERE id_inscripcion = @id_inscripcion_creada;

    -- C) UPDATE de Cancelación por el Socio (estado = 'Cancelado')
    UPDATE Inscripcion
    SET estado_inscripcion = 'Cancelado',
        observaciones_inscripcion = N'Socio canceló reserva vía portal'
    WHERE id_inscripcion = @id_inscripcion_creada;

    -- Verificación de evidencia registrada en LOG_CAMBIO_INSCRIPCION (Sin SELECT *)
    PRINT 'Resultados auditados en LOG_CAMBIO_INSCRIPCION:';
    SELECT 
        id_log,
        id_inscripcion,
        tipo_operacion,
        fecha_cambio,
        usuario_sql,
        equipo_origen,
        aplicacion_origen,
        estado_anterior,
        estado_nuevo,
        asistio_anterior,
        asistio_nuevo
    FROM LOG_CAMBIO_INSCRIPCION
    WHERE id_inscripcion = @id_inscripcion_creada
    ORDER BY id_log ASC;

ROLLBACK TRANSACTION;
PRINT '>> [PRUEBA 3] Finalizada y revertida exitosamente con ROLLBACK.';

PRINT '=========================================================================';
PRINT 'Todos los triggers y pruebas de auditoría de GimnasioDB han concluido OK.';
PRINT '=========================================================================';
GO
