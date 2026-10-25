-- =====================================================================================
-- GimnasioDB - Script T-SQL de Carga Inicial de Datos de Prueba (Seed)
-- Sincronizado con el DDL donde cada atributo termina en el nombre de su tabla.
--
-- Reglas:
-- 1. Pure T-SQL sin ORM.
-- 2. Integridad referencial con variables base (MIN de cada identidad) y SCOPE_IDENTITY().
-- 3. Transacción atómica segura con TRY...CATCH.
-- 4. Entre 10 y 100 registros por tabla. Se asume una BD recién creada (vacía).
--
-- NOTA: Los contratos se insertan ANTES que las inscripciones porque el trigger
--       trg_Inscripcion_Validaciones (si existe) exige contrato vigente.
-- NOTA: Las sesiones se generan con fechas relativas al día de ejecución (hoy a +13 días).
--       Pasado ese plazo estarán vencidas; recrea la base (DDL + seed) para renovarlas.
-- ORDEN: ejecutar primero GimnasioDB_DDL.sql y luego este archivo.
-- Credenciales de prueba: password = 'Clave#' + username (ej: Clave#admin).
-- RUT ficticios (dígito verificador no calculado).
-- =====================================================================================

USE GimnasioDB;
GO

SET NOCOUNT ON;

BEGIN TRANSACTION;
BEGIN TRY

    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);

    DECLARE @base_sede INT;
    DECLARE @base_plan INT;
    DECLARE @base_instructor INT;
    DECLARE @base_clase INT;
    DECLARE @base_sesion INT;
    DECLARE @base_rol INT;

    -- Protección: este seed solo se ejecuta sobre una base recién creada (vacía).
    IF EXISTS (SELECT 1 FROM Region)
        THROW 50001, 'La base ya contiene datos. Ejecuta el seed solo sobre una GimnasioDB recien creada con GimnasioDB_DDL.sql.', 1;

    -- =================================================================================
    -- 1. JERARQUÍA GEOGRÁFICA: Región > Provincia > Comuna > Ciudad
    -- =================================================================================
    INSERT INTO Region (nombre_region) VALUES
        (N'Antofagasta'), (N'Atacama'), (N'Coquimbo'), (N'Valparaíso'),
        (N'Metropolitana de Santiago'), (N'O''Higgins'), (N'Maule'), (N'Ñuble'),
        (N'Biobío'), (N'La Araucanía'), (N'Los Ríos'), (N'Los Lagos');

    INSERT INTO Provincia (id_region_provincia, nombre_provincia)
    SELECT id_region, Lista.provincia_ref
    FROM (VALUES
        (N'Antofagasta', N'Antofagasta'), (N'Atacama', N'Copiapó'),
        (N'Coquimbo', N'Elqui'), (N'Valparaíso', N'Valparaíso'),
        (N'Metropolitana de Santiago', N'Santiago'), (N'O''Higgins', N'Cachapoal'),
        (N'Maule', N'Talca'), (N'Ñuble', N'Diguillín'),
        (N'Biobío', N'Concepción'), (N'La Araucanía', N'Cautín'),
        (N'Los Ríos', N'Valdivia'), (N'Los Lagos', N'Llanquihue')
    ) AS Lista(region_ref, provincia_ref)
    INNER JOIN Region ON nombre_region = Lista.region_ref;

    INSERT INTO Comuna (id_provincia_comuna, nombre_comuna)
    SELECT id_provincia, Lista.comuna_ref
    FROM (VALUES
        (N'Antofagasta', N'Antofagasta'), (N'Copiapó', N'Copiapó'),
        (N'Elqui', N'La Serena'), (N'Valparaíso', N'Valparaíso'),
        (N'Valparaíso', N'Viña del Mar'), (N'Santiago', N'Santiago Centro'),
        (N'Santiago', N'Providencia'), (N'Santiago', N'Las Condes'),
        (N'Cachapoal', N'Rancagua'), (N'Talca', N'Talca'),
        (N'Diguillín', N'Chillán'), (N'Concepción', N'Concepción'),
        (N'Cautín', N'Temuco'), (N'Valdivia', N'Valdivia'),
        (N'Llanquihue', N'Puerto Montt')
    ) AS Lista(provincia_ref, comuna_ref)
    INNER JOIN Provincia ON nombre_provincia = Lista.provincia_ref;

    INSERT INTO Ciudad (id_comuna_ciudad, nombre_ciudad)
    SELECT id_comuna, Lista.ciudad_ref
    FROM (VALUES
        (N'Antofagasta', N'Antofagasta'), (N'Copiapó', N'Copiapó'),
        (N'La Serena', N'La Serena'), (N'Valparaíso', N'Valparaíso'),
        (N'Viña del Mar', N'Viña del Mar'), (N'Santiago Centro', N'Santiago'),
        (N'Providencia', N'Providencia'), (N'Las Condes', N'Las Condes'),
        (N'Rancagua', N'Rancagua'), (N'Talca', N'Talca'),
        (N'Chillán', N'Chillán'), (N'Concepción', N'Concepción'),
        (N'Temuco', N'Temuco'), (N'Valdivia', N'Valdivia'),
        (N'Puerto Montt', N'Puerto Montt')
    ) AS Lista(comuna_ref, ciudad_ref)
    INNER JOIN Comuna ON nombre_comuna = Lista.comuna_ref;

    PRINT 'Jerarquía geográfica insertada (12 regiones, 12 provincias, 15 comunas, 15 ciudades).';

    -- =================================================================================
    -- 2. SEDES (12)
    -- =================================================================================
    INSERT INTO Sede (nombre_sede, direccion_calle_sede, id_ciudad_sede, telefono_sede)
    SELECT Lista.nombre_ref, Lista.calle_ref, id_ciudad, Lista.fono_ref
    FROM (VALUES
        (N'Sede Central Moneda',        N'Calle Moneda 1020',              N'Santiago',      '+56 2 2345 6789'),
        (N'Sede Providencia Norte',     N'Av. Providencia 1450',           N'Providencia',   '+56 2 2987 6543'),
        (N'Sede Las Condes Apoquindo',  N'Av. Apoquindo 4500',             N'Las Condes',    '+56 2 2456 1200'),
        (N'Sede Viña Centro',           N'Av. Libertad 1200',              N'Viña del Mar',  '+56 32 238 1100'),
        (N'Sede Valparaíso Puerto',     N'Av. Errázuriz 800',              N'Valparaíso',    '+56 32 225 4400'),
        (N'Sede Concepción Centro',     N'Calle Barros Arana 900',         N'Concepción',    '+56 41 224 5500'),
        (N'Sede Temuco Norte',          N'Av. Alemania 750',               N'Temuco',        '+56 45 221 3300'),
        (N'Sede Puerto Montt Costanera',N'Av. Diego Portales 600',         N'Puerto Montt',  '+56 65 226 7700'),
        (N'Sede Valdivia Centro',       N'Calle Arauco 450',               N'Valdivia',      '+56 63 221 8800'),
        (N'Sede Rancagua Plaza',        N'Av. Brasil 1100',                N'Rancagua',      '+56 72 223 9900'),
        (N'Sede La Serena Centro',      N'Av. Francisco de Aguirre 300',   N'La Serena',     '+56 51 222 6600'),
        (N'Sede Antofagasta Sur',       N'Av. Angamos 1500',               N'Antofagasta',   '+56 55 245 1500')
    ) AS Lista(nombre_ref, calle_ref, ciudad_ref, fono_ref)
    INNER JOIN Ciudad ON nombre_ciudad = Lista.ciudad_ref;

    SELECT @base_sede = MIN(id_sede) FROM Sede;
    PRINT '12 Sedes insertadas correctamente.';

    -- =================================================================================
    -- 3. PLANES DE MEMBRESÍA (10)
    -- =================================================================================
    INSERT INTO PlanMembresia (nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia) VALUES
        (N'Plan Mensual Smart',        1,  29990.00),
        (N'Plan Anual Black VIP',      12, 289990.00),
        (N'Plan Trimestral Flex',      3,  79990.00),
        (N'Plan Semestral Plus',       6,  149990.00),
        (N'Plan Anual Estándar',       12, 249990.00),
        (N'Plan Mensual Estudiante',   1,  19990.00),
        (N'Plan Anual Familiar',       12, 449990.00),
        (N'Plan Trimestral Mañanas',   3,  59990.00),
        (N'Plan Semestral Estudiante', 6,  109990.00),
        (N'Plan Mensual Premium',      1,  39990.00);

    SELECT @base_plan = MIN(id_planmembresia) FROM PlanMembresia;
    PRINT '10 Planes de membresía insertados correctamente.';

    -- =================================================================================
    -- Tabla temporal con 100 nombres de persona para reutilizar en
    -- instructores (1-18), personal (21-40) y socios (41-97)
    -- =================================================================================
    CREATE TABLE #Persona (num_persona INT NOT NULL, nombre_persona NVARCHAR(150) NOT NULL);

    WITH Numeros AS (
        SELECT TOP (100) ROW_NUMBER() OVER (ORDER BY object_id) AS n FROM sys.all_objects
    )
    INSERT INTO #Persona (num_persona, nombre_persona)
    SELECT n,
        CONCAT(
            CHOOSE(n % 20 + 1, N'Sofía', N'Mateo', N'Camila', N'Benjamín', N'Javiera', N'Joaquín', N'Fernanda',
                N'Vicente', N'Constanza', N'Matías', N'Catalina', N'Sebastián', N'Antonia', N'Tomás',
                N'Isidora', N'Nicolás', N'Francisca', N'Felipe', N'Martina', N'Diego'),
            N' ',
            CHOOSE((n * 7 + n / 20) % 20 + 1, N'González', N'Muñoz', N'Rojas', N'Díaz', N'Pérez', N'Soto',
                N'Contreras', N'Silva', N'Martínez', N'Sepúlveda', N'Morales', N'Rodríguez', N'López',
                N'Fuentes', N'Hernández', N'Torres', N'Araya', N'Flores', N'Espinoza', N'Valenzuela'),
            N' ',
            CHOOSE((n * 3 + 5 + n / 7) % 20 + 1, N'Castro', N'Vargas', N'Reyes', N'Núñez', N'Carrasco', N'Tapia',
                N'Gómez', N'Cortés', N'Herrera', N'Álvarez', N'Vega', N'Peña', N'Bravo', N'Figueroa',
                N'Riquelme', N'Sandoval', N'Campos', N'Miranda', N'Vidal', N'Parra'))
    FROM Numeros;

    -- =================================================================================
    -- 4. INSTRUCTORES (20: 2 originales + 18 generados)
    -- =================================================================================
    INSERT INTO Instructor (rut_instructor, nombre_completo_instructor, correo_instructor, telefono_instructor, id_sede_habitual_instructor)
    VALUES ('15.432.876-1', N'Carlos Gutiérrez', 'carlos.gutierrez@gimnasiodb.cl', '+56 9 8111 2233', @base_sede),
           ('16.789.012-3', N'Valentina Ríos',   'valentina.rios@gimnasiodb.cl',   '+56 9 8222 3344', @base_sede + 1);

    INSERT INTO Instructor (rut_instructor, nombre_completo_instructor, correo_instructor, telefono_instructor, id_sede_habitual_instructor)
    SELECT CONCAT(FORMAT(11000000 + num_persona * 251113, 'N0', 'es-CL'), '-', num_persona % 10),
           nombre_persona,
           CONCAT('instructor', num_persona + 2, '@gimnasiodb.cl'),
           CONCAT('+56 9 ', 5000 + num_persona * 37, ' ', 1000 + num_persona * 53),
           @base_sede + (num_persona % 12)
    FROM #Persona
    WHERE num_persona BETWEEN 1 AND 18;

    SELECT @base_instructor = MIN(id_instructor) FROM Instructor;
    PRINT '20 Instructores insertados correctamente.';

    -- =================================================================================
    -- 5. PERSONAL (20)
    -- =================================================================================
    INSERT INTO Personal (rut_personal, nombre_completo_personal, correo_personal, telefono_personal, cargo_personal, id_sede_personal)
    SELECT CONCAT(FORMAT(13000000 + num_persona * 197003, 'N0', 'es-CL'), '-', num_persona % 10),
           nombre_persona,
           CONCAT('personal', num_persona, '@gimnasiodb.cl'),
           CONCAT('+56 9 ', 6000 + num_persona * 29, ' ', 2000 + num_persona * 41),
           CHOOSE(num_persona % 5 + 1, 'Recepcionista', 'Administrador de Sede', 'Aseo y Mantención', 'Ventas', 'Soporte'),
           @base_sede + (num_persona % 12)
    FROM #Persona
    WHERE num_persona BETWEEN 21 AND 40;

    PRINT '20 registros de Personal insertados correctamente.';

    -- =================================================================================
    -- 6. EQUIPAMIENTO (40)
    -- =================================================================================
    WITH Numeros AS (
        SELECT TOP (40) ROW_NUMBER() OVER (ORDER BY object_id) AS n FROM sys.all_objects
    )
    INSERT INTO Equipamiento (id_sede_equipamiento, nombre_descriptivo_equipamiento, fecha_adquisicion_equipamiento)
    SELECT @base_sede + (n % 12),
           CONCAT(CHOOSE(n % 10 + 1, N'Trotadora Pro X', N'Bicicleta Spinning', N'Banco Press Plano',
                  N'Rack de Sentadillas', N'Set de Mancuernas', N'Remo Ergómetro', N'Elíptica Cardio',
                  N'Polea Multifuerza', N'Kettlebell Set', N'Máquina Prensa de Piernas'), N' #', n),
           DATEADD(DAY, -(n * 37), @hoy)
    FROM Numeros;

    PRINT '40 piezas de Equipamiento insertadas correctamente.';

    -- =================================================================================
    -- 7. SOCIOS (60: Daniel Matus, Emilia Osorio, Yulissa Ulloa + 57 generados)
    -- =================================================================================
    INSERT INTO Socio (rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio)
    VALUES ('18.765.432-K', N'Daniel Matus',  '1999-04-12', 'daniel.matus@alumnos.cl',  '+56 9 9333 4455', @base_sede,     1, 1),
           ('19.123.456-7', N'Emilia Osorio', '2000-08-25', 'emilia.osorio@alumnos.cl', '+56 9 9444 5566', @base_sede + 1, 1, 1),
           ('19.987.654-3', N'Yulissa Ulloa', '2001-01-18', 'yulissa.ulloa@alumnos.cl', '+56 9 9555 6677', @base_sede,     0, 1);

    INSERT INTO Socio (rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio)
    SELECT CONCAT(FORMAT(10000000 + num_persona * 239117 / 4, 'N0', 'es-CL'), '-', num_persona % 10),
           nombre_persona,
           DATEADD(DAY, -(7000 + num_persona * 97), @hoy),
           CONCAT('socio', num_persona, '@alumnos.cl'),
           CONCAT('+56 9 ', 7000 + num_persona * 31, ' ', 3000 + num_persona * 47),
           @base_sede + (num_persona % 12),
           CASE WHEN num_persona % 3 = 0 THEN 0 ELSE 1 END,
           CASE WHEN num_persona % 25 = 0 THEN 0 ELSE 1 END
    FROM #Persona
    WHERE num_persona BETWEEN 41 AND 97;

    DROP TABLE #Persona;
    PRINT '60 Socios insertados correctamente (incluye Daniel Matus, Emilia Osorio, Yulissa Ulloa).';

    -- =================================================================================
    -- 8. CLASES (12) Y SESIONES (60)
    -- =================================================================================
    INSERT INTO Clase (nombre_clase, duracion_minutos_clase, nivel_exigencia_clase) VALUES
        (N'CrossFit Intensivo', 60, 'Avanzado'),
        (N'Spinning Cardio', 45, 'Intermedio'),
        (N'Yoga Flow', 60, 'Principiante'),
        (N'Pilates Mat', 50, 'Principiante'),
        (N'Zumba Fitness', 45, 'Principiante'),
        (N'Funcional HIIT', 40, 'Avanzado'),
        (N'Boxeo Fitness', 50, 'Intermedio'),
        (N'Stretching y Movilidad', 30, 'Principiante'),
        (N'GAP Glúteos Abdomen Piernas', 45, 'Intermedio'),
        (N'TRX Total Body', 45, 'Intermedio'),
        (N'Calistenia', 60, 'Avanzado'),
        (N'Body Pump', 55, 'Intermedio');

    SELECT @base_clase = MIN(id_clase) FROM Clase;

    WITH Numeros AS (
        SELECT TOP (60) ROW_NUMBER() OVER (ORDER BY object_id) AS n FROM sys.all_objects
    )
    INSERT INTO Sesion (id_clase_sesion, id_sede_sesion, id_instructor_sesion, fecha_sesion, hora_sesion, cupo_maximo_sesion)
    SELECT @base_clase + (n % 12),
           @base_sede + ((n / 5) % 12),
           CASE WHEN n % 25 = 0 THEN NULL ELSE @base_instructor + (n % 20) END,
           DATEADD(DAY, n % 14, @hoy),
           CAST(CHOOSE(n % 6 + 1, '07:00', '09:00', '12:00', '18:30', '19:30', '20:30') AS TIME(7)),
           10 + (n % 4) * 5
    FROM Numeros;

    SELECT @base_sesion = MIN(id_sesion) FROM Sesion;
    PRINT '12 Clases y 60 Sesiones insertadas correctamente.';

    -- =================================================================================
    -- 9. CONTRATOS (60, uno por socio) Y PAGOS (60)
    --    n%10=0 -> Vencido | n%15=0 -> Cancelado | resto -> Vigente
    -- =================================================================================
    WITH Base AS (
        SELECT id_socio, ROW_NUMBER() OVER (ORDER BY id_socio) AS n FROM Socio
    ),
    Calculo AS (
        SELECT id_socio, n,
               @base_plan + CASE WHEN n = 2 THEN 0 ELSE n % 10 END AS plan_calc,
               CASE WHEN n % 10 = 0 THEN 'Vencido' WHEN n % 15 = 0 THEN 'Cancelado' ELSE 'Vigente' END AS estado_calc
        FROM Base
    )
    INSERT INTO Contrato (id_socio_contrato, id_planmembresia_contrato, fecha_inicio_contrato, fecha_termino_contrato, estado_contrato, precio_pactado_contrato)
    SELECT id_socio,
           id_planmembresia,
           CASE WHEN estado_calc = 'Vencido' THEN DATEADD(DAY, -(500 + n), @hoy) ELSE DATEADD(DAY, -(n % 25), @hoy) END,
           DATEADD(MONTH, duracion_meses_planmembresia,
               CASE WHEN estado_calc = 'Vencido' THEN DATEADD(DAY, -(500 + n), @hoy) ELSE DATEADD(DAY, -(n % 25), @hoy) END),
           estado_calc,
           CAST(precio_vigente_planmembresia * CASE WHEN n % 4 = 0 THEN 0.90 ELSE 1.00 END AS DECIMAL(12,2))
    FROM Calculo
    INNER JOIN PlanMembresia ON id_planmembresia = plan_calc;

    INSERT INTO Pago (id_contrato_pago, fecha_pago, monto_cancelado_pago, medio_pago)
    SELECT id_contrato,
           CAST(fecha_inicio_contrato AS DATETIME2(7)),
           precio_pactado_contrato,
           CHOOSE(id_contrato % 3 + 1, 'Efectivo', 'Tarjeta', 'Transferencia')
    FROM Contrato;

    PRINT '60 Contratos y 60 Pagos insertados correctamente.';

    -- =================================================================================
    -- 10. INSCRIPCIONES (80) - solo socios con contrato vigente (trigger de validación)
    -- =================================================================================
    WITH Elegibles AS (
        SELECT id_socio_contrato, ROW_NUMBER() OVER (ORDER BY id_socio_contrato) AS pos_elegible
        FROM Contrato
        WHERE estado_contrato = 'Vigente'
    ),
    TotalElegibles AS (
        SELECT COUNT(*) AS total_elegible FROM Elegibles
    ),
    Numeros AS (
        SELECT TOP (80) ROW_NUMBER() OVER (ORDER BY object_id) AS n FROM sys.all_objects
    )
    INSERT INTO Inscripcion (id_socio_inscripcion, id_sesion_inscripcion, fecha_inscripcion, asistio_inscripcion, observaciones_inscripcion, estado_inscripcion)
    SELECT id_socio_contrato,
           @base_sesion + ((n - 1) % 60),
           SYSDATETIME(),
           NULL,
           CASE WHEN n = 1 THEN N'Inscripción inicial' ELSE CONCAT(N'Inscripción de prueba #', n) END,
           CASE WHEN n % 9 = 0 THEN 'Cancelado' ELSE 'Inscrito' END
    FROM Numeros
    CROSS JOIN TotalElegibles
    INNER JOIN Elegibles ON pos_elegible = ((n - 1) % total_elegible) + 1;

    PRINT '80 Inscripciones insertadas correctamente.';

    -- =================================================================================
    -- 11. ROLES (10) Y USUARIOS (40)
    -- =================================================================================
    INSERT INTO Rol (nombre_rol) VALUES
        (N'Administrador'), (N'Gerente de Sede'), (N'Recepcionista'), (N'Instructor'), (N'Socio'),
        (N'Contador'), (N'Marketing'), (N'Mantenimiento'), (N'Soporte'), (N'Auditor');

    SELECT @base_rol = MIN(id_rol) FROM Rol;

    -- 1 administrador
    INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario)
    VALUES ('admin', HASHBYTES('SHA2_512', 'Clave#admin'), @base_rol);

    -- 8 usuarios instructor
    INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario, id_instructor_usuario)
    SELECT TOP (8) CONCAT('instructor', id_instructor),
           HASHBYTES('SHA2_512', CONCAT('Clave#instructor', id_instructor)),
           @base_rol + 3,
           id_instructor
    FROM Instructor
    ORDER BY id_instructor;

    -- 8 usuarios de personal (rol según cargo)
    INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario, id_personal_usuario)
    SELECT TOP (8) CONCAT('personal', id_personal),
           HASHBYTES('SHA2_512', CONCAT('Clave#personal', id_personal)),
           @base_rol + CASE cargo_personal
                           WHEN 'Recepcionista' THEN 2
                           WHEN 'Administrador de Sede' THEN 1
                           WHEN 'Aseo y Mantención' THEN 7
                           WHEN 'Ventas' THEN 6
                           ELSE 8 END,
           id_personal
    FROM Personal
    ORDER BY id_personal;

    -- 23 usuarios socio
    INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario, id_socio_usuario)
    SELECT TOP (23) CONCAT('socio', id_socio),
           HASHBYTES('SHA2_512', CONCAT('Clave#socio', id_socio)),
           @base_rol + 4,
           id_socio
    FROM Socio
    ORDER BY id_socio;

    PRINT '10 Roles y 40 Usuarios insertados correctamente.';

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

    IF OBJECT_ID('tempdb..#Persona') IS NOT NULL DROP TABLE #Persona;

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
SELECT 'Region' AS entidad, COUNT(*) AS total FROM Region
UNION ALL SELECT 'Provincia', COUNT(*) FROM Provincia
UNION ALL SELECT 'Comuna', COUNT(*) FROM Comuna
UNION ALL SELECT 'Ciudad', COUNT(*) FROM Ciudad
UNION ALL SELECT 'Sede', COUNT(*) FROM Sede
UNION ALL SELECT 'PlanMembresia', COUNT(*) FROM PlanMembresia
UNION ALL SELECT 'Instructor', COUNT(*) FROM Instructor
UNION ALL SELECT 'Personal', COUNT(*) FROM Personal
UNION ALL SELECT 'Equipamiento', COUNT(*) FROM Equipamiento
UNION ALL SELECT 'Socio', COUNT(*) FROM Socio
UNION ALL SELECT 'Clase', COUNT(*) FROM Clase
UNION ALL SELECT 'Sesion', COUNT(*) FROM Sesion
UNION ALL SELECT 'Contrato', COUNT(*) FROM Contrato
UNION ALL SELECT 'Pago', COUNT(*) FROM Pago
UNION ALL SELECT 'Inscripcion', COUNT(*) FROM Inscripcion
UNION ALL SELECT 'Rol', COUNT(*) FROM Rol
UNION ALL SELECT 'Usuario', COUNT(*) FROM Usuario;
GO
