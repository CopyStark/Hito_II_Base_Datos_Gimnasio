from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, AliasChoices, ConfigDict, computed_field

# =========================================================================
# PERSONA 1: Acceso y Administración de Socios
# Sincronizado con tabla: [dbo].[Socio] (convención: sufijo _socio)
# =========================================================================

class SocioBase(BaseModel):
    rut_socio: str = Field(
        ..., 
        min_length=8, 
        max_length=12, 
        example="18.765.432-K",
        validation_alias=AliasChoices("rut_socio", "rut")
    )
    nombre_completo_socio: str = Field(
        ..., 
        min_length=3, 
        max_length=150, 
        example="Daniel Matus",
        validation_alias=AliasChoices("nombre_completo_socio", "nombre_completo")
    )
    fecha_nacimiento_socio: date = Field(
        ..., 
        example="1999-04-12",
        validation_alias=AliasChoices("fecha_nacimiento_socio", "fecha_nacimiento")
    )
    correo_socio: EmailStr = Field(
        ..., 
        example="daniel.matus@alumnos.cl",
        validation_alias=AliasChoices("correo_socio", "correo")
    )
    telefono_socio: str = Field(
        ..., 
        max_length=20, 
        example="+56 9 9333 4455",
        validation_alias=AliasChoices("telefono_socio", "telefono")
    )
    id_sede_registro_socio: int = Field(
        ..., 
        gt=0, 
        example=1,
        validation_alias=AliasChoices("id_sede_registro_socio", "id_sede_registro")
    )
    acepta_promociones_socio: bool = Field(
        default=False,
        validation_alias=AliasChoices("acepta_promociones_socio", "acepta_promociones")
    )

    # Propiedades computadas para retrocompatibilidad con frontend y clientes legados
    @computed_field
    def rut(self) -> str:
        return self.rut_socio

    @computed_field
    def nombre_completo(self) -> str:
        return self.nombre_completo_socio

    @computed_field
    def fecha_nacimiento(self) -> date:
        return self.fecha_nacimiento_socio

    @computed_field
    def correo(self) -> EmailStr:
        return self.correo_socio

    @computed_field
    def telefono(self) -> str:
        return self.telefono_socio

    @computed_field
    def id_sede_registro(self) -> int:
        return self.id_sede_registro_socio

    @computed_field
    def acepta_promociones(self) -> bool:
        return self.acepta_promociones_socio

class SocioCreate(SocioBase):
    pass

class SocioResponse(SocioBase):
    id_socio: int
    activo_socio: bool = Field(
        default=True,
        validation_alias=AliasChoices("activo_socio", "activo")
    )

    @computed_field
    def activo(self) -> bool:
        return self.activo_socio

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# PERSONA 2: Clases, Sesiones e Inscripciones
# Sincronizado con tablas: [dbo].[Clase], [dbo].[Sesion], [dbo].[Inscripcion]
# =========================================================================

class ClaseBase(BaseModel):
    nombre_clase: str = Field(
        ..., 
        min_length=2, 
        max_length=100, 
        example="CrossFit Intensivo",
        validation_alias=AliasChoices("nombre_clase", "nombre")
    )
    duracion_minutos_clase: int = Field(
        ..., 
        gt=0, 
        example=60,
        validation_alias=AliasChoices("duracion_minutos_clase", "duracion_minutos")
    )
    nivel_exigencia_clase: Literal["Principiante", "Intermedio", "Avanzado"] = Field(
        default="Intermedio",
        validation_alias=AliasChoices("nivel_exigencia_clase", "nivel_exigencia")
    )

    @computed_field
    def nombre(self) -> str:
        return self.nombre_clase

    @computed_field
    def duracion_minutos(self) -> int:
        return self.duracion_minutos_clase

    @computed_field
    def nivel_exigencia(self) -> str:
        return self.nivel_exigencia_clase

class ClaseCreate(ClaseBase):
    pass

class ClaseResponse(ClaseBase):
    id_clase: int

    model_config = ConfigDict(from_attributes=True)

class SesionBase(BaseModel):
    id_clase_sesion: int = Field(
        ..., 
        gt=0,
        validation_alias=AliasChoices("id_clase_sesion", "id_clase")
    )
    id_sede_sesion: int = Field(
        ..., 
        gt=0,
        validation_alias=AliasChoices("id_sede_sesion", "id_sede")
    )
    id_instructor_sesion: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("id_instructor_sesion", "id_instructor")
    )
    fecha_sesion: date = Field(
        ...,
        validation_alias=AliasChoices("fecha_sesion", "fecha")
    )
    hora_sesion: str = Field(
        ..., 
        example="09:00:00",
        validation_alias=AliasChoices("hora_sesion", "hora")
    )
    cupo_maximo_sesion: int = Field(
        ..., 
        gt=0, 
        example=20,
        validation_alias=AliasChoices("cupo_maximo_sesion", "cupo_maximo")
    )

    @computed_field
    def id_clase(self) -> int:
        return self.id_clase_sesion

    @computed_field
    def id_sede(self) -> int:
        return self.id_sede_sesion

    @computed_field
    def id_instructor(self) -> Optional[int]:
        return self.id_instructor_sesion

    @computed_field
    def fecha(self) -> date:
        return self.fecha_sesion

    @computed_field
    def hora(self) -> str:
        return self.hora_sesion

    @computed_field
    def cupo_maximo(self) -> int:
        return self.cupo_maximo_sesion

class SesionCreate(SesionBase):
    pass

class SesionResponse(SesionBase):
    id_sesion: int

    model_config = ConfigDict(from_attributes=True)

class InscripcionCreate(BaseModel):
    id_socio_inscripcion: int = Field(
        ..., 
        gt=0,
        validation_alias=AliasChoices("id_socio_inscripcion", "id_socio")
    )
    id_sesion_inscripcion: int = Field(
        ..., 
        gt=0,
        validation_alias=AliasChoices("id_sesion_inscripcion", "id_sesion")
    )
    observaciones_inscripcion: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("observaciones_inscripcion", "observaciones")
    )

    @computed_field
    def id_socio(self) -> int:
        return self.id_socio_inscripcion

    @computed_field
    def id_sesion(self) -> int:
        return self.id_sesion_inscripcion

    @computed_field
    def observaciones(self) -> Optional[str]:
        return self.observaciones_inscripcion

class InscripcionResponse(BaseModel):
    id_inscripcion: int
    id_socio_inscripcion: int = Field(
        ...,
        validation_alias=AliasChoices("id_socio_inscripcion", "id_socio")
    )
    id_sesion_inscripcion: int = Field(
        ...,
        validation_alias=AliasChoices("id_sesion_inscripcion", "id_sesion")
    )
    fecha_inscripcion: datetime
    asistio_inscripcion: Optional[bool] = Field(
        default=None,
        validation_alias=AliasChoices("asistio_inscripcion", "asistio")
    )
    observaciones_inscripcion: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("observaciones_inscripcion", "observaciones")
    )
    estado_inscripcion: str = Field(
        default="Inscrito",
        validation_alias=AliasChoices("estado_inscripcion", "estado")
    )

    @computed_field
    def id_socio(self) -> int:
        return self.id_socio_inscripcion

    @computed_field
    def id_sesion(self) -> int:
        return self.id_sesion_inscripcion

    @computed_field
    def asistio(self) -> Optional[bool]:
        return self.asistio_inscripcion

    @computed_field
    def observaciones(self) -> Optional[str]:
        return self.observaciones_inscripcion

    @computed_field
    def estado(self) -> str:
        return self.estado_inscripcion

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# PERSONA 3: Membresías, Contratos y Pagos
# Sincronizado con tablas: [dbo].[PlanMembresia], [dbo].[Contrato], [dbo].[Pago]
# =========================================================================

class PlanMembresiaBase(BaseModel):
    nombre_planmembresia: str = Field(
        ..., 
        max_length=100, 
        example="Plan Mensual Smart",
        validation_alias=AliasChoices("nombre_planmembresia", "nombre")
    )
    duracion_meses_planmembresia: int = Field(
        ..., 
        gt=0, 
        example=1,
        validation_alias=AliasChoices("duracion_meses_planmembresia", "duracion_meses")
    )
    precio_vigente_planmembresia: float = Field(
        ..., 
        ge=0, 
        example=29990.00,
        validation_alias=AliasChoices("precio_vigente_planmembresia", "precio_vigente")
    )

    @computed_field
    def nombre(self) -> str:
        return self.nombre_planmembresia

    @computed_field
    def duracion_meses(self) -> int:
        return self.duracion_meses_planmembresia

    @computed_field
    def precio_vigente(self) -> float:
        return self.precio_vigente_planmembresia

class PlanMembresiaResponse(PlanMembresiaBase):
    id_planmembresia: int = Field(
        ...,
        validation_alias=AliasChoices("id_planmembresia", "id_plan")
    )

    @computed_field
    def id_plan(self) -> int:
        return self.id_planmembresia

    model_config = ConfigDict(from_attributes=True)

class ContratoCreate(BaseModel):
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
    fecha_inicio_contrato: date = Field(
        ...,
        validation_alias=AliasChoices("fecha_inicio_contrato", "fecha_inicio")
    )
    fecha_termino_contrato: date = Field(
        ...,
        validation_alias=AliasChoices("fecha_termino_contrato", "fecha_termino")
    )
    precio_pactado_contrato: float = Field(
        ..., 
        ge=0, 
        example=29990.00,
        validation_alias=AliasChoices("precio_pactado_contrato", "precio_pactado")
    )
    estado_contrato: Literal["Vigente", "Vencido", "Cancelado"] = Field(
        default="Vigente",
        validation_alias=AliasChoices("estado_contrato", "estado")
    )

    @computed_field
    def id_socio(self) -> int:
        return self.id_socio_contrato

    @computed_field
    def id_plan(self) -> int:
        return self.id_planmembresia_contrato

    @computed_field
    def fecha_inicio(self) -> date:
        return self.fecha_inicio_contrato

    @computed_field
    def fecha_termino(self) -> date:
        return self.fecha_termino_contrato

    @computed_field
    def precio_pactado(self) -> float:
        return self.precio_pactado_contrato

    @computed_field
    def estado(self) -> str:
        return self.estado_contrato

class ContratoResponse(BaseModel):
    id_contrato: int
    id_socio_contrato: int = Field(
        ...,
        validation_alias=AliasChoices("id_socio_contrato", "id_socio")
    )
    id_planmembresia_contrato: int = Field(
        ...,
        validation_alias=AliasChoices("id_planmembresia_contrato", "id_plan", "id_planmembresia")
    )
    fecha_inicio_contrato: date = Field(
        ...,
        validation_alias=AliasChoices("fecha_inicio_contrato", "fecha_inicio")
    )
    fecha_termino_contrato: date = Field(
        ...,
        validation_alias=AliasChoices("fecha_termino_contrato", "fecha_termino")
    )
    estado_contrato: str = Field(
        ...,
        validation_alias=AliasChoices("estado_contrato", "estado")
    )
    precio_pactado_contrato: float = Field(
        ...,
        validation_alias=AliasChoices("precio_pactado_contrato", "precio_pactado")
    )

    @computed_field
    def id_socio(self) -> int:
        return self.id_socio_contrato

    @computed_field
    def id_plan(self) -> int:
        return self.id_planmembresia_contrato

    @computed_field
    def fecha_inicio(self) -> date:
        return self.fecha_inicio_contrato

    @computed_field
    def fecha_termino(self) -> date:
        return self.fecha_termino_contrato

    @computed_field
    def estado(self) -> str:
        return self.estado_contrato

    @computed_field
    def precio_pactado(self) -> float:
        return self.precio_pactado_contrato

    model_config = ConfigDict(from_attributes=True)

class PagoCreate(BaseModel):
    id_contrato_pago: int = Field(
        ..., 
        gt=0,
        validation_alias=AliasChoices("id_contrato_pago", "id_contrato")
    )
    monto_cancelado_pago: float = Field(
        ..., 
        gt=0, 
        example=29990.00,
        validation_alias=AliasChoices("monto_cancelado_pago", "monto_cancelado", "monto")
    )
    medio_pago: Literal["Transferencia", "Tarjeta", "Efectivo"] = Field(
        default="Transferencia",
        validation_alias=AliasChoices("medio_pago", "metodo_pago")
    )

    @computed_field
    def id_contrato(self) -> int:
        return self.id_contrato_pago

    @computed_field
    def monto_cancelado(self) -> float:
        return self.monto_cancelado_pago

class PagoResponse(BaseModel):
    id_pago: int
    id_contrato_pago: int = Field(
        ...,
        validation_alias=AliasChoices("id_contrato_pago", "id_contrato")
    )
    fecha_pago: datetime
    monto_cancelado_pago: float = Field(
        ...,
        validation_alias=AliasChoices("monto_cancelado_pago", "monto_cancelado")
    )
    medio_pago: str

    @computed_field
    def id_contrato(self) -> int:
        return self.id_contrato_pago

    @computed_field
    def monto_cancelado(self) -> float:
        return self.monto_cancelado_pago

    model_config = ConfigDict(from_attributes=True)
