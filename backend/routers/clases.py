"""
Router – Módulo Clases, Sesiones e Inscripciones (Persona 2)
=============================================================
Prefijo registrado en el router : /clases   (definido aquí abajo)
Prefijo en main.py               : ninguno adicional (app.include_router sin prefix)

Tablas principales : Clase, Sesion, Inscripcion
Consultas a        : Socio, vw_Sesiones_Disponibles,
                     vw_Reporte_Ocupacion_Clases, vw_Ranking_Clases_Demandadas
SPs utilizados     : sp_Inscribir_Socio, sp_Cancelar_Inscripcion,
                     sp_Registrar_Asistencia, sp_Programar_Sesion

REGLAS DEL PROYECTO:
  1. Prohibido ORM: todo SQL es explícito y parametrizado con '?' (pyodbc).
  2. Nunca usar f-strings con datos del usuario.
  3. Inyectar conexión con get_db_connection() (context manager con commit automático).
  4. Capturar pyodbc.Error y traducir códigos THROW del SP:
       50010 -> HTTP 404  (no encontrado)
       50020 -> HTTP 409  (conflicto: cupo lleno, ya inscrito)
       50030 -> HTTP 400  (regla de negocio inválida)
       otro  -> HTTP 500  (mensaje genérico, sin exponer detalles internos)

CÓDIGOS DE ERROR DE LOS SP (definidos en sp_clases.sql):
  50010 = No encontrado
  50020 = Conflicto (cupo lleno, socio ya inscrito)
  50030 = Regla de negocio / dato inválido
"""

import logging
from datetime import date
from typing import List, Optional
import pyodbc
from fastapi import APIRouter, HTTPException, Query, status

# ── Importaciones con fallback para ejecución directa vs. desde uvicorn ──────
try:
    from backend.db.connection import get_db_connection
    from backend.schemas import ClaseResponse, SedeSimpleResponse
    try:
        from backend.schemas.clases import (
            SesionDisponibleResponse,
            InscribirSocioRequest,
            InscripcionCreadaResponse,
            CancelarInscripcionRequest,
            CancelacionResponse,
            RegistrarAsistenciaRequest,
            AsistenciaResponse,
            ProgramarSesionRequest,
            SesionCreadaResponse,
            InscritoEnSesionResponse,
            OcupacionClaseItem,
            RankingClaseItem,
            SedeSimpleResponse,
            InstructorItemResponse,
            SesionInstructorResponse,
            EquipamientoItemResponse,
            EquipamientoCreateRequest,
            EquipamientoCreadoResponse,
            EquipamientoUpdateRequest,
            EquipamientoOperacionResponse,
            InscripcionSocioDetalleResponse,
        )
    except ImportError:
        try:
            from backend.schemas.clases import (
                SesionDisponibleResponse,
                InscribirSocioRequest,
                InscripcionCreadaResponse,
                CancelarInscripcionRequest,
                CancelacionResponse,
                RegistrarAsistenciaRequest,
                AsistenciaResponse,
                ProgramarSesionRequest,
                SesionCreadaResponse,
                InscritoEnSesionResponse,
                OcupacionClaseItem,
                RankingClaseItem,
                InstructorItemResponse,
            )
        except ImportError:
            from backend.schemas.clases import (
                SesionDisponibleResponse,
                InscribirSocioRequest,
                InscripcionCreadaResponse,
                CancelarInscripcionRequest,
                CancelacionResponse,
                RegistrarAsistenciaRequest,
                AsistenciaResponse,
                ProgramarSesionRequest,
                SesionCreadaResponse,
                InscritoEnSesionResponse,
                OcupacionClaseItem,
                RankingClaseItem,
            )
        from datetime import datetime
        from pydantic import BaseModel, Field, AliasChoices

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
except ImportError:
    from db.connection import get_db_connection
    from schemas import ClaseResponse, SedeSimpleResponse
    try:
        from schemas.clases import (
            SesionDisponibleResponse,
            InscribirSocioRequest,
            InscripcionCreadaResponse,
            CancelarInscripcionRequest,
            CancelacionResponse,
            RegistrarAsistenciaRequest,
            AsistenciaResponse,
            ProgramarSesionRequest,
            SesionCreadaResponse,
            InscritoEnSesionResponse,
            OcupacionClaseItem,
            RankingClaseItem,
            SedeSimpleResponse,
            InstructorItemResponse,
            SesionInstructorResponse,
            EquipamientoItemResponse,
            EquipamientoCreateRequest,
            EquipamientoCreadoResponse,
            EquipamientoUpdateRequest,
            EquipamientoOperacionResponse,
            InscripcionSocioDetalleResponse,
        )
    except ImportError:
        try:
            from schemas.clases import (
                SesionDisponibleResponse,
                InscribirSocioRequest,
                InscripcionCreadaResponse,
                CancelarInscripcionRequest,
                CancelacionResponse,
                RegistrarAsistenciaRequest,
                AsistenciaResponse,
                ProgramarSesionRequest,
                SesionCreadaResponse,
                InscritoEnSesionResponse,
                OcupacionClaseItem,
                RankingClaseItem,
                InstructorItemResponse,
            )
        except ImportError:
            from schemas.clases import (
                SesionDisponibleResponse,
                InscribirSocioRequest,
                InscripcionCreadaResponse,
                CancelarInscripcionRequest,
                CancelacionResponse,
                RegistrarAsistenciaRequest,
                AsistenciaResponse,
                ProgramarSesionRequest,
                SesionCreadaResponse,
                InscritoEnSesionResponse,
                OcupacionClaseItem,
                RankingClaseItem,
            )
        from datetime import datetime
        from pydantic import BaseModel, Field, AliasChoices

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

# ── Definición del router ──────────────────────────────────────────────────
# prefix="/clases" es el único prefijo; main.py NO añade ninguno adicional.
router = APIRouter(
    prefix="/clases",
    tags=["Persona 2 – Clases & Sesiones"],
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: traducir el número de error de un THROW de SQL Server a HTTP status
# ─────────────────────────────────────────────────────────────────────────────
def _sp_error_to_http(exc: pyodbc.Error) -> HTTPException:
    """
    Convierte un pyodbc.Error que proviene de un THROW del SP en un
    HTTPException con el código HTTP apropiado.

    SQL Server devuelve el número de error en exc.args[1] como parte
    del mensaje con el formato: '[SQL Server]<mensaje> (NNNNN) ...'.
    Extraemos el número buscando el patrón '(NNNNN)'.

    Códigos definidos en sp_clases.sql y sp_equipos.sql:
      50010 -> 404 Not Found
      50020 -> 409 Conflict
      50030 -> 400 Bad Request
      otro  -> 500 Internal Server Error (mensaje genérico + logging.exception)
    """
    # El mensaje completo de pyodbc incluye el número entre paréntesis.
    msg_completo = str(exc)

    # Extraer número de error buscando el patrón '(NNNNN)'
    numero_error: Optional[int] = None
    import re
    match = re.search(r"\((\d+)\)", msg_completo)
    if match:
        numero_error = int(match.group(1))

    # Intentar obtener el mensaje limpio del SP (entre corchetes y la coma)
    # Ejemplo: "[SQL Server]Socio no encontrado. (50010) (SQLExecDirectW)"
    msg_sp = msg_completo  # fallback: mensaje completo
    partes = msg_completo.split("]")
    if len(partes) > 1:
        # Tomar la parte tras el último ']', limpiar el número y el driver
        msg_sp = partes[-1].split("(")[0].strip().rstrip(",").strip()

    if numero_error == 50010:
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg_sp)
    if numero_error == 50020:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg_sp)
    if numero_error == 50030:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg_sp)

    # Error desconocido: registro con logging.exception y respuesta 500 sin exponer detalles
    logging.exception("Error de base de datos no controlado: %s", exc)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error interno en la base de datos. Contacte al administrador.",
    )


def _row_to_dict(cursor, row) -> dict:
    """
    Convierte una fila de pyodbc en dict usando los nombres de columna
    del cursor.description. Serializa timedelta (TIME de SQL Server) a str.
    """
    import datetime
    cols = [col[0] for col in cursor.description]
    item = dict(zip(cols, row))
    # pyodbc devuelve TIME como datetime.timedelta → convertir a "HH:MM:SS"
    for k, v in item.items():
        if isinstance(v, datetime.timedelta):
            total = int(v.total_seconds())
            hh, rest = divmod(total, 3600)
            mm, ss = divmod(rest, 60)
            item[k] = f"{hh:02d}:{mm:02d}:{ss:02d}"
    return item


# =============================================================================
# ENDPOINT 1: GET /clases
# Catálogo completo de disciplinas desde la tabla Clase
# =============================================================================
@router.get(
    "/",
    response_model=List[ClaseResponse],
    summary="Catálogo de clases",
    description="Devuelve todas las disciplinas registradas en la tabla Clase.",
)
def listar_clases():
    """
    SELECT directo sobre la tabla Clase.
    Sin filtros: devuelve todas las clases ordenadas alfabéticamente.
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # SQL parametrizado (sin parámetros de usuario aquí, tabla fija)
                cursor.execute(
                    """
                    SELECT id_clase,
                           nombre_clase,
                           duracion_minutos_clase,
                           nivel_exigencia_clase
                    FROM   Clase
                    ORDER  BY nombre_clase ASC
                    """
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 2: GET /clases/sesiones
# Consulta vw_Sesiones_Disponibles con filtros opcionales
# =============================================================================
@router.get(
    "/sesiones",
    response_model=List[SesionDisponibleResponse],
    summary="Sesiones disponibles (con filtros opcionales)",
    description=(
        "Consulta la vista vw_Sesiones_Disponibles. "
        "Acepta filtros opcionales: fecha (= fecha_sesion), "
        "id_sede (= id_sede_sesion en Sesion) e id_clase (= id_clase_sesion en Sesion). "
        "Los filtros se aplican con AND."
    ),
)
def listar_sesiones_disponibles(
    # Query params opcionales; los nombres de parámetro son amigables para el
    # consumidor de la API, pero internamente se comparan con las columnas reales.
    fecha: Optional[str] = Query(
        default=None,
        description="Filtrar por fecha_sesion (formato YYYY-MM-DD).",
        example="2027-01-15",
    ),
    id_sede: Optional[int] = Query(
        default=None,
        gt=0,
        description="Filtrar por id_sede_sesion.",
    ),
    id_clase: Optional[int] = Query(
        default=None,
        gt=0,
        description="Filtrar por id_clase_sesion.",
    ),
):
    """
    Construye la cláusula WHERE dinámicamente de forma segura (solo '?').
    Nunca se usan f-strings con valores del usuario.
    """
    # Construcción dinámica y segura del WHERE
    condiciones = []   # lista de strings con placeholders
    parametros  = []   # lista de valores en el mismo orden

    if fecha is not None:
        # La columna de la vista se llama fecha_sesion (viene de Sesion)
        condiciones.append("fecha_sesion = ?")
        parametros.append(fecha)

    if id_sede is not None:
        # La vista expone nombre_sede pero el filtro es sobre la columna base;
        # como la vista agrupa por id_sesion, necesitamos filtrar por la columna
        # id_sede_sesion que NO está en la vista.  Solución: sub-select o JOIN.
        # Optamos por filtrar directamente desde la tabla Sesion con una subconsulta.
        # Esto es más preciso que filtrar por nombre_sede (no es FK).
        condiciones.append(
            "id_sesion IN (SELECT id_sesion FROM Sesion WHERE id_sede_sesion = ?)"
        )
        parametros.append(id_sede)

    if id_clase is not None:
        condiciones.append(
            "id_sesion IN (SELECT id_sesion FROM Sesion WHERE id_clase_sesion = ?)"
        )
        parametros.append(id_clase)

    # Ensamblar la cláusula WHERE solo si hay al menos un filtro
    where_clause = ""
    if condiciones:
        # Unimos con AND; cada condición usa '?' sin interpolar datos del usuario
        where_clause = "WHERE " + " AND ".join(condiciones)

    sql = f"""
        SELECT id_sesion,
               nombre_clase,
               nivel_exigencia_clase,
               duracion_minutos_clase,
               nombre_sede,
               nombre_completo_instructor,
               fecha_sesion,
               CONVERT(VARCHAR(8), hora_sesion, 108) AS hora_sesion,
               cupo_maximo_sesion,
               total_inscritos,
               cupos_disponibles
        FROM   vw_Sesiones_Disponibles
        {where_clause}
        ORDER  BY fecha_sesion ASC, hora_sesion ASC
    """
    # NOTA: where_clause solo contiene nombres de columna y '?' —
    # nunca contiene datos del usuario directamente.

    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, parametros)
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 3: POST /clases/inscripciones
# Inscribir un socio en una sesión mediante sp_Inscribir_Socio
# =============================================================================
@router.post(
    "/inscripciones",
    response_model=InscripcionCreadaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Inscribir socio en sesión",
    description=(
        "Ejecuta sp_Inscribir_Socio. El SP valida: socio activo, sesión futura, "
        "contrato vigente, cupo disponible y que el socio no esté ya inscrito. "
        "Devuelve el id_inscripcion generado."
    ),
)
def inscribir_socio(body: InscribirSocioRequest):
    """
    EXEC sp_Inscribir_Socio @id_socio = ?, @id_sesion = ?

    El SP usa UPDLOCK + HOLDLOCK para evitar overbooking concurrente.
    Los errores 50010/50020/50030 se traducen a 404/409/400 respectivamente.

    TODO: cuando exista autenticación, extraer id_socio_inscripcion del token JWT.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Llamada parametrizada al SP; nunca se interpolan datos del body
                cursor.execute(
                    "EXEC sp_Inscribir_Socio ?, ?",
                    (body.id_socio_inscripcion, body.id_sesion_inscripcion),
                )
                # El SP devuelve un SELECT con id_inscripcion
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return {"id_inscripcion": row[0]}
    except HTTPException:
        raise  # re-lanzar sin envolver
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 4: PATCH /clases/inscripciones/{id}/cancelar
# Cancelar una inscripción mediante sp_Cancelar_Inscripcion
# =============================================================================
@router.patch(
    "/inscripciones/{id_inscripcion}/cancelar",
    response_model=CancelacionResponse,
    summary="Cancelar inscripción",
    description=(
        "Ejecuta sp_Cancelar_Inscripcion. Válida que la inscripción pertenezca "
        "al socio indicado, esté en estado 'Inscrito' y la sesión sea futura. "
        "Cambia estado_inscripcion a 'Cancelado'."
    ),
)
def cancelar_inscripcion(id_inscripcion: int, body: CancelarInscripcionRequest):
    """
    EXEC sp_Cancelar_Inscripcion @id_inscripcion = ?, @id_socio = ?

    id_inscripcion viene de la URL (path param).
    id_socio viene del body.

    TODO: cuando exista autenticación, extraer id_socio del token JWT.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Cancelar_Inscripcion ?, ?",
                    (id_inscripcion, body.id_socio),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return _row_to_dict(cursor, row)
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 5: GET /clases/sesiones/{id}/inscritos
# Lista de socios inscritos en una sesión (JOIN Inscripcion x Socio)
# =============================================================================
@router.get(
    "/sesiones/{id_sesion}/inscritos",
    response_model=List[InscritoEnSesionResponse],
    summary="Inscritos en una sesión",
    description=(
        "Devuelve los socios con inscripción activa ('Inscrito') en la sesión indicada. "
        "JOIN entre Inscripcion y Socio usando los nombres de columna del DDL."
    ),
)
def listar_inscritos_en_sesion(id_sesion: int):
    """
    JOIN Inscripcion x Socio filtrado por id_sesion_inscripcion y estado_inscripcion.
    Solo columnas necesarias para no exponer datos sensibles innecesarios.
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT i.id_inscripcion,
                           i.id_socio_inscripcion,
                           s.nombre_completo_socio,
                           s.correo_socio,
                           s.telefono_socio,
                           i.fecha_inscripcion,
                           i.estado_inscripcion,
                           i.asistio_inscripcion,
                           i.observaciones_inscripcion
                    FROM   Inscripcion AS i
                    INNER  JOIN Socio AS s
                           ON i.id_socio_inscripcion = s.id_socio
                    WHERE  i.id_sesion_inscripcion = ?
                      AND  i.estado_inscripcion    = 'Inscrito'
                    ORDER  BY i.fecha_inscripcion ASC
                    """,
                    (id_sesion,),   # parametrizado: nunca f-string con id_sesion
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 6: PATCH /clases/inscripciones/{id}/asistencia
# Registrar asistencia mediante sp_Registrar_Asistencia
# =============================================================================
@router.patch(
    "/inscripciones/{id_inscripcion}/asistencia",
    response_model=AsistenciaResponse,
    summary="Registrar asistencia",
    description=(
        "Ejecuta sp_Registrar_Asistencia. Solo opera sobre inscripciones en estado "
        "'Inscrito'. Actualiza asistio_inscripcion y observaciones_inscripcion."
    ),
)
def registrar_asistencia(id_inscripcion: int, body: RegistrarAsistenciaRequest):
    """
    EXEC sp_Registrar_Asistencia @id_inscripcion = ?,
                                  @asistio        = ?,
                                  @observaciones  = ?

    id_inscripcion viene de la URL.
    asistio y observaciones_inscripcion vienen del body.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Registrar_Asistencia ?, ?, ?",
                    (
                        id_inscripcion,
                        1 if body.asistio else 0,        # BIT: 1 o 0
                        body.observaciones_inscripcion,   # puede ser None → NULL
                    ),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return _row_to_dict(cursor, row)
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 7: POST /clases/sesiones
# Programar una nueva sesión mediante sp_Programar_Sesion
# =============================================================================
@router.post(
    "/sesiones",
    response_model=SesionCreadaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Programar nueva sesión",
    description=(
        "Ejecuta sp_Programar_Sesion. Valida que clase, sede e instructor (opcional) "
        "existan, que la fecha+hora sean futuras y que el cupo sea > 0. "
        "Devuelve el id_sesion creado."
    ),
)
def programar_sesion(body: ProgramarSesionRequest):
    """
    EXEC sp_Programar_Sesion @id_clase      = ?,
                              @id_sede       = ?,
                              @id_instructor = ?,   -- puede ser NULL
                              @fecha         = ?,
                              @hora          = ?,
                              @cupo          = ?

    id_instructor_sesion es Optional; se pasa None → SQL Server lo trata como NULL.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Programar_Sesion ?, ?, ?, ?, ?, ?",
                    (
                        body.id_clase_sesion,
                        body.id_sede_sesion,
                        body.id_instructor_sesion,  # None -> NULL en SQL Server
                        body.fecha_sesion,
                        body.hora_sesion,
                        body.cupo_maximo_sesion,
                    ),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return {"id_sesion": row[0]}
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 8: GET /clases/reportes/ocupacion
# Reporte de ocupación usando vw_Reporte_Ocupacion_Clases
# =============================================================================
@router.get(
    "/reportes/ocupacion",
    response_model=List[OcupacionClaseItem],
    summary="Reporte de ocupación de clases",
    description=(
        "Consulta la vista vw_Reporte_Ocupacion_Clases (definida en el DDL). "
        "Muestra id_sesion, clase, sede, fecha/hora, cupo máximo, inscritos y cupos libres."
    ),
)
def reporte_ocupacion_clases():
    """
    SELECT directo sobre la vista; sin parámetros de usuario → sin riesgo de inyección.
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id_sesion,
                           nombre_clase,
                           nombre_sede,
                           fecha_sesion,
                           hora_sesion,
                           cupo_maximo_sesion,
                           total_inscritos,
                           cupos_disponibles
                    FROM   vw_Reporte_Ocupacion_Clases
                    ORDER  BY fecha_sesion ASC, hora_sesion ASC
                    """
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 9: GET /clases/reportes/ranking
# Ranking de clases más demandadas usando vw_Ranking_Clases_Demandadas
# =============================================================================
@router.get(
    "/reportes/ranking",
    response_model=List[RankingClaseItem],
    summary="Ranking de clases más demandadas",
    description=(
        "Consulta la vista vw_Ranking_Clases_Demandadas (definida en el DDL). "
        "Devuelve nombre, nivel y total de inscripciones activas por clase."
    ),
)
def reporte_ranking_clases():
    """
    SELECT directo sobre la vista; sin parámetros de usuario → sin riesgo de inyección.
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT nombre_clase,
                           nivel_exigencia_clase,
                           total_inscripciones
                    FROM   vw_Ranking_Clases_Demandadas
                    ORDER  BY total_inscripciones DESC
                    """
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 10: GET /clases/sedes
# Listado completo de sedes para selectores y gestión
# =============================================================================
@router.get(
    "/sedes",
    response_model=List[SedeSimpleResponse],
    summary="Listado de sedes",
    description="Devuelve todas las sedes del gimnasio junto con el nombre de su ciudad.",
)
def listar_sedes():
    """
    SELECT directo sobre la tabla Sede con INNER JOIN a Ciudad.
    Sin parámetros de usuario; ordenado alfabéticamente por nombre_sede.
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT s.id_sede,
                           s.nombre_sede,
                           s.direccion_calle_sede,
                           s.id_ciudad_sede,
                           s.telefono_sede,
                           c.nombre_ciudad
                    FROM   Sede AS s
                    INNER JOIN Ciudad AS c ON s.id_ciudad_sede = c.id_ciudad
                    ORDER  BY s.nombre_sede ASC
                    """
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 11: GET /clases/instructores
# Listado de instructores con filtro opcional por sede habitual
# =============================================================================
@router.get(
    "/instructores",
    response_model=List[InstructorItemResponse],
    summary="Listado de instructores",
    description=(
        "Devuelve instructores registrados en la tabla Instructor. "
        "Acepta filtro opcional por sede habitual (id_sede)."
    ),
)
def listar_instructores(
    id_sede: Optional[int] = Query(
        default=None,
        gt=0,
        description="Filtrar por id_sede_habitual_instructor.",
    ),
):
    """
    SELECT sobre la tabla Instructor con INNER JOIN a Sede.
    Construye la cláusula WHERE de forma parametrizada con '?' evitando SQL injection.
    """
    condiciones = []
    parametros = []

    if id_sede is not None:
        condiciones.append("i.id_sede_habitual_instructor = ?")
        parametros.append(id_sede)

    where_clause = ""
    if condiciones:
        where_clause = "WHERE " + " AND ".join(condiciones)

    sql = f"""
        SELECT i.id_instructor,
               i.rut_instructor,
               i.nombre_completo_instructor,
               i.correo_instructor,
               i.telefono_instructor,
               i.id_sede_habitual_instructor,
               s.nombre_sede
        FROM   Instructor AS i
        INNER JOIN Sede AS s ON i.id_sede_habitual_instructor = s.id_sede
        {where_clause}
        ORDER  BY i.nombre_completo_instructor ASC
    """

    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, parametros)
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 12: GET /clases/instructores/{id}/sesiones
# Sesiones de un instructor mediante sp_Sesiones_Por_Instructor
# =============================================================================
@router.get(
    "/instructores/{id_instructor}/sesiones",
    response_model=List[SesionInstructorResponse],
    summary="Sesiones asignadas a un instructor",
    description=(
        "Ejecuta sp_Sesiones_Por_Instructor. Lista sesiones (pasadas y futuras) "
        "asignadas al instructor, con total de inscritos activos ('Inscrito'). "
        "Acepta filtro opcional por rango de fechas (desde, hasta)."
    ),
)
def listar_sesiones_instructor(
    id_instructor: int,
    desde: Optional[date] = Query(
        default=None,
        description="Fecha mínima del filtro (YYYY-MM-DD).",
    ),
    hasta: Optional[date] = Query(
        default=None,
        description="Fecha máxima del filtro (YYYY-MM-DD).",
    ),
):
    """
    EXEC sp_Sesiones_Por_Instructor @id_instructor = ?, @desde = ?, @hasta = ?

    Llama al procedimiento parametrizado con pyodbc.
    Captura y traduce códigos de error THROW (50010 -> 404, 50030 -> 400).
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Sesiones_Por_Instructor ?, ?, ?",
                    (id_instructor, desde, hasta),
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 13: GET /clases/equipos
# Inventario de equipamiento mediante vw_Inventario_Equipos
# =============================================================================
@router.get(
    "/equipos",
    response_model=List[EquipamientoItemResponse],
    summary="Inventario de equipamiento",
    description=(
        "Consulta la vista vw_Inventario_Equipos. "
        "Acepta filtro opcional por sede (id_sede)."
    ),
)
def listar_equipos(
    id_sede: Optional[int] = Query(
        default=None,
        gt=0,
        description="Filtrar por id_sede_equipamiento.",
    ),
):
    """
    SELECT sobre la vista vw_Inventario_Equipos con filtro opcional parametrizado.
    Calcula antigüedad de los equipos en años a través de la vista.
    """
    condiciones = []
    parametros = []

    if id_sede is not None:
        condiciones.append("id_sede_equipamiento = ?")
        parametros.append(id_sede)

    where_clause = ""
    if condiciones:
        where_clause = "WHERE " + " AND ".join(condiciones)

    sql = f"""
        SELECT id_equipamiento,
               nombre_descriptivo_equipamiento,
               nombre_sede,
               id_sede_equipamiento,
               fecha_adquisicion_equipamiento,
               antiguedad_anios
        FROM   vw_Inventario_Equipos
        {where_clause}
        ORDER  BY nombre_descriptivo_equipamiento ASC
    """

    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql, parametros)
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 14: POST /clases/equipos
# Registrar equipamiento mediante sp_Registrar_Equipamiento
# =============================================================================
@router.post(
    "/equipos",
    response_model=EquipamientoCreadoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo equipamiento",
    description=(
        "Ejecuta sp_Registrar_Equipamiento. Valida que la sede exista, que el nombre "
        "no venga vacío y que la fecha de adquisición no sea futura. "
        "Devuelve el id_equipamiento generado."
    ),
)
def registrar_equipamiento(body: EquipamientoCreateRequest):
    """
    EXEC sp_Registrar_Equipamiento @id_sede = ?, @nombre = ?, @fecha_adquisicion = ?
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Registrar_Equipamiento ?, ?, ?",
                    (
                        body.id_sede_equipamiento,
                        body.nombre_descriptivo_equipamiento,
                        body.fecha_adquisicion_equipamiento,
                    ),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return {"id_equipamiento": row[0]}
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 15: PUT /clases/equipos/{id}
# Actualizar equipamiento mediante sp_Actualizar_Equipamiento
# =============================================================================
@router.put(
    "/equipos/{id_equipamiento}",
    response_model=EquipamientoOperacionResponse,
    summary="Actualizar equipamiento",
    description=(
        "Ejecuta sp_Actualizar_Equipamiento. Valida existencia del equipo, nombre no vacío "
        "y fecha no futura. El UPDATE filtra siempre por id_equipamiento."
    ),
)
def actualizar_equipamiento(id_equipamiento: int, body: EquipamientoUpdateRequest):
    """
    EXEC sp_Actualizar_Equipamiento @id_equipamiento = ?, @nombre = ?, @fecha_adquisicion = ?
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Actualizar_Equipamiento ?, ?, ?",
                    (
                        id_equipamiento,
                        body.nombre_descriptivo_equipamiento,
                        body.fecha_adquisicion_equipamiento,
                    ),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return {
                    "id_equipamiento": row[0],
                    "mensaje": "Equipamiento actualizado correctamente",
                }
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 16: DELETE /clases/equipos/{id}
# Eliminar equipamiento mediante sp_Eliminar_Equipamiento
# =============================================================================
@router.delete(
    "/equipos/{id_equipamiento}",
    response_model=EquipamientoOperacionResponse,
    summary="Eliminar equipamiento",
    description=(
        "Ejecuta sp_Eliminar_Equipamiento. Valida que el equipo exista "
        "y lo elimina mediante DELETE filtrado por id_equipamiento."
    ),
)
def eliminar_equipamiento(id_equipamiento: int):
    """
    EXEC sp_Eliminar_Equipamiento @id_equipamiento = ?
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "EXEC sp_Eliminar_Equipamiento ?",
                    (id_equipamiento,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="El SP no devolvió un resultado. Contacte al administrador.",
                    )
                return {
                    "id_equipamiento": row[0],
                    "mensaje": "Equipamiento eliminado correctamente",
                }
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


# =============================================================================
# ENDPOINT 17: GET /clases/socios/{id_socio}/inscripciones
# Historial de inscripciones de un socio con estado_inscripcion
# =============================================================================
@router.get(
    "/socios/{id_socio}/inscripciones",
    response_model=List[InscripcionSocioDetalleResponse],
    summary="Inscripciones de un socio",
    description=(
        "Obtiene todas las inscripciones del socio realizando JOIN entre "
        "Inscripcion, Sesion, Clase y Sede, incluyendo el estado_inscripcion."
    ),
)
def listar_inscripciones_socio(id_socio: int):
    """
    JOIN Inscripcion x Sesion x Clase x Sede filtrado por id_socio_inscripcion.
    Valida previamente que el socio exista (404 si no existe).
    """
    resultado = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Validar existencia del socio
                cursor.execute("SELECT id_socio FROM Socio WHERE id_socio = ?", (id_socio,))
                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Socio no encontrado.",
                    )

                cursor.execute(
                    """
                    SELECT i.id_inscripcion,
                           i.id_socio_inscripcion,
                           i.id_sesion_inscripcion,
                           c.id_clase,
                           c.nombre_clase,
                           c.duracion_minutos_clase,
                           c.nivel_exigencia_clase,
                           s.id_sede,
                           s.nombre_sede,
                           se.fecha_sesion,
                           CONVERT(VARCHAR(8), se.hora_sesion, 108) AS hora_sesion,
                           se.cupo_maximo_sesion,
                           i.fecha_inscripcion,
                           i.estado_inscripcion,
                           i.asistio_inscripcion,
                           i.observaciones_inscripcion
                    FROM   Inscripcion AS i
                    INNER JOIN Sesion AS se ON i.id_sesion_inscripcion = se.id_sesion
                    INNER JOIN Clase  AS c  ON se.id_clase_sesion      = c.id_clase
                    INNER JOIN Sede   AS s  ON se.id_sede_sesion       = s.id_sede
                    WHERE  i.id_socio_inscripcion = ?
                    ORDER  BY se.fecha_sesion DESC, se.hora_sesion DESC
                    """,
                    (id_socio,),
                )
                for row in cursor.fetchall():
                    resultado.append(_row_to_dict(cursor, row))
        return resultado
    except HTTPException:
        raise
    except pyodbc.Error as exc:
        raise _sp_error_to_http(exc)


