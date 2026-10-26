/* =====================================================================================
   GimnasioDB – Módulo Clases (Persona 2)
   Archivo  : sp_clases.sql
   Tablas   : Clase, Sesion, Inscripcion
               + consultas a Socio, Contrato, Sede, Instructor
   Creado   : 2026-10-25
   Re-ejecutable: sí (CREATE OR ALTER / CREATE OR ALTER PROCEDURE)

   CONVENCIÓN DE NOMBRES (igual que el DDL):
     Cada atributo termina con el nombre de su tabla.
     Ejemplos: cupo_maximo_sesion, estado_inscripcion, id_socio_inscripcion.

   ── CÓDIGOS DE ERROR PARA THROW ────────────────────────────────────────────
     50010  No encontrado            – el registro buscado no existe en la BD
     50020  Conflicto                – cupo lleno, socio ya inscrito en esa sesión
     50030  Regla de negocio / dato  – contrato no vigente, sesión pasada,
            inválido                   cupo <= 0, estado incorrecto, etc.
   ───────────────────────────────────────────────────────────────────────────
===================================================================================== */
USE [GimnasioDB];
GO

/* =====================================================================================
   1. VISTA  vw_Sesiones_Disponibles
   Propósito : Muestra todas las sesiones con el conteo de inscritos activos
               y los cupos restantes. El instructor se une con LEFT JOIN porque
               id_instructor_sesion puede ser NULL (sesión sin instructor asignado).
   Columnas  :
     - id_sesion, nombre_clase, nivel_exigencia_clase, duracion_minutos_clase
     - nombre_sede
     - nombre_completo_instructor  (NULL si no hay instructor)
     - fecha_sesion, hora_sesion, cupo_maximo_sesion
     - total_inscritos     (solo estado_inscripcion = 'Inscrito')
     - cupos_disponibles   (cupo_maximo_sesion - total_inscritos)
===================================================================================== */
CREATE OR ALTER VIEW [dbo].[vw_Sesiones_Disponibles] AS
SELECT
    -- Identificador de la sesión
    id_sesion,

    -- Datos de la clase asociada
    nombre_clase,
    nivel_exigencia_clase,
    duracion_minutos_clase,

    -- Sede donde se imparte
    nombre_sede,

    -- Instructor (puede ser NULL: sesión sin instructor asignado)
    nombre_completo_instructor,

    -- Fecha y hora de la sesión
    fecha_sesion,
    hora_sesion,
    cupo_maximo_sesion,

    -- Conteo de inscripciones ACTIVAS (estado = 'Inscrito')
    COUNT(id_inscripcion)                             AS total_inscritos,

    -- Cupos que aún quedan disponibles
    cupo_maximo_sesion - COUNT(id_inscripcion)        AS cupos_disponibles

FROM Sesion
-- Clase: obligatoria (toda sesión pertenece a una clase)
INNER JOIN Clase      ON id_clase_sesion      = id_clase
-- Sede: obligatoria (toda sesión ocurre en una sede)
INNER JOIN Sede       ON id_sede_sesion       = id_sede
-- Instructor: opcional (LEFT JOIN porque id_instructor_sesion puede ser NULL)
LEFT  JOIN Instructor ON id_instructor_sesion = id_instructor
-- Inscripcion: LEFT JOIN + filtro de estado para no perder sesiones sin inscritos
LEFT  JOIN Inscripcion
       ON id_sesion             = id_sesion_inscripcion
      AND estado_inscripcion    = 'Inscrito'

GROUP BY
    id_sesion,
    nombre_clase,
    nivel_exigencia_clase,
    duracion_minutos_clase,
    nombre_sede,
    nombre_completo_instructor,
    fecha_sesion,
    hora_sesion,
    cupo_maximo_sesion;
GO


/* =====================================================================================
   2. SP  sp_Inscribir_Socio
   Propósito : Inscribe un socio en una sesión, aplicando todas las reglas
               de negocio requeridas.

   Parámetros:
     @id_socio  INT  – ID del socio que quiere inscribirse
     @id_sesion INT  – ID de la sesión a la que quiere asistir

   Validaciones (en orden):
     V1) Socio existe y está activo (activo_socio = 1)           -> Error 50010 / 50030
     V2) Sesión existe                                            -> Error 50010
     V3) La fecha+hora de la sesión es futura (> SYSDATETIME())  -> Error 50030
     V4) Socio tiene un Contrato 'Vigente' cuyo rango cubre
         la fecha_sesion                                          -> Error 50030
     V5) El socio NO tiene ya una inscripción 'Inscrito'
         en esa misma sesión                                      -> Error 50020
     V6) Hay cupo disponible (bloqueo con UPDLOCK, HOLDLOCK)      -> Error 50020

   Por qué UPDLOCK + HOLDLOCK en la lectura de Sesion:
     - UPDLOCK   : adquiere un lock de actualización (compatible con S-locks de
                   otros lectores, pero incompatible con otros U-locks), evitando
                   el deadlock clásico en que dos transacciones hacen SELECT y
                   luego intentan UPDATE sobre la misma fila.
     - HOLDLOCK  : mantiene el lock hasta el COMMIT/ROLLBACK de la transacción
                   (equivale a nivel serializable para esa fila), garantizando
                   que el conteo de inscritos que leemos no cambie entre el SELECT
                   y el INSERT. Sin él, dos transacciones concurrentes podrían
                   leer el mismo cupo disponible e inscribir más socios de lo
                   permitido (phantom / non-repeatable read).

   Salida: resultado SELECT con id_inscripcion del nuevo registro.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Inscribir_Socio]
    @id_socio  INT,
    @id_sesion INT
AS
BEGIN
    SET NOCOUNT ON;      -- Evita mensajes de "N filas afectadas" innecesarios
    SET XACT_ABORT ON;   -- Ante cualquier error, hace ROLLBACK automático

    -- Variables de trabajo
    DECLARE @activo_socio        BIT;
    DECLARE @fecha_sesion        DATE;
    DECLARE @hora_sesion         TIME(7);
    DECLARE @cupo_maximo_sesion  INT;
    DECLARE @total_inscritos     INT;
    DECLARE @tiene_contrato      INT;
    DECLARE @ya_inscrito         INT;
    DECLARE @nuevo_id            INT;
    DECLARE @datetime_sesion     DATETIME2(7);

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: El socio existe y está activo ----------------------------- */
        SELECT @activo_socio = activo_socio
        FROM   Socio
        WHERE  id_socio = @id_socio;

        IF @activo_socio IS NULL
            THROW 50010, 'Socio no encontrado.', 1;

        IF @activo_socio = 0
            THROW 50030, 'El socio no está activo y no puede inscribirse.', 1;

        /* -- V2+V6: La sesión existe; se bloquea la fila con UPDLOCK, HOLDLOCK
              para contar inscritos de forma segura y luego verificar cupo.
              UPDLOCK  -> evita el deadlock S->X clásico entre transacciones concurrentes.
              HOLDLOCK -> mantiene el lock hasta fin de transacción (serializable),
                         impidiendo que otro SELECT lea el mismo cupo libre
                         antes de que el INSERT lo ocupe.                       -- */
        SELECT
            @fecha_sesion       = fecha_sesion,
            @hora_sesion        = hora_sesion,
            @cupo_maximo_sesion = cupo_maximo_sesion
        FROM Sesion WITH (UPDLOCK, HOLDLOCK)
        WHERE id_sesion = @id_sesion;

        IF @fecha_sesion IS NULL
            THROW 50010, 'Sesión no encontrada.', 1;

        /* -- V3: La sesión debe ser futura --------------------------------- */
        -- Combinamos fecha y hora en un único DATETIME2 para comparar con ahora
        SET @datetime_sesion = CAST(
                CAST(@fecha_sesion AS NVARCHAR(10))
                + ' '
                + CAST(@hora_sesion  AS NVARCHAR(16))
            AS DATETIME2(7));

        IF @datetime_sesion <= SYSDATETIME()
            THROW 50030, 'No es posible inscribirse en una sesión que ya ocurrió o está en curso.', 1;

        /* -- V4: El socio tiene un Contrato Vigente que cubre la fecha_sesion -- */
        SELECT @tiene_contrato = COUNT(*)
        FROM   Contrato
        WHERE  id_socio_contrato      = @id_socio
          AND  estado_contrato        = 'Vigente'
          AND  fecha_inicio_contrato  <= @fecha_sesion
          AND  fecha_termino_contrato >= @fecha_sesion;

        IF @tiene_contrato = 0
            THROW 50030, 'El socio no tiene un contrato vigente que cubra la fecha de la sesión.', 1;

        /* -- V5: El socio no está ya inscrito en esta sesión --------------- */
        SELECT @ya_inscrito = COUNT(*)
        FROM   Inscripcion
        WHERE  id_socio_inscripcion  = @id_socio
          AND  id_sesion_inscripcion = @id_sesion
          AND  estado_inscripcion    = 'Inscrito';

        IF @ya_inscrito > 0
            THROW 50020, 'El socio ya tiene una inscripción activa en esta sesión.', 1;

        /* -- V6: Verificar cupo disponible (fila ya bloqueada con UPDLOCK) - */
        SELECT @total_inscritos = COUNT(*)
        FROM   Inscripcion
        WHERE  id_sesion_inscripcion = @id_sesion
          AND  estado_inscripcion    = 'Inscrito';

        IF @total_inscritos >= @cupo_maximo_sesion
            THROW 50020, 'La sesión no tiene cupos disponibles.', 1;

        /* -- INSERT de la inscripción --------------------------------------- */
        INSERT INTO Inscripcion
            (id_socio_inscripcion, id_sesion_inscripcion, estado_inscripcion)
            -- fecha_inscripcion usa DEFAULT sysdatetime()
            -- asistio_inscripcion y observaciones_inscripcion quedan NULL
        VALUES
            (@id_socio, @id_sesion, 'Inscrito');

        SET @nuevo_id = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        -- Devuelve el ID del nuevo registro al llamador
        SELECT @nuevo_id AS id_inscripcion;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Re-lanza el error original (THROW sin parámetros conserva número/mensaje)
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   3. SP  sp_Cancelar_Inscripcion
   Propósito : Cambia el estado de una inscripción de 'Inscrito' a 'Cancelado'.

   Parámetros:
     @id_inscripcion INT  – ID de la inscripción a cancelar
     @id_socio       INT  – ID del socio que realiza la cancelación (seguridad)

   Validaciones:
     V1) La inscripción existe                                    -> Error 50010
     V2) Pertenece al socio indicado                              -> Error 50030
     V3) Estado actual es 'Inscrito' (no ya cancelada)            -> Error 50030
     V4) La sesión aún no ha ocurrido (fecha+hora > ahora)        -> Error 50030
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Cancelar_Inscripcion]
    @id_inscripcion INT,
    @id_socio       INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @id_socio_inscripcion  INT;
    DECLARE @estado_inscripcion    VARCHAR(20);
    DECLARE @fecha_sesion          DATE;
    DECLARE @hora_sesion           TIME(7);
    DECLARE @datetime_sesion       DATETIME2(7);

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- Leer la inscripción y la sesión asociada ---------------------- */
        SELECT
            @id_socio_inscripcion = id_socio_inscripcion,
            @estado_inscripcion   = estado_inscripcion,
            @fecha_sesion         = fecha_sesion,
            @hora_sesion          = hora_sesion
        FROM Inscripcion
        INNER JOIN Sesion ON id_sesion_inscripcion = id_sesion
        WHERE id_inscripcion = @id_inscripcion;

        /* -- V1: Inscripción existe ---------------------------------------- */
        IF @id_socio_inscripcion IS NULL
            THROW 50010, 'Inscripción no encontrada.', 1;

        /* -- V2: Pertenece al socio indicado -------------------------------- */
        IF @id_socio_inscripcion <> @id_socio
            THROW 50030, 'La inscripción no pertenece al socio indicado.', 1;

        /* -- V3: Estado debe ser 'Inscrito' --------------------------------- */
        IF @estado_inscripcion <> 'Inscrito'
            THROW 50030, 'La inscripción ya está cancelada y no puede modificarse.', 1;

        /* -- V4: La sesión todavía no ha ocurrido -------------------------- */
        SET @datetime_sesion = CAST(
                CAST(@fecha_sesion AS NVARCHAR(10))
                + ' '
                + CAST(@hora_sesion  AS NVARCHAR(16))
            AS DATETIME2(7));

        IF @datetime_sesion <= SYSDATETIME()
            THROW 50030, 'No es posible cancelar una inscripción de una sesión que ya ocurrió o está en curso.', 1;

        /* -- UPDATE: siempre filtra por id_inscripcion (PK) ---------------- */
        UPDATE Inscripcion
        SET    estado_inscripcion = 'Cancelado'
        WHERE  id_inscripcion = @id_inscripcion;

        COMMIT TRANSACTION;

        SELECT @id_inscripcion AS id_inscripcion,
               'Cancelado'    AS estado_inscripcion;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   4. SP  sp_Registrar_Asistencia
   Propósito : Registra si un socio asistió o no a una sesión y una observación
               opcional. Solo opera sobre inscripciones en estado 'Inscrito'.

   Parámetros:
     @id_inscripcion INT               – ID de la inscripción
     @asistio        BIT               – 1 = asistió, 0 = no asistió
     @observaciones  NVARCHAR(500)     – texto libre opcional (default NULL)

   Validaciones:
     V1) La inscripción existe                  -> Error 50010
     V2) Estado actual es 'Inscrito'            -> Error 50030
       (Si está 'Cancelado' no corresponde registrar asistencia)
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Registrar_Asistencia]
    @id_inscripcion INT,
    @asistio        BIT,
    @observaciones  NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @estado_inscripcion VARCHAR(20);

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: Inscripción existe ---------------------------------------- */
        SELECT @estado_inscripcion = estado_inscripcion
        FROM   Inscripcion
        WHERE  id_inscripcion = @id_inscripcion;

        IF @estado_inscripcion IS NULL
            THROW 50010, 'Inscripción no encontrada.', 1;

        /* -- V2: Solo inscripciones activas permiten registrar asistencia --- */
        IF @estado_inscripcion <> 'Inscrito'
            THROW 50030, 'Solo se puede registrar asistencia en inscripciones con estado ''Inscrito''.', 1;

        /* -- UPDATE de asistencia y observaciones --------------------------- */
        UPDATE Inscripcion
        SET    asistio_inscripcion       = @asistio,
               observaciones_inscripcion = @observaciones
        WHERE  id_inscripcion = @id_inscripcion;

        COMMIT TRANSACTION;

        SELECT @id_inscripcion AS id_inscripcion,
               @asistio        AS asistio_inscripcion;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO


/* =====================================================================================
   5. SP  sp_Programar_Sesion
   Propósito : Crea una nueva sesión para una clase existente.

   Parámetros:
     @id_clase       INT          – ID de la clase (obligatorio)
     @id_sede        INT          – ID de la sede (obligatorio)
     @id_instructor  INT  = NULL  – ID del instructor (opcional)
     @fecha          DATE         – Fecha de la sesión
     @hora           TIME(7)      – Hora de inicio de la sesión
     @cupo           INT          – Cupo máximo de la sesión

   Validaciones:
     V1) La clase existe                                          -> Error 50010
     V2) La sede existe                                           -> Error 50010
     V3) Si @id_instructor no es NULL, el instructor existe       -> Error 50010
     V4) La combinación fecha+hora es futura                      -> Error 50030
     V5) El cupo es mayor que 0                                   -> Error 50030

   Salida: SELECT con el id_sesion creado.
===================================================================================== */
CREATE OR ALTER PROCEDURE [dbo].[sp_Programar_Sesion]
    @id_clase      INT,
    @id_sede       INT,
    @id_instructor INT      = NULL,
    @fecha         DATE,
    @hora          TIME(7),
    @cupo          INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @existe_clase      INT;
    DECLARE @existe_sede       INT;
    DECLARE @existe_instructor INT;
    DECLARE @datetime_sesion   DATETIME2(7);
    DECLARE @nuevo_id_sesion   INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        /* -- V1: La clase existe ------------------------------------------- */
        SELECT @existe_clase = COUNT(*)
        FROM   Clase
        WHERE  id_clase = @id_clase;

        IF @existe_clase = 0
            THROW 50010, 'Clase no encontrada.', 1;

        /* -- V2: La sede existe -------------------------------------------- */
        SELECT @existe_sede = COUNT(*)
        FROM   Sede
        WHERE  id_sede = @id_sede;

        IF @existe_sede = 0
            THROW 50010, 'Sede no encontrada.', 1;

        /* -- V3: Si se especificó instructor, debe existir ----------------- */
        IF @id_instructor IS NOT NULL
        BEGIN
            SELECT @existe_instructor = COUNT(*)
            FROM   Instructor
            WHERE  id_instructor = @id_instructor;

            IF @existe_instructor = 0
                THROW 50010, 'Instructor no encontrado.', 1;
        END;

        /* -- V4: La sesión debe ser futura --------------------------------- */
        SET @datetime_sesion = CAST(
                CAST(@fecha AS NVARCHAR(10))
                + ' '
                + CAST(@hora AS NVARCHAR(16))
            AS DATETIME2(7));

        IF @datetime_sesion <= SYSDATETIME()
            THROW 50030, 'La fecha y hora de la sesión deben ser futuras.', 1;

        /* -- V5: El cupo debe ser mayor que 0 ------------------------------ */
        IF @cupo <= 0
            THROW 50030, 'El cupo máximo debe ser mayor que 0.', 1;

        /* -- INSERT de la nueva sesión -------------------------------------- */
        INSERT INTO Sesion
            (id_clase_sesion, id_sede_sesion, id_instructor_sesion,
             fecha_sesion, hora_sesion, cupo_maximo_sesion)
        VALUES
            (@id_clase, @id_sede, @id_instructor,
             @fecha,    @hora,    @cupo);

        SET @nuevo_id_sesion = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SELECT @nuevo_id_sesion AS id_sesion;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* =====================================================================================
   FIN  sp_clases.sql
   Para ejecutar: abrir en SSMS con la BD GimnasioDB seleccionada y ejecutar F5.
===================================================================================== */
