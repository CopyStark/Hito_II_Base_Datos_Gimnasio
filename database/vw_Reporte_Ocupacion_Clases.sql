CREATE OR ALTER VIEW [dbo].[vw_Reporte_Ocupacion_Clases] AS
SELECT 
    id_sesion,
    nombre_clase,
    nombre_sede,
    fecha_sesion,
    CONVERT(VARCHAR(8), hora_sesion, 108) AS hora_sesion,
    cupo_maximo_sesion,
    COUNT(id_inscripcion) AS total_inscritos,
    (cupo_maximo_sesion - COUNT(id_inscripcion)) AS cupos_disponibles
FROM Sesion
INNER JOIN Clase ON id_clase_sesion = id_clase
INNER JOIN Sede ON id_sede_sesion = id_sede
LEFT JOIN Inscripcion ON id_sesion = id_sesion_inscripcion AND estado_inscripcion = 'Inscrito'
GROUP BY id_sesion, nombre_clase, nombre_sede, fecha_sesion, hora_sesion, cupo_maximo_sesion;
GO