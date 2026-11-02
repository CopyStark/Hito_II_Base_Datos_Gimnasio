/* =====================================================================================
   GimnasioDB – Módulo Personal y Finanzas por Sede (Persona 3)
   Archivo  : sp_personal.sql
   Tablas   : Personal, Sede, Usuario
   Re-ejecutable: sí (CREATE OR ALTER VIEW / CREATE OR ALTER PROCEDURE)

   CONVENCIÓN DE NOMBRES (acorde al DDL):
     Cada atributo termina con el nombre de su tabla base:
     id_personal, rut_personal, nombre_completo_personal, correo_personal,
     telefono_personal, cargo_personal, id_sede_personal, nombre_sede.

   ── CÓDIGOS DE ERROR PARA THROW ────────────────────────────────────────────
     50010  No encontrado            – el registro buscado no existe en la BD
     50020  Conflicto                – duplicidad de RUT o correo en Personal
     50030  Regla de negocio / dato  – datos vacíos o cargo inválido
   ───────────────────────────────────────────────────────────────────────────
===================================================================================== */
USE [GimnasioDB];
GO

/* =====================================================================================
   1. VISTA vw_Nomina_Personal_Sede
   Propósito : Muestra la nómina de personal administrativo y operativo del gimnasio
               junto con el nombre y ciudad de su sede asignada.
===================================================================================== */
CREATE OR ALTER VIEW [dbo].[vw_Nomina_Personal_Sede] AS
SELECT
    p.id_personal,
    p.rut_personal,
    p.nombre_completo_personal,
    p.correo_personal,
    p.telefono_personal,
    p.cargo_personal,
    p.id_sede_personal,
    s.nombre_sede
FROM Personal AS p
INNER JOIN Sede AS s ON p.id_sede_personal = s.id_sede;
GO

/* =====================================================================================
   2. SP: sp_Registrar_Personal
   Propósito : Registra un nuevo funcionario en la tabla [Personal] validando
               existencia de sede y unicidad de RUT y correo electrónico.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Registrar_Personal]
    @rut_personal             VARCHAR(12),
    @nombre_completo_personal NVARCHAR(150),
    @correo_personal          VARCHAR(100),
    @telefono_personal        VARCHAR(20),
    @cargo_personal           NVARCHAR(50),
    @id_sede_personal         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @nombre_sede NVARCHAR(100);
    DECLARE @nuevo_id_personal INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @nombre_sede = nombre_sede
        FROM Sede
        WHERE id_sede = @id_sede_personal;

        IF @nombre_sede IS NULL
            THROW 50010, 'La sede especificada para el personal no existe.', 1;

        IF EXISTS (
            SELECT 1 FROM Personal
            WHERE rut_personal = @rut_personal OR correo_personal = @correo_personal
        )
            THROW 50020, 'Ya existe un integrante del personal registrado con el mismo RUT o correo.', 1;

        INSERT INTO Personal (
            rut_personal,
            nombre_completo_personal,
            correo_personal,
            telefono_personal,
            cargo_personal,
            id_sede_personal
        )
        VALUES (
            @rut_personal,
            @nombre_completo_personal,
            @correo_personal,
            @telefono_personal,
            @cargo_personal,
            @id_sede_personal
        );

        SET @nuevo_id_personal = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT
            @nuevo_id_personal AS id_personal,
            @rut_personal AS rut_personal,
            @nombre_completo_personal AS nombre_completo_personal,
            @correo_personal AS correo_personal,
            @telefono_personal AS telefono_personal,
            @cargo_personal AS cargo_personal,
            @id_sede_personal AS id_sede_personal,
            @nombre_sede AS nombre_sede;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO
