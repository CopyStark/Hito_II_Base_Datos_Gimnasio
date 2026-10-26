"""
Schemas Pydantic – Módulo Clases (Persona 2)
============================================
Modelos de entrada/salida para los endpoints del router de clases.
Todos los nombres de campo siguen la convención del DDL (sufijo = nombre de tabla).

Tablas implicadas : Clase, Sesion, Inscripcion
Vistas implicadas : vw_Sesiones_Disponibles, vw_Reporte_Ocupacion_Clases,
                    vw_Ranking_Clases_Demandadas
SPs implicados    : sp_Inscribir_Socio, sp_Cancelar_Inscripcion,
                    sp_Registrar_Asistencia, sp_Programar_Sesion
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, AliasChoices


# ---------------------------------------------------------------------------
# 1. Sesiones disponibles (vw_Sesiones_Disponibles) – respuesta
# ---------------------------------------------------------------------------

class SesionDisponibleResponse(BaseModel):
    """
    Fila devuelta por la vista vw_Sesiones_Disponibles.
    Todos los campos tienen el mismo nombre que las columnas de la vista.
    """
    id_sesion: int
    nombre_clase: str
    nivel_exigencia_clase: str
    duracion_minutos_clase: int
    nombre_sede: str
    # nombre_completo_instructor puede ser NULL si id_instructor_sesion es NULL
    nombre_completo_instructor: Optional[str] = None
    fecha_sesion: date
    # hora_sesion llega como timedelta/str desde pyodbc → siempre se serializa como str
    hora_sesion: str
    cupo_maximo_sesion: int
    total_inscritos: int
    cupos_disponibles: int


# ---------------------------------------------------------------------------
# 2. Inscripción mediante SP – request / response
# ---------------------------------------------------------------------------

class InscribirSocioRequest(BaseModel):
    """
    Body para POST /clases/inscripciones.
    TODO: cuando se implemente autenticación, id_socio_inscripcion se obtendrá
          del token JWT y no deberá enviarse en el body.
    """
    # TODO: extraer id_socio_inscripcion del token JWT cuando exista autenticación
    id_socio_inscripcion: int = Field(
        ...,
        gt=0,
        description="ID del socio que se inscribe (temporal: llega en el body).",
        examples=[1],
    )
    id_sesion_inscripcion: int = Field(
        ...,
        gt=0,
        description="ID de la sesión a la que se inscribe el socio.",
        examples=[5],
    )


class InscripcionCreadaResponse(BaseModel):
    """
    Respuesta mínima tras ejecutar sp_Inscribir_Socio exitosamente.
    El SP devuelve únicamente el id_inscripcion generado.
    """
    id_inscripcion: int


# ---------------------------------------------------------------------------
# 3. Cancelación de inscripción – request / response
# ---------------------------------------------------------------------------

class CancelarInscripcionRequest(BaseModel):
    """
    Body para PATCH /clases/inscripciones/{id}/cancelar.
    TODO: extraer id_socio del token JWT cuando exista autenticación.
    """
    # TODO: extraer id_socio del token JWT cuando exista autenticación
    id_socio: int = Field(
        ...,
        gt=0,
        description="ID del socio propietario de la inscripción (temporal: llega en el body).",
        examples=[1],
    )


class CancelacionResponse(BaseModel):
    """Respuesta tras cancelar una inscripción."""
    id_inscripcion: int
    estado_inscripcion: str  # siempre 'Cancelado' si tuvo éxito


# ---------------------------------------------------------------------------
# 4. Registro de asistencia – request / response
# ---------------------------------------------------------------------------

class RegistrarAsistenciaRequest(BaseModel):
    """Body para PATCH /clases/inscripciones/{id}/asistencia."""
    asistio: bool = Field(
        ...,
        description="True = el socio asistió; False = no asistió.",
    )
    observaciones_inscripcion: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Observaciones opcionales (columna observaciones_inscripcion).",
    )


class AsistenciaResponse(BaseModel):
    """Respuesta tras registrar asistencia."""
    id_inscripcion: int
    asistio_inscripcion: bool  # nombre de columna real en la tabla Inscripcion


# ---------------------------------------------------------------------------
# 5. Programar sesión – request / response
# ---------------------------------------------------------------------------

class ProgramarSesionRequest(BaseModel):
    """Body para POST /clases/sesiones. Llama a sp_Programar_Sesion."""
    id_clase_sesion: int = Field(
        ..., gt=0, description="ID de la clase (FK -> Clase.id_clase).", examples=[2]
    )
    id_sede_sesion: int = Field(
        ..., gt=0, description="ID de la sede (FK -> Sede.id_sede).", examples=[1]
    )
    # id_instructor_sesion es NULL-able en el DDL (sesión sin instructor asignado)
    id_instructor_sesion: Optional[int] = Field(
        default=None,
        gt=0,
        description="ID del instructor (opcional; None = sin instructor asignado).",
        examples=[3],
    )
    fecha_sesion: date = Field(
        ..., description="Fecha de la sesión (debe ser futura).", examples=["2027-01-15"]
    )
    hora_sesion: str = Field(
        ...,
        description="Hora de inicio en formato HH:MM o HH:MM:SS.",
        examples=["09:00:00"],
        pattern=r"^\d{2}:\d{2}(:\d{2})?$",
    )
    cupo_maximo_sesion: int = Field(
        ..., gt=0, description="Número máximo de inscritos.", examples=[20]
    )


class SesionCreadaResponse(BaseModel):
    """Respuesta tras ejecutar sp_Programar_Sesion exitosamente."""
    id_sesion: int


# ---------------------------------------------------------------------------
# 6. Lista de inscritos en una sesión – response
# ---------------------------------------------------------------------------

class InscritoEnSesionResponse(BaseModel):
    """
    Fila del JOIN Inscripcion x Socio para el endpoint
    GET /clases/sesiones/{id}/inscritos.
    Devuelve columnas de ambas tablas con sus nombres reales del DDL.
    """
    id_inscripcion: int
    id_socio_inscripcion: int
    nombre_completo_socio: str
    correo_socio: str
    telefono_socio: str
    fecha_inscripcion: datetime
    estado_inscripcion: str
    asistio_inscripcion: Optional[bool] = None
    observaciones_inscripcion: Optional[str] = None


# ---------------------------------------------------------------------------
# 7. Reportes – responses
# ---------------------------------------------------------------------------

class OcupacionClaseItem(BaseModel):
    """
    Fila de la vista vw_Reporte_Ocupacion_Clases.
    Columnas idénticas a las que devuelve la vista.
    """
    id_sesion: int
    nombre_clase: str
    nombre_sede: str
    fecha_sesion: date
    hora_sesion: str
    cupo_maximo_sesion: int
    total_inscritos: int
    cupos_disponibles: int


class RankingClaseItem(BaseModel):
    """
    Fila de la vista vw_Ranking_Clases_Demandadas.
    Columnas idénticas a las que devuelve la vista.
    """
    nombre_clase: str
    nivel_exigencia_clase: str
    total_inscripciones: int


# ---------------------------------------------------------------------------
# 8. Instructores, Equipamiento y Detalle de Inscripción – responses & requests
# ---------------------------------------------------------------------------

class InstructorItemResponse(BaseModel):
    id_instructor: int
    rut_instructor: str
    nombre_completo_instructor: str
    correo_instructor: str
    telefono_instructor: str
    id_sede_habitual_instructor: int
    nombre_sede: Optional[str] = None


class SesionInstructorResponse(BaseModel):
    id_sesion: int
    nombre_clase: str
    nombre_sede: str
    fecha: date = Field(..., validation_alias=AliasChoices("fecha", "fecha_sesion"))
    hora: str = Field(..., validation_alias=AliasChoices("hora", "hora_sesion"))
    cupo_maximo_sesion: int
    total_inscritos: int


class EquipamientoItemResponse(BaseModel):
    id_equipamiento: int
    nombre_descriptivo_equipamiento: str
    nombre_sede: str
    id_sede_equipamiento: int
    fecha_adquisicion_equipamiento: date
    antiguedad_anios: int


class EquipamientoCreateRequest(BaseModel):
    id_sede_equipamiento: int = Field(..., gt=0, validation_alias=AliasChoices("id_sede_equipamiento", "id_sede"))
    nombre_descriptivo_equipamiento: str = Field(..., min_length=1, max_length=150, validation_alias=AliasChoices("nombre_descriptivo_equipamiento", "nombre"))
    fecha_adquisicion_equipamiento: date = Field(..., validation_alias=AliasChoices("fecha_adquisicion_equipamiento", "fecha_adquisicion"))


class EquipamientoCreadoResponse(BaseModel):
    id_equipamiento: int


class EquipamientoUpdateRequest(BaseModel):
    nombre_descriptivo_equipamiento: str = Field(..., min_length=1, max_length=150, validation_alias=AliasChoices("nombre_descriptivo_equipamiento", "nombre"))
    fecha_adquisicion_equipamiento: date = Field(..., validation_alias=AliasChoices("fecha_adquisicion_equipamiento", "fecha_adquisicion"))


class EquipamientoOperacionResponse(BaseModel):
    id_equipamiento: int
    mensaje: str = "Operación realizada exitosamente"


class InscripcionSocioDetalleResponse(BaseModel):
    id_inscripcion: int
    id_socio_inscripcion: int
    id_sesion_inscripcion: int
    id_clase: int
    nombre_clase: str
    duracion_minutos_clase: int
    nivel_exigencia_clase: str
    id_sede: int
    nombre_sede: str
    fecha_sesion: date
    hora_sesion: str
    cupo_maximo_sesion: int
    fecha_inscripcion: datetime
    estado_inscripcion: str
    asistio_inscripcion: Optional[bool] = None
    observaciones_inscripcion: Optional[str] = None

