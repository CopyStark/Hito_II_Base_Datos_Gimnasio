from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# -------------------------------------------------------------------------
# Schemas base para Persona 1: Acceso y Administración de Socios
# -------------------------------------------------------------------------
class SocioBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    apellido: str = Field(..., min_length=2, max_length=100)
    dni: str = Field(..., min_length=5, max_length=20)
    email: EmailStr
    telefono: Optional[str] = Field(None, max_length=25)
    fecha_nacimiento: Optional[date] = None

class SocioCreate(SocioBase):
    pass

class SocioResponse(SocioBase):
    id_socio: int
    estado: str = "activo"
    fecha_registro: Optional[datetime] = None

    class Config:
        from_attributes = True

# -------------------------------------------------------------------------
# Schemas base para Persona 2: Sesiones e Inscripciones de Clases
# -------------------------------------------------------------------------
class ClaseBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    cupo_maximo: int = Field(..., gt=0)
    entrenador: Optional[str] = Field(None, max_length=100)

class ClaseCreate(ClaseBase):
    pass

class ClaseResponse(ClaseBase):
    id_clase: int
    horario: Optional[str] = None

    class Config:
        from_attributes = True

class InscripcionCreate(BaseModel):
    id_socio: int
    id_clase: int

# -------------------------------------------------------------------------
# Schemas base para Persona 3: Membresías, Contratos y Pagos
# -------------------------------------------------------------------------
class ContratoBase(BaseModel):
    id_socio: int
    tipo_plan: str = Field(..., max_length=50)  # Ej: Mensual, Trimestral, Anual
    monto: float = Field(..., gt=0)
    fecha_inicio: date
    fecha_fin: date

class ContratoCreate(ContratoBase):
    pass

class ContratoResponse(ContratoBase):
    id_contrato: int
    estado_pago: str = "pendiente"  # pendiente, pagado, vencido

    class Config:
        from_attributes = True

class PagoCreate(BaseModel):
    id_contrato: int
    monto: float = Field(..., gt=0)
    metodo_pago: str = Field(..., max_length=30)  # efectivo, tarjeta, transferencia
