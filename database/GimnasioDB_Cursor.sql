/* =====================================================================================
   GimnasioDB - Módulo de Analítica Procedural con Cursores (Guía 7 de Cátedra)
   Archivo    : GimnasioDB_Cursor.sql
   Propósito  : Procedimiento almacenado sp_Reporte_Fidelidad_Socios_Cursor que recorre
                los socios activos fila a fila mediante un cursor LOCAL FAST_FORWARD,
                evalúa su nivel de concurrencia y días restantes de membresía vigente,
                los clasifica mediante lógica condicional IF / ELSE IF / ELSE y emite
                un reporte estructurado en consola (PRINT) para gestión de retención.

   CICLO DE VIDA DEL CURSOR SEGÚN LA GUÍA 7:
     1. DECLARE cur_socios_fidelidad CURSOR LOCAL FAST_FORWARD FOR (consulta set-based)
     2. OPEN cur_socios_fidelidad
     3. Primer FETCH NEXT FROM cur_socios_fidelidad INTO @variables
     4. Bucle WHILE @@FETCH_STATUS = 0
          - Lógica condicional procedural (IF / ELSE IF / ELSE)
          - Emisión de mensaje formateado con PRINT CONCAT(...)
          - Incremento de contadores acumuladores
          - Segundo FETCH NEXT FROM cur_socios_fidelidad INTO @variables
     5. CLOSE cur_socios_fidelidad (liberación de memoria y bloqueos de filas)
     6. DEALLOCATE cur_socios_fidelidad (eliminación definitiva de la referencia)

   DOCUMENTACIÓN TÉCNICA - COMPARATIVA CURSOR VS ENFOQUE ORIENTADO A CONJUNTOS:
   -------------------------------------------------------------------------------------
   ¿Cuándo usar el Cursor?
     - Para emitir alertas o mensajes administrativos secuenciales en consola (SSMS).
     - Para disparar procedimientos de envío de correos, webhooks o tareas externas fila
       a fila que no pueden ser procesadas de forma puramente relacional.
   
   ¿Por qué preferir el Enfoque Set-Based en analítica masiva?
     - Los cursores operan fila por fila (RBAR: Row-By-Agonizing-Row), generando sobrecarga
       de memoria en tempdb, cambios de contexto repetitivos y bloqueos transaccionales.
     - La alternativa Set-Based (documentada al pie) permite al optimizador de SQL Server
       aprovechar índices, paralelismo y vectorización en una sola pasada.
   ===================================================================================== */

USE [GimnasioDB];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- =====================================================================================
-- 1. PROCEDIMIENTO ALMACENADO: sp_Reporte_Fidelidad_Socios_Cursor
-- =====================================================================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Reporte_Fidelidad_Socios_Cursor]
AS
BEGIN
    SET NOCOUNT ON;

    -- ---------------------------------------------------------------------------------
    -- A) Declaración de variables escalares con nombres descriptivos
    -- ---------------------------------------------------------------------------------
    DECLARE @id_socio               INT;
    DECLARE @rut_socio              VARCHAR(12);
    DECLARE @nombre_socio           NVARCHAR(150);
    DECLARE @nombre_sede            NVARCHAR(100);
    DECLARE @total_asistencias      INT;
    DECLARE @total_inasistencias    INT;
    DECLARE @dias_vencimiento       INT;
    DECLARE @clasificacion          VARCHAR(30);

    -- Variables acumuladoras para métricas de resumen
    DECLARE @contador_procesados    INT = 0;
    DECLARE @contador_riesgo        INT = 0;
    DECLARE @contador_frecuente     INT = 0;
    DECLARE @contador_ocasional     INT = 0;
    DECLARE @contador_sin_actividad INT = 0;

    -- Tabla variable para recolectar resultados procesados fila a fila por el cursor
    -- Permite consumo relacional directo desde APIs (FastAPI / pyodbc) sin romper la estructura del cursor
    DECLARE @ResultadosFidelidad TABLE (
        [id_socio]                  INT           NOT NULL,
        [rut_socio]                 VARCHAR(12)   NOT NULL,
        [nombre_completo_socio]     NVARCHAR(150) NOT NULL,
        [nombre_sede]               NVARCHAR(100) NOT NULL,
        [total_asistencias]         INT           NOT NULL,
        [total_inasistencias]       INT           NOT NULL,
        [dias_vencimiento_contrato] INT           NOT NULL,
        [clasificacion_fidelidad]   VARCHAR(30)   NOT NULL
    );

    DECLARE @fecha_reporte_str      VARCHAR(10) = CONVERT(VARCHAR(10), GETDATE(), 120);

    -- ---------------------------------------------------------------------------------
    -- B) Encabezado visual del reporte en la pestaña Messages de SSMS
    -- ---------------------------------------------------------------------------------
    PRINT '========================================================================================================';
    PRINT CONCAT('   GIMNASIO-DB :: REPORTE PROCEDURAL DE FIDELIZACIÓN Y RETENCIÓN DE SOCIOS (FECHA: ', @fecha_reporte_str, ')');
    PRINT '========================================================================================================';
    PRINT 'ID    | RUT          | SOCIO                          | SEDE REGISTRO         | ASIST | FALTAS | VENCE EN    | CLASIFICACIÓN';
    PRINT '--------------------------------------------------------------------------------------------------------';

    -- ---------------------------------------------------------------------------------
    -- C) Paso 1: DECLARE CURSOR (LOCAL FAST_FORWARD)
    --    Utiliza alias descriptivos, LEFT JOINs y GROUP BY explícito (sin SELECT *)
    -- ---------------------------------------------------------------------------------
    DECLARE cur_socios_fidelidad CURSOR LOCAL FAST_FORWARD FOR
    SELECT 
        socio.id_socio,
        socio.rut_socio,
        socio.nombre_completo_socio,
        sede.nombre_sede,
        COUNT(CASE WHEN inscripcion.asistio_inscripcion = 1 THEN 1 END) AS total_asistencias,
        COUNT(CASE WHEN inscripcion.asistio_inscripcion = 0 THEN 1 END) AS total_inasistencias,
        COALESCE(MAX(DATEDIFF(DAY, CAST(GETDATE() AS DATE), contrato.fecha_termino_contrato)), -999) AS dias_vencimiento
    FROM Socio AS socio
    INNER JOIN Sede AS sede
        ON sede.id_sede = socio.id_sede_registro_socio
    LEFT JOIN Contrato AS contrato
        ON contrato.id_socio_contrato = socio.id_socio
       AND contrato.estado_contrato = 'Vigente'
    LEFT JOIN Inscripcion AS inscripcion
        ON inscripcion.id_socio_inscripcion = socio.id_socio
       AND inscripcion.estado_inscripcion = 'Inscrito'
    LEFT JOIN Sesion AS sesion
        ON sesion.id_sesion = inscripcion.id_sesion_inscripcion
    WHERE socio.activo_socio = 1
    GROUP BY 
        socio.id_socio,
        socio.rut_socio,
        socio.nombre_completo_socio,
        sede.nombre_sede
    ORDER BY 
        socio.id_socio ASC;

    -- ---------------------------------------------------------------------------------
    -- D) Paso 2: OPEN del cursor
    -- ---------------------------------------------------------------------------------
    OPEN cur_socios_fidelidad;

    -- ---------------------------------------------------------------------------------
    -- E) Paso 3: Primer FETCH NEXT (lectura inicial de la primera fila)
    -- ---------------------------------------------------------------------------------
    FETCH NEXT FROM cur_socios_fidelidad 
    INTO @id_socio, @rut_socio, @nombre_socio, @nombre_sede, @total_asistencias, @total_inasistencias, @dias_vencimiento;

    -- ---------------------------------------------------------------------------------
    -- F) Paso 4: Bucle de iteración secuencial WHILE @@FETCH_STATUS = 0
    -- ---------------------------------------------------------------------------------
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @contador_procesados = @contador_procesados + 1;

        -- Evaluación condicional de fidelidad según reglas del negocio
        IF @total_inasistencias >= 2 
           OR (@dias_vencimiento BETWEEN -999 AND 7 AND @total_asistencias = 0)
        BEGIN
            SET @clasificacion = 'RIESGO DE DESERCION';
            SET @contador_riesgo = @contador_riesgo + 1;
        END
        ELSE IF @total_asistencias >= 3
        BEGIN
            SET @clasificacion = 'FRECUENTE';
            SET @contador_frecuente = @contador_frecuente + 1;
        END
        ELSE IF @total_asistencias BETWEEN 1 AND 2
        BEGIN
            SET @clasificacion = 'OCASIONAL';
            SET @contador_ocasional = @contador_ocasional + 1;
        END
        ELSE
        BEGIN
            SET @clasificacion = 'SIN ACTIVIDAD';
            SET @contador_sin_actividad = @contador_sin_actividad + 1;
        END;

        -- Formateo de columna 'Vence en'
        DECLARE @vence_texto VARCHAR(15);
        IF @dias_vencimiento = -999
            SET @vence_texto = 'Sin contr. vig.';
        ELSE IF @dias_vencimiento < 0
            SET @vence_texto = CONCAT('Venció (', @dias_vencimiento * -1, 'd)');
        ELSE
            SET @vence_texto = CONCAT(@dias_vencimiento, ' días');

        -- Emisión de mensaje estructurado por consola (PRINT)
        PRINT CONCAT(
            FORMAT(@id_socio, '0000'), '  | ',
            LEFT(CONCAT(@rut_socio, '            '), 12), ' | ',
            LEFT(CONCAT(@nombre_socio, '                              '), 30), ' | ',
            LEFT(CONCAT(@nombre_sede, '                      '), 21), ' | ',
            RIGHT(CONCAT('   ', @total_asistencias), 5), ' | ',
            RIGHT(CONCAT('    ', @total_inasistencias), 6), ' | ',
            LEFT(CONCAT(@vence_texto, '               '), 11), ' | [',
            @clasificacion, ']'
        );

        -- Inserción en tabla variable para consumo desde la API (FastAPI / pyodbc)
        INSERT INTO @ResultadosFidelidad (
            [id_socio],
            [rut_socio],
            [nombre_completo_socio],
            [nombre_sede],
            [total_asistencias],
            [total_inasistencias],
            [dias_vencimiento_contrato],
            [clasificacion_fidelidad]
        )
        VALUES (
            @id_socio,
            @rut_socio,
            @nombre_socio,
            @nombre_sede,
            @total_asistencias,
            @total_inasistencias,
            @dias_vencimiento,
            @clasificacion
        );

        -- Paso 5: Segundo FETCH NEXT para avanzar al siguiente socio del cursor
        FETCH NEXT FROM cur_socios_fidelidad 
        INTO @id_socio, @rut_socio, @nombre_socio, @nombre_sede, @total_asistencias, @total_inasistencias, @dias_vencimiento;
    END;

    -- ---------------------------------------------------------------------------------
    -- G) Pasos 6 y 7: CLOSE y DEALLOCATE del cursor
    -- ---------------------------------------------------------------------------------
    CLOSE cur_socios_fidelidad;
    DEALLOCATE cur_socios_fidelidad;

    -- ---------------------------------------------------------------------------------
    -- H) Resumen final consolidado de la ejecución procedural
    -- ---------------------------------------------------------------------------------
    PRINT '--------------------------------------------------------------------------------------------------------';
    PRINT 'RESUMEN EJECUTIVO DE RETENCIÓN:';
    PRINT CONCAT('  - Total de socios activos procesados : ', @contador_procesados);
    PRINT CONCAT('  - Socios en RIESGO DE DESERCIÓN      : ', @contador_riesgo, '  <-- Contactar por WhatsApp/Email');
    PRINT CONCAT('  - Socios FRECUENTES (Alta fidelidad) : ', @contador_frecuente);
    PRINT CONCAT('  - Socios OCASIONALES                 : ', @contador_ocasional);
    PRINT CONCAT('  - Socios SIN ACTIVIDAD REGISTRADA    : ', @contador_sin_actividad);
    PRINT '========================================================================================================';
    PRINT 'Procedimiento sp_Reporte_Fidelidad_Socios_Cursor ejecutado con éxito.';

    -- ---------------------------------------------------------------------------------
    -- I) Retorno de Result Set explícito (sin SELECT *) para consumo desde la API
    -- ---------------------------------------------------------------------------------
    SELECT 
        [id_socio],
        [rut_socio],
        [nombre_completo_socio],
        [nombre_sede],
        [total_asistencias],
        [total_inasistencias],
        [dias_vencimiento_contrato],
        [clasificacion_fidelidad]
    FROM @ResultadosFidelidad
    ORDER BY [id_socio] ASC;
END;
GO

PRINT 'Procedimiento sp_Reporte_Fidelidad_Socios_Cursor creado/actualizado exitosamente.';
GO


-- =====================================================================================
-- 2. ALTERNATIVA ORIENTADA A CONJUNTOS (SET-BASED CON CASE WHEN)
--    En entornos de producción con miles o millones de registros, esta consulta
--    es la recomendada por la industria ya que elimina el overhead de memoria,
--    context switches y bloqueos de tempdb asociados a cursores procedurales:
-- =====================================================================================
/*
SELECT 
    socio.id_socio,
    socio.rut_socio,
    socio.nombre_completo_socio,
    sede.nombre_sede,
    COUNT(CASE WHEN inscripcion.asistio_inscripcion = 1 THEN 1 END) AS total_asistencias,
    COUNT(CASE WHEN inscripcion.asistio_inscripcion = 0 THEN 1 END) AS total_inasistencias,
    COALESCE(MAX(DATEDIFF(DAY, CAST(GETDATE() AS DATE), contrato.fecha_termino_contrato)), -999) AS dias_vencimiento,
    CASE 
        WHEN COUNT(CASE WHEN inscripcion.asistio_inscripcion = 0 THEN 1 END) >= 2 
             OR (COALESCE(MAX(DATEDIFF(DAY, CAST(GETDATE() AS DATE), contrato.fecha_termino_contrato)), -999) BETWEEN -999 AND 7 
                 AND COUNT(CASE WHEN inscripcion.asistio_inscripcion = 1 THEN 1 END) = 0)
             THEN 'RIESGO DE DESERCION'
        WHEN COUNT(CASE WHEN inscripcion.asistio_inscripcion = 1 THEN 1 END) >= 3 
             THEN 'FRECUENTE'
        WHEN COUNT(CASE WHEN inscripcion.asistio_inscripcion = 1 THEN 1 END) BETWEEN 1 AND 2 
             THEN 'OCASIONAL'
        ELSE 'SIN ACTIVIDAD'
    END AS clasificacion_socio
FROM Socio AS socio
INNER JOIN Sede AS sede
    ON sede.id_sede = socio.id_sede_registro_socio
LEFT JOIN Contrato AS contrato
    ON contrato.id_socio_contrato = socio.id_socio
   AND contrato.estado_contrato = 'Vigente'
LEFT JOIN Inscripcion AS inscripcion
    ON inscripcion.id_socio_inscripcion = socio.id_socio
   AND inscripcion.estado_inscripcion = 'Inscrito'
LEFT JOIN Sesion AS sesion
    ON sesion.id_sesion = inscripcion.id_sesion_inscripcion
WHERE socio.activo_socio = 1
GROUP BY 
    socio.id_socio,
    socio.rut_socio,
    socio.nombre_completo_socio,
    sede.nombre_sede
ORDER BY 
    socio.id_socio ASC;
*/
GO


-- =====================================================================================
-- 3. EJECUCIÓN DIRECTA DEL PROCEDIMIENTO (Para prueba inmediata en SSMS Messages)
-- =====================================================================================
EXEC [dbo].[sp_Reporte_Fidelidad_Socios_Cursor];
GO
