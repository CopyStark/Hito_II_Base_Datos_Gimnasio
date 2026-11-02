/* =====================================================================================
   GimnasioDB – Módulo Acceso, Socios y Sedes (Persona 1 - Carlos)
   Archivo  : sp_socios.sql
   Tablas   : Socio, Usuario, Rol, Sede, Ciudad, Contrato, PlanMembresia
   Vistas   : vw_Reporte_Socios_Por_Sede
   Creado   : 2026-10-30
   Re-ejecutable: sí (CREATE OR ALTER VIEW / CREATE OR ALTER PROCEDURE)

   CONVENCIÓN DE NOMBRES (acorde al DDL):
     Cada atributo termina con el nombre de su tabla base:
     _socio, _usuario, _rol, _sede, _contrato, _planmembresia.

   ── CÓDIGOS DE ERROR PARA THROW ────────────────────────────────────────────
     50010  No encontrado            – el registro buscado no existe en la BD
     50020  Conflicto                – duplicidad de RUT, correo o username
     50030  Regla de negocio / dato  – socio inactivo, credenciales inválidas,
            inválido                   datos vacíos, etc.
   ───────────────────────────────────────────────────────────────────────────
===================================================================================== */
USE [GimnasioDB];
GO

/* =====================================================================================
   1. VISTA OFICIAL: vw_Reporte_Socios_Por_Sede
   Propósito : Consolida la distribución de socios por cada sucursal y estado de contrato
               (Vigente, Vencido, Cancelado o Sin Contrato).
===================================================================================== */
CREATE OR ALTER VIEW [dbo].[vw_Reporte_Socios_Por_Sede] AS
SELECT 
    nombre_sede,
    estado_contrato,
    COUNT(DISTINCT id_socio) AS cantidad_socios
FROM Sede
INNER JOIN Socio    ON id_sede = id_sede_registro_socio
LEFT  JOIN Contrato ON id_socio = id_socio_contrato
GROUP BY nombre_sede, estado_contrato;
GO


/* =====================================================================================
   2. SP: sp_Registrar_Socio
   Propósito : Registra un nuevo socio validando la existencia de la sede de registro y
               la unicidad de RUT y correo electrónico dentro de una transacción segura.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Registrar_Socio]
    @rut_socio                VARCHAR(12),
    @nombre_completo_socio    NVARCHAR(150),
    @fecha_nacimiento_socio   DATE,
    @correo_socio             VARCHAR(100),
    @telefono_socio           VARCHAR(20),
    @id_sede_registro_socio   INT,
    @acepta_promociones_socio BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @nuevo_id_socio INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: Validar existencia de la sede ------------------------------ */
        IF NOT EXISTS (SELECT 1 FROM Sede WHERE id_sede = @id_sede_registro_socio)
            THROW 50010, 'La sede de registro especificada no existe.', 1;

        /* -- V2: Validar unicidad de RUT y Correo --------------------------- */
        IF EXISTS (
            SELECT 1 FROM Socio 
            WHERE rut_socio = LTRIM(RTRIM(@rut_socio)) 
               OR correo_socio = LTRIM(RTRIM(@correo_socio))
        )
            THROW 50020, 'Ya existe un socio registrado con el mismo RUT o Correo electrónico.', 1;

        /* -- Insertar Socio ------------------------------------------------- */
        INSERT INTO Socio (
            rut_socio,
            nombre_completo_socio,
            fecha_nacimiento_socio,
            correo_socio,
            telefono_socio,
            id_sede_registro_socio,
            acepta_promociones_socio,
            activo_socio
        )
        VALUES (
            LTRIM(RTRIM(@rut_socio)),
            LTRIM(RTRIM(@nombre_completo_socio)),
            @fecha_nacimiento_socio,
            LTRIM(RTRIM(@correo_socio)),
            LTRIM(RTRIM(@telefono_socio)),
            @id_sede_registro_socio,
            @acepta_promociones_socio,
            1
        );

        SET @nuevo_id_socio = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT 
            id_socio,
            rut_socio,
            nombre_completo_socio,
            fecha_nacimiento_socio,
            correo_socio,
            telefono_socio,
            id_sede_registro_socio,
            acepta_promociones_socio,
            activo_socio
        FROM Socio
        WHERE id_socio = @nuevo_id_socio;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   3. SP: sp_Asignar_Credenciales_Socio
   Propósito : Crea o actualiza las credenciales de acceso de un socio en la tabla
               [Usuario] aplicando cifrado nativo HASHBYTES('SHA2_512', @password).
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Asignar_Credenciales_Socio]
    @id_socio          INT,
    @username_usuario  VARCHAR(50),
    @password          VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @id_rol_socio INT;
    DECLARE @id_usuario_existente INT;
    DECLARE @id_usuario_final INT;
    DECLARE @accion VARCHAR(20);

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: Validar que el socio exista -------------------------------- */
        IF NOT EXISTS (SELECT 1 FROM Socio WHERE id_socio = @id_socio)
            THROW 50010, 'El socio especificado no existe.', 1;

        /* -- V2: Validar que el username no esté en uso por otro usuario ---- */
        IF EXISTS (
            SELECT 1 FROM Usuario 
            WHERE username_usuario = LTRIM(RTRIM(@username_usuario))
              AND (id_socio_usuario IS NULL OR id_socio_usuario <> @id_socio)
        )
            THROW 50020, 'El nombre de usuario especificado ya se encuentra en uso.', 1;

        /* -- Obtener Rol 'Socio' -------------------------------------------- */
        SELECT @id_rol_socio = id_rol FROM Rol WHERE nombre_rol = N'Socio';
        IF @id_rol_socio IS NULL
            SET @id_rol_socio = 5;

        SELECT @id_usuario_existente = id_usuario 
        FROM Usuario 
        WHERE id_socio_usuario = @id_socio;

        IF @id_usuario_existente IS NOT NULL
        BEGIN
            UPDATE Usuario
            SET username_usuario      = LTRIM(RTRIM(@username_usuario)),
                password_hash_usuario = HASHBYTES('SHA2_512', @password),
                id_rol_usuario        = @id_rol_socio
            WHERE id_socio_usuario = @id_socio;

            SET @id_usuario_final = @id_usuario_existente;
            SET @accion = 'Actualizadas';
        END
        ELSE
        BEGIN
            INSERT INTO Usuario (
                username_usuario,
                password_hash_usuario,
                id_rol_usuario,
                id_socio_usuario
            )
            VALUES (
                LTRIM(RTRIM(@username_usuario)),
                HASHBYTES('SHA2_512', @password),
                @id_rol_socio,
                @id_socio
            );

            SET @id_usuario_final = SCOPE_IDENTITY();
            SET @accion = 'Creadas';
        END

        COMMIT TRANSACTION;

        SELECT 
            @id_usuario_final AS id_usuario,
            @id_socio AS id_socio,
            LTRIM(RTRIM(@username_usuario)) AS username_usuario,
            @accion AS accion;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   4. SP: sp_Validar_Acceso_Torniquete
   Propósito : Resuelve en tiempo real si un socio (por ID numérico o por RUT) tiene
               autorización para ingresar por el torniquete de recepción, verificando:
               1) Existencia del socio.
               2) Estado activo (activo_socio = 1).
               3) Existencia de al menos un contrato 'Vigente' cuya fecha de término
                  sea mayor o igual a la fecha actual.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Validar_Acceso_Torniquete]
    @identificador VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id_buscado INT = TRY_CAST(LTRIM(RTRIM(@identificador)) AS INT);
    DECLARE @rut_buscado VARCHAR(12) = LTRIM(RTRIM(@identificador));

    SELECT TOP 1
        s.id_socio,
        s.rut_socio,
        s.nombre_completo_socio,
        sed.nombre_sede AS sede_registro,
        s.activo_socio,
        c.id_contrato,
        c.estado_contrato,
        c.fecha_termino_contrato,
        p.nombre_planmembresia AS nombre_plan,
        CASE 
            WHEN s.activo_socio = 0 THEN CAST(0 AS BIT)
            WHEN c.id_contrato IS NULL THEN CAST(0 AS BIT)
            ELSE CAST(1 AS BIT)
        END AS acceso_permitido,
        CASE 
            WHEN s.activo_socio = 0 THEN N'Acceso DENEGADO: El socio se encuentra desactivado en el sistema.'
            WHEN c.id_contrato IS NULL THEN N'Acceso DENEGADO: El socio no posee un contrato o membresía vigente al día de hoy.'
            ELSE CONCAT(N'Acceso PERMITIDO: Membresía ''', p.nombre_planmembresia, N''' vigente hasta ', CONVERT(VARCHAR(10), c.fecha_termino_contrato, 23), N'.')
        END AS motivo
    FROM Socio s
    INNER JOIN Sede sed ON s.id_sede_registro_socio = sed.id_sede
    LEFT  JOIN Contrato c ON s.id_socio = c.id_socio_contrato
                         AND c.estado_contrato = 'Vigente'
                         AND c.fecha_termino_contrato >= CAST(GETDATE() AS DATE)
    LEFT  JOIN PlanMembresia p ON c.id_planmembresia_contrato = p.id_planmembresia
    WHERE (s.id_socio = @id_buscado OR s.rut_socio = @rut_buscado)
    ORDER BY c.fecha_termino_contrato DESC;
END;
GO

