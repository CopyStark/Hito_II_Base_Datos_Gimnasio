"""
Módulo de Gestión de Clases, Sesiones e Inscripciones
Responsable: Persona 2
Sincronizado con tablas: [dbo].[Clase], [dbo].[Sesion], [dbo].[Inscripcion]

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
                    SELECT id_clase, nombre, duracion_minutos, nivel_exigencia
                    FROM Clase
                    ORDER BY nombre ASC
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
                    INSERT INTO Clase (nombre, duracion_minutos, nivel_exigencia)
                    OUTPUT INSERTED.id_clase
                    VALUES (?, ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (clase.nombre, clase.duracion_minutos, clase.nivel_exigencia)
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
    """
    sesiones = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_sesion, Clase, Sede, fecha, hora, cupo_maximo, Total_Inscritos, Cupos_Disponibles
                    FROM vw_Reporte_Ocupacion_Clases
                    ORDER BY fecha ASC, hora ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    # Convertir hora y fecha a string para serialización JSON limpia
                    if "hora" in item and item["hora"] is not None:
                        item["hora"] = str(item["hora"])
                    if "fecha" in item and item["fecha"] is not None:
                        item["fecha"] = str(item["fecha"])
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
                    SELECT se.cupo_maximo, COUNT(i.id_inscripcion) AS inscritos
                    FROM Sesion se
                    LEFT JOIN Inscripcion i ON se.id_sesion = i.id_sesion AND i.estado = 'Inscrito'
                    WHERE se.id_sesion = ?
                    GROUP BY se.id_sesion, se.cupo_maximo
                """, (inscripcion.id_sesion,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="La sesión especificada no existe.")
                
                cupo_maximo, inscritos = row[0], row[1]
                if inscritos >= cupo_maximo:
                    raise HTTPException(status_code=400, detail="No quedan cupos disponibles para esta sesión.")

                # 2. Validar que el socio no esté ya inscrito
                cursor.execute("""
                    SELECT id_inscripcion FROM Inscripcion
                    WHERE id_socio = ? AND id_sesion = ? AND estado = 'Inscrito'
                """, (inscripcion.id_socio, inscripcion.id_sesion))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El socio ya se encuentra inscrito en esta sesión.")

                # 3. Insertar inscripción
                insert_query = """
                    INSERT INTO Inscripcion (id_socio, id_sesion, fecha_inscripcion, estado, observaciones)
                    OUTPUT INSERTED.id_inscripcion, INSERTED.fecha_inscripcion, INSERTED.estado
                    VALUES (?, ?, SYSDATETIME(), 'Inscrito', ?)
                """
                cursor.execute(
                    insert_query,
                    (inscripcion.id_socio, inscripcion.id_sesion, inscripcion.observaciones)
                )
                res = cursor.fetchone()
                return {
                    "id_inscripcion": res[0],
                    "id_socio": inscripcion.id_socio,
                    "id_sesion": inscripcion.id_sesion,
                    "fecha_inscripcion": res[1],
                    "estado": res[2],
                    "observaciones": inscripcion.observaciones,
                    "asistio": None
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos al inscribir: {str(e)}"
        )
