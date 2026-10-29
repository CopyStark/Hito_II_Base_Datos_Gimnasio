/* =====================================================================================
   GimnasioDB – Módulo Equipamiento e Instructores
   Archivo  : sp_equipos.sql
   Tablas   : Equipamiento, Sede, Instructor, Sesion, Clase, Inscripcion
   Re-ejecutable: sí (CREATE OR ALTER VIEW / CREATE OR ALTER PROCEDURE)

   CONVENCIÓN DE NOMBRES (acorde al DDL):
     Cada atributo termina con el nombre de su tabla base.
     Ejemplos: id_equipamiento, id_sede_equipamiento, nombre_descriptivo_equipamiento,
               fecha_adquisicion_equipamiento, nombre_sede, id_instructor_sesion.

   ── CÓDIGOS DE ERROR PARA THROW ────────────────────────────────────────────
     50010  No encontrado            – el registro buscado no existe en la BD
     50020  Conflicto                – conflicto de concurrencia o duplicidad
     50030  Regla de negocio / dato  – datos vacíos, fechas futuras inválidas,
            inválido                   rangos incoherentes, etc.
   ───────────────────────────────────────────────────────────────────────────
===================================================================================== */
USE [GimnasioDB];
GO

/* =====================================================================================
   1. VISTA vw_Inventario_Equipos
   Propósito : Muestra el catálogo de equipamiento del gimnasio con el nombre
               de la sede a la que pertenece y su antigüedad calculada en años.
   Columnas  :
     - id_equipamiento
     - nombre_descriptivo_equipamiento
     - nombre_sede
     - id_sede_equipamiento
     - fecha_adquisicion_equipamiento
     - antiguedad_anios (DATEDIFF en años respecto a la fecha actual)
===================================================================================== */
CREATE OR ALTER VIEW [dbo].[vw_Inventario_Equipos] AS
SELECT
    e.id_equipamiento,
    e.nombre_descriptivo_equipamiento,
    s.nombre_sede,
    e.id_sede_equipamiento,
    e.fecha_adquisicion_equipamiento,
    DATEDIFF(YEAR, e.fecha_adquisicion_equipamiento, CAST(SYSDATETIME() AS DATE)) AS antiguedad_anios
FROM Equipamiento AS e
INNER JOIN Sede   AS s ON e.id_sede_equipamiento = s.id_sede;
GO


/* =====================================================================================
   2. SP sp_Registrar_Equipamiento
   Propósito : Inserta un nuevo equipamiento asignado a una sede existente.

   Parámetros:
     @id_sede            INT            – ID de la sede a la cual se asigna el equipo
     @nombre             NVARCHAR(150)  – Nombre descriptivo del equipamiento
     @fecha_adquisicion  DATE           – Fecha de compra/adquisición del equipo

   Validaciones (en orden):
     V1) La sede debe existir en la tabla Sede                     -> Error 50010
     V2) El nombre no puede ser nulo ni estar en blanco           -> Error 50030
     V3) La fecha de adquisición no puede ser futura              -> Error 50030

   Salida: SELECT con el id_equipamiento generado (SCOPE_IDENTITY).
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Registrar_Equipamiento]
    @id_sede            INT,
    @nombre             NVARCHAR(150),
    @fecha_adquisicion  DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @nuevo_id INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: La sede debe existir -------------------------------------- */
        IF NOT EXISTS (SELECT 1 FROM Sede WHERE id_sede = @id_sede)
            THROW 50010, 'Sede no encontrada.', 1;

        /* -- V2: El nombre no puede venir vacío ----------------------------- */
        IF @nombre IS NULL OR LTRIM(RTRIM(@nombre)) = ''
            THROW 50030, 'El nombre descriptivo del equipamiento no puede estar vacío.', 1;

        /* -- V3: La fecha de adquisición no puede ser futura ---------------- */
        IF @fecha_adquisicion > CAST(SYSDATETIME() AS DATE)
            THROW 50030, 'La fecha de adquisición del equipamiento no puede ser futura.', 1;

        /* -- INSERT del nuevo registro de equipamiento --------------------- */
        INSERT INTO Equipamiento
            (id_sede_equipamiento, nombre_descriptivo_equipamiento, fecha_adquisicion_equipamiento)
        VALUES
            (@id_sede, LTRIM(RTRIM(@nombre)), @fecha_adquisicion);

        SET @nuevo_id = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        -- Devuelve el identificador único generado al llamador
        SELECT @nuevo_id AS id_equipamiento;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   3. SP sp_Actualizar_Equipamiento
   Propósito : Actualiza los datos descriptivos y fecha de un equipamiento existente.

   Parámetros:
     @id_equipamiento    INT            – ID del equipamiento a modificar
     @nombre             NVARCHAR(150)  – Nuevo nombre descriptivo
     @fecha_adquisicion  DATE           – Nueva fecha de adquisición

   Validaciones:
     V1) El equipamiento debe existir en la tabla Equipamiento     -> Error 50010
     V2) El nombre no puede ser nulo ni estar en blanco           -> Error 50030
     V3) La fecha de adquisición no puede ser futura              -> Error 50030

   Seguridad y buenas prácticas:
     - El UPDATE SIEMPRE está filtrado de forma explícita por id_equipamiento.
   Salida: SELECT con el id_equipamiento actualizado.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Actualizar_Equipamiento]
    @id_equipamiento    INT,
    @nombre             NVARCHAR(150),
    @fecha_adquisicion  DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: El equipamiento debe existir ------------------------------ */
        IF NOT EXISTS (SELECT 1 FROM Equipamiento WHERE id_equipamiento = @id_equipamiento)
            THROW 50010, 'Equipamiento no encontrado.', 1;

        /* -- V2: El nombre no puede venir vacío ----------------------------- */
        IF @nombre IS NULL OR LTRIM(RTRIM(@nombre)) = ''
            THROW 50030, 'El nombre descriptivo del equipamiento no puede estar vacío.', 1;

        /* -- V3: La fecha de adquisición no puede ser futura ---------------- */
        IF @fecha_adquisicion > CAST(SYSDATETIME() AS DATE)
            THROW 50030, 'La fecha de adquisición del equipamiento no puede ser futura.', 1;

        /* -- UPDATE con filtro estricto por id_equipamiento ----------------- */
        UPDATE Equipamiento
        SET    nombre_descriptivo_equipamiento = LTRIM(RTRIM(@nombre)),
               fecha_adquisicion_equipamiento  = @fecha_adquisicion
        WHERE  id_equipamiento = @id_equipamiento;

        COMMIT TRANSACTION;

        SELECT @id_equipamiento AS id_equipamiento;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   4. SP sp_Eliminar_Equipamiento
   Propósito : Elimina un registro de equipamiento por su clave primaria.

   Parámetros:
     @id_equipamiento INT – ID del equipamiento a eliminar

   Validaciones:
     V1) El equipamiento debe existir en la tabla Equipamiento -> Error 50010

   Seguridad y buenas prácticas:
     - El DELETE SIEMPRE está filtrado de forma explícita por id_equipamiento.
   Salida: SELECT con el id_equipamiento eliminado.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Eliminar_Equipamiento]
    @id_equipamiento INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: El equipamiento debe existir ------------------------------ */
        IF NOT EXISTS (SELECT 1 FROM Equipamiento WHERE id_equipamiento = @id_equipamiento)
            THROW 50010, 'Equipamiento no encontrado.', 1;

        /* -- DELETE con filtro estricto por id_equipamiento ----------------- */
        DELETE FROM Equipamiento
        WHERE  id_equipamiento = @id_equipamiento;

        COMMIT TRANSACTION;

        SELECT @id_equipamiento AS id_equipamiento;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   5. SP sp_Sesiones_Por_Instructor
   Propósito : Consulta todas las sesiones (pasadas y futuras) asignadas a un instructor,
               indicando clase, sede, fecha, hora, cupo máximo y total de inscritos activos.
               Permite filtrar opcionalmente por rango de fechas (@desde, @hasta).

   Parámetros:
     @id_instructor INT        – ID del instructor a consultar (obligatorio)
     @desde         DATE = NULL – Fecha límite inferior (opcional)
     @hasta         DATE = NULL – Fecha límite superior (opcional)

   Validaciones:
     V1) El instructor debe existir en la tabla Instructor         -> Error 50010
     V2) Si se envían ambas fechas, @desde no puede ser > @hasta   -> Error 50030
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Sesiones_Por_Instructor]
    @id_instructor INT,
    @desde         DATE = NULL,
    @hasta         DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        /* -- V1: El instructor debe existir -------------------------------- */
        IF NOT EXISTS (SELECT 1 FROM Instructor WHERE id_instructor = @id_instructor)
            THROW 50010, 'Instructor no encontrado.', 1;

        /* -- V2: Rango coherente de fechas si ambas son provistas ----------- */
        IF @desde IS NOT NULL AND @hasta IS NOT NULL AND @desde > @hasta
            THROW 50030, 'La fecha inicial (desde) no puede ser posterior a la fecha final (hasta).', 1;

        /* -- Consulta de sesiones con agregación de inscripciones activas --- */
        SELECT
            s.id_sesion,
            c.nombre_clase,
            sd.nombre_sede,
            s.fecha_sesion                                   AS fecha_sesion,
            s.fecha_sesion                                   AS fecha,
            CONVERT(VARCHAR(8), s.hora_sesion, 108)          AS hora_sesion,
            CONVERT(VARCHAR(8), s.hora_sesion, 108)          AS hora,
            s.cupo_maximo_sesion,
            COUNT(i.id_inscripcion)                          AS total_inscritos
        FROM Sesion AS s
        INNER JOIN Clase       AS c  ON s.id_clase_sesion      = c.id_clase
        INNER JOIN Sede        AS sd ON s.id_sede_sesion       = sd.id_sede
        LEFT  JOIN Inscripcion AS i  ON s.id_sesion            = i.id_sesion_inscripcion
                                    AND i.estado_inscripcion   = 'Inscrito'
        WHERE s.id_instructor_sesion = @id_instructor
          AND (@desde IS NULL OR s.fecha_sesion >= @desde)
          AND (@hasta IS NULL OR s.fecha_sesion <= @hasta)
        GROUP BY
            s.id_sesion,
            c.nombre_clase,
            sd.nombre_sede,
            s.fecha_sesion,
            s.hora_sesion,
            s.cupo_maximo_sesion
        ORDER BY
            s.fecha_sesion ASC,
            s.hora_sesion  ASC;

    END TRY
    BEGIN CATCH
        THROW;
    END CATCH;
END;
GO