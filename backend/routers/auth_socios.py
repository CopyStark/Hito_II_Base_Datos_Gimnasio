"""
Módulo de Acceso y Administración de Socios
Responsable: Persona 1

REGLAS DE DESARROLLO:
1. Prohibido el uso de ORM.
2. Todas las consultas a SQL Server deben ejecutarse mediante 'pyodbc' de forma explícita y parametrizada con '?'.
3. Inyectar la conexión con 'get_db_connection()'.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import pyodbc
try:
    from backend.db.connection import get_db_connection
    from backend.schemas import SocioCreate, SocioResponse
except ImportError:
    from db.connection import get_db_connection
    from schemas import SocioCreate, SocioResponse

router = APIRouter(
    prefix="/socios",
    tags=["Persona 1 - Socios & Acceso"]
)

@router.get("/", response_model=List[SocioResponse], summary="Listar todos los socios activos")
def listar_socios():
    """
    Obtiene el listado de socios directamente con SQL explícito.
    """
    socios = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Consulta SQL parametrizable y explícita
                query = """
                    SELECT id_socio, nombre, apellido, dni, email, telefono, fecha_nacimiento, estado, fecha_registro
                    FROM Socios
                    ORDER BY id_socio DESC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    socios.append(dict(zip(columns, row)))
        return socios
    except pyodbc.Error as e:
        # Si la tabla aún no existe o hay error de conexión, se retorna detalle legible
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar socios en SQL Server: {str(e)}"
        )

@router.post("/", response_model=SocioResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo socio")
def registrar_socio(socio: SocioCreate):
    """
    Registra un nuevo socio mediante INSERT parametrizado con pyodbc.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Validación previa: DNI duplicado
                cursor.execute("SELECT id_socio FROM Socios WHERE dni = ?", (socio.dni,))
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe un socio registrado con el mismo DNI."
                    )

                # Inserción parametrizada con OUTPUT para obtener el ID generado
                insert_query = """
                    INSERT INTO Socios (nombre, apellido, dni, email, telefono, fecha_nacimiento, estado, fecha_registro)
                    OUTPUT INSERTED.id_socio, INSERTED.estado, INSERTED.fecha_registro
                    VALUES (?, ?, ?, ?, ?, ?, 'activo', GETDATE())
                """
                cursor.execute(
                    insert_query,
                    (socio.nombre, socio.apellido, socio.dni, socio.email, socio.telefono, socio.fecha_nacimiento)
                )
                row = cursor.fetchone()
                
                return {
                    **socio.model_dump(),
                    "id_socio": row[0],
                    "estado": row[1],
                    "fecha_registro": row[2]
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )

@router.get("/{id_socio}", response_model=SocioResponse, summary="Obtener socio por ID")
def obtener_socio(id_socio: int):
    """
    Consulta un socio específico utilizando consultas parametrizadas.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_socio, nombre, apellido, dni, email, telefono, fecha_nacimiento, estado, fecha_registro
                    FROM Socios
                    WHERE id_socio = ?
                """
                cursor.execute(query, (id_socio,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Socio con ID {id_socio} no encontrado."
                    )
                columns = [col[0] for col in cursor.description]
                return dict(zip(columns, row))
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos: {str(e)}"
        )
