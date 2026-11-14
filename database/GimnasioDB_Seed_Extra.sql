/* =====================================================================================
   GimnasioDB - Script de Enriquecimiento de Datos de Prueba (Seed Extra)
   Archivo    : GimnasioDB_Seed_Extra.sql
   Propósito  : Enriquecer la base de datos con casos de prueba completos para la defensa:
                1. 32 socios con nombres, apellidos chilenos reales, RUTs válidos (Módulo 11)
                   y teléfonos reales, distribuidos equitativamente en todas las sedes.
                2. Contratos diversificados: 'Vigente' (incluyendo contratos que vencen en los
                   próximos 5 días), 'Vencido' y 'Cancelado', junto a sus Pagos distribuidos
                   entre el mes actual, el mes pasado y hace dos meses para nutrir
                   el reporte vw_Reporte_Ingresos_Por_Sede.
                3. 18 sesiones dinámicas relativas a GETDATE() (hoy, mañana, +2 días, +5 días,
                   -2 días, -5 días) asignadas principalmente a instructor1 y otros instructores.
                4. Inscripciones estratégicas para instructor1 (sesión de hoy casi llena para
                   validar control de cupos, y asistencias/inasistencias en sesiones pasadas
                   para nutrir el historial y los casos de prueba del cursor de inasistencias).
                5. Totalmente IDEMPOTENTE: puede ejecutarse múltiples veces de forma segura
                   sin duplicar datos ni alterar credenciales base (socio1, instructor1, etc.).
   ===================================================================================== */

USE [GimnasioDB];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

    PRINT '=========================================================================';
    PRINT 'Iniciando carga de datos enriquecidos (GimnasioDB_Seed_Extra)...';
    PRINT '=========================================================================';

    -- Variables de tiempo relativo
    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @ahora DATETIME2(7) = SYSDATETIME();

    -- ---------------------------------------------------------------------------------
    -- VALIDACIONES PREVIAS DE INTEGRIDAD
    -- ---------------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM Sede)
        THROW 50001, 'No existen sedes registradas en Sede. Ejecuta primero GimnasioDB_DDL.sql y GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM PlanMembresia)
        THROW 50002, 'No existen planes registrados en PlanMembresia. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM Clase)
        THROW 50003, 'No existen clases registradas en Clase. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    IF NOT EXISTS (SELECT 1 FROM Instructor)
        THROW 50004, 'No existen instructores registrados en Instructor. Ejecuta primero GimnasioDB_Seed.sql.', 1;

    -- Localizar ID de instructor1 (prioriza el vinculado al usuario 'instructor1' o el mínimo ID)
    DECLARE @id_inst1 INT;
    SELECT TOP 1 @id_inst1 = i.id_instructor
    FROM Instructor i
    LEFT JOIN Usuario u ON u.id_instructor_usuario = i.id_instructor
    ORDER BY CASE WHEN u.username_usuario = 'instructor1' THEN 0 ELSE 1 END, i.id_instructor ASC;

    -- Localizar otros instructores para distribuir carga
    DECLARE @id_inst2 INT, @id_inst3 INT, @id_inst4 INT;
    SELECT TOP 1 @id_inst2 = id_instructor FROM Instructor WHERE id_instructor > @id_inst1 ORDER BY id_instructor ASC;
    SELECT TOP 1 @id_inst3 = id_instructor FROM Instructor WHERE id_instructor > COALESCE(@id_inst2, @id_inst1) ORDER BY id_instructor ASC;
    SELECT TOP 1 @id_inst4 = id_instructor FROM Instructor WHERE id_instructor > COALESCE(@id_inst3, @id_inst2, @id_inst1) ORDER BY id_instructor ASC;

    SET @id_inst2 = COALESCE(@id_inst2, @id_inst1);
    SET @id_inst3 = COALESCE(@id_inst3, @id_inst2);
    SET @id_inst4 = COALESCE(@id_inst4, @id_inst3);

    -- Tabla de Sedes numeradas correlativamente (0 a N-1) para distribución uniforme
    IF OBJECT_ID('tempdb..#SedesRef') IS NOT NULL DROP TABLE #SedesRef;
    CREATE TABLE #SedesRef (
        pos INT IDENTITY(0, 1) PRIMARY KEY,
        id_sede INT NOT NULL
    );
    INSERT INTO #SedesRef (id_sede)
    SELECT id_sede FROM Sede ORDER BY id_sede ASC;

    DECLARE @total_sedes INT;
    SELECT @total_sedes = COUNT(*) FROM #SedesRef;

    -- Tabla de Planes numerados correlativamente (0 a N-1)
    IF OBJECT_ID('tempdb..#PlanesRef') IS NOT NULL DROP TABLE #PlanesRef;
    CREATE TABLE #PlanesRef (
        pos INT IDENTITY(0, 1) PRIMARY KEY,
        id_planmembresia INT NOT NULL,
        duracion_meses INT NOT NULL,
        precio DECIMAL(12,2) NOT NULL
    );
    INSERT INTO #PlanesRef (id_planmembresia, duracion_meses, precio)
    SELECT id_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
    FROM PlanMembresia
    ORDER BY id_planmembresia ASC;

    DECLARE @total_planes INT;
    SELECT @total_planes = COUNT(*) FROM #PlanesRef;

    -- Tabla de Clases numeradas correlativamente (0 a N-1)
    IF OBJECT_ID('tempdb..#ClasesRef') IS NOT NULL DROP TABLE #ClasesRef;
    CREATE TABLE #ClasesRef (
        pos INT IDENTITY(0, 1) PRIMARY KEY,
        id_clase INT NOT NULL,
        nombre_clase NVARCHAR(100) NOT NULL
    );
    INSERT INTO #ClasesRef (id_clase, nombre_clase)
    SELECT id_clase, nombre_clase FROM Clase ORDER BY id_clase ASC;

    DECLARE @total_clases INT;
    SELECT @total_clases = COUNT(*) FROM #ClasesRef;

    -- =================================================================================
    -- 1. REGISTRO DE 32 NUEVOS SOCIOS (Nombres reales chilenos + RUTs Módulo 11)
    -- =================================================================================
    IF OBJECT_ID('tempdb..#StagingSocios') IS NOT NULL DROP TABLE #StagingSocios;
    CREATE TABLE #StagingSocios (
        idx INT IDENTITY(1,1) PRIMARY KEY,
        rut_socio VARCHAR(12) NOT NULL,
        nombre_completo NVARCHAR(150) NOT NULL,
        fecha_nac DATE NOT NULL,
        correo VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        acepta_prom BIT NOT NULL,
        activo BIT NOT NULL
    );

    INSERT INTO #StagingSocios (rut_socio, nombre_completo, fecha_nac, correo, telefono, acepta_prom, activo) VALUES
        ('19482710-5', N'Camila Ignacia Valenzuela Soto',     '1997-04-12', 'camila.valenzuela@gmail.com',     '+56981234561', 1, 1),
        ('18934521-6', N'Matías Alonso Contreras Muñoz',      '1995-09-23', 'matias.contreras@gmail.com',      '+56982345672', 1, 1),
        ('20145892-7', N'Javiera Paz Sepúlveda Rojas',        '1999-11-05', 'javiera.sepulveda@gmail.com',     '+56983456783', 1, 1),
        ('17892341-2', N'Nicolás Andrés Morales Pérez',       '1992-02-18', 'nicolas.morales@gmail.com',       '+56984567894', 0, 1),
        ('19654128-4', N'Valentina Andrea Silva Castro',      '1998-07-30', 'valentina.silva@gmail.com',       '+56985678905', 1, 1),
        ('18432198-K', N'Benjamín Ignacio Fuentes Araya',     '1994-01-14', 'benjamin.fuentes@gmail.com',      '+56986789016', 1, 1),
        ('20456123-0', N'Francisca Belén Torres Espinoza',    '2000-06-25', 'francisca.torres@gmail.com',      '+56987890127', 1, 1),
        ('19128945-5', N'Vicente Javier Hernández Vargas',    '1996-03-08', 'vicente.hernandez@gmail.com',     '+56988901238', 0, 1),
        ('18765431-9', N'Constanza Nicole Díaz Reyes',        '1994-10-17', 'constanza.diaz@gmail.com',        '+56989012349', 1, 1),
        ('19876234-2', N'Tomás Alejandro López Carrasco',     '1998-12-03', 'tomas.lopez@gmail.com',           '+56990123450', 1, 1),
        ('20678912-3', N'Isidora Millaray Flores Gómez',      '2001-05-20', 'isidora.flores@gmail.com',        '+56991234561', 1, 1),
        ('17654329-9', N'Felipe Esteban Espinoza Cortés',     '1991-08-11', 'felipe.espinoza@gmail.com',       '+56992345672', 0, 1),
        ('19543890-0', N'Catalina Sofía Álvarez Herrera',     '1997-02-28', 'catalina.alvarez@gmail.com',      '+56993456783', 1, 1),
        ('18234567-9', N'Sebastián Eduardo Vergara Bravo',    '1993-04-19', 'sebastian.vergara@gmail.com',     '+56994567894', 1, 1),
        ('20321456-1', N'Fernanda Rocío Pinto Figueroa',      '2000-01-07', 'fernanda.pinto@gmail.com',        '+56995678905', 1, 1),
        ('19765412-0', N'Diego Ignacio Mendoza Riquelme',     '1998-09-15', 'diego.mendoza@gmail.com',         '+56996789016', 0, 1),
        ('20987456-3', N'Martina Antonia Salazar Sandoval',   '2002-03-22', 'martina.salazar@gmail.com',       '+56997890127', 1, 1),
        ('18654321-1', N'Joaquín Emilio Cárdenas Campos',     '1994-06-30', 'joaquin.cardenas@gmail.com',      '+56998901238', 1, 1),
        ('19345678-2', N'Daniela Andrea Bustos Miranda',      '1996-10-12', 'daniela.bustos@gmail.com',        '+56999012349', 1, 1),
        ('18876543-2', N'Cristóbal Jesús Parra Vidal',        '1995-04-05', 'cristobal.parra@gmail.com',       '+56980123451', 1, 1),
        ('19234512-K', N'Macarena Soledad Gajardo Peña',      '1996-08-27', 'macarena.gajardo@gmail.com',      '+56981234572', 0, 1),
        ('17987654-K', N'Ignacio Andrés Navarro Salinas',     '1992-12-14', 'ignacio.navarro@gmail.com',       '+56982345683', 1, 1),
        ('19678123-4', N'Paulina Alejandra Lagos Maldonado',  '1998-03-03', 'paulina.lagos@gmail.com',        '+56983456794', 1, 1),
        ('18543210-6', N'Gabriel Antonio Sanhueza Godoy',     '1994-07-21', 'gabriel.sanhueza@gmail.com',     '+56984567805', 0, 1),
        ('20876543-4', N'Monserrat Isidora Paredes Leiva',    '2001-11-19', 'monserrat.paredes@gmail.com',     '+56985678916', 1, 1),
        ('18345679-2', N'Álvaro Rodrigo Garrido Zúñiga',      '1993-09-09', 'alvaro.garrido@gmail.com',       '+56986789027', 1, 1),
        ('19876540-6', N'Bárbara Paz Henríquez Orellana',     '1998-05-16', 'barbara.henriquez@gmail.com',     '+56987890138', 1, 1),
        ('18765982-5', N'Maximiliano José Poblete Valdés',    '1995-01-24', 'maximiliano.poblete@gmail.com',    '+56988901249', 0, 1),
        ('20543219-1', N'Pía Valentina Barrientos Venegas',   '2000-08-08', 'pia.barrientos@gmail.com',        '+56989012350', 1, 1),
        ('17543218-3', N'Rodrigo Alfonso Santana Guzmán',     '1990-10-31', 'rodrigo.santana@gmail.com',      '+56990123461', 1, 1),
        ('19987612-0', N'Florencia Rosario Carrillo Medina',  '1999-02-14', 'florencia.carrillo@gmail.com',   '+56991234572', 1, 1),
        ('20234567-0', N'Lucas Manuel Aguilera Baeza',        '2000-12-29', 'lucas.aguilera@gmail.com',        '+56992345683', 0, 1);

    -- Inserción idempotente en Socio distribuyendo equitativamente en Sede
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
    SELECT 
        s.rut_socio,
        s.nombre_completo,
        s.fecha_nac,
        s.correo,
        s.telefono,
        sr.id_sede,
        s.acepta_prom,
        s.activo
    FROM #StagingSocios s
    INNER JOIN #SedesRef sr ON sr.pos = ((s.idx - 1) % @total_sedes)
    WHERE NOT EXISTS (
        SELECT 1 FROM Socio WHERE rut_socio = s.rut_socio OR correo_socio = s.correo
    );

    PRINT '32 Socios chilenos procesados y distribuidos equitativamente entre sedes.';

    -- Opcional: Asignación de credenciales en Usuario para los nuevos socios (sin tocar socio1 ni otros base)
    DECLARE @id_rol_socio INT;
    SELECT TOP 1 @id_rol_socio = id_rol FROM Rol WHERE nombre_rol = 'Socio';

    IF @id_rol_socio IS NOT NULL
    BEGIN
        INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario, id_socio_usuario)
        SELECT 
            CONCAT('socio', sc.id_socio),
            HASHBYTES('SHA2_512', CONCAT('Clave#socio', sc.id_socio)),
            @id_rol_socio,
            sc.id_socio
        FROM Socio sc
        INNER JOIN #StagingSocios st ON sc.rut_socio = st.rut_socio
        WHERE NOT EXISTS (SELECT 1 FROM Usuario WHERE id_socio_usuario = sc.id_socio);
    END;

    -- =================================================================================
    -- 2. GENERACIÓN DE CONTRATOS Y PAGOS (Vigentes, Vencidos, Cancelados, 3 Períodos)
    -- =================================================================================
    -- Recuperar los IDs reales de los 32 socios
    IF OBJECT_ID('tempdb..#SociosAsignados') IS NOT NULL DROP TABLE #SociosAsignados;
    CREATE TABLE #SociosAsignados (
        idx INT NOT NULL,
        id_socio INT NOT NULL,
        id_sede INT NOT NULL
    );
    INSERT INTO #SociosAsignados (idx, id_socio, id_sede)
    SELECT st.idx, sc.id_socio, sc.id_sede_registro_socio
    FROM #StagingSocios st
    INNER JOIN Socio sc ON sc.rut_socio = st.rut_socio;

    -- Definir los parámetros de cada contrato según el índice (1 a 32):
    --   Idx  1 al  4: VIGENTES POR VENCER (vencen en 1, 2, 3 y 5 días)
    --   Idx  5 al 20: VIGENTES NORMALES (con vigencia holgada)
    --   Idx 21 al 27: VENCIDOS (vencieron hace 7 a 60 días)
    --   Idx 28 al 32: CANCELADOS
    IF OBJECT_ID('tempdb..#ConfigContratos') IS NOT NULL DROP TABLE #ConfigContratos;
    CREATE TABLE #ConfigContratos (
        idx INT PRIMARY KEY,
        estado VARCHAR(20) NOT NULL,
        plan_offset INT NOT NULL,
        dias_inicio INT NOT NULL,
        dias_fin INT NOT NULL,
        meses_pago_retro INT NOT NULL, -- 0: mes actual, 1: mes pasado, 2: hace 2 meses
        medio_pago VARCHAR(20) NOT NULL
    );

    INSERT INTO #ConfigContratos (idx, estado, plan_offset, dias_inicio, dias_fin, meses_pago_retro, medio_pago) VALUES
        -- VIGENTES POR VENCER (en los próximos 5 días)
        (1,  'Vigente',   0,  -29,   1, 0, 'Tarjeta'),        -- Vence mañana (+1 día)
        (2,  'Vigente',   1,  -88,   2, 2, 'Transferencia'),  -- Vence en +2 días
        (3,  'Vigente',   0,  -27,   3, 0, 'Efectivo'),       -- Vence en +3 días
        (4,  'Vigente',   2, -175,   5, 1, 'Tarjeta'),        -- Vence en +5 días

        -- VIGENTES NORMALES (16 socios)
        (5,  'Vigente',   0,   -2,  28, 0, 'Tarjeta'),
        (6,  'Vigente',   1,   -5, 175, 0, 'Transferencia'),
        (7,  'Vigente',   2,  -10, 355, 0, 'Tarjeta'),
        (8,  'Vigente',   3,  -15,  75, 0, 'Efectivo'),
        (9,  'Vigente',   0,  -18,  12, 0, 'Transferencia'),
        (10, 'Vigente',   1,  -22, 158, 0, 'Tarjeta'),
        (11, 'Vigente',   2,  -25, 340, 0, 'Transferencia'),
        (12, 'Vigente',   0,  -35,  25, 1, 'Efectivo'),
        (13, 'Vigente',   1,  -40, 140, 1, 'Tarjeta'),
        (14, 'Vigente',   2,  -45, 320, 1, 'Transferencia'),
        (15, 'Vigente',   3,  -50,  40, 1, 'Tarjeta'),
        (16, 'Vigente',   0,  -55,   5, 1, 'Efectivo'),
        (17, 'Vigente',   1,  -65, 115, 2, 'Transferencia'),
        (18, 'Vigente',   2,  -70, 295, 2, 'Tarjeta'),
        (19, 'Vigente',   3,  -75,  15, 2, 'Efectivo'),
        (20, 'Vigente',   0,  -80,  10, 2, 'Transferencia'),

        -- VENCIDOS (7 socios)
        (21, 'Vencido',   0,  -37,  -7, 1, 'Tarjeta'),        -- Venció hace 7 días
        (22, 'Vencido',   0,  -45, -15, 1, 'Transferencia'),  -- Venció hace 15 días
        (23, 'Vencido',   2, -120, -30, 2, 'Efectivo'),       -- Venció hace 30 días
        (24, 'Vencido',   1, -225, -45, 2, 'Tarjeta'),        -- Venció hace 45 días
        (25, 'Vencido',   2,  -90, -60, 2, 'Transferencia'),  -- Venció hace 60 días
        (26, 'Vencido',   0,  -40, -10, 1, 'Efectivo'),       -- Venció hace 10 días
        (27, 'Vencido',   0,  -50, -20, 1, 'Tarjeta'),        -- Venció hace 20 días

        -- CANCELADOS (5 socios)
        (28, 'Cancelado', 1,  -60, 120, 2, 'Transferencia'),
        (29, 'Cancelado', 2,  -45, 135, 1, 'Tarjeta'),
        (30, 'Cancelado', 0,  -30,  30, 1, 'Efectivo'),
        (31, 'Cancelado', 3,  -20,  70, 0, 'Transferencia'),
        (32, 'Cancelado', 1,  -15, 165, 0, 'Tarjeta');

    -- Insertar Contratos para los socios que aún no tengan contrato registrado
    INSERT INTO Contrato (
        id_socio_contrato,
        id_planmembresia_contrato,
        fecha_inicio_contrato,
        fecha_termino_contrato,
        estado_contrato,
        precio_pactado_contrato
    )
    SELECT 
        sa.id_socio,
        pr.id_planmembresia,
        DATEADD(DAY, cfg.dias_inicio, @hoy),
        DATEADD(DAY, cfg.dias_fin, @hoy),
        cfg.estado,
        pr.precio
    FROM #ConfigContratos cfg
    INNER JOIN #SociosAsignados sa ON sa.idx = cfg.idx
    INNER JOIN #PlanesRef pr ON pr.pos = (cfg.plan_offset % @total_planes)
    WHERE NOT EXISTS (
        SELECT 1 FROM Contrato WHERE id_socio_contrato = sa.id_socio
    );

    PRINT '32 Contratos generados (20 Vigentes [4 por vencer en <=5 días], 7 Vencidos, 5 Cancelados).';

    -- Insertar Pagos para cada contrato nuevo distribuidos en los 3 meses requeridos
    -- Fecha de pago calibrada según meses_pago_retro:
    --   0: Mes actual
    --   1: Mes pasado (DATEADD(MONTH, -1, ...))
    --   2: Hace dos meses (DATEADD(MONTH, -2, ...))
    INSERT INTO Pago (
        id_contrato_pago,
        fecha_pago,
        monto_cancelado_pago,
        medio_pago
    )
    SELECT 
        c.id_contrato,
        CAST(
            CASE 
                WHEN cfg.meses_pago_retro = 0 THEN DATEADD(DAY, -((cfg.idx * 3) % 12), @ahora)
                WHEN cfg.meses_pago_retro = 1 THEN DATEADD(MONTH, -1, DATEADD(DAY, -((cfg.idx * 2) % 15), @ahora))
                ELSE DATEADD(MONTH, -2, DATEADD(DAY, -((cfg.idx * 2) % 15), @ahora))
            END 
            AS DATETIME2(7)
        ),
        c.precio_pactado_contrato,
        cfg.medio_pago
    FROM Contrato c
    INNER JOIN #SociosAsignados sa ON sa.id_socio = c.id_socio_contrato
    INNER JOIN #ConfigContratos cfg ON cfg.idx = sa.idx
    WHERE NOT EXISTS (
        SELECT 1 FROM Pago WHERE id_contrato_pago = c.id_contrato
    );

    PRINT 'Pagos generados y distribuidos entre mes actual, mes anterior y hace 2 meses (vw_Reporte_Ingresos_Por_Sede).';

    -- =================================================================================
    -- 3. INSERCIÓN DE 18 SESIONES DINÁMICAS (Hoy, Mañana, +2d, +5d, -2d, -5d)
    -- =================================================================================
    -- Usamos etiquetas claras de sesión para verificar idempotencia
    IF OBJECT_ID('tempdb..#StagingSesiones') IS NOT NULL DROP TABLE #StagingSesiones;
    CREATE TABLE #StagingSesiones (
        sesion_num INT PRIMARY KEY,
        id_instructor INT NOT NULL,
        dias_offset INT NOT NULL, -- 0=hoy, 1=mañana, 2=+2d, 5=+5d, -2=-2d, -5=-5d
        hora TIME(7) NOT NULL,
        clase_offset INT NOT NULL,
        sede_offset INT NOT NULL,
        cupo INT NOT NULL
    );

    INSERT INTO #StagingSesiones (sesion_num, id_instructor, dias_offset, hora, clase_offset, sede_offset, cupo) VALUES
        -- SESIONES DE HOY (Principalmente instructor1)
        (1,  @id_inst1,  0, '08:00', 0, 0, 15), -- Hoy 08:00
        (2,  @id_inst1,  0, '11:30', 1, 0, 12), -- Hoy 11:30
        (3,  @id_inst1,  0, '18:00', 5, 0, 12), -- Hoy 18:00 (SESIÓN CASI LLENA: 10 inscritos / 12 cupos)
        (4,  @id_inst1,  0, '19:30', 6, 1, 15), -- Hoy 19:30
        (5,  @id_inst2,  0, '09:00', 2, 1, 15), -- Hoy 09:00 (Instructor 2)

        -- SESIONES DE MAÑANA (instructor1 y otros)
        (6,  @id_inst1,  1, '09:00', 0, 0, 12), -- Mañana 09:00 (8 inscritos para instructor1)
        (7,  @id_inst1,  1, '18:30', 1, 0, 12), -- Mañana 18:30
        (8,  @id_inst2,  1, '10:00', 3, 1, 14), -- Mañana 10:00 (Instructor 2)

        -- SESIONES A +2 DÍAS
        (9,  @id_inst1,  2, '08:30', 5, 0, 15), -- +2 días
        (10, @id_inst1,  2, '19:00', 6, 1, 10), -- +2 días
        (11, @id_inst3,  2, '18:00', 4, 2, 16), -- +2 días (Instructor 3)

        -- SESIONES A +5 DÍAS
        (12, @id_inst1,  5, '10:00', 3, 0, 12), -- +5 días
        (13, @id_inst3,  5, '19:00', 7, 2, 18), -- +5 días (Instructor 3)

        -- HISTORIAL: SESIONES PASADAS A -2 DÍAS (Para pase de asistencia e inasistencias)
        (14, @id_inst1, -2, '08:00', 1, 0, 12), -- -2 días (Spinning - asistencias/inasistencias)
        (15, @id_inst1, -2, '18:30', 5, 0, 12), -- -2 días (CrossFit - asistencias/inasistencias)
        (16, @id_inst2, -2, '10:00', 8, 1, 15), -- -2 días (Instructor 2)

        -- HISTORIAL: SESIONES PASADAS A -5 DÍAS (Para historial e inasistencias acumuladas)
        (17, @id_inst1, -5, '09:00', 0, 0, 15), -- -5 días (Funcional HIIT)
        (18, @id_inst4, -5, '18:00', 9, 3, 12); -- -5 días (Instructor 4)

    -- Inserción idempotente de las 18 sesiones
    INSERT INTO Sesion (
        id_clase_sesion,
        id_sede_sesion,
        id_instructor_sesion,
        fecha_sesion,
        hora_sesion,
        cupo_maximo_sesion
    )
    SELECT 
        cr.id_clase,
        sr.id_sede,
        stg.id_instructor,
        DATEADD(DAY, stg.dias_offset, @hoy),
        stg.hora,
        stg.cupo
    FROM #StagingSesiones stg
    INNER JOIN #ClasesRef cr ON cr.pos = (stg.clase_offset % @total_clases)
    INNER JOIN #SedesRef sr ON sr.pos = (stg.sede_offset % @total_sedes)
    WHERE NOT EXISTS (
        SELECT 1 FROM Sesion 
        WHERE id_instructor_sesion = stg.id_instructor
          AND fecha_sesion = DATEADD(DAY, stg.dias_offset, @hoy)
          AND hora_sesion = stg.hora
          AND id_sede_sesion = sr.id_sede
    );

    PRINT '18 Sesiones programadas (hoy, mañana, futuras e historial) creadas/verificadas.';

    -- =================================================================================
    -- 4. INSCRIPCIONES ESTRATÉGICAS Y REGISTRO DE ASISTENCIA / INASISTENCIA
    -- =================================================================================
    -- Localizar los IDs reales de las sesiones creadas para instructor1
    DECLARE @id_ses_hoy_tarde INT, @id_ses_manana_manana INT;
    DECLARE @id_ses_pasada_2d_a INT, @id_ses_pasada_2d_b INT, @id_ses_pasada_5d INT;

    -- Sesión 3: Hoy 18:00 instructor1 (Casi llena: 10 inscritos de 12 cupos)
    SELECT TOP 1 @id_ses_hoy_tarde = id_sesion
    FROM Sesion
    WHERE id_instructor_sesion = @id_inst1
      AND fecha_sesion = @hoy
      AND hora_sesion = '18:00'
    ORDER BY id_sesion DESC;

    -- Sesión 6: Mañana 09:00 instructor1 (8 inscritos)
    SELECT TOP 1 @id_ses_manana_manana = id_sesion
    FROM Sesion
    WHERE id_instructor_sesion = @id_inst1
      AND fecha_sesion = DATEADD(DAY, 1, @hoy)
      AND hora_sesion = '09:00'
    ORDER BY id_sesion DESC;

    -- Sesión 14: Hace 2 días 08:00 instructor1
    SELECT TOP 1 @id_ses_pasada_2d_a = id_sesion
    FROM Sesion
    WHERE id_instructor_sesion = @id_inst1
      AND fecha_sesion = DATEADD(DAY, -2, @hoy)
      AND hora_sesion = '08:00'
    ORDER BY id_sesion DESC;

    -- Sesión 15: Hace 2 días 18:30 instructor1
    SELECT TOP 1 @id_ses_pasada_2d_b = id_sesion
    FROM Sesion
    WHERE id_instructor_sesion = @id_inst1
      AND fecha_sesion = DATEADD(DAY, -2, @hoy)
      AND hora_sesion = '18:30'
    ORDER BY id_sesion DESC;

    -- Sesión 17: Hace 5 días 09:00 instructor1
    SELECT TOP 1 @id_ses_pasada_5d = id_sesion
    FROM Sesion
    WHERE id_instructor_sesion = @id_inst1
      AND fecha_sesion = DATEADD(DAY, -5, @hoy)
      AND hora_sesion = '09:00'
    ORDER BY id_sesion DESC;

    -- Socios elegibles: socios con contrato Vigente de nuestro seed extra (idx 1 al 14)
    IF OBJECT_ID('tempdb..#SociosVigentes') IS NOT NULL DROP TABLE #SociosVigentes;
    CREATE TABLE #SociosVigentes (
        num INT IDENTITY(1,1) PRIMARY KEY,
        id_socio INT NOT NULL
    );
    INSERT INTO #SociosVigentes (id_socio)
    SELECT sa.id_socio
    FROM #SociosAsignados sa
    INNER JOIN Contrato c ON c.id_socio_contrato = sa.id_socio
    WHERE c.estado_contrato = 'Vigente'
    ORDER BY sa.idx ASC;

    -- A) Inscripciones para Sesión de Hoy 18:00 (10 socios -> Casi llena, cupo 12)
    IF @id_ses_hoy_tarde IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (
            id_socio_inscripcion,
            id_sesion_inscripcion,
            fecha_inscripcion,
            asistio_inscripcion,
            observaciones_inscripcion,
            estado_inscripcion
        )
        SELECT 
            sv.id_socio,
            @id_ses_hoy_tarde,
            DATEADD(HOUR, -4, @ahora),
            NULL, -- Sesión futura/hoy: asistencia pendiente
            N'Reserva confirmada vía Portal del Socio',
            'Inscrito'
        FROM #SociosVigentes sv
        WHERE sv.num BETWEEN 1 AND 10
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sv.id_socio 
                AND id_sesion_inscripcion = @id_ses_hoy_tarde
          );
        PRINT 'Sesión de hoy (18:00) cargada con 10 inscritos (casi llena para prueba de cupos).';
    END;

    -- B) Inscripciones para Sesión de Mañana 09:00 (8 socios)
    IF @id_ses_manana_manana IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (
            id_socio_inscripcion,
            id_sesion_inscripcion,
            fecha_inscripcion,
            asistio_inscripcion,
            observaciones_inscripcion,
            estado_inscripcion
        )
        SELECT 
            sv.id_socio,
            @id_ses_manana_manana,
            DATEADD(HOUR, -2, @ahora),
            NULL,
            N'Reserva anticipada confirmada',
            'Inscrito'
        FROM #SociosVigentes sv
        WHERE sv.num BETWEEN 5 AND 12
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sv.id_socio 
                AND id_sesion_inscripcion = @id_ses_manana_manana
          );
        PRINT 'Sesión de mañana (09:00) cargada con 8 inscritos.';
    END;

    -- C) Historial - Sesión hace 2 días (08:00): 8 inscritos (6 asistencias, 2 inasistencias)
    IF @id_ses_pasada_2d_a IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (
            id_socio_inscripcion,
            id_sesion_inscripcion,
            fecha_inscripcion,
            asistio_inscripcion,
            observaciones_inscripcion,
            estado_inscripcion
        )
        SELECT 
            sv.id_socio,
            @id_ses_pasada_2d_a,
            DATEADD(DAY, -3, @ahora),
            CASE WHEN sv.num IN (2, 7) THEN 0 ELSE 1 END,
            CASE WHEN sv.num IN (2, 7) THEN N'Inasistencia no justificada (pase de lista)' ELSE N'Asistencia registrada por instructor' END,
            'Inscrito'
        FROM #SociosVigentes sv
        WHERE sv.num BETWEEN 1 AND 8
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sv.id_socio 
                AND id_sesion_inscripcion = @id_ses_pasada_2d_a
          );
        PRINT 'Sesión pasada (-2 días 08:00) registrada con asistencias e inasistencias.';
    END;

    -- D) Historial - Sesión hace 2 días (18:30): 7 inscritos (5 asistencias, 2 inasistencias)
    IF @id_ses_pasada_2d_b IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (
            id_socio_inscripcion,
            id_sesion_inscripcion,
            fecha_inscripcion,
            asistio_inscripcion,
            observaciones_inscripcion,
            estado_inscripcion
        )
        SELECT 
            sv.id_socio,
            @id_ses_pasada_2d_b,
            DATEADD(DAY, -3, @ahora),
            CASE WHEN sv.num IN (7, 11) THEN 0 ELSE 1 END,
            CASE WHEN sv.num IN (7, 11) THEN N'Inasistencia sin previo aviso' ELSE N'Asistencia validada' END,
            'Inscrito'
        FROM #SociosVigentes sv
        WHERE sv.num BETWEEN 7 AND 13
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sv.id_socio 
                AND id_sesion_inscripcion = @id_ses_pasada_2d_b
          );
        PRINT 'Sesión pasada (-2 días 18:30) registrada con asistencias e inasistencias.';
    END;

    -- E) Historial - Sesión hace 5 días (09:00): 8 inscritos (5 asistencias, 3 inasistencias)
    -- Casos clave para el cursor de inasistencias:
    --   - Socio 2 acumula 2 faltas (sesión -2d y -5d)
    --   - Socio 7 acumula 2 faltas (sesión -2d mañana y -2d tarde)
    --   - Socio 8 acumula 1 falta
    IF @id_ses_pasada_5d IS NOT NULL
    BEGIN
        INSERT INTO Inscripcion (
            id_socio_inscripcion,
            id_sesion_inscripcion,
            fecha_inscripcion,
            asistio_inscripcion,
            observaciones_inscripcion,
            estado_inscripcion
        )
        SELECT 
            sv.id_socio,
            @id_ses_pasada_5d,
            DATEADD(DAY, -6, @ahora),
            CASE WHEN sv.num IN (2, 8, 9) THEN 0 ELSE 1 END,
            CASE WHEN sv.num IN (2, 8, 9) THEN N'Inasistencia reiterada para análisis de cursor' ELSE N'Asistencia confirmada' END,
            'Inscrito'
        FROM #SociosVigentes sv
        WHERE sv.num BETWEEN 2 AND 9
          AND NOT EXISTS (
              SELECT 1 FROM Inscripcion 
              WHERE id_socio_inscripcion = sv.id_socio 
                AND id_sesion_inscripcion = @id_ses_pasada_5d
          );
        PRINT 'Sesión pasada (-5 días) registrada con asistencias e inasistencias acumuladas.';
    END;

    -- Limpieza de tablas temporales
    IF OBJECT_ID('tempdb..#SedesRef') IS NOT NULL DROP TABLE #SedesRef;
    IF OBJECT_ID('tempdb..#PlanesRef') IS NOT NULL DROP TABLE #PlanesRef;
    IF OBJECT_ID('tempdb..#ClasesRef') IS NOT NULL DROP TABLE #ClasesRef;
    IF OBJECT_ID('tempdb..#StagingSocios') IS NOT NULL DROP TABLE #StagingSocios;
    IF OBJECT_ID('tempdb..#SociosAsignados') IS NOT NULL DROP TABLE #SociosAsignados;
    IF OBJECT_ID('tempdb..#ConfigContratos') IS NOT NULL DROP TABLE #ConfigContratos;
    IF OBJECT_ID('tempdb..#StagingSesiones') IS NOT NULL DROP TABLE #StagingSesiones;
    IF OBJECT_ID('tempdb..#SociosVigentes') IS NOT NULL DROP TABLE #SociosVigentes;

    COMMIT TRANSACTION;

    PRINT '=========================================================================';
    PRINT 'GimnasioDB_Seed_Extra ejecutado con ÉXITO en la base de datos.';
    PRINT '=========================================================================';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    IF OBJECT_ID('tempdb..#SedesRef') IS NOT NULL DROP TABLE #SedesRef;
    IF OBJECT_ID('tempdb..#PlanesRef') IS NOT NULL DROP TABLE #PlanesRef;
    IF OBJECT_ID('tempdb..#ClasesRef') IS NOT NULL DROP TABLE #ClasesRef;
    IF OBJECT_ID('tempdb..#StagingSocios') IS NOT NULL DROP TABLE #StagingSocios;
    IF OBJECT_ID('tempdb..#SociosAsignados') IS NOT NULL DROP TABLE #SociosAsignados;
    IF OBJECT_ID('tempdb..#ConfigContratos') IS NOT NULL DROP TABLE #ConfigContratos;
    IF OBJECT_ID('tempdb..#StagingSesiones') IS NOT NULL DROP TABLE #StagingSesiones;
    IF OBJECT_ID('tempdb..#SociosVigentes') IS NOT NULL DROP TABLE #SociosVigentes;

    PRINT '=========================================================================';
    PRINT 'ERROR en la ejecución de GimnasioDB_Seed_Extra:';
    PRINT ERROR_MESSAGE();
    PRINT '=========================================================================';
    THROW;
END CATCH;
GO

-- -------------------------------------------------------------------------------------
-- COMPROBACIÓN VISUAL DE REGISTROS Y VISTAS DE NEGOCIO
-- -------------------------------------------------------------------------------------
PRINT '--- RESUMEN DE TOTALES EN LA BASE DE DATOS ---';
SELECT 'Sedes Totales' AS Metrica, COUNT(*) AS Total FROM Sede
UNION ALL SELECT 'Socios Totales', COUNT(*) FROM Socio
UNION ALL SELECT 'Contratos Totales', COUNT(*) FROM Contrato
UNION ALL SELECT 'Contratos Vigentes', COUNT(*) FROM Contrato WHERE estado_contrato = 'Vigente'
UNION ALL SELECT 'Contratos que vencen en <= 5 días', COUNT(*) FROM Contrato WHERE estado_contrato = 'Vigente' AND fecha_termino_contrato <= DATEADD(DAY, 5, CAST(GETDATE() AS DATE))
UNION ALL SELECT 'Contratos Vencidos', COUNT(*) FROM Contrato WHERE estado_contrato = 'Vencido'
UNION ALL SELECT 'Contratos Cancelados', COUNT(*) FROM Contrato WHERE estado_contrato = 'Cancelado'
UNION ALL SELECT 'Pagos Totales', COUNT(*) FROM Pago
UNION ALL SELECT 'Sesiones Totales', COUNT(*) FROM Sesion
UNION ALL SELECT 'Inscripciones Totales', COUNT(*) FROM Inscripcion
UNION ALL SELECT 'Inasistencias Registradas (Historial)', COUNT(*) FROM Inscripcion WHERE asistio_inscripcion = 0;
GO

PRINT '--- INGRESOS POR SEDE Y PERÍODO (vw_Reporte_Ingresos_Por_Sede) ---';
SELECT TOP 10 
    nombre_sede, 
    anio_pago, 
    mes_pago, 
    FORMAT(total_ingresos, 'C', 'es-CL') AS total_ingresos_formato
FROM vw_Reporte_Ingresos_Por_Sede
ORDER BY anio_pago DESC, mes_pago DESC, total_ingresos DESC;
GO

PRINT '--- ESTADO DE SESIONES Y CUPOS DISPONIBLES (vw_Sesiones_Disponibles) ---';
SELECT TOP 10 
    id_sesion,
    nombre_clase,
    nombre_sede,
    nombre_completo_instructor,
    fecha_sesion,
    hora_sesion,
    cupo_maximo_sesion,
    total_inscritos,
    cupos_disponibles
FROM vw_Sesiones_Disponibles
WHERE fecha_sesion >= CAST(GETDATE() AS DATE)
ORDER BY fecha_sesion ASC, hora_sesion ASC;
GO
