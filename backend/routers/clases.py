"""
Módulo de Gestión de Clases, Sesiones e Inscripciones
Responsable: Persona 2
Sincronizado con tablas: [dbo].[Clase], [dbo].[Sesion], [dbo].[Inscripcion]
Convención: sufijos por tabla (_clase, _sesion, _inscripcion)

REGLAS DE DESARROLLO:
1. Prohibido el uso de ORM.
2. Consultas explícitas y parametrizadas con '?' mediante pyodbc.
3. Inyectar la conexión con 'get_db_connection()'.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
import pyodbc

try:
    from backend.db.connection import get_db_connection
    from backend.schemas import (
        ClaseCreate, ClaseResponse, 
        SesionCreate, SesionResponse, 
        InscripcionCreate, InscripcionResponse
    )
except ImportError:
    from db.connection import get_db_connection
    from schemas import (
        ClaseCreate, ClaseResponse, 
        SesionCreate, SesionResponse, 
        InscripcionCreate, InscripcionResponse
    )

router = APIRouter(
    prefix="/clases",
    tags=["Persona 2 - Clases & Sesiones"]
)

@router.get("/", response_model=List[ClaseResponse], summary="Listar catálogo de clases")
def listar_clases():
    """
    Obtiene todas las disciplinas y clases configuradas.
    """
    clases = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_clase, nombre_clase, duracion_minutos_clase, nivel_exigencia_clase
                    FROM Clase
                    ORDER BY nombre_clase ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    clases.append(dict(zip(columns, row)))
        return clases
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar clases: {str(e)}"
        )

@router.post("/", response_model=ClaseResponse, status_code=status.HTTP_201_CREATED, summary="Crear nueva disciplina/clase")
def crear_clase(clase: ClaseCreate):
    """
    Registra una nueva disciplina en la tabla Clase.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                insert_query = """
                    INSERT INTO Clase (nombre_clase, duracion_minutos_clase, nivel_exigencia_clase)
                    OUTPUT INSERTED.id_clase
                    VALUES (?, ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (clase.nombre_clase, clase.duracion_minutos_clase, clase.nivel_exigencia_clase)
                )
                row = cursor.fetchone()
                return {
                    **clase.model_dump(),
                    "id_clase": row[0]
                }
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar clase: {str(e)}"
        )

@router.get("/sesiones", response_model=List[dict], summary="Listar sesiones con cupos disponibles (Vista)")
def listar_sesiones_disponibles():
    """
    Consulta la vista oficial vw_Reporte_Ocupacion_Clases para mostrar cupos en tiempo real.
    Columnas oficiales: id_sesion, nombre_clase, nombre_sede, fecha_sesion, hora_sesion, 
                       cupo_maximo_sesion, total_inscritos, cupos_disponibles.
    """
    sesiones = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_sesion, nombre_clase, nombre_sede, fecha_sesion, hora_sesion, 
                           cupo_maximo_sesion, total_inscritos, cupos_disponibles
                    FROM vw_Reporte_Ocupacion_Clases
                    ORDER BY fecha_sesion ASC, hora_sesion ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    # Convertir hora y fecha a string para serialización JSON limpia
                    if "hora_sesion" in item and item["hora_sesion"] is not None:
                        item["hora_sesion"] = str(item["hora_sesion"])
                    if "fecha_sesion" in item and item["fecha_sesion"] is not None:
                        item["fecha_sesion"] = str(item["fecha_sesion"])

                    # Aliases de compatibilidad para código que consuma la convención previa
                    item["Clase"] = item.get("nombre_clase")
                    item["Sede"] = item.get("nombre_sede")
                    item["fecha"] = item.get("fecha_sesion")
                    item["hora"] = item.get("hora_sesion")
                    item["cupo_maximo"] = item.get("cupo_maximo_sesion")
                    item["Total_Inscritos"] = item.get("total_inscritos")
                    item["Cupos_Disponibles"] = item.get("cupos_disponibles")

                    sesiones.append(item)
        return sesiones
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar ocupación de sesiones: {str(e)}"
        )

@router.post("/inscripciones", response_model=InscripcionResponse, status_code=status.HTTP_201_CREATED, summary="Inscribir socio a una sesión")
def inscribir_socio(inscripcion: InscripcionCreate):
    """
    Inscribe a un socio validando que la sesión tenga cupo disponible y no esté duplicada.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar que la sesión existe y revisar cupo disponible
                cursor.execute("""
                    SELECT se.cupo_maximo_sesion, COUNT(i.id_inscripcion) AS inscritos
                    FROM Sesion se
                    LEFT JOIN Inscripcion i ON se.id_sesion = i.id_sesion_inscripcion AND i.estado_inscripcion = 'Inscrito'
                    WHERE se.id_sesion = ?
                    GROUP BY se.id_sesion, se.cupo_maximo_sesion
                """, (inscripcion.id_sesion_inscripcion,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="La sesión especificada no existe.")
                
                cupo_maximo, inscritos = row[0], row[1]
                if inscritos >= cupo_maximo:
                    raise HTTPException(status_code=400, detail="No quedan cupos disponibles para esta sesión.")

                # 2. Validar que el socio no esté ya inscrito
                cursor.execute("""
                    SELECT id_inscripcion FROM Inscripcion
                    WHERE id_socio_inscripcion = ? AND id_sesion_inscripcion = ? AND estado_inscripcion = 'Inscrito'
                """, (inscripcion.id_socio_inscripcion, inscripcion.id_sesion_inscripcion))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El socio ya se encuentra inscrito en esta sesión.")

                # 3. Insertar inscripción
                insert_query = """
                    INSERT INTO Inscripcion (
                        id_socio_inscripcion, 
                        id_sesion_inscripcion, 
                        fecha_inscripcion, 
                        estado_inscripcion, 
                        observaciones_inscripcion
                    )
                    OUTPUT INSERTED.id_inscripcion, INSERTED.fecha_inscripcion, INSERTED.estado_inscripcion
                    VALUES (?, ?, SYSDATETIME(), 'Inscrito', ?)
                """
                cursor.execute(
                    insert_query,
                    (
                        inscripcion.id_socio_inscripcion, 
                        inscripcion.id_sesion_inscripcion, 
                        inscripcion.observaciones_inscripcion
                    )
                )
                res = cursor.fetchone()
                return {
                    "id_inscripcion": res[0],
                    "id_socio_inscripcion": inscripcion.id_socio_inscripcion,
                    "id_sesion_inscripcion": inscripcion.id_sesion_inscripcion,
                    "fecha_inscripcion": res[1],
                    "estado_inscripcion": res[2],
                    "observaciones_inscripcion": inscripcion.observaciones_inscripcion,
                    "asistio_inscripcion": None
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos al inscribir: {str(e)}"
        )
