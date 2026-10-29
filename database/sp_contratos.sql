/* =====================================================================================
   GimnasioDB – Módulo Membresías, Contratos, Pagos, Personal y Finanzas (Persona 3)
   Archivo  : sp_contratos.sql
   Tablas   : PlanMembresia, Contrato, Pago, Personal, Socio, Sede, Usuario
   Vistas   : vw_Reporte_Ingresos_Por_Sede
   Creado   : 2026-10-28
   Re-ejecutable: sí (CREATE OR ALTER VIEW / CREATE OR ALTER PROCEDURE)

   CONVENCIÓN DE NOMBRES (acorde al DDL):
     Cada atributo termina con el nombre de su tabla base:
     _planmembresia, _contrato, _pago, _personal, _socio, _sede.

   ── CÓDIGOS DE ERROR PARA THROW ────────────────────────────────────────────
     50010  No encontrado            – el registro buscado no existe en la BD
     50020  Conflicto                – duplicidad de RUT/correo o sobrepago de contrato
     50030  Regla de negocio / dato  – socio inactivo, contrato cancelado,
            inválido                   montos <= 0, fechas incoherentes, etc.
   ───────────────────────────────────────────────────────────────────────────
===================================================================================== */
USE [GimnasioDB];
GO

/* =====================================================================================
   1. VISTA OFICIAL: vw_Reporte_Ingresos_Por_Sede
   Propósito : Consolida la recaudación mensual y anual por cada sede del gimnasio
               uniendo Pago -> Contrato -> Socio -> Sede.
   Columnas  :
     - nombre_sede
     - anio_pago
     - mes_pago
     - total_ingresos
===================================================================================== */
CREATE OR ALTER VIEW [dbo].[vw_Reporte_Ingresos_Por_Sede] AS
SELECT 
    nombre_sede,
    YEAR(fecha_pago) AS anio_pago,
    MONTH(fecha_pago) AS mes_pago,
    SUM(monto_cancelado_pago) AS total_ingresos
FROM Pago
INNER JOIN Contrato ON id_contrato_pago = id_contrato
INNER JOIN Socio    ON id_socio_contrato = id_socio
INNER JOIN Sede     ON id_sede_registro_socio = id_sede
GROUP BY nombre_sede, YEAR(fecha_pago), MONTH(fecha_pago);
GO


/* =====================================================================================
   2. SP: sp_Emitir_Contrato_Con_Pago
   Propósito : Emite un contrato de membresía para un socio y registra su pago inicial
               en una única transacción atómica de Caja (ACID).
               Si el registro del pago falla, se revierte también la creación del contrato.

   Parámetros:
     @id_socio            INT            – ID del socio titular
     @id_planmembresia    INT            – ID del plan comercial contratado
     @fecha_inicio        DATE = NULL    – Fecha de inicio (por defecto hoy)
     @precio_pactado      DECIMAL(12,2) = NULL – Precio acordado (por defecto precio_vigente del plan)
     @monto_pago_inicial  DECIMAL(12,2) = NULL – Abono inicial (por defecto el total pactado)
     @medio_pago          VARCHAR(20) = 'Transferencia' – 'Efectivo', 'Tarjeta' o 'Transferencia'

   Validaciones:
     V1) El socio debe existir en la tabla Socio                  -> Error 50010
     V2) El socio debe encontrarse activo (activo_socio = 1)      -> Error 50030
     V3) El plan de membresía debe existir en PlanMembresia       -> Error 50010
     V4) El precio pactado debe ser >= 0                          -> Error 50030
     V5) El monto de pago inicial debe ser > 0 y <= precio_pactado-> Error 50030 / 50020
     V6) El medio de pago debe ser válido                         -> Error 50030
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Emitir_Contrato_Con_Pago]
    @id_socio            INT,
    @id_planmembresia    INT,
    @fecha_inicio        DATE = NULL,
    @precio_pactado      DECIMAL(12,2) = NULL,
    @monto_pago_inicial  DECIMAL(12,2) = NULL,
    @medio_pago          VARCHAR(20) = 'Transferencia'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @activo_socio BIT;
    DECLARE @nombre_socio NVARCHAR(150);
    DECLARE @nombre_plan  NVARCHAR(100);
    DECLARE @duracion_meses INT;
    DECLARE @precio_vigente DECIMAL(12,2);
    DECLARE @fecha_termino DATE;
    DECLARE @nuevo_id_contrato INT;
    DECLARE @nuevo_id_pago INT;
    DECLARE @fecha_pago_generada DATETIME2(7);

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1 y V2: Validar existencia y estado activo del socio ---------- */
        SELECT @activo_socio = activo_socio,
               @nombre_socio = nombre_completo_socio
        FROM Socio
        WHERE id_socio = @id_socio;

        IF @nombre_socio IS NULL
            THROW 50010, 'El socio especificado no existe en la base de datos.', 1;

        IF @activo_socio = 0
            THROW 50030, 'No se puede emitir un contrato para un socio inactivo.', 1;

        /* -- V3: Validar existencia del plan de membresía ------------------- */
        SELECT @nombre_plan    = nombre_planmembresia,
               @duracion_meses = duracion_meses_planmembresia,
               @precio_vigente = precio_vigente_planmembresia
        FROM PlanMembresia
        WHERE id_planmembresia = @id_planmembresia;

        IF @nombre_plan IS NULL
            THROW 50010, 'El plan de membresía especificado no existe.', 1;

        /* -- Determinar fechas y montos por defecto ------------------------- */
        IF @fecha_inicio IS NULL
            SET @fecha_inicio = CAST(SYSDATETIME() AS DATE);

        SET @fecha_termino = DATEADD(MONTH, @duracion_meses, @fecha_inicio);

        IF @precio_pactado IS NULL
            SET @precio_pactado = @precio_vigente;

        IF @precio_pactado < 0
            THROW 50030, 'El precio pactado del contrato no puede ser negativo.', 1;

        IF @monto_pago_inicial IS NULL
            SET @monto_pago_inicial = @precio_pactado;

        IF @monto_pago_inicial <= 0
            THROW 50030, 'El monto del pago inicial debe ser mayor a cero.', 1;

        IF @monto_pago_inicial > @precio_pactado
            THROW 50020, 'El monto del pago inicial no puede superar el precio pactado del contrato.', 1;

        IF @medio_pago NOT IN ('Transferencia', 'Tarjeta', 'Efectivo')
            THROW 50030, 'Medio de pago inválido. Use Transferencia, Tarjeta o Efectivo.', 1;

        /* -- 1. Insertar Contrato ------------------------------------------- */
        INSERT INTO Contrato (
            id_socio_contrato,
            id_planmembresia_contrato,
            fecha_inicio_contrato,
            fecha_termino_contrato,
            estado_contrato,
            precio_pactado_contrato
        )
        VALUES (
            @id_socio,
            @id_planmembresia,
            @fecha_inicio,
            @fecha_termino,
            'Vigente',
            @precio_pactado
        );

        SET @nuevo_id_contrato = SCOPE_IDENTITY();

        /* -- 2. Insertar Pago Inicial en la misma transacción --------------- */
        SET @fecha_pago_generada = SYSDATETIME();

        INSERT INTO Pago (
            id_contrato_pago,
            fecha_pago,
            monto_cancelado_pago,
            medio_pago
        )
        VALUES (
            @nuevo_id_contrato,
            @fecha_pago_generada,
            @monto_pago_inicial,
            @medio_pago
        );

        SET @nuevo_id_pago = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @nuevo_id_contrato AS id_contrato,
            @id_socio AS id_socio_contrato,
            @nombre_socio AS nombre_completo_socio,
            @id_planmembresia AS id_planmembresia_contrato,
            @nombre_plan AS nombre_planmembresia,
            @fecha_inicio AS fecha_inicio_contrato,
            @fecha_termino AS fecha_termino_contrato,
            'Vigente' AS estado_contrato,
            @precio_pactado AS precio_pactado_contrato,
            (@precio_pactado - @monto_pago_inicial) AS saldo_pendiente,
            @nuevo_id_pago AS id_pago,
            @fecha_pago_generada AS fecha_pago,
            @monto_pago_inicial AS monto_cancelado_pago,
            @medio_pago AS medio_pago;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   3. SP: sp_Registrar_Pago_Contrato
   Propósito : Registra un pago en caja para un contrato existente validando su estado
               y controlando que el abono sea válido.

   Parámetros:
     @id_contrato         INT           – ID del contrato a abonar
     @monto_cancelado     DECIMAL(12,2) – Monto a pagar (> 0)
     @medio_pago          VARCHAR(20)   – 'Transferencia', 'Tarjeta' o 'Efectivo'

   Validaciones:
     V1) El contrato debe existir                                 -> Error 50010
     V2) El contrato no puede estar en estado 'Cancelado'         -> Error 50030
     V3) El monto a pagar debe ser > 0                            -> Error 50030
     V4) El medio de pago debe ser válido                         -> Error 50030
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Registrar_Pago_Contrato]
    @id_contrato      INT,
    @monto_cancelado  DECIMAL(12,2),
    @medio_pago       VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @estado_contrato VARCHAR(20);
    DECLARE @precio_pactado  DECIMAL(12,2);
    DECLARE @nuevo_id_pago   INT;
    DECLARE @fecha_actual    DATETIME2(7);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @estado_contrato = estado_contrato,
               @precio_pactado  = precio_pactado_contrato
        FROM Contrato
        WHERE id_contrato = @id_contrato;

        IF @estado_contrato IS NULL
            THROW 50010, 'El contrato especificado no existe.', 1;

        IF @estado_contrato = 'Cancelado'
            THROW 50030, 'No se puede registrar un pago sobre un contrato en estado Cancelado.', 1;

        IF @monto_cancelado IS NULL OR @monto_cancelado <= 0
            THROW 50030, 'El monto cancelado debe ser mayor a cero.', 1;

        IF @medio_pago NOT IN ('Transferencia', 'Tarjeta', 'Efectivo')
            THROW 50030, 'Medio de pago inválido. Use Transferencia, Tarjeta o Efectivo.', 1;

        SET @fecha_actual = SYSDATETIME();

        INSERT INTO Pago (
            id_contrato_pago,
            fecha_pago,
            monto_cancelado_pago,
            medio_pago
        )
        VALUES (
            @id_contrato,
            @fecha_actual,
            @monto_cancelado,
            @medio_pago
        );

        SET @nuevo_id_pago = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            @nuevo_id_pago AS id_pago,
            @id_contrato AS id_contrato_pago,
            @fecha_actual AS fecha_pago,
            @monto_cancelado AS monto_cancelado_pago,
            @medio_pago AS medio_pago;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   4. SP: sp_Actualizar_Contratos_Vencidos
   Propósito : Actualiza a estado 'Vencido' todos los contratos que figuran como
               'Vigente' pero cuya fecha de término ya expiró respecto a la fecha actual.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Actualizar_Contratos_Vencidos]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @actualizados INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Contrato
        SET estado_contrato = 'Vencido'
        WHERE estado_contrato = 'Vigente'
          AND fecha_termino_contrato < CAST(SYSDATETIME() AS DATE);

        SET @actualizados = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT @actualizados AS contratos_actualizados;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
