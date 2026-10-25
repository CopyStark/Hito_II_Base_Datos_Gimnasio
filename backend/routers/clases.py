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

from typing import List, Optional
import pyodbc
from fastapi import APIRouter, HTTPException, Query, status

# ── Importaciones con fallback para ejecución directa vs. desde uvicorn ──────
try:
    from backend.db.connection import get_db_connection
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
    from backend.schemas import ClaseResponse
except ImportError:
    from db.connection import get_db_connection
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
    from schemas import ClaseResponse

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

    Códigos definidos en sp_clases.sql:
      50010 -> 404 Not Found
      50020 -> 409 Conflict
      50030 -> 400 Bad Request
      otro  -> 500 Internal Server Error (mensaje genérico)
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

    # Error desconocido: respuesta 500 sin exponer detalles internos
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
               hora_sesion,
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

