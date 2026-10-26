"""
Módulo de Membresías, Contratos, Pagos, Personal y Finanzas
Responsable: Persona 3
Sincronizado con tablas: [dbo].[PlanMembresia], [dbo].[Contrato], [dbo].[Pago], [dbo].[Personal]
Sincronizado con vista:  [dbo].[vw_Reporte_Ingresos_Por_Sede]
Convención: sufijos por tabla (_planmembresia, _contrato, _pago, _personal)

REGLAS DE DESARROLLO (ESTRICTAS):
1. Prohibido el uso de ORM (SQLAlchemy, Prisma, etc.).
2. Consultas explícitas y parametrizadas con '?' mediante pyodbc para prevenir inyección SQL.
3. Inyectar la conexión con 'get_db_connection()'.
"""

from datetime import date, datetime
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, AliasChoices, ConfigDict, computed_field
import pyodbc

try:
    from backend.db.connection import get_db_connection
    from backend.schemas import (
        PlanMembresiaBase,
        PlanMembresiaResponse,
        ContratoCreate,
        ContratoResponse,
        PagoCreate,
        PagoResponse,
    )
except ImportError:
    from db.connection import get_db_connection
    from schemas import (
        PlanMembresiaBase,
        PlanMembresiaResponse,
        ContratoCreate,
        ContratoResponse,
        PagoCreate,
        PagoResponse,
    )


# =========================================================================
# ESQUEMAS PYDANTIC EXTENDIDOS PARA EL MÓDULO DE PERSONA 3
# =========================================================================

class PlanMembresiaCreate(PlanMembresiaBase):
    pass


class PlanMembresiaUpdate(BaseModel):
    nombre_planmembresia: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
        validation_alias=AliasChoices("nombre_planmembresia", "nombre")
    )
    duracion_meses_planmembresia: Optional[int] = Field(
        default=None,
        gt=0,
        validation_alias=AliasChoices("duracion_meses_planmembresia", "duracion_meses")
    )
    precio_vigente_planmembresia: Optional[float] = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("precio_vigente_planmembresia", "precio_vigente")
    )

    model_config = ConfigDict(from_attributes=True)


class ContratoDetalleResponse(ContratoResponse):
    rut_socio: Optional[str] = None
    nombre_completo_socio: Optional[str] = None
    nombre_planmembresia: Optional[str] = None
    duracion_meses_planmembresia: Optional[int] = None
    total_pagado: float = 0.0
    saldo_pendiente: float = 0.0


class ContratoEstadoUpdate(BaseModel):
    estado_contrato: Literal["Vigente", "Vencido", "Cancelado"] = Field(
        ...,
        validation_alias=AliasChoices("estado_contrato", "estado")
    )

    @computed_field
    def estado(self) -> str:
        return self.estado_contrato

    model_config = ConfigDict(from_attributes=True)


class EmisionContratoConPagoRequest(BaseModel):
    id_socio_contrato: int = Field(
        ...,
        gt=0,
        validation_alias=AliasChoices("id_socio_contrato", "id_socio")
    )
    id_planmembresia_contrato: int = Field(
        ...,
        gt=0,
        validation_alias=AliasChoices("id_planmembresia_contrato", "id_plan", "id_planmembresia")
    )
    fecha_inicio_contrato: Optional[date] = Field(
        default=None,
        validation_alias=AliasChoices("fecha_inicio_contrato", "fecha_inicio")
    )
    precio_pactado_contrato: Optional[float] = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("precio_pactado_contrato", "precio_pactado")
    )
    monto_pago_inicial: Optional[float] = Field(
        default=None,
        gt=0,
        validation_alias=AliasChoices("monto_pago_inicial", "monto_cancelado_pago", "monto")
    )
    medio_pago: Literal["Transferencia", "Tarjeta", "Efectivo"] = Field(
        default="Transferencia",
        validation_alias=AliasChoices("medio_pago", "metodo_pago")
    )


class PagoDetalleResponse(PagoResponse):
    id_socio_contrato: Optional[int] = None
    rut_socio: Optional[str] = None
    nombre_completo_socio: Optional[str] = None
    nombre_planmembresia: Optional[str] = None


class EstadoCuentaSocioResponse(BaseModel):
    id_socio: int
    rut_socio: str
    nombre_completo_socio: str
    correo_socio: str
    activo_socio: bool
    nombre_sede: str
    tiene_contrato_vigente: bool
    total_contratos: int
    total_pactado: float
    total_pagado: float
    saldo_pendiente: float
    estado_financiero: str
    contratos: List[ContratoDetalleResponse]
    pagos: List[PagoDetalleResponse]

    model_config = ConfigDict(from_attributes=True)


class PersonalBase(BaseModel):
    rut_personal: str = Field(
        ...,
        min_length=8,
        max_length=12,
        example="14.567.890-1",
        validation_alias=AliasChoices("rut_personal", "rut")
    )
    nombre_completo_personal: str = Field(
        ...,
        min_length=3,
        max_length=150,
        example="Camila Rojas",
        validation_alias=AliasChoices("nombre_completo_personal", "nombre_completo")
    )
    correo_personal: EmailStr = Field(
        ...,
        example="camila.rojas@gimnasiodb.cl",
        validation_alias=AliasChoices("correo_personal", "correo")
    )
    telefono_personal: str = Field(
        ...,
        max_length=20,
        example="+56 9 6123 4567",
        validation_alias=AliasChoices("telefono_personal", "telefono")
    )
    cargo_personal: str = Field(
        ...,
        min_length=2,
        max_length=50,
        example="Recepcionista",
        validation_alias=AliasChoices("cargo_personal", "cargo")
    )
    id_sede_personal: int = Field(
        ...,
        gt=0,
        example=1,
        validation_alias=AliasChoices("id_sede_personal", "id_sede")
    )

    @computed_field
    def rut(self) -> str:
        return self.rut_personal

    @computed_field
    def nombre_completo(self) -> str:
        return self.nombre_completo_personal

    @computed_field
    def correo(self) -> EmailStr:
        return self.correo_personal

    @computed_field
    def telefono(self) -> str:
        return self.telefono_personal

    @computed_field
    def cargo(self) -> str:
        return self.cargo_personal

    @computed_field
    def id_sede(self) -> int:
        return self.id_sede_personal


class PersonalCreate(PersonalBase):
    pass


class PersonalUpdate(BaseModel):
    nombre_completo_personal: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=150,
        validation_alias=AliasChoices("nombre_completo_personal", "nombre_completo")
    )
    correo_personal: Optional[EmailStr] = Field(
        default=None,
        validation_alias=AliasChoices("correo_personal", "correo")
    )
    telefono_personal: Optional[str] = Field(
        default=None,
        max_length=20,
        validation_alias=AliasChoices("telefono_personal", "telefono")
    )
    cargo_personal: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
        validation_alias=AliasChoices("cargo_personal", "cargo")
    )
    id_sede_personal: Optional[int] = Field(
        default=None,
        gt=0,
        validation_alias=AliasChoices("id_sede_personal", "id_sede")
    )

    model_config = ConfigDict(from_attributes=True)


class PersonalResponse(PersonalBase):
    id_personal: int
    nombre_sede: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReporteIngresosPorSedeItem(BaseModel):
    nombre_sede: str
    anio_pago: int
    mes_pago: int
    total_ingresos: float

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# CONFIGURACIÓN DEL ROUTER (PERSONA 3)
# =========================================================================

router = APIRouter(
    prefix="/contratos",
    tags=["Persona 3 - Contratos, Pagos, Personal & Finanzas"]
)


# =========================================================================
# 1. CATÁLOGO Y GESTIÓN DE PLANES DE MEMBRESÍA ([dbo].[PlanMembresia])
# =========================================================================

@router.get("/planes", response_model=List[PlanMembresiaResponse], summary="Listar planes de membresía disponibles")
def listar_planes(
    duracion_meses: Optional[int] = Query(None, gt=0, description="Filtrar por duración exacta en meses"),
    buscar: Optional[str] = Query(None, description="Buscar por nombre del plan")
):
    """
    Obtiene los planes de membresía vigentes desde la tabla [PlanMembresia].
    Permite filtrar opcionalmente por duración en meses o por coincidencia en el nombre.
    """
    planes = []
    where_clauses = []
    params = []

    if duracion_meses is not None:
        where_clauses.append("duracion_meses_planmembresia = ?")
        params.append(duracion_meses)

    if buscar and buscar.strip():
        where_clauses.append("nombre_planmembresia LIKE ?")
        params.append(f"%{buscar.strip()}%")

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT id_planmembresia, nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
        FROM PlanMembresia
        {where_sql}
        ORDER BY duracion_meses_planmembresia ASC, precio_vigente_planmembresia ASC
    """

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    item["precio_vigente_planmembresia"] = float(item["precio_vigente_planmembresia"])
                    planes.append(item)
        return planes
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar planes de membresía: {str(e)}"
        )


@router.get("/planes/{id_planmembresia}", response_model=PlanMembresiaResponse, summary="Obtener un plan de membresía por ID")
def obtener_plan(id_planmembresia: int):
    """
    Consulta el detalle de un plan de membresía específico por su ID.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_planmembresia, nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
                    FROM PlanMembresia
                    WHERE id_planmembresia = ?
                """
                cursor.execute(query, (id_planmembresia,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El plan de membresía con ID {id_planmembresia} no existe."
                    )
                columns = [col[0] for col in cursor.description]
                item = dict(zip(columns, row))
                item["precio_vigente_planmembresia"] = float(item["precio_vigente_planmembresia"])
                return item
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar plan de membresía: {str(e)}"
        )


@router.post("/planes", response_model=PlanMembresiaResponse, status_code=status.HTTP_201_CREATED, summary="Crear nuevo plan de membresía")
def crear_plan(plan: PlanMembresiaCreate):
    """
    Registra un nuevo plan comercial en la tabla [PlanMembresia] validando unicidad de nombre.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id_planmembresia FROM PlanMembresia WHERE nombre_planmembresia = ?",
                    (plan.nombre_planmembresia.strip(),)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Ya existe un plan de membresía con el nombre '{plan.nombre_planmembresia}'."
                    )

                insert_query = """
                    INSERT INTO PlanMembresia (
                        nombre_planmembresia,
                        duracion_meses_planmembresia,
                        precio_vigente_planmembresia
                    )
                    OUTPUT INSERTED.id_planmembresia
                    VALUES (?, ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (
                        plan.nombre_planmembresia.strip(),
                        plan.duracion_meses_planmembresia,
                        plan.precio_vigente_planmembresia
                    )
                )
                id_generado = cursor.fetchone()[0]
                return {
                    "id_planmembresia": id_generado,
                    "nombre_planmembresia": plan.nombre_planmembresia.strip(),
                    "duracion_meses_planmembresia": plan.duracion_meses_planmembresia,
                    "precio_vigente_planmembresia": float(plan.precio_vigente_planmembresia)
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear plan de membresía: {str(e)}"
        )


@router.put("/planes/{id_planmembresia}", response_model=PlanMembresiaResponse, summary="Actualizar un plan de membresía")
def actualizar_plan(id_planmembresia: int, datos: PlanMembresiaUpdate):
    """
    Actualiza el nombre, duración en meses o precio vigente de un plan de membresía existente.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id_planmembresia, nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
                    FROM PlanMembresia
                    WHERE id_planmembresia = ?
                    """,
                    (id_planmembresia,)
                )
                actual = cursor.fetchone()
                if not actual:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El plan de membresía con ID {id_planmembresia} no existe."
                    )

                nuevo_nombre = datos.nombre_planmembresia.strip() if datos.nombre_planmembresia else actual[1]
                nueva_duracion = datos.duracion_meses_planmembresia if datos.duracion_meses_planmembresia is not None else actual[2]
                nuevo_precio = datos.precio_vigente_planmembresia if datos.precio_vigente_planmembresia is not None else float(actual[3])

                if nuevo_nombre != actual[1]:
                    cursor.execute(
                        "SELECT id_planmembresia FROM PlanMembresia WHERE nombre_planmembresia = ? AND id_planmembresia != ?",
                        (nuevo_nombre, id_planmembresia)
                    )
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Ya existe otro plan con el nombre '{nuevo_nombre}'."
                        )

                update_query = """
                    UPDATE PlanMembresia
                    SET nombre_planmembresia = ?,
                        duracion_meses_planmembresia = ?,
                        precio_vigente_planmembresia = ?
                    WHERE id_planmembresia = ?
                """
                cursor.execute(update_query, (nuevo_nombre, nueva_duracion, nuevo_precio, id_planmembresia))

                return {
                    "id_planmembresia": id_planmembresia,
                    "nombre_planmembresia": nuevo_nombre,
                    "duracion_meses_planmembresia": nueva_duracion,
                    "precio_vigente_planmembresia": float(nuevo_precio)
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar plan de membresía: {str(e)}"
        )


# =========================================================================
# 2. CAJA Y REGISTRO DE PAGOS ([dbo].[Pago])
# =========================================================================

@router.get("/pagos", response_model=List[PagoDetalleResponse], summary="Listar pagos registrados en caja")
def listar_pagos(
    id_contrato: Optional[int] = Query(None, gt=0, description="Filtrar por ID de contrato"),
    id_socio: Optional[int] = Query(None, gt=0, description="Filtrar por ID de socio"),
    medio_pago: Optional[Literal["Transferencia", "Tarjeta", "Efectivo"]] = Query(None, description="Filtrar por medio de pago"),
    limite: int = Query(100, ge=1, le=500, description="Cantidad máxima de registros"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación")
):
    """
    Lista los pagos registrados en la tabla [Pago] junto con la información del socio y plan asociado.
    """
    pagos = []
    where_clauses = []
    params = []

    if id_contrato is not None:
        where_clauses.append("p.id_contrato_pago = ?")
        params.append(id_contrato)

    if id_socio is not None:
        where_clauses.append("c.id_socio_contrato = ?")
        params.append(id_socio)

    if medio_pago is not None:
        where_clauses.append("p.medio_pago = ?")
        params.append(medio_pago)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT 
            p.id_pago,
            p.id_contrato_pago,
            p.fecha_pago,
            p.monto_cancelado_pago,
            p.medio_pago,
            c.id_socio_contrato,
            s.rut_socio,
            s.nombre_completo_socio,
            pm.nombre_planmembresia
        FROM Pago p
        INNER JOIN Contrato c ON p.id_contrato_pago = c.id_contrato
        INNER JOIN Socio s ON c.id_socio_contrato = s.id_socio
        INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
        {where_sql}
        ORDER BY p.fecha_pago DESC, p.id_pago DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    params.extend([offset, limite])

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    item["monto_cancelado_pago"] = float(item["monto_cancelado_pago"])
                    pagos.append(item)
        return pagos
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar historial de pagos: {str(e)}"
        )


@router.post("/pagos", response_model=PagoResponse, status_code=status.HTTP_201_CREATED, summary="Registrar pago de contrato en caja")
def registrar_pago(pago: PagoCreate):
    """
    Registra un pago para un contrato en la tabla [Pago].
    Valida que el contrato exista y que no se encuentre Cancelado.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Comprobar que el contrato exista y revisar su estado
                cursor.execute(
                    """
                    SELECT id_contrato, estado_contrato, precio_pactado_contrato
                    FROM Contrato
                    WHERE id_contrato = ?
                    """,
                    (pago.id_contrato_pago,)
                )
                contrato_row = cursor.fetchone()
                if not contrato_row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El contrato con ID {pago.id_contrato_pago} no existe."
                    )

                _, estado_contrato, _ = contrato_row
                if estado_contrato == "Cancelado":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"No se puede registrar un pago para el contrato {pago.id_contrato_pago} porque está 'Cancelado'."
                    )

                # 2. Insertar registro de pago con marca de tiempo del servidor SQL
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
                    "monto_cancelado_pago": float(pago.monto_cancelado_pago),
                    "medio_pago": pago.medio_pago
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar pago en SQL Server: {str(e)}"
        )


# =========================================================================
# 3. GESTIÓN DE PERSONAL DEL GIMNASIO ([dbo].[Personal])
# =========================================================================

@router.get("/personal", response_model=List[PersonalResponse], summary="Listar personal del gimnasio")
def listar_personal(
    id_sede: Optional[int] = Query(None, gt=0, description="Filtrar por ID de sede asignada"),
    cargo: Optional[str] = Query(None, description="Filtrar por cargo (ej: Recepcionista, Ventas, Soporte)"),
    buscar: Optional[str] = Query(None, description="Buscar por nombre, RUT o correo del personal"),
    limite: int = Query(100, ge=1, le=500, description="Cantidad máxima de registros"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación")
):
    """
    Obtiene la nómina de personal desde la tabla [Personal] unida con [Sede].
    """
    personal_list = []
    where_clauses = []
    params = []

    if id_sede is not None:
        where_clauses.append("p.id_sede_personal = ?")
        params.append(id_sede)

    if cargo and cargo.strip():
        where_clauses.append("p.cargo_personal = ?")
        params.append(cargo.strip())

    if buscar and buscar.strip():
        term = f"%{buscar.strip()}%"
        where_clauses.append(
            "(p.nombre_completo_personal LIKE ? OR p.rut_personal LIKE ? OR p.correo_personal LIKE ?)"
        )
        params.extend([term, term, term])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT 
            p.id_personal,
            p.rut_personal,
            p.nombre_completo_personal,
            p.correo_personal,
            p.telefono_personal,
            p.cargo_personal,
            p.id_sede_personal,
            s.nombre_sede
        FROM Personal p
        INNER JOIN Sede s ON p.id_sede_personal = s.id_sede
        {where_sql}
        ORDER BY p.id_personal DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    params.extend([offset, limite])

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    personal_list.append(dict(zip(columns, row)))
        return personal_list
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar personal en SQL Server: {str(e)}"
        )


@router.get("/personal/{id_personal}", response_model=PersonalResponse, summary="Obtener detalle de un miembro del personal")
def obtener_personal(id_personal: int):
    """
    Consulta los datos de un integrante del personal por su ID.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT 
                        p.id_personal,
                        p.rut_personal,
                        p.nombre_completo_personal,
                        p.correo_personal,
                        p.telefono_personal,
                        p.cargo_personal,
                        p.id_sede_personal,
                        s.nombre_sede
                    FROM Personal p
                    INNER JOIN Sede s ON p.id_sede_personal = s.id_sede
                    WHERE p.id_personal = ?
                """
                cursor.execute(query, (id_personal,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Personal con ID {id_personal} no encontrado."
                    )
                columns = [col[0] for col in cursor.description]
                return dict(zip(columns, row))
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener personal: {str(e)}"
        )


@router.post("/personal", response_model=PersonalResponse, status_code=status.HTTP_201_CREATED, summary="Registrar nuevo miembro del personal")
def registrar_personal(personal: PersonalCreate):
    """
    Inserta un nuevo funcionario en la tabla [Personal] validando existencia de sede y unicidad de RUT/Correo.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar que la sede exista
                cursor.execute("SELECT nombre_sede FROM Sede WHERE id_sede = ?", (personal.id_sede_personal,))
                sede_row = cursor.fetchone()
                if not sede_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La sede con ID {personal.id_sede_personal} no existe."
                    )
                nombre_sede = sede_row[0]

                # 2. Validar unicidad de RUT y Correo
                cursor.execute(
                    "SELECT id_personal FROM Personal WHERE rut_personal = ? OR correo_personal = ?",
                    (personal.rut_personal.strip(), personal.correo_personal)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe un miembro del personal registrado con el mismo RUT o Correo."
                    )

                # 3. Insertar registro
                insert_query = """
                    INSERT INTO Personal (
                        rut_personal,
                        nombre_completo_personal,
                        correo_personal,
                        telefono_personal,
                        cargo_personal,
                        id_sede_personal
                    )
                    OUTPUT INSERTED.id_personal
                    VALUES (?, ?, ?, ?, ?, ?)
                """
                cursor.execute(
                    insert_query,
                    (
                        personal.rut_personal.strip(),
                        personal.nombre_completo_personal.strip(),
                        personal.correo_personal,
                        personal.telefono_personal.strip(),
                        personal.cargo_personal.strip(),
                        personal.id_sede_personal
                    )
                )
                id_generado = cursor.fetchone()[0]
                return {
                    **personal.model_dump(),
                    "id_personal": id_generado,
                    "nombre_sede": nombre_sede
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar personal: {str(e)}"
        )


@router.put("/personal/{id_personal}", response_model=PersonalResponse, summary="Actualizar datos de un miembro del personal")
def actualizar_personal(id_personal: int, datos: PersonalUpdate):
    """
    Actualiza nombre, correo, teléfono, cargo o sede asignada de un miembro del personal.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id_personal, rut_personal, nombre_completo_personal, correo_personal,
                           telefono_personal, cargo_personal, id_sede_personal
                    FROM Personal
                    WHERE id_personal = ?
                    """,
                    (id_personal,)
                )
                actual = cursor.fetchone()
                if not actual:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Personal con ID {id_personal} no encontrado."
                    )

                nuevo_correo = datos.correo_personal or actual[3]
                if nuevo_correo != actual[3]:
                    cursor.execute(
                        "SELECT id_personal FROM Personal WHERE correo_personal = ? AND id_personal != ?",
                        (nuevo_correo, id_personal)
                    )
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="El correo electrónico ya está siendo utilizado por otro integrante del personal."
                        )

                nueva_sede = datos.id_sede_personal if datos.id_sede_personal is not None else actual[6]
                cursor.execute("SELECT nombre_sede FROM Sede WHERE id_sede = ?", (nueva_sede,))
                sede_row = cursor.fetchone()
                if not sede_row:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La sede con ID {nueva_sede} no existe."
                    )
                nombre_sede = sede_row[0]

                nuevo_nombre = datos.nombre_completo_personal.strip() if datos.nombre_completo_personal else actual[2]
                nuevo_telefono = datos.telefono_personal.strip() if datos.telefono_personal else actual[4]
                nuevo_cargo = datos.cargo_personal.strip() if datos.cargo_personal else actual[5]

                update_query = """
                    UPDATE Personal
                    SET nombre_completo_personal = ?,
                        correo_personal = ?,
                        telefono_personal = ?,
                        cargo_personal = ?,
                        id_sede_personal = ?
                    WHERE id_personal = ?
                """
                cursor.execute(
                    update_query,
                    (nuevo_nombre, nuevo_correo, nuevo_telefono, nuevo_cargo, nueva_sede, id_personal)
                )

                return {
                    "id_personal": id_personal,
                    "rut_personal": actual[1],
                    "nombre_completo_personal": nuevo_nombre,
                    "correo_personal": nuevo_correo,
                    "telefono_personal": nuevo_telefono,
                    "cargo_personal": nuevo_cargo,
                    "id_sede_personal": nueva_sede,
                    "nombre_sede": nombre_sede
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar personal: {str(e)}"
        )


@router.delete("/personal/{id_personal}", summary="Eliminar un registro de personal")
def eliminar_personal(id_personal: int):
    """
    Elimina un funcionario de la tabla [Personal], desvinculando previamente cualquier cuenta en [Usuario].
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id_personal, nombre_completo_personal FROM Personal WHERE id_personal = ?", (id_personal,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Personal con ID {id_personal} no encontrado."
                    )

                # Desvincular referencia en Usuario si existiera para respetar FK_Usuario_Personal
                cursor.execute("UPDATE Usuario SET id_personal_usuario = NULL WHERE id_personal_usuario = ?", (id_personal,))
                cursor.execute("DELETE FROM Personal WHERE id_personal = ?", (id_personal,))

                return {
                    "mensaje": f"Registro de personal '{row[1]}' (ID {id_personal}) eliminado correctamente.",
                    "id_personal": id_personal
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar personal: {str(e)}"
        )


# =========================================================================
# 4. REPORTE DE INGRESOS POR SEDE ([dbo].[vw_Reporte_Ingresos_Por_Sede])
# =========================================================================

@router.get("/reportes/ingresos-por-sede", response_model=List[ReporteIngresosPorSedeItem], summary="Reporte de ingresos por sede y período (Vista)")
def reporte_ingresos_por_sede(
    nombre_sede: Optional[str] = Query(None, description="Filtrar por nombre de sede"),
    anio: Optional[int] = Query(None, ge=2000, le=2100, description="Filtrar por año de pago (anio_pago)"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mes de pago (mes_pago)")
):
    """
    Consulta la vista analítica oficial [dbo].[vw_Reporte_Ingresos_Por_Sede]
    para obtener la recaudación mensual y anual agrupada por sucursal.
    """
    reporte = []
    where_clauses = []
    params = []

    if nombre_sede and nombre_sede.strip():
        where_clauses.append("nombre_sede LIKE ?")
        params.append(f"%{nombre_sede.strip()}%")

    if anio is not None:
        where_clauses.append("anio_pago = ?")
        params.append(anio)

    if mes is not None:
        where_clauses.append("mes_pago = ?")
        params.append(mes)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT nombre_sede, anio_pago, mes_pago, total_ingresos
        FROM vw_Reporte_Ingresos_Por_Sede
        {where_sql}
        ORDER BY anio_pago DESC, mes_pago DESC, total_ingresos DESC, nombre_sede ASC
    """

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    item["total_ingresos"] = float(item["total_ingresos"]) if item["total_ingresos"] is not None else 0.0
                    reporte.append(item)
        return reporte
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar vista vw_Reporte_Ingresos_Por_Sede: {str(e)}"
        )


# =========================================================================
# 5. PORTAL FINANCIERO DEL SOCIO (ESTADO DE CUENTA Y SALDOS)
# =========================================================================

@router.get("/socio/{id_socio}/estado-cuenta", response_model=EstadoCuentaSocioResponse, summary="Estado de cuenta financiero completo de un socio")
def obtener_estado_cuenta_socio(id_socio: int):
    """
    Retorna el estado de cuenta integral de un socio:
    - Información personal y sede de registro.
    - Contratos emitidos con monto pactado, monto abonado y saldo individual.
    - Historial detallado de recibos/pagos efectuados.
    - Saldo pendiente total y estado financiero ('Al día' o 'Con deuda pendiente').
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Datos del socio y su sede
                cursor.execute(
                    """
                    SELECT s.id_socio, s.rut_socio, s.nombre_completo_socio, s.correo_socio, s.activo_socio, sed.nombre_sede
                    FROM Socio s
                    INNER JOIN Sede sed ON s.id_sede_registro_socio = sed.id_sede
                    WHERE s.id_socio = ?
                    """,
                    (id_socio,)
                )
                socio_row = cursor.fetchone()
                if not socio_row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El socio con ID {id_socio} no existe."
                    )

                _, rut_socio, nombre_socio, correo_socio, activo_socio, nombre_sede = socio_row

                # 2. Contratos del socio con suma de pagos por contrato
                cursor.execute(
                    """
                    SELECT 
                        c.id_contrato,
                        c.id_socio_contrato,
                        c.id_planmembresia_contrato,
                        c.fecha_inicio_contrato,
                        c.fecha_termino_contrato,
                        c.estado_contrato,
                        c.precio_pactado_contrato,
                        pm.nombre_planmembresia,
                        pm.duracion_meses_planmembresia,
                        ISNULL(SUM(p.monto_cancelado_pago), 0) AS total_pagado
                    FROM Contrato c
                    INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
                    LEFT JOIN Pago p ON c.id_contrato = p.id_contrato_pago
                    WHERE c.id_socio_contrato = ?
                    GROUP BY 
                        c.id_contrato,
                        c.id_socio_contrato,
                        c.id_planmembresia_contrato,
                        c.fecha_inicio_contrato,
                        c.fecha_termino_contrato,
                        c.estado_contrato,
                        c.precio_pactado_contrato,
                        pm.nombre_planmembresia,
                        pm.duracion_meses_planmembresia
                    ORDER BY c.fecha_inicio_contrato DESC, c.id_contrato DESC
                    """,
                    (id_socio,)
                )
                contratos_cols = [col[0] for col in cursor.description]
                contratos_list = []
                total_pactado = 0.0
                total_pagado_global = 0.0
                saldo_pendiente_global = 0.0
                tiene_vigente = False
                hoy = date.today()

                for row in cursor.fetchall():
                    c_dict = dict(zip(contratos_cols, row))
                    precio_pactado = float(c_dict["precio_pactado_contrato"])
                    pagado_contrato = float(c_dict["total_pagado"])
                    # Si el contrato está cancelado, no genera deuda pendiente adicional
                    saldo_contrato = max(0.0, round(precio_pactado - pagado_contrato, 2)) if c_dict["estado_contrato"] != "Cancelado" else 0.0

                    c_dict["precio_pactado_contrato"] = precio_pactado
                    c_dict["total_pagado"] = pagado_contrato
                    c_dict["saldo_pendiente"] = saldo_contrato
                    c_dict["rut_socio"] = rut_socio
                    c_dict["nombre_completo_socio"] = nombre_socio

                    if c_dict["estado_contrato"] == "Vigente" and c_dict["fecha_termino_contrato"] >= hoy:
                        tiene_vigente = True

                    if c_dict["estado_contrato"] != "Cancelado":
                        total_pactado += precio_pactado
                        saldo_pendiente_global += saldo_contrato

                    total_pagado_global += pagado_contrato
                    contratos_list.append(c_dict)

                # 3. Historial de pagos del socio
                cursor.execute(
                    """
                    SELECT 
                        p.id_pago,
                        p.id_contrato_pago,
                        p.fecha_pago,
                        p.monto_cancelado_pago,
                        p.medio_pago,
                        c.id_socio_contrato,
                        pm.nombre_planmembresia
                    FROM Pago p
                    INNER JOIN Contrato c ON p.id_contrato_pago = c.id_contrato
                    INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
                    WHERE c.id_socio_contrato = ?
                    ORDER BY p.fecha_pago DESC, p.id_pago DESC
                    """,
                    (id_socio,)
                )
                pagos_cols = [col[0] for col in cursor.description]
                pagos_list = []
                for row in cursor.fetchall():
                    p_dict = dict(zip(pagos_cols, row))
                    p_dict["monto_cancelado_pago"] = float(p_dict["monto_cancelado_pago"])
                    p_dict["rut_socio"] = rut_socio
                    p_dict["nombre_completo_socio"] = nombre_socio
                    pagos_list.append(p_dict)

                saldo_pendiente_global = round(saldo_pendiente_global, 2)
                estado_financiero = "Al día" if saldo_pendiente_global <= 0 else "Con saldo pendiente"

                return {
                    "id_socio": id_socio,
                    "rut_socio": rut_socio,
                    "nombre_completo_socio": nombre_socio,
                    "correo_socio": correo_socio,
                    "activo_socio": bool(activo_socio),
                    "nombre_sede": nombre_sede,
                    "tiene_contrato_vigente": tiene_vigente,
                    "total_contratos": len(contratos_list),
                    "total_pactado": round(total_pactado, 2),
                    "total_pagado": round(total_pagado_global, 2),
                    "saldo_pendiente": saldo_pendiente_global,
                    "estado_financiero": estado_financiero,
                    "contratos": contratos_list,
                    "pagos": pagos_list
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estado de cuenta del socio: {str(e)}"
        )


# =========================================================================
# 6. EMISIÓN, CONSULTA Y CONTROL DE CONTRATOS ([dbo].[Contrato])
# =========================================================================

@router.get("/", response_model=List[ContratoDetalleResponse], summary="Listar contratos con filtros y estado de pago")
def listar_contratos(
    id_socio: Optional[int] = Query(None, gt=0, description="Filtrar por ID de socio"),
    id_plan: Optional[int] = Query(None, gt=0, description="Filtrar por ID de plan de membresía"),
    estado: Optional[Literal["Vigente", "Vencido", "Cancelado"]] = Query(None, description="Filtrar por estado del contrato"),
    limite: int = Query(100, ge=1, le=500, description="Cantidad máxima de registros"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación")
):
    """
    Lista los contratos registrados en [Contrato] incluyendo datos del socio, plan,
    monto total abonado y saldo pendiente.
    """
    contratos = []
    where_clauses = []
    params = []

    if id_socio is not None:
        where_clauses.append("c.id_socio_contrato = ?")
        params.append(id_socio)

    if id_plan is not None:
        where_clauses.append("c.id_planmembresia_contrato = ?")
        params.append(id_plan)

    if estado is not None:
        where_clauses.append("c.estado_contrato = ?")
        params.append(estado)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT 
            c.id_contrato,
            c.id_socio_contrato,
            c.id_planmembresia_contrato,
            c.fecha_inicio_contrato,
            c.fecha_termino_contrato,
            c.estado_contrato,
            c.precio_pactado_contrato,
            s.rut_socio,
            s.nombre_completo_socio,
            pm.nombre_planmembresia,
            pm.duracion_meses_planmembresia,
            ISNULL(SUM(p.monto_cancelado_pago), 0) AS total_pagado
        FROM Contrato c
        INNER JOIN Socio s ON c.id_socio_contrato = s.id_socio
        INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
        LEFT JOIN Pago p ON c.id_contrato = p.id_contrato_pago
        {where_sql}
        GROUP BY 
            c.id_contrato,
            c.id_socio_contrato,
            c.id_planmembresia_contrato,
            c.fecha_inicio_contrato,
            c.fecha_termino_contrato,
            c.estado_contrato,
            c.precio_pactado_contrato,
            s.rut_socio,
            s.nombre_completo_socio,
            pm.nombre_planmembresia,
            pm.duracion_meses_planmembresia
        ORDER BY c.id_contrato DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    params.extend([offset, limite])

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    precio = float(item["precio_pactado_contrato"])
                    pagado = float(item["total_pagado"])
                    item["precio_pactado_contrato"] = precio
                    item["total_pagado"] = pagado
                    item["saldo_pendiente"] = max(0.0, round(precio - pagado, 2)) if item["estado_contrato"] != "Cancelado" else 0.0
                    contratos.append(item)
        return contratos
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar contratos en SQL Server: {str(e)}"
        )


@router.post("/", response_model=ContratoResponse, status_code=status.HTTP_201_CREATED, summary="Crear nuevo contrato de membresía")
def crear_contrato(contrato: ContratoCreate):
    """
    Registra un contrato para un socio validando la existencia del socio, del plan y coherencia de fechas.
    """
    if contrato.fecha_termino_contrato < contrato.fecha_inicio_contrato:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de término del contrato no puede ser anterior a la fecha de inicio."
        )

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar existencia del socio
                cursor.execute("SELECT id_socio FROM Socio WHERE id_socio = ?", (contrato.id_socio_contrato,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El socio con ID {contrato.id_socio_contrato} no existe."
                    )

                # 2. Validar existencia del plan
                cursor.execute(
                    "SELECT id_planmembresia FROM PlanMembresia WHERE id_planmembresia = ?",
                    (contrato.id_planmembresia_contrato,)
                )
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
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


@router.post("/emitir-con-pago", status_code=status.HTTP_201_CREATED, summary="Emitir contrato y registrar pago inicial de forma atómica")
def emitir_contrato_con_pago(payload: EmisionContratoConPagoRequest):
    """
    Operación transaccional de Caja:
    1. Valida socio y plan de membresía.
    2. Calcula automáticamente fecha_termino_contrato según duracion_meses_planmembresia del plan.
    3. Inserta el nuevo Contrato en estado 'Vigente'.
    4. Inserta el Pago en la misma transacción atómica (si falla el pago, se revierte el contrato).
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar socio
                cursor.execute(
                    "SELECT id_socio, nombre_completo_socio, activo_socio FROM Socio WHERE id_socio = ?",
                    (payload.id_socio_contrato,)
                )
                socio_row = cursor.fetchone()
                if not socio_row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El socio con ID {payload.id_socio_contrato} no existe."
                    )

                # 2. Obtener duración y precio vigente del plan
                cursor.execute(
                    """
                    SELECT id_planmembresia, nombre_planmembresia, duracion_meses_planmembresia, precio_vigente_planmembresia
                    FROM PlanMembresia
                    WHERE id_planmembresia = ?
                    """,
                    (payload.id_planmembresia_contrato,)
                )
                plan_row = cursor.fetchone()
                if not plan_row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El plan de membresía con ID {payload.id_planmembresia_contrato} no existe."
                    )

                _, nombre_plan, duracion_meses, precio_vigente = plan_row
                fecha_inicio = payload.fecha_inicio_contrato or date.today()
                precio_pactado = float(payload.precio_pactado_contrato) if payload.precio_pactado_contrato is not None else float(precio_vigente)
                monto_pago = float(payload.monto_pago_inicial) if payload.monto_pago_inicial is not None else precio_pactado

                # 3. Insertar contrato calculando fecha_termino_contrato con DATEADD en SQL Server
                insert_contrato_sql = """
                    INSERT INTO Contrato (
                        id_socio_contrato,
                        id_planmembresia_contrato,
                        fecha_inicio_contrato,
                        fecha_termino_contrato,
                        estado_contrato,
                        precio_pactado_contrato
                    )
                    OUTPUT INSERTED.id_contrato, INSERTED.fecha_inicio_contrato, INSERTED.fecha_termino_contrato
                    VALUES (?, ?, ?, DATEADD(MONTH, ?, ?), 'Vigente', ?)
                """
                cursor.execute(
                    insert_contrato_sql,
                    (
                        payload.id_socio_contrato,
                        payload.id_planmembresia_contrato,
                        fecha_inicio,
                        duracion_meses,
                        fecha_inicio,
                        precio_pactado
                    )
                )
                contrato_insertado = cursor.fetchone()
                id_contrato = contrato_insertado[0]
                fecha_inicio_db = contrato_insertado[1]
                fecha_termino_db = contrato_insertado[2]

                # 4. Insertar pago inicial en la misma transacción
                insert_pago_sql = """
                    INSERT INTO Pago (id_contrato_pago, fecha_pago, monto_cancelado_pago, medio_pago)
                    OUTPUT INSERTED.id_pago, INSERTED.fecha_pago
                    VALUES (?, SYSDATETIME(), ?, ?)
                """
                cursor.execute(
                    insert_pago_sql,
                    (id_contrato, monto_pago, payload.medio_pago)
                )
                pago_insertado = cursor.fetchone()

                return {
                    "mensaje": "Contrato emitido y pago registrado exitosamente en transacción atómica.",
                    "contrato": {
                        "id_contrato": id_contrato,
                        "id_socio_contrato": payload.id_socio_contrato,
                        "nombre_completo_socio": socio_row[1],
                        "id_planmembresia_contrato": payload.id_planmembresia_contrato,
                        "nombre_planmembresia": nombre_plan,
                        "fecha_inicio_contrato": fecha_inicio_db,
                        "fecha_termino_contrato": fecha_termino_db,
                        "estado_contrato": "Vigente",
                        "precio_pactado_contrato": precio_pactado,
                        "saldo_pendiente": max(0.0, round(precio_pactado - monto_pago, 2))
                    },
                    "pago": {
                        "id_pago": pago_insertado[0],
                        "id_contrato_pago": id_contrato,
                        "fecha_pago": pago_insertado[1],
                        "monto_cancelado_pago": monto_pago,
                        "medio_pago": payload.medio_pago
                    }
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la emisión atómica de contrato y pago: {str(e)}"
        )


@router.post("/actualizar-vencidos", summary="Actualizar automáticamente el estado de contratos cuyo plazo haya expirado")
def actualizar_contratos_vencidos():
    """
    Cambia el estado a 'Vencido' en todos los contratos que figuren como 'Vigente'
    pero cuya fecha_termino_contrato sea menor a la fecha actual del servidor.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                update_sql = """
                    UPDATE Contrato
                    SET estado_contrato = 'Vencido'
                    WHERE estado_contrato = 'Vigente'
                      AND fecha_termino_contrato < CAST(GETDATE() AS DATE)
                """
                cursor.execute(update_sql)
                afectados = cursor.rowcount if cursor.rowcount >= 0 else 0
                return {
                    "mensaje": "Proceso de actualización de contratos vencidos completado.",
                    "contratos_actualizados": afectados
                }
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar contratos vencidos: {str(e)}"
        )


@router.get("/{id_contrato}", response_model=ContratoDetalleResponse, summary="Obtener detalle de un contrato por ID")
def obtener_contrato(id_contrato: int):
    """
    Consulta el detalle de un contrato por su ID, incluyendo socio, plan, total abonado y saldo pendiente.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT 
                        c.id_contrato,
                        c.id_socio_contrato,
                        c.id_planmembresia_contrato,
                        c.fecha_inicio_contrato,
                        c.fecha_termino_contrato,
                        c.estado_contrato,
                        c.precio_pactado_contrato,
                        s.rut_socio,
                        s.nombre_completo_socio,
                        pm.nombre_planmembresia,
                        pm.duracion_meses_planmembresia,
                        ISNULL(SUM(p.monto_cancelado_pago), 0) AS total_pagado
                    FROM Contrato c
                    INNER JOIN Socio s ON c.id_socio_contrato = s.id_socio
                    INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
                    LEFT JOIN Pago p ON c.id_contrato = p.id_contrato_pago
                    WHERE c.id_contrato = ?
                    GROUP BY 
                        c.id_contrato,
                        c.id_socio_contrato,
                        c.id_planmembresia_contrato,
                        c.fecha_inicio_contrato,
                        c.fecha_termino_contrato,
                        c.estado_contrato,
                        c.precio_pactado_contrato,
                        s.rut_socio,
                        s.nombre_completo_socio,
                        pm.nombre_planmembresia,
                        pm.duracion_meses_planmembresia
                """
                cursor.execute(query, (id_contrato,))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El contrato con ID {id_contrato} no existe."
                    )
                columns = [col[0] for col in cursor.description]
                item = dict(zip(columns, row))
                precio = float(item["precio_pactado_contrato"])
                pagado = float(item["total_pagado"])
                item["precio_pactado_contrato"] = precio
                item["total_pagado"] = pagado
                item["saldo_pendiente"] = max(0.0, round(precio - pagado, 2)) if item["estado_contrato"] != "Cancelado" else 0.0
                return item
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar contrato: {str(e)}"
        )


@router.patch("/{id_contrato}/estado", response_model=ContratoResponse, summary="Cambiar estado de un contrato (Vigente, Vencido, Cancelado)")
def cambiar_estado_contrato(id_contrato: int, payload: ContratoEstadoUpdate):
    """
    Actualiza el estado de un contrato existente ('Vigente', 'Vencido' o 'Cancelado').
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                update_sql = """
                    UPDATE Contrato
                    SET estado_contrato = ?
                    OUTPUT INSERTED.id_contrato,
                           INSERTED.id_socio_contrato,
                           INSERTED.id_planmembresia_contrato,
                           INSERTED.fecha_inicio_contrato,
                           INSERTED.fecha_termino_contrato,
                           INSERTED.estado_contrato,
                           INSERTED.precio_pactado_contrato
                    WHERE id_contrato = ?
                """
                cursor.execute(update_sql, (payload.estado_contrato, id_contrato))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El contrato con ID {id_contrato} no existe."
                    )
                columns = [col[0] for col in cursor.description]
                item = dict(zip(columns, row))
                item["precio_pactado_contrato"] = float(item["precio_pactado_contrato"])
                return item
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar estado del contrato: {str(e)}"
        )


@router.get("/{id_contrato}/pagos", response_model=List[PagoResponse], summary="Listar todos los pagos asociados a un contrato")
def listar_pagos_por_contrato(id_contrato: int):
    """
    Obtiene todos los recibos de pago registrados para un contrato específico.
    """
    pagos = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id_contrato FROM Contrato WHERE id_contrato = ?", (id_contrato,))
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El contrato con ID {id_contrato} no existe."
                    )

                query = """
                    SELECT id_pago, id_contrato_pago, fecha_pago, monto_cancelado_pago, medio_pago
                    FROM Pago
                    WHERE id_contrato_pago = ?
                    ORDER BY fecha_pago DESC, id_pago DESC
                """
                cursor.execute(query, (id_contrato,))
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    item["monto_cancelado_pago"] = float(item["monto_cancelado_pago"])
                    pagos.append(item)
        return pagos
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar pagos del contrato: {str(e)}"
        )
