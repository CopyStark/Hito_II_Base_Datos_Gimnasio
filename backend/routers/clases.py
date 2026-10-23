"""
Módulo de Gestión de Clases, Sesiones e Inscripciones
Responsable: Persona 2

REGLAS DE DESARROLLO:
1. Prohibido el uso de ORM.
2. Todas las consultas a SQL Server deben ejecutarse mediante 'pyodbc' de forma explícita y parametrizada con '?'.
3. Inyectar la conexión con 'get_db_connection()'.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
import pyodbc
try:
    from backend.db.connection import get_db_connection
    from backend.schemas import ClaseCreate, ClaseResponse, InscripcionCreate
except ImportError:
    from db.connection import get_db_connection
    from schemas import ClaseCreate, ClaseResponse, InscripcionCreate

router = APIRouter(
    prefix="/clases",
    tags=["Persona 2 - Clases & Sesiones"]
)

@router.get("/", response_model=List[ClaseResponse], summary="Listar todas las clases disponibles")
def listar_clases():
    """
    Obtiene las clases y cupos disponibles con SQL explícito.
    """
    clases = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_clase, nombre, descripcion, cupo_maximo, entrenador, horario
                    FROM Clases
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
            detail=f"Error al consultar clases en SQL Server: {str(e)}"
        )

@router.post("/", response_model=ClaseResponse, status_code=status.HTTP_201_CREATED, summary="Crear una nueva clase")
def crear_clase(clase: ClaseCreate):
    """
    Crea una nueva clase deportiva con consulta INSERT parametrizada.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                insert_query = """
                    INSERT INTO Clases (nombre, descripcion, cupo_maximo, entrenador)
                    OUTPUT INSERTED.id_clase, INSERTED.horario
                    VALUES (?, ?, ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (clase.nombre, clase.descripcion, clase.cupo_maximo, clase.entrenador)
                )
                row = cursor.fetchone()
                return {
                    **clase.model_dump(),
                    "id_clase": row[0],
                    "horario": row[1]
                }
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar clase: {str(e)}"
        )

@router.post("/inscripciones", status_code=status.HTTP_201_CREATED, summary="Inscribir socio a una clase")
def inscribir_socio(inscripcion: InscripcionCreate):
    """
    Inscribe a un socio validando cupos con transacciones SQL explícitas.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar que la clase existe y chequear cupo
                cursor.execute("""
                    SELECT c.cupo_maximo, COUNT(i.id_inscripcion) AS total_inscritos
                    FROM Clases c
                    LEFT JOIN Inscripciones i ON c.id_clase = i.id_clase
                    WHERE c.id_clase = ?
                    GROUP BY c.id_clase, c.cupo_maximo
                """, (inscripcion.id_clase,))
                row = cursor.fetchone()
                
                if not row:
                    raise HTTPException(status_code=404, detail="La clase especificada no existe.")
                
                cupo_maximo, inscritos = row[0], row[1]
                if inscritos >= cupo_maximo:
                    raise HTTPException(status_code=400, detail="No quedan cupos disponibles para esta clase.")

                # 2. Insertar inscripción
                cursor.execute("""
                    INSERT INTO Inscripciones (id_socio, id_clase, fecha_inscripcion)
                    VALUES (?, ?, GETDATE())
                """, (inscripcion.id_socio, inscripcion.id_clase))

                return {"message": "Inscripción realizada con éxito", "id_clase": inscripcion.id_clase, "id_socio": inscripcion.id_socio}
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos al inscribir: {str(e)}"
        )
