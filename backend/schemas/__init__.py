from datetime import date, datetime, time
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field

# =========================================================================
# PERSONA 1: Acceso y Administración de Socios
# Tablas involucradas: Socio, Sede
# =========================================================================

class SocioBase(BaseModel):
    rut: str = Field(..., min_length=8, max_length=12, example="18.765.432-K")
    nombre_completo: str = Field(..., min_length=3, max_length=150, example="Daniel Matus")
    fecha_nacimiento: date = Field(..., example="1999-04-12")
    correo: EmailStr = Field(..., example="daniel.matus@alumnos.cl")
    telefono: str = Field(..., max_length=20, example="+56 9 9333 4455")
    id_sede_registro: int = Field(..., gt=0, example=1)
    acepta_promociones: bool = False

class SocioCreate(SocioBase):
    pass

class SocioResponse(SocioBase):
    id_socio: int
    activo: bool = True

    class Config:
        from_attributes = True


# =========================================================================
# PERSONA 2: Clases, Sesiones e Inscripciones
# Tablas involucradas: Clase, Sesion, Inscripcion
# =========================================================================

class ClaseBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, example="CrossFit Intensivo")
    duracion_minutos: int = Field(..., gt=0, example=60)
    nivel_exigencia: Literal["Principiante", "Intermedio", "Avanzado"] = "Intermedio"

class ClaseCreate(ClaseBase):
    pass

class ClaseResponse(ClaseBase):
    id_clase: int

    class Config:
        from_attributes = True

class SesionBase(BaseModel):
    id_clase: int
    id_sede: int
    id_instructor: Optional[int] = None
    fecha: date
    hora: str = Field(..., example="09:00:00")
    cupo_maximo: int = Field(..., gt=0, example=20)

class SesionCreate(SesionBase):
    pass

class SesionResponse(SesionBase):
    id_sesion: int

    class Config:
        from_attributes = True

class InscripcionCreate(BaseModel):
    id_socio: int
    id_sesion: int
    observaciones: Optional[str] = None

class InscripcionResponse(BaseModel):
    id_inscripcion: int
    id_socio: int
    id_sesion: int
    fecha_inscripcion: datetime
    asistio: Optional[bool] = None
    observaciones: Optional[str] = None
    estado: str = "Inscrito"

    class Config:
        from_attributes = True


# =========================================================================
# PERSONA 3: Membresías, Contratos y Pagos
# Tablas involucradas: PlanMembresia, Contrato, Pago
# =========================================================================

class PlanMembresiaBase(BaseModel):
    nombre: str = Field(..., max_length=100, example="Plan Mensual Smart")
    duracion_meses: int = Field(..., gt=0, example=1)
    precio_vigente: float = Field(..., ge=0, example=29990.00)

class PlanMembresiaResponse(PlanMembresiaBase):
    id_plan: int

    class Config:
        from_attributes = True

class ContratoCreate(BaseModel):
    id_socio: int
    id_plan: int
    fecha_inicio: date
    fecha_termino: date
    precio_pactado: float = Field(..., ge=0, example=29990.00)
    estado: Literal["Vigente", "Vencido", "Cancelado"] = "Vigente"

class ContratoResponse(BaseModel):
    id_contrato: int
    id_socio: int
    id_plan: int
    fecha_inicio: date
    fecha_termino: date
    estado: str
    precio_pactado: float

    class Config:
        from_attributes = True

class PagoCreate(BaseModel):
    id_contrato: int
    monto_cancelado: float = Field(..., gt=0, example=29990.00)
    medio_pago: Literal["Transferencia", "Tarjeta", "Efectivo"] = "Transferencia"

class PagoResponse(BaseModel):
    id_pago: int
    id_contrato: int
    fecha_pago: datetime
    monto_cancelado: float
    medio_pago: str

    class Config:
        from_attributes = True
