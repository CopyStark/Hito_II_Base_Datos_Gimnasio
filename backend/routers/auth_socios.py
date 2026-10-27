"""
Módulo de Acceso y Administración de Socios
Responsable: Persona 1 (Carlos)
Sincronizado con tablas: [dbo].[Socio], [dbo].[Usuario], [dbo].[Rol], [dbo].[Sede], [dbo].[Contrato]
Convención: sufijos por tabla (_socio, _usuario, _sede, etc.)

REGLAS DE DESARROLLO (ESTRICTAS):
1. Prohibido el uso de ORM (SQLAlchemy, Prisma, etc.).
2. Consultas explícitas y parametrizadas con '?' mediante pyodbc para prevenir inyección SQL.
3. Inyectar la conexión con 'get_db_connection()'.
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
import pyodbc

try:
    from backend.db.connection import get_db_connection
    from backend.schemas import (
        SocioCreate,
        SocioResponse,
        SocioUpdate,
        SocioEstadoUpdate,
        SocioCredencialesCreate,
        LoginRequest,
        LoginResponse,
        ControlAccesoResponse,
        SedeSimpleResponse,
        ReporteSociosPorSedeItem
    )
except ImportError:
    from db.connection import get_db_connection
    from schemas import (
        SocioCreate,
        SocioResponse,
        SocioUpdate,
        SocioEstadoUpdate,
        SocioCredencialesCreate,
        LoginRequest,
        LoginResponse,
        ControlAccesoResponse,
        SedeSimpleResponse,
        ReporteSociosPorSedeItem
    )

router = APIRouter(
    prefix="/socios",
    tags=["Persona 1 - Socios & Acceso"]
)


# =========================================================================
# 1. CONSULTAS Y FILTROS DE SOCIOS
# =========================================================================

@router.get("", response_model=List[SocioResponse], include_in_schema=False)
@router.get("/", response_model=List[SocioResponse], summary="Listar socios con filtros y paginación")
def listar_socios(
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo (true/false)"),
    id_sede: Optional[int] = Query(None, description="Filtrar por ID de sede de registro"),
    buscar: Optional[str] = Query(None, description="Búsqueda por coincidencia en Nombre, RUT o Correo"),
    limite: int = Query(100, ge=1, le=500, description="Cantidad máxima de registros a retornar"),
    offset: int = Query(0, ge=0, description="Desplazamiento para paginación")
):
    """
    Obtiene la lista de socios desde la tabla [Socio] con soporte para filtros opcionales.
    Usa consultas SQL nativas parametrizadas con '?' para máxima seguridad.
    """
    socios = []
    where_clauses = []
    params = []

    if activo is not None:
        where_clauses.append("activo_socio = ?")
        params.append(1 if activo else 0)

    if id_sede is not None:
        where_clauses.append("id_sede_registro_socio = ?")
        params.append(id_sede)

    if buscar and buscar.strip():
        term = f"%{buscar.strip()}%"
        where_clauses.append("(nombre_completo_socio LIKE ? OR rut_socio LIKE ? OR correo_socio LIKE ?)")
        params.extend([term, term, term])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        SELECT id_socio, rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, 
               telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio
        FROM Socio
        {where_sql}
        ORDER BY id_socio DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    params.extend([offset, limite])

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    socios.append(dict(zip(columns, row)))
        return socios
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar socios en SQL Server: {str(e)}"
        )


@router.get("/sedes/catalogo", response_model=List[SedeSimpleResponse], summary="Catálogo de sedes disponibles")
def listar_sedes_catalogo():
    """
    Retorna el listado de sedes con su ciudad para asociar a los socios en el registro o edición.
    """
    sedes = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT s.id_sede, s.nombre_sede, s.direccion_calle_sede, s.telefono_sede, c.nombre_ciudad
                    FROM Sede s
                    INNER JOIN Ciudad c ON s.id_ciudad_sede = c.id_ciudad
                    ORDER BY s.nombre_sede ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    sedes.append(dict(zip(columns, row)))
        return sedes
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener catálogo de sedes: {str(e)}"
        )


@router.get("/reportes/por-sede", response_model=List[ReporteSociosPorSedeItem], summary="Reporte de socios por sede")
def reporte_socios_por_sede():
    """
    Consulta la vista analítica oficial [vw_Reporte_Socios_Por_Sede] para conocer
    la distribución de socios vigentes, vencidos o cancelados por cada sucursal.
    """
    reporte = []
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT nombre_sede, estado_contrato, cantidad_socios
                    FROM vw_Reporte_Socios_Por_Sede
                    ORDER BY nombre_sede ASC, estado_contrato ASC
                """
                cursor.execute(query)
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    reporte.append(dict(zip(columns, row)))
        return reporte
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar reporte de socios por sede: {str(e)}"
        )


@router.get("/{id_socio}", response_model=SocioResponse, summary="Obtener un socio por ID")
def obtener_socio(id_socio: int):
    """
    Consulta el detalle completo de un socio a partir de su ID.
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


@router.get("/rut/{rut_socio}", response_model=SocioResponse, summary="Obtener un socio por RUT")
def obtener_socio_por_rut(rut_socio: str):
    """
    Consulta un socio a partir de su número de RUT.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT id_socio, rut_socio, nombre_completo_socio, fecha_nacimiento_socio, correo_socio, 
                           telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio
                    FROM Socio
                    WHERE rut_socio = ?
                """
                cursor.execute(query, (rut_socio.strip(),))
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Socio con RUT '{rut_socio}' no encontrado."
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


# =========================================================================
# 2. REGISTRO, ACTUALIZACIÓN Y CONTROL DE ESTADO
# =========================================================================

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


@router.put("/{id_socio}", response_model=SocioResponse, summary="Actualizar datos de un socio")
def actualizar_socio(id_socio: int, datos: SocioUpdate):
    """
    Actualiza la información de contacto y sede de un socio existente.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Verificar existencia del socio actual
                cursor.execute("""
                    SELECT id_socio, rut_socio, nombre_completo_socio, fecha_nacimiento_socio, 
                           correo_socio, telefono_socio, id_sede_registro_socio, acepta_promociones_socio, activo_socio
                    FROM Socio
                    WHERE id_socio = ?
                """, (id_socio,))
                actual = cursor.fetchone()
                if not actual:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Socio con ID {id_socio} no encontrado."
                    )

                # 2. Si cambia el correo, verificar que no esté duplicado en otro socio
                nuevo_correo = datos.correo_socio or actual[4]
                if nuevo_correo != actual[4]:
                    cursor.execute("SELECT id_socio FROM Socio WHERE correo_socio = ? AND id_socio != ?", (nuevo_correo, id_socio))
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="El nuevo correo electrónico ya está registrado por otro socio."
                        )

                # 3. Si cambia la sede, verificar que exista
                nueva_sede = datos.id_sede_registro_socio if datos.id_sede_registro_socio is not None else actual[6]
                if nueva_sede != actual[6]:
                    cursor.execute("SELECT id_sede FROM Sede WHERE id_sede = ?", (nueva_sede,))
                    if not cursor.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"La sede con ID {nueva_sede} no existe."
                        )

                nuevo_nombre = datos.nombre_completo_socio or actual[2]
                nuevo_telefono = datos.telefono_socio or actual[5]
                nuevas_promociones = datos.acepta_promociones_socio if datos.acepta_promociones_socio is not None else actual[7]

                # 4. Actualizar registro
                update_query = """
                    UPDATE Socio
                    SET nombre_completo_socio = ?,
                        correo_socio = ?,
                        telefono_socio = ?,
                        id_sede_registro_socio = ?,
                        acepta_promociones_socio = ?
                    WHERE id_socio = ?
                """
                cursor.execute(
                    update_query,
                    (
                        nuevo_nombre,
                        nuevo_correo,
                        nuevo_telefono,
                        nueva_sede,
                        1 if nuevas_promociones else 0,
                        id_socio
                    )
                )

                return {
                    "id_socio": id_socio,
                    "rut_socio": actual[1],
                    "nombre_completo_socio": nuevo_nombre,
                    "fecha_nacimiento_socio": actual[3],
                    "correo_socio": nuevo_correo,
                    "telefono_socio": nuevo_telefono,
                    "id_sede_registro_socio": nueva_sede,
                    "acepta_promociones_socio": bool(nuevas_promociones),
                    "activo_socio": bool(actual[8])
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar socio: {str(e)}"
        )


@router.patch("/{id_socio}/estado", response_model=SocioResponse, summary="Activar o desactivar un socio")
def cambiar_estado_socio(id_socio: int, payload: SocioEstadoUpdate):
    """
    Modifica el estado activo/inactivo (activo_socio) de un socio.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                update_query = """
                    UPDATE Socio
                    SET activo_socio = ?
                    OUTPUT INSERTED.id_socio, INSERTED.rut_socio, INSERTED.nombre_completo_socio, 
                           INSERTED.fecha_nacimiento_socio, INSERTED.correo_socio, INSERTED.telefono_socio, 
                           INSERTED.id_sede_registro_socio, INSERTED.acepta_promociones_socio, INSERTED.activo_socio
                    WHERE id_socio = ?
                """
                cursor.execute(update_query, (1 if payload.activo_socio else 0, id_socio))
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
            detail=f"Error al cambiar estado del socio: {str(e)}"
        )


# =========================================================================
# 3. GESTIÓN DE CREDENCIALES Y AUTENTICACIÓN
# =========================================================================

@router.post("/{id_socio}/credenciales", status_code=status.HTTP_201_CREATED, summary="Crear o actualizar credenciales de acceso para un socio")
def asignar_credenciales_socio(id_socio: int, credenciales: SocioCredencialesCreate):
    """
    Crea o renueva las credenciales en la tabla [Usuario] vinculadas al socio.
    Utiliza HASHBYTES('SHA2_512', ?) nativo de SQL Server para máxima seguridad.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # 1. Validar existencia del socio
                cursor.execute("SELECT id_socio, correo_socio FROM Socio WHERE id_socio = ?", (id_socio,))
                socio = cursor.fetchone()
                if not socio:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Socio con ID {id_socio} no encontrado."
                    )

                # 2. Validar que el username no esté en uso por otro usuario distinto
                cursor.execute(
                    "SELECT id_usuario FROM Usuario WHERE username_usuario = ? AND (id_socio_usuario IS NULL OR id_socio_usuario != ?)",
                    (credenciales.username_usuario, id_socio)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El nombre de usuario '{credenciales.username_usuario}' ya está en uso."
                    )

                # 3. Obtener el ID del rol 'Socio'
                cursor.execute("SELECT id_rol FROM Rol WHERE nombre_rol = 'Socio'")
                rol_row = cursor.fetchone()
                id_rol_socio = rol_row[0] if rol_row else 5

                # 4. Verificar si el socio ya tenía usuario para actualizar o insertar
                cursor.execute("SELECT id_usuario FROM Usuario WHERE id_socio_usuario = ?", (id_socio,))
                usuario_existente = cursor.fetchone()

                if usuario_existente:
                    update_sql = """
                        UPDATE Usuario
                        SET username_usuario = ?,
                            password_hash_usuario = HASHBYTES('SHA2_512', ?),
                            id_rol_usuario = ?
                        WHERE id_socio_usuario = ?
                    """
                    cursor.execute(update_sql, (credenciales.username_usuario, credenciales.password, id_rol_socio, id_socio))
                    return {
                        "mensaje": "Credenciales de socio actualizadas exitosamente.",
                        "id_usuario": usuario_existente[0],
                        "id_socio": id_socio,
                        "username_usuario": credenciales.username_usuario
                    }
                else:
                    insert_sql = """
                        INSERT INTO Usuario (username_usuario, password_hash_usuario, id_rol_usuario, id_socio_usuario)
                        OUTPUT INSERTED.id_usuario
                        VALUES (?, HASHBYTES('SHA2_512', ?), ?, ?)
                    """
                    cursor.execute(insert_sql, (credenciales.username_usuario, credenciales.password, id_rol_socio, id_socio))
                    id_generado = cursor.fetchone()[0]
                    return {
                        "mensaje": "Credenciales de socio creadas exitosamente.",
                        "id_usuario": id_generado,
                        "id_socio": id_socio,
                        "username_usuario": credenciales.username_usuario
                    }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al asignar credenciales: {str(e)}"
        )


@router.post("/login", response_model=LoginResponse, summary="Autenticación de socios y usuarios")
def autenticar_usuario(credentials: LoginRequest):
    """
    Valida credenciales contra la tabla [Usuario] mediante comparación de hash SHA2_512 en SQL Server.
    Admite inicio de sesión con Username o con Correo electrónico del socio.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                login_query = """
                    SELECT 
                        u.id_usuario, 
                        u.username_usuario, 
                        r.nombre_rol, 
                        u.id_socio_usuario, 
                        s.nombre_completo_socio, 
                        s.activo_socio
                    FROM Usuario u
                    INNER JOIN Rol r ON u.id_rol_usuario = r.id_rol
                    LEFT JOIN Socio s ON u.id_socio_usuario = s.id_socio
                    WHERE (u.username_usuario = ? OR s.correo_socio = ?)
                      AND u.password_hash_usuario = HASHBYTES('SHA2_512', ?)
                """
                cursor.execute(login_query, (credentials.username_o_correo, credentials.username_o_correo, credentials.password))
                row = cursor.fetchone()

                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Credenciales inválidas. Verifique su usuario/correo y contraseña."
                    )

                id_usuario, username, rol, id_socio, nombre_socio, activo_socio = row

                # Si es un socio y su estado es inactivo
                if id_socio is not None and activo_socio is False:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="La cuenta de este socio se encuentra inactiva. Comuníquese con administración."
                    )

                return {
                    "autenticado": True,
                    "mensaje": "Autenticación exitosa.",
                    "id_usuario": id_usuario,
                    "username_usuario": username,
                    "rol": rol,
                    "id_socio": id_socio,
                    "nombre_completo_socio": nombre_socio,
                    "activo_socio": bool(activo_socio) if activo_socio is not None else True
                }
    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar credenciales en SQL Server: {str(e)}"
        )


# =========================================================================
# 4. CONTROL DE ACCESO EN RECEPCIÓN / TORNIQUETES
# =========================================================================

@router.get("/acceso/validar/{identificador}", response_model=ControlAccesoResponse, summary="Validar control de acceso para torniquete o recepción")
def validar_acceso_socio(identificador: str):
    """
    Verifica en tiempo real si un socio puede acceder al gimnasio:
    1. Comprueba si el socio existe.
    2. Comprueba que el socio se encuentre ACTIVO.
    3. Comprueba si cuenta con un contrato VIGENTE (con fecha de término >= hoy).
    """
    identificador_limpio = identificador.strip()
    es_numero = identificador_limpio.isdigit()
    id_param = int(identificador_limpio) if es_numero else -1

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                access_query = """
                    SELECT 
                        s.id_socio,
                        s.rut_socio,
                        s.nombre_completo_socio,
                        sed.nombre_sede,
                        s.activo_socio,
                        c.id_contrato,
                        c.estado_contrato,
                        c.fecha_termino_contrato,
                        p.nombre_planmembresia
                    FROM Socio s
                    INNER JOIN Sede sed ON s.id_sede_registro_socio = sed.id_sede
                    LEFT JOIN Contrato c ON s.id_socio = c.id_socio_contrato 
                                        AND c.estado_contrato = 'Vigente' 
                                        AND c.fecha_termino_contrato >= CAST(GETDATE() AS DATE)
                    LEFT JOIN PlanMembresia p ON c.id_planmembresia_contrato = p.id_planmembresia
                    WHERE s.id_socio = ? OR s.rut_socio = ?
                    ORDER BY c.fecha_termino_contrato DESC
                """
                cursor.execute(access_query, (id_param, identificador_limpio))
                row = cursor.fetchone()

                if not row:
                    return {
                        "acceso_permitido": False,
                        "motivo": f"No se encontró ningún socio registrado con el identificador '{identificador}'.",
                        "id_socio": None,
                        "rut_socio": None,
                        "nombre_completo_socio": None,
                        "sede_registro": None,
                        "activo_socio": None,
                        "contrato_vigente": False,
                        "nombre_plan": None,
                        "fecha_termino_contrato": None
                    }

                (
                    id_socio, rut, nombre, sede, activo, 
                    id_contrato, estado_contrato, fecha_termino, nombre_plan
                ) = row

                # Caso 1: Socio inactivo
                if not bool(activo):
                    return {
                        "acceso_permitido": False,
                        "motivo": "Acceso DENEGADO: El socio se encuentra desactivado en el sistema.",
                        "id_socio": id_socio,
                        "rut_socio": rut,
                        "nombre_completo_socio": nombre,
                        "sede_registro": sede,
                        "activo_socio": False,
                        "contrato_vigente": bool(id_contrato),
                        "nombre_plan": nombre_plan,
                        "fecha_termino_contrato": fecha_termino
                    }

                # Caso 2: Sin contrato vigente
                if not id_contrato:
                    return {
                        "acceso_permitido": False,
                        "motivo": "Acceso DENEGADO: El socio no posee un contrato o membresía vigente al día de hoy.",
                        "id_socio": id_socio,
                        "rut_socio": rut,
                        "nombre_completo_socio": nombre,
                        "sede_registro": sede,
                        "activo_socio": True,
                        "contrato_vigente": False,
                        "nombre_plan": None,
                        "fecha_termino_contrato": None
                    }

                # Caso 3: Acceso concedido
                return {
                    "acceso_permitido": True,
                    "motivo": f"Acceso PERMITIDO: Membresía '{nombre_plan}' vigente hasta {fecha_termino}.",
                    "id_socio": id_socio,
                    "rut_socio": rut,
                    "nombre_completo_socio": nombre,
                    "sede_registro": sede,
                    "activo_socio": True,
                    "contrato_vigente": True,
                    "nombre_plan": nombre_plan,
                    "fecha_termino_contrato": fecha_termino
                }
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al validar acceso de socio en SQL Server: {str(e)}"
        )
