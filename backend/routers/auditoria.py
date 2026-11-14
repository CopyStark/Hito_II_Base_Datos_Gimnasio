"""
Módulo de Auditoría y Procedimientos Especiales (GimnasioDB)
Endpoints para consulta de logs de auditoría (Triggers) y ejecución de análisis
procedural de fidelidad de socios (Cursores).

REGLAS DE SEGURIDAD Y ARQUITECTURA:
1. Acceso restringido exclusivamente a usuarios autenticados con rol 'Personal' o 'Administrador' (JWT).
2. Sin ORM: Consultas SQL directas y parametrizadas con pyodbc.
3. Prohibido el uso de 'SELECT *': Proyecciones explícitas de atributos en todas las consultas.
"""

import logging
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import pyodbc

try:
    from backend.core.security import require_personal
    from backend.db.connection import get_db_connection
except ImportError:
    from core.security import require_personal
    from db.connection import get_db_connection

logger = logging.getLogger("gimnasiodb.auditoria")

# Router protegido globalmente: Solo usuarios con rol Personal o Administrador pueden acceder
router = APIRouter(
    prefix="/auditoria",
    tags=["Auditoría y Procedimientos Especiales"],
    dependencies=[Depends(require_personal)]
)


# =========================================================================
# MODELOS DE RESPUESTA (PYDANTIC SCHEMAS)
# =========================================================================

class LogContratoResponse(BaseModel):
    id_log: int
    id_contrato: int
    tipo_operacion: str
    fecha_cambio: datetime
    usuario_sql: Optional[str] = None
    equipo_origen: Optional[str] = None
    aplicacion_origen: Optional[str] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    fecha_fin_anterior: Optional[date] = None
    fecha_fin_nueva: Optional[date] = None


class LogInscripcionResponse(BaseModel):
    id_log: int
    id_inscripcion: int
    tipo_operacion: str
    fecha_cambio: datetime
    usuario_sql: Optional[str] = None
    equipo_origen: Optional[str] = None
    aplicacion_origen: Optional[str] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: Optional[str] = None
    asistio_anterior: Optional[bool] = None
    asistio_nuevo: Optional[bool] = None


class SocioFidelidadCursorResponse(BaseModel):
    id_socio: int
    rut_socio: str
    nombre_completo_socio: str
    nombre_sede: str
    total_asistencias: int
    total_inasistencias: int
    dias_vencimiento_contrato: int
    clasificacion_fidelidad: str


# =========================================================================
# ENDPOINTS DE AUDITORÍA (TRIGGERS)
# =========================================================================

@router.get(
    "/logs-contratos",
    response_model=List[LogContratoResponse],
    summary="Consultar registro de auditoría de contratos (Trigger trg_LogCambiosContrato)",
    description=(
        "Retorna los últimos 50 eventos de auditoría registrados por el trigger en "
        "[dbo].[LOG_CAMBIO_CONTRATO] (altas, cancelaciones, cambios de vencimiento y bajas)."
    )
)
def get_logs_contratos():
    """
    Consulta los últimos 50 registros de auditoría de contratos con proyección explícita.
    """
    query = """
        SELECT TOP 50
            id_log,
            id_contrato,
            tipo_operacion,
            fecha_cambio,
            usuario_sql,
            equipo_origen,
            aplicacion_origen,
            estado_anterior,
            estado_nuevo,
            fecha_fin_anterior,
            fecha_fin_nueva
        FROM LOG_CAMBIO_CONTRATO
        ORDER BY fecha_cambio DESC, id_log DESC;
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            filas = cursor.fetchall()

            resultados = []
            for row in filas:
                resultados.append(
                    LogContratoResponse(
                        id_log=row[0],
                        id_contrato=row[1],
                        tipo_operacion=row[2],
                        fecha_cambio=row[3],
                        usuario_sql=row[4],
                        equipo_origen=row[5],
                        aplicacion_origen=row[6],
                        estado_anterior=row[7],
                        estado_nuevo=row[8],
                        fecha_fin_anterior=row[9],
                        fecha_fin_nueva=row[10]
                    )
                )
            return resultados
    except pyodbc.Error as err:
        # Si la tabla aún no ha sido creada mediante GimnasioDB_Triggers.sql, retorna lista vacía informativa
        if "Invalid object name" in str(err) or "LOG_CAMBIO_CONTRATO" in str(err):
            logger.warning("Tabla [LOG_CAMBIO_CONTRATO] no encontrada. Ejecuta database/GimnasioDB_Triggers.sql.")
            return []
        logger.error(f"Error al consultar LOG_CAMBIO_CONTRATO: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en base de datos al consultar log de contratos: {str(err)}"
        )


@router.get(
    "/logs-inscripciones",
    response_model=List[LogInscripcionResponse],
    summary="Consultar registro de auditoría de inscripciones (Trigger trg_LogCambiosInscripcion)",
    description=(
        "Retorna los últimos 50 eventos de auditoría en [dbo].[LOG_CAMBIO_INSCRIPCION] "
        "(cancelaciones de socios, toma de asistencia por instructores y bajas)."
    )
)
def get_logs_inscripciones():
    """
    Consulta los últimos 50 registros de auditoría de inscripciones con proyección explícita.
    """
    query = """
        SELECT TOP 50
            id_log,
            id_inscripcion,
            tipo_operacion,
            fecha_cambio,
            usuario_sql,
            equipo_origen,
            aplicacion_origen,
            estado_anterior,
            estado_nuevo,
            asistio_anterior,
            asistio_nuevo
        FROM LOG_CAMBIO_INSCRIPCION
        ORDER BY fecha_cambio DESC, id_log DESC;
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            filas = cursor.fetchall()

            resultados = []
            for row in filas:
                resultados.append(
                    LogInscripcionResponse(
                        id_log=row[0],
                        id_inscripcion=row[1],
                        tipo_operacion=row[2],
                        fecha_cambio=row[3],
                        usuario_sql=row[4],
                        equipo_origen=row[5],
                        aplicacion_origen=row[6],
                        estado_anterior=row[7],
                        estado_nuevo=row[8],
                        asistio_anterior=bool(row[9]) if row[9] is not None else None,
                        asistio_nuevo=bool(row[10]) if row[10] is not None else None
                    )
                )
            return resultados
    except pyodbc.Error as err:
        if "Invalid object name" in str(err) or "LOG_CAMBIO_INSCRIPCION" in str(err):
            logger.warning("Tabla [LOG_CAMBIO_INSCRIPCION] no encontrada. Ejecuta database/GimnasioDB_Triggers.sql.")
            return []
        logger.error(f"Error al consultar LOG_CAMBIO_INSCRIPCION: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en base de datos al consultar log de inscripciones: {str(err)}"
        )


# =========================================================================
# ENDPOINTS PROCEDURALES (CURSORES)
# =========================================================================

@router.get(
    "/fidelidad-cursor",
    response_model=List[SocioFidelidadCursorResponse],
    summary="Ejecutar análisis procedural de retención con Cursor (sp_Reporte_Fidelidad_Socios_Cursor)",
    description=(
        "Ejecuta el procedimiento almacenado [sp_Reporte_Fidelidad_Socios_Cursor] que procesa "
        "fila a fila los socios activos mediante un cursor FAST_FORWARD y los clasifica en "
        "'RIESGO DE DESERCION', 'FRECUENTE', 'OCASIONAL' o 'SIN ACTIVIDAD'."
    )
)
def get_fidelidad_cursor():
    """
    Ejecuta el procedimiento almacenado con cursor y retorna la clasificación de fidelidad.
    """
    sp_call = "SET NOCOUNT ON; EXEC sp_Reporte_Fidelidad_Socios_Cursor;"
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sp_call)

            # Avanzar a través de posibles tokens/mensajes hasta el Result Set del procedimiento
            while cursor.description is None:
                if not cursor.nextset():
                    break

            if cursor.description is None:
                return []

            filas = cursor.fetchall()
            resultados = []
            for row in filas:
                resultados.append(
                    SocioFidelidadCursorResponse(
                        id_socio=row[0],
                        rut_socio=str(row[1]).strip(),
                        nombre_completo_socio=str(row[2]).strip(),
                        nombre_sede=str(row[3]).strip(),
                        total_asistencias=int(row[4] or 0),
                        total_inasistencias=int(row[5] or 0),
                        dias_vencimiento_contrato=int(row[6] or 0),
                        clasificacion_fidelidad=str(row[7]).strip()
                    )
                )
            return resultados
    except pyodbc.Error as err:
        # Respaldo: Si el SP aún no está compilado en la base de datos, ejecutar la consulta Set-Based equivalente
        logger.warning(f"Aviso al ejecutar SP con cursor: {err}. Ejecutando consulta relacional de respaldo.")
        fallback_query = """
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
            WHERE socio.activo_socio = 1
            GROUP BY 
                socio.id_socio,
                socio.rut_socio,
                socio.nombre_completo_socio,
                sede.nombre_sede
            ORDER BY 
                socio.id_socio ASC;
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(fallback_query)
                filas = cursor.fetchall()
                return [
                    SocioFidelidadCursorResponse(
                        id_socio=row[0],
                        rut_socio=str(row[1]).strip(),
                        nombre_completo_socio=str(row[2]).strip(),
                        nombre_sede=str(row[3]).strip(),
                        total_asistencias=int(row[4] or 0),
                        total_inasistencias=int(row[5] or 0),
                        dias_vencimiento_contrato=int(row[6] or 0),
                        clasificacion_fidelidad=str(row[7]).strip()
                    )
                    for row in filas
                ]
        except Exception as e:
            logger.error(f"Error en consulta de respaldo de fidelidad: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al evaluar reporte de fidelidad: {str(e)}"
            )
