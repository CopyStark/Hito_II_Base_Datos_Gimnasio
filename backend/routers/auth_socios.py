"""
Módulo de Acceso y Administración de Socios
Responsable: Persona 1 (Carlos)
Sincronizado con tabla: [dbo].[Socio] (sufijo _socio en todas las columnas excepto PK id_socio)

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
    from backend.schemas import SocioCreate, SocioResponse
except ImportError:
    from db.connection import get_db_connection
    from schemas import SocioCreate, SocioResponse

router = APIRouter(
    prefix="/socios",
    tags=["Persona 1 - Socios & Acceso"]
)

@router.get("/", response_model=List[SocioResponse], summary="Listar todos los socios")
def listar_socios():
    """
    Obtiene la lista completa de socios desde la tabla Socio.
    Utiliza la convención oficial de sufijos de GimnasioDB.
    """
    socios = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_socio, rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, 
                           telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio
                    FROM Socio
                    ORDER BY id_socio DESC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    socios.append(dict(zip(columns, row)))
        return socios
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar socios en SQL Server: {str(e)}"
        )

@router.get("/{id_socio}", response_model=SocioResponse, summary="Obtener un socio por ID")
def obtener_socio(id_socio: int):
    """
    Consulta un socio por su identificador único.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_socio, rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, 
                           telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio
                    FROM Socio
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

@router.post("/", response_model=SocioResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo socio")
def registrar_socio(socio: SocioCreate):
    """
    Inserta un nuevo socio validando unicidad de RUT y Correo con consulta parametrizada.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar que la sede de registro exista
                cursor.execute("SELECT id_sede FROM Sede WHERE id_sede = ?", (socio.id_sede_registro_socio,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La sede con ID {socio.id_sede_registro_socio} no existe."
                    )

                # 2. Validar RUT o Correo duplicado
                cursor.execute(
                    "SELECT id_socio FROM Socio WHERE rut_socio = ? OR correo_socio = ?", 
                    (socio.rut_socio, socio.correo_socio)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe un socio registrado con el mismo RUT o Correo."
                    )

                # 3. Inserción con OUTPUT para obtener id_socio generado y activo_socio por defecto
                insert_query = """
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
                    OUTPUT INSERTED.id_socio, INSERTED.activo_socio
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """
                cursor.execute(
                    insert_query,
                    (
                        socio.rut_socio, 
                        socio.nombre_completo_socio, 
                        socio.fecha_nacimiento_socio, 
                        socio.correo_socio, 
                        socio.telefono_socio, 
                        socio.id_sede_registro_socio, 
                        1 if socio.acepta_promociones_socio else 0
                    )
                )
                row = cursor.fetchone()
                return {
                    **socio.model_dump(),
                    "id_socio": row[0],
                    "activo_socio": bool(row[1])
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la base de datos al registrar socio: {str(e)}"
        )
