"""
Módulo de Membresías, Contratos y Pagos
Responsable: Persona 3

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
    from backend.schemas import ContratoCreate, ContratoResponse, PagoCreate
except ImportError:
    from db.connection import get_db_connection
    from schemas import ContratoCreate, ContratoResponse, PagoCreate

router = APIRouter(
    prefix="/contratos",
    tags=["Persona 3 - Contratos & Pagos"]
)

@router.get("/", response_model=List[ContratoResponse], summary="Listar contratos y membresías")
def listar_contratos():
    """
    Lista todos los contratos registrados mediante SQL explícito.
    """
    contratos = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_contrato, id_socio, tipo_plan, monto, fecha_inicio, fecha_fin, estado_pago
                    FROM Contratos
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

@router.post("/", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED, summary="Crear un nuevo contrato de membresía")
def crear_contrato(contrato: ContratoCreate):
    """
    Registra un contrato para un socio usando parámetros de consulta seguros.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Validar existencia del socio
                cursor.execute("SELECT id_socio FROM Socios WHERE id_socio = ?", (contrato.id_socio,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="El socio indicado no existe.")

                query = """
                    INSERT INTO Contratos (id_socio, tipo_plan, monto, fecha_inicio, fecha_fin, estado_pago)
                    OUTPUT INSERTED.id_contrato, INSERTED.estado_pago
                    VALUES (?, ?, ?, ?, ?, 'pendiente')
                """
                cursor.execute(
                    query,
                    (contrato.id_socio, contrato.tipo_plan, contrato.monto, contrato.fecha_inicio, contrato.fecha_fin)
                )
                row = cursor.fetchone()
                return {
                    **contrato.model_dump(),
                    "id_contrato": row[0],
                    "estado_pago": row[1]
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar contrato: {str(e)}"
        )

@router.post("/pagos", status_code=status.HTTP_201_CREATED, summary="Registrar pago de membresía")
def registrar_pago(pago: PagoCreate):
    """
    Registra el pago de un contrato y actualiza el estado del contrato en una transacción atómica.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Comprobar que el contrato existe
                cursor.execute("SELECT id_contrato, monto FROM Contratos WHERE id_contrato = ?", (pago.id_contrato,))
                contrato = cursor.fetchone()
                if not contrato:
                    raise HTTPException(status_code=404, detail="El contrato a pagar no existe.")

                # 2. Insertar registro de pago
                cursor.execute("""
                    INSERT INTO Pagos (id_contrato, monto, metodo_pago, fecha_pago)
                    OUTPUT INSERTED.id_pago
                    VALUES (?, ?, ?, GETDATE())
                """, (pago.id_contrato, pago.monto, pago.metodo_pago))
                id_pago = cursor.fetchone()[0]

                # 3. Actualizar estado del contrato a 'pagado' si cubre el monto
                cursor.execute("""
                    UPDATE Contratos
                    SET estado_pago = 'pagado'
                    WHERE id_contrato = ?
                """, (pago.id_contrato,))

                return {
                    "message": "Pago registrado y contrato actualizado",
                    "id_pago": id_pago,
                    "id_contrato": pago.id_contrato,
                    "monto": pago.monto
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar pago: {str(e)}"
        )
