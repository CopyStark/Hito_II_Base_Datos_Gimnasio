/* =====================================================================================
   GimnasioDB - Script de Carga de Datos Semanales (Seed Semana)
   Archivo    : GimnasioDB_Seed_Semana.sql
   Propósito  : Poblar la base de datos con sesiones e inscripciones dinámicas realistas
                desde hoy sábado hasta el próximo jueves (DATEADD(DAY, 5, GETDATE())):
                1. Al menos 12 sesiones en la sede de Daniel Matus (socio1) distribuidas
                   entre hoy y el jueves en distintos horarios y disciplinas.
                2. Sesiones diarias para instructor1 (Carlos Gutiérrez) con entre 8 y 14
                   alumnos inscritos activos, más 1 a 2 inscripciones con estado 'Cancelado'
                   para comprobar en vivo que el pase de lista las excluye y no bloquea
                   el guardado de los alumnos activos.
                3. Sesiones con inscritos en las demás sedes (6 a 12 alumnos por clase)
                   para nutrir los reportes de ocupación, disponibilidad y demandas.
                4. Totalmente IDEMPOTENTE: seguro para ejecutar múltiples veces sin duplicar
                   registros ni violar llaves foráneas, CHECKs o UNIQUEs.
   ===================================================================================== */

USE [GimnasioDB];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

    PRINT '=========================================================================';
    PRINT 'Iniciando carga de datos semanales en GimnasioDB (Seed Semana)...';
    PRINT '=========================================================================';

    -- Fechas de referencia dinámica
    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @ahora DATETIME2(7) = SYSDATETIME();

    -- ---------------------------------------------------------------------------------
    -- 1. VALIDACIÓN PREVIA DE INTEGRIDAD
    -- ---------------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM Sede)
        THROW 50001, 'No existen sedes registradas en Sede. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM Clase)
        THROW 50002, 'No existen clases registradas en Clase. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM Instructor)
        THROW 50003, 'No existen instructores registrados en Instructor. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM Socio)
        THROW 50004, 'No existen socios registrados en Socio. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    -- ---------------------------------------------------------------------------------
    -- 2. IDENTIFICACIÓN DE ACTORES CLAVE
    -- ---------------------------------------------------------------------------------
    -- Sede de Daniel Matus (socio1)
    DECLARE @id_sede_daniel INT;
    SELECT TOP 1 @id_sede_daniel = id_sede_registro_socio
    FROM Socio
    WHERE id_socio = 1;
    SET @id_sede_daniel = COALESCE(@id_sede_daniel, 1);

    -- Instructor 1 (Carlos Gutiérrez o vinculado al usuario instructor1)
    DECLARE @id_inst1 INT;
    SELECT TOP 1 @id_inst1 = i.id_instructor
    FROM Instructor i
    LEFT JOIN Usuario u ON u.id_instructor_usuario = i.id_instructor
    ORDER BY CASE WHEN u.username_usuario = 'instructor1' THEN 0 ELSE 1 END, i.id_instructor ASC;

    DECLARE @id_sede_inst1 INT;
    SELECT TOP 1 @id_sede_inst1 = id_sede_habitual_instructor
    FROM Instructor
    WHERE id_instructor = @id_inst1;
    SET @id_sede_inst1 = COALESCE(@id_sede_inst1, @id_sede_daniel);

    -- Otros instructores
    DECLARE @id_inst2 INT, @id_inst3 INT, @id_inst4 INT;
    SELECT @id_inst2 = MIN(id_instructor) FROM Instructor WHERE id_instructor <> @id_inst1;
    SELECT @id_inst3 = MIN(id_instructor) FROM Instructor WHERE id_instructor NOT IN (@id_inst1, @id_inst2);
    SELECT @id_inst4 = MIN(id_instructor) FROM Instructor WHERE id_instructor NOT IN (@id_inst1, @id_inst2, @id_inst3);

    SET @id_inst2 = COALESCE(@id_inst2, @id_inst1);
    SET @id_inst3 = COALESCE(@id_inst3, @id_inst2);
    SET @id_inst4 = COALESCE(@id_inst4, @id_inst3);

    -- Otras sedes
    DECLARE @sede2 INT, @sede3 INT, @sede4 INT;
    SELECT @sede2 = MIN(id_sede) FROM Sede WHERE id_sede <> @id_sede_daniel;
    SELECT @sede3 = MIN(id_sede) FROM Sede WHERE id_sede NOT IN (@id_sede_daniel, @sede2);
    SELECT @sede4 = MIN(id_sede) FROM Sede WHERE id_sede NOT IN (@id_sede_daniel, @sede2, @sede3);

    SET @sede2 = COALESCE(@sede2, @id_sede_daniel);
    SET @sede3 = COALESCE(@sede3, @sede2);
    SET @sede4 = COALESCE(@sede4, @sede3);

    -- Clases / Disciplinas
    DECLARE @clase_crossfit INT, @clase_spinning INT, @clase_yoga INT, @clase_pilates INT;
    DECLARE @clase_funcional INT, @clase_zumba INT, @clase_boxeo INT, @clase_bodypump INT;
    DECLARE @clase_trx INT, @clase_calistenia INT;

    SELECT TOP 1 @clase_crossfit  = id_clase FROM Clase WHERE nombre_clase LIKE '%CrossFit%' ORDER BY id_clase;
    SELECT TOP 1 @clase_spinning  = id_clase FROM Clase WHERE nombre_clase LIKE '%Spinning%' ORDER BY id_clase;
    SELECT TOP 1 @clase_yoga      = id_clase FROM Clase WHERE nombre_clase LIKE '%Yoga%' ORDER BY id_clase;
    SELECT TOP 1 @clase_pilates   = id_clase FROM Clase WHERE nombre_clase LIKE '%Pilates%' ORDER BY id_clase;
    SELECT TOP 1 @clase_funcional = id_clase FROM Clase WHERE nombre_clase LIKE '%Funcional%' ORDER BY id_clase;
    SELECT TOP 1 @clase_zumba     = id_clase FROM Clase WHERE nombre_clase LIKE '%Zumba%' ORDER BY id_clase;
    SELECT TOP 1 @clase_boxeo     = id_clase FROM Clase WHERE nombre_clase LIKE '%Boxeo%' ORDER BY id_clase;
    SELECT TOP 1 @clase_bodypump  = id_clase FROM Clase WHERE nombre_clase LIKE '%Body Pump%' OR nombre_clase LIKE '%Pump%' ORDER BY id_clase;
    SELECT TOP 1 @clase_trx       = id_clase FROM Clase WHERE nombre_clase LIKE '%TRX%' ORDER BY id_clase;
    SELECT TOP 1 @clase_calistenia= id_clase FROM Clase WHERE nombre_clase LIKE '%Calistenia%' ORDER BY id_clase;

    DECLARE @clase_min INT;
    SELECT @clase_min = MIN(id_clase) FROM Clase;
    SET @clase_crossfit  = COALESCE(@clase_crossfit, @clase_min);
    SET @clase_spinning  = COALESCE(@clase_spinning, @clase_min);
    SET @clase_yoga      = COALESCE(@clase_yoga, @clase_min);
    SET @clase_pilates   = COALESCE(@clase_pilates, @clase_min);
    SET @clase_funcional = COALESCE(@clase_funcional, @clase_min);
    SET @clase_zumba     = COALESCE(@clase_zumba, @clase_min);
    SET @clase_boxeo     = COALESCE(@clase_boxeo, @clase_min);
    SET @clase_bodypump  = COALESCE(@clase_bodypump, @clase_min);
    SET @clase_trx       = COALESCE(@clase_trx, @clase_min);
    SET @clase_calistenia= COALESCE(@clase_calistenia, @clase_min);

    PRINT CONCAT('Sede Daniel Matus: ', @id_sede_daniel, ' | Instructor 1: ', @id_inst1, ' (Sede ', @id_sede_inst1, ')');

    -- ---------------------------------------------------------------------------------
    -- 3. POBLAR TABLA TEMPORAL CON SESIONES A CREAR (HOY A +5 DÍAS: JUEVES)
    -- ---------------------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#PlanSesiones') IS NOT NULL DROP TABLE #PlanSesiones;
    CREATE TABLE #PlanSesiones (
        tag_sesion VARCHAR(50) NOT NULL PRIMARY KEY,
        id_clase INT NOT NULL,
        id_sede INT NOT NULL,
        id_instructor INT NOT NULL,
        fecha DATE NOT NULL,
        hora TIME(7) NOT NULL,
        cupo INT NOT NULL
    );

    INSERT INTO #PlanSesiones (tag_sesion, id_clase, id_sede, id_instructor, fecha, hora, cupo) VALUES
        -- =============================================================================
        -- A) SESIONES ASIGNADAS A INSTRUCTOR1 (Carlos Gutiérrez) - DIARIAS HOY A JUEVES
        -- =============================================================================
        ('INST1_D0_TARDE',  @clase_crossfit,  @id_sede_inst1, @id_inst1, DATEADD(DAY, 0, @hoy), '18:00', 16),
        ('INST1_D1_MANANA', @clase_funcional, @id_sede_inst1, @id_inst1, DATEADD(DAY, 1, @hoy), '10:30', 15),
        ('INST1_D2_TARDE',  @clase_boxeo,     @id_sede_inst1, @id_inst1, DATEADD(DAY, 2, @hoy), '19:00', 16),
        ('INST1_D3_TARDE',  @clase_crossfit,  @id_sede_inst1, @id_inst1, DATEADD(DAY, 3, @hoy), '18:30', 15),
        ('INST1_D4_TARDE',  @clase_funcional, @id_sede_inst1, @id_inst1, DATEADD(DAY, 4, @hoy), '19:00', 16),
        ('INST1_D5_TARDE',  @clase_bodypump,  @id_sede_inst1, @id_inst1, DATEADD(DAY, 5, @hoy), '20:00', 18),

        -- =============================================================================
        -- B) SESIONES EN LA SEDE DE DANIEL MATUS (socio1) - AL MENOS 6 DE DIVERSAS DISCIPLINAS
        -- =============================================================================
        ('DAN_D0_MANANA',  @clase_yoga,       @id_sede_daniel, @id_inst2, DATEADD(DAY, 0, @hoy), '10:00', 15),
        ('DAN_D0_NOCHE',   @clase_spinning,   @id_sede_daniel, @id_inst3, DATEADD(DAY, 0, @hoy), '19:30', 20),
        ('DAN_D1_MANANA',  @clase_pilates,    @id_sede_daniel, @id_inst4, DATEADD(DAY, 1, @hoy), '11:00', 14),
        ('DAN_D1_TARDE',   @clase_funcional,  @id_sede_daniel, @id_inst2, DATEADD(DAY, 1, @hoy), '17:30', 16),
        ('DAN_D2_MANANA',  @clase_crossfit,   @id_sede_daniel, @id_inst3, DATEADD(DAY, 2, @hoy), '08:00', 15),
        ('DAN_D2_TARDE',   @clase_boxeo,      @id_sede_daniel, @id_inst2, DATEADD(DAY, 2, @hoy), '18:30', 14),
        ('DAN_D3_MANANA',  @clase_bodypump,   @id_sede_daniel, @id_inst4, DATEADD(DAY, 3, @hoy), '09:30', 18),
        ('DAN_D3_TARDE',   @clase_zumba,      @id_sede_daniel, @id_inst3, DATEADD(DAY, 3, @hoy), '19:30', 22),
        ('DAN_D4_MANANA',  @clase_spinning,   @id_sede_daniel, @id_inst2, DATEADD(DAY, 4, @hoy), '07:30', 20),
        ('DAN_D4_TARDE',   @clase_trx,        @id_sede_daniel, @id_inst4, DATEADD(DAY, 4, @hoy), '18:00', 15),
        ('DAN_D5_MANANA',  @clase_yoga,       @id_sede_daniel, @id_inst3, DATEADD(DAY, 5, @hoy), '10:00', 15),
        ('DAN_D5_TARDE',   @clase_calistenia, @id_sede_daniel, @id_inst2, DATEADD(DAY, 5, @hoy), '19:00', 15),

        -- =============================================================================
        -- C) SESIONES GENERALES EN OTRAS SEDES (2, 3, 4) PARA NUTRIR REPORTES Y DEMANDA
        -- =============================================================================
        ('OTR_S2_D0',      @clase_spinning,   @sede2,          @id_inst3, DATEADD(DAY, 0, @hoy), '12:00', 18),
        ('OTR_S2_D2',      @clase_pilates,    @sede2,          @id_inst4, DATEADD(DAY, 2, @hoy), '17:00', 15),
        ('OTR_S2_D4',      @clase_boxeo,      @sede2,          @id_inst2, DATEADD(DAY, 4, @hoy), '19:00', 16),
        ('OTR_S3_D1',      @clase_yoga,       @sede3,          @id_inst2, DATEADD(DAY, 1, @hoy), '09:30', 15),
        ('OTR_S3_D3',      @clase_crossfit,   @sede3,          @id_inst4, DATEADD(DAY, 3, @hoy), '18:00', 16),
        ('OTR_S3_D5',      @clase_zumba,      @sede3,          @id_inst3, DATEADD(DAY, 5, @hoy), '11:00', 20),
        ('OTR_S4_D0',      @clase_bodypump,   @sede4,          @id_inst4, DATEADD(DAY, 0, @hoy), '19:30', 18),
        ('OTR_S4_D2',      @clase_spinning,   @sede4,          @id_inst3, DATEADD(DAY, 2, @hoy), '08:30', 20),
        ('OTR_S4_D4',      @clase_funcional,  @sede4,          @id_inst2, DATEADD(DAY, 4, @hoy), '18:30', 16);

    -- Inserción idempotente de Sesiones en [Sesion]
    INSERT INTO Sesion (id_clase_sesion, id_sede_sesion, id_instructor_sesion, fecha_sesion, hora_sesion, cupo_maximo_sesion)
    SELECT ps.id_clase, ps.id_sede, ps.id_instructor, ps.fecha, ps.hora, ps.cupo
    FROM #PlanSesiones ps
    WHERE NOT EXISTS (
        SELECT 1 FROM Sesion s
        WHERE s.id_clase_sesion = ps.id_clase
          AND s.id_sede_sesion = ps.id_sede
          AND s.fecha_sesion = ps.fecha
          AND s.hora_sesion = ps.hora
    );

    PRINT 'Sesiones programadas creadas exitosamente para la semana.';

    -- Tabla de correspondencia para enlazar tag_sesion con el id_sesion real
    IF OBJECT_ID('tempdb..#SesionesCreadas') IS NOT NULL DROP TABLE #SesionesCreadas;
    SELECT ps.tag_sesion, s.id_sesion, ps.cupo
    INTO #SesionesCreadas
    FROM #PlanSesiones ps
    INNER JOIN Sesion s ON s.id_clase_sesion = ps.id_clase
                       AND s.id_sede_sesion = ps.id_sede
                       AND s.fecha_sesion = ps.fecha
                       AND s.hora_sesion = ps.hora;

    -- ---------------------------------------------------------------------------------
    -- 4. SELECCIÓN DE SOCIOS CON CONTRATO VIGENTE PARA INSCRIPCIONES
    -- ---------------------------------------------------------------------------------
    -- Excluimos expresamente a Daniel Matus (1), Emilia Osorio (2), Yulissa (3), Catalina (13), Antonia (15)
    -- para no alterar sus escenarios de evaluación propios.
    IF OBJECT_ID('tempdb..#SociosPool') IS NOT NULL DROP TABLE #SociosPool;
    CREATE TABLE #SociosPool (
        idx INT IDENTITY(1, 1) PRIMARY KEY,
        id_socio INT NOT NULL
    );

    INSERT INTO #SociosPool (id_socio)
    SELECT DISTINCT s.id_socio
    FROM Socio s
    INNER JOIN Contrato c ON c.id_socio_contrato = s.id_socio
    WHERE c.estado_contrato = 'Vigente'
      AND s.activo_socio = 1
      AND s.id_socio NOT IN (1, 2, 3, 13, 15)
    ORDER BY s.id_socio ASC;

    DECLARE @total_socios_pool INT;
    SELECT @total_socios_pool = COUNT(*) FROM #SociosPool;
    PRINT CONCAT('Socios vigentes disponibles para inscripciones: ', @total_socios_pool);

    IF @total_socios_pool < 14
        PRINT 'Aviso: El pool de socios vigentes es menor a 14; se reutilizarán los socios disponibles.';

    -- ---------------------------------------------------------------------------------
    -- 5. INSCRIPCIÓN EN SESIONES DE INSTRUCTOR1 (Carlos Gutiérrez)
    --    - Entre 8 y 14 alumnos activos por clase.
    --    - 1 a 2 inscripciones con estado 'Cancelado' para validar que el pase de lista
    --      las excluye automáticamente.
    -- ---------------------------------------------------------------------------------
    DECLARE @id_ses_inst1 INT;

    -- A) INST1_D0_TARDE (Hoy 18:00): 11 alumnos activos + 2 cancelados (Total 13)
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D0_TARDE';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        -- 11 alumnos activos
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -6, @ahora), NULL, N'Reserva confirmada vía App Móvil', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 1 AND 11
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );

        -- 2 alumnos cancelados (para verificar exclusión visual y funcional en pase de lista)
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -8, @ahora), NULL, N'Socio canceló por motivos laborales', 'Cancelado'
        FROM #SociosPool sp
        WHERE sp.idx IN (12, 13)
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Hoy 18:00) cargada con 11 activos y 2 cancelados.';
    END;

    -- B) INST1_D1_MANANA (Mañana 10:30): 10 alumnos activos
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D1_MANANA';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -4, @ahora), NULL, N'Inscripción web anticipada', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 4 AND 13
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Mañana 10:30) cargada con 10 alumnos activos.';
    END;

    -- C) INST1_D2_TARDE (Lunes 19:00): 12 alumnos activos + 1 cancelado
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D2_TARDE';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -3, @ahora), NULL, N'Reserva en recepción de sede', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 2 AND 13
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );

        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -5, @ahora), NULL, N'Cancelación médica informada en recepción', 'Cancelado'
        FROM #SociosPool sp
        WHERE sp.idx = 14
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Lunes 19:00) cargada con 12 activos y 1 cancelado.';
    END;

    -- D) INST1_D3_TARDE (Martes 18:30): 11 alumnos activos
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D3_TARDE';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -2, @ahora), NULL, N'Inscripción confirmada', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 5 AND 15
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Martes 18:30) cargada con 11 alumnos activos.';
    END;

    -- E) INST1_D4_TARDE (Miércoles 19:00): 13 alumnos activos
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D4_TARDE';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, DATEADD(HOUR, -1, @ahora), NULL, N'Reserva web confirmada', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 3 AND 15
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Miércoles 19:00) cargada con 13 alumnos activos.';
    END;

    -- F) INST1_D5_TARDE (Jueves 20:00): 14 alumnos activos
    SELECT @id_ses_inst1 = id_sesion FROM #SesionesCreadas WHERE tag_sesion = 'INST1_D5_TARDE';
    IF @id_ses_inst1 IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses_inst1, @ahora, NULL, N'Reserva anticipada confirmada', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN 1 AND 14
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses_inst1
          );
        PRINT 'Sesión instructor1 (Jueves 20:00) cargada con 14 alumnos activos.';
    END;

    -- ---------------------------------------------------------------------------------
    -- 6. INSCRIPCIONES EN LAS DEMÁS SESIONES DE LA SEMANA (6 A 12 ALUMNOS POR CLASE)
    -- ---------------------------------------------------------------------------------
    DECLARE @tag VARCHAR(50);
    DECLARE @id_ses INT;
    DECLARE @cupo_ses INT;

    DECLARE curSesiones CURSOR LOCAL FAST_FORWARD FOR
    SELECT tag_sesion, id_sesion, cupo
    FROM #SesionesCreadas
    WHERE tag_sesion NOT LIKE 'INST1_%';

    OPEN curSesiones;
    FETCH NEXT FROM curSesiones INTO @tag, @id_ses, @cupo_ses;

    DECLARE @iter INT = 0;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Determinar rango rotativo de socios para variedad (entre 6 y 10 socios)
        DECLARE @alumnos_inscribir INT = 6 + (@iter % 5);
        DECLARE @offset INT = (@iter * 3) % CASE WHEN @total_socios_pool > 10 THEN @total_socios_pool - 10 ELSE 1 END;

        INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
        SELECT sp.id_socio, @id_ses, DATEADD(HOUR, -(@iter * 2 + 1), @ahora), NULL, N'Inscripción de catálogo semanal', 'Inscrito'
        FROM #SociosPool sp
        WHERE sp.idx BETWEEN (@offset + 1) AND (@offset + @alumnos_inscribir)
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sp.id_socio AND id_sesion_inscripcion = @id_ses
          );

        SET @iter = @iter + 1;
        FETCH NEXT FROM curSesiones INTO @tag, @id_ses, @cupo_ses;
    END;

    CLOSE curSesiones;
    DEALLOCATE curSesiones;

    PRINT 'Inscripciones de variedad agregadas exitosamente en todas las sedes.';

    -- ---------------------------------------------------------------------------------
    -- 7. REPORTE FINAL DE INTEGRIDAD
    -- ---------------------------------------------------------------------------------
    DECLARE @sesiones_semana INT;
    DECLARE @inscripciones_semana INT;

    SELECT @sesiones_semana = COUNT(*)
    FROM Sesion
    WHERE fecha_sesion BETWEEN @hoy AND DATEADD(DAY, 5, @hoy);

    SELECT @inscripciones_semana = COUNT(*)
    FROM Inscripcion i
    INNER JOIN Sesion s ON s.id_sesion = i.id_sesion_inscripcion
    WHERE s.fecha_sesion BETWEEN @hoy AND DATEADD(DAY, 5, @hoy);

    PRINT '=========================================================================';
    PRINT CONCAT('RESUMEN SEMANA (', CONVERT(VARCHAR(10), @hoy, 120), ' a ', CONVERT(VARCHAR(10), DATEADD(DAY, 5, @hoy), 120), '):');
    PRINT CONCAT('- Total de sesiones activas en el rango: ', @sesiones_semana);
    PRINT CONCAT('- Total de inscripciones en el rango : ', @inscripciones_semana);
    PRINT 'Carga de GimnasioDB_Seed_Semana completada exitosamente.';
    PRINT '=========================================================================';

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();
    DECLARE @ErrorLine INT = ERROR_LINE();

    RAISERROR('Error en GimnasioDB_Seed_Semana (Línea %d): %s', @ErrorSeverity, @ErrorState, @ErrorLine, @ErrorMessage);
END CATCH;
GO
