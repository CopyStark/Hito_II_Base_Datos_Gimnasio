CREATE OR ALTER VIEW [dbo].[vw_Sesiones_Disponibles] AS
SELECT
    -- Identificadores de la sesión y relaciones
    id_sesion,
    id_clase_sesion,
    id_sede_sesion,

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
    COUNT(id_inscripcion)                      AS total_inscritos,

    -- Cupos que aún quedan disponibles
    cupo_maximo_sesion - COUNT(id_inscripcion) AS cupos_disponibles
FROM Sesion
-- Clase: obligatoria (toda sesión pertenece a una clase)
INNER JOIN Clase      ON id_clase_sesion      = id_clase
-- Sede: obligatoria (toda sesión ocurre en una sede)
INNER JOIN Sede       ON id_sede_sesion       = id_sede
-- Instructor: opcional (LEFT JOIN porque id_instructor_sesion puede ser NULL)
LEFT  JOIN Instructor ON id_instructor_sesion = id_instructor
-- Inscripcion: LEFT JOIN + filtro de estado para no perder sesiones sin inscritos
LEFT  JOIN Inscripcion
       ON id_sesion          = id_sesion_inscripcion
      AND estado_inscripcion = 'Inscrito'
GROUP BY
    id_sesion,
    id_clase_sesion,
    id_sede_sesion,
    nombre_clase,
    nivel_exigencia_clase,
    duracion_minutos_clase,
    nombre_sede,
    nombre_completo_instructor,
    fecha_sesion,
    hora_sesion,
    cupo_maximo_sesion;
GO