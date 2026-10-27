"""
Módulo de Membresías, Contratos y Pagos
Responsable: Persona 3
Sincronizado con tablas: [dbo].[PlanMembresia], [dbo].[Contrato], [dbo].[Pago]
Convención: sufijos por tabla (_planmembresia, _contrato, _pago)

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
        PlanMembresiaResponse, 
        ContratoCreate, ContratoResponse, 
        PagoCreate, PagoResponse
    )
except ImportError:
    from db.connection import get_db_connection
    from schemas import (
        PlanMembresiaResponse, 
        ContratoCreate, ContratoResponse, 
        PagoCreate, PagoResponse
    )

router = APIRouter(
    prefix="/contratos",
    tags=["Persona 3 - Contratos & Pagos"]
)

@router.get("/planes", response_model=List[PlanMembresiaResponse], summary="Listar planes de membresía disponibles")
def listar_planes():
    """
    Obtiene los planes de membresía vigentes desde la tabla PlanMembresia.
    """
    planes = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_planmembresia, nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
                    FROM PlanMembresia
                    ORDER BY duracion_meses_planmembresia ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    planes.append(dict(zip(columns, row)))
        return planes
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar planes: {str(e)}"
        )

@router.get("", response_model=List[ContratoResponse], include_in_schema=False)
@router.get("/", response_model=List[ContratoResponse], summary="Listar contratos")
def listar_contratos():
    """
    Lista todos los contratos registrados.
    """
    contratos = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_contrato, id_socio_contrato, id_planmembresia_contrato, 
                           fecha_inicio_contrato, fecha_termino_contrato, estado_contrato, precio_pactado_contrato
                    FROM Contrato
                    ORDER BY id_contrato DESC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    contratos.append(dict(zip(columns, row)))
        return contratos
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar contratos en SQL Server: {str(e)}"
        )

@router.post("/", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED, summary="Crear nuevo contrato de membresía")
def crear_contrato(contrato: ContratoCreate):
    """
    Registra un contrato para un socio validando la existencia del socio y del plan.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar existencia del socio
                cursor.execute("SELECT id_socio FROM Socio WHERE id_socio = ?", (contrato.id_socio_contrato,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail=f"El socio con ID {contrato.id_socio_contrato} no existe.")

                # 2. Validar existencia del plan
                cursor.execute(
                    "SELECT id_planmembresia FROM PlanMembresia WHERE id_planmembresia = ?", 
                    (contrato.id_planmembresia_contrato,)
                )
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=404, 
                        detail=f"El plan de membresía con ID {contrato.id_planmembresia_contrato} no existe."
                    )

                # 3. Insertar contrato
                query = """
                    INSERT INTO Contrato (
                        id_socio_contrato, 
                        id_planmembresia_contrato, 
                        fecha_inicio_contrato, 
                        fecha_termino_contrato, 
                        estado_contrato, 
                        precio_pactado_contrato
                    )
                    OUTPUT INSERTED.id_contrato
                    VALUES (?, ?, ?, ?, ?, ?)
                """
                cursor.execute(
                    query,
                    (
                        contrato.id_socio_contrato, 
                        contrato.id_planmembresia_contrato, 
                        contrato.fecha_inicio_contrato, 
                        contrato.fecha_termino_contrato, 
                        contrato.estado_contrato, 
                        contrato.precio_pactado_contrato
                    )
                )
                id_contrato = cursor.fetchone()[0]
                return {
                    **contrato.model_dump(),
                    "id_contrato": id_contrato
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar contrato: {str(e)}"
        )

@router.post("/pagos", response_model=PagoResponse, status_code=status.HTTP_201_CREATED, summary="Registrar pago de contrato")
def registrar_pago(pago: PagoCreate):
    """
    Registra un pago para un contrato en la tabla Pago.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Comprobar que el contrato exista
                cursor.execute("SELECT id_contrato FROM Contrato WHERE id_contrato = ?", (pago.id_contrato_pago,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail=f"El contrato {pago.id_contrato_pago} no existe.")

                # 2. Insertar registro de pago
                insert_query = """
                    INSERT INTO Pago (id_contrato_pago, fecha_pago, monto_cancelado_pago, medio_pago)
                    OUTPUT INSERTED.id_pago, INSERTED.fecha_pago
                    VALUES (?, SYSDATETIME(), ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (pago.id_contrato_pago, pago.monto_cancelado_pago, pago.medio_pago)
                )
                res = cursor.fetchone()
                return {
                    "id_pago": res[0],
                    "id_contrato_pago": pago.id_contrato_pago,
                    "fecha_pago": res[1],
                    "monto_cancelado_pago": pago.monto_cancelado_pago,
                    "medio_pago": pago.medio_pago
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar pago: {str(e)}"
        )
