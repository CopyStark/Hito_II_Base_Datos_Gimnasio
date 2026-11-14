"""
Módulo de Autenticación Universal y Gestión de Sesión JWT para GimnasioDB
Endpoints:
- POST /auth/login: Autenticación con credenciales (username/correo + password con HASHBYTES SHA2_512) y emisión de JWT.
- GET /auth/me: Validación de la sesión activa contra el token JWT inyectado en Authorization: Bearer.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, Dict, Any
import pyodbc

try:
    from backend.db.connection import get_db_connection
    from backend.core.security import create_access_token, get_current_user
except ImportError:
    from db.connection import get_db_connection
    from core.security import create_access_token, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación JWT"]
)


# =========================================================================
# ESQUEMAS PYDANTIC
# =========================================================================

class LoginRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=1,
        description="Nombre de usuario o correo electrónico registrado",
        validation_alias=AliasChoices("username", "username_o_correo", "correo"),
        example="admin"
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Contraseña en texto plano",
        example="Clave#admin"
    )


class UserDataResponse(BaseModel):
    id_usuario: int
    username: str
    rol: str
    id_socio: Optional[int] = None
    id_instructor: Optional[int] = None
    id_personal: Optional[int] = None
    nombre_completo: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserDataResponse


class CurrentUserResponse(BaseModel):
    autenticado: bool = True
    user: UserDataResponse


# =========================================================================
# ENDPOINTS
# =========================================================================

@router.post("/login", response_model=LoginResponse, summary="Iniciar sesión con credenciales y obtener JWT")
def login(credentials: LoginRequest):
    """
    Autentica usuarios (Socio, Instructor, Personal o Administrador) contra la tabla [Usuario]
    utilizando SQL explícito parametrizado con '?' y verificación nativa de hash SHA2_512.
    
    Retorna:
    - access_token: Token JWT con 8 horas de vigencia firmado con HS256.
    - token_type: 'bearer'
    - user: Datos completos del usuario (id_usuario, username, rol, id_socio, id_instructor, id_personal, nombre_completo)
    """
    identifier = credentials.username.strip()
    plain_password = credentials.password

    login_sql = """
        SELECT 
            u.id_usuario, 
            u.username_usuario, 
            r.nombre_rol, 
            u.id_socio_usuario, 
            u.id_instructor_usuario, 
            u.id_personal_usuario,
            s.activo_socio,
            COALESCE(s.nombre_completo_socio, i.nombre_completo_instructor, p.nombre_completo_personal, u.username_usuario) AS nombre_completo
        FROM Usuario u
        INNER JOIN Rol r ON u.id_rol_usuario = r.id_rol
        LEFT JOIN Socio s ON u.id_socio_usuario = s.id_socio
        LEFT JOIN Instructor i ON u.id_instructor_usuario = i.id_instructor
        LEFT JOIN Personal p ON u.id_personal_usuario = p.id_personal
        WHERE (u.username_usuario = ? OR s.correo_socio = ? OR i.correo_instructor = ? OR p.correo_personal = ?)
          AND (u.password_hash_usuario = HASHBYTES('SHA2_512', ?) OR u.password_hash_usuario = HASHBYTES('SHA2_512', CAST(? AS VARCHAR(255))))
    """

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(login_sql, (identifier, identifier, identifier, identifier, plain_password, plain_password))
                row = cursor.fetchone()

                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Credenciales inválidas. Verifique su usuario/correo y contraseña.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                id_usuario, username, rol, id_socio, id_instructor, id_personal, activo_socio, nombre_completo = row

                # Validación de socio inactivo
                if id_socio is not None and activo_socio is False:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="La cuenta de este socio se encuentra inactiva. Comuníquese con administración."
                    )

                user_data = {
                    "id_usuario": int(id_usuario),
                    "username": str(username),
                    "rol": str(rol),
                    "id_socio": int(id_socio) if id_socio is not None else None,
                    "id_instructor": int(id_instructor) if id_instructor is not None else None,
                    "id_personal": int(id_personal) if id_personal is not None else None,
                    "nombre_completo": str(nombre_completo) if nombre_completo else str(username),
                }

                # Payload embebido en el token JWT
                token_payload = {
                    "sub": str(id_usuario),
                    "id_usuario": user_data["id_usuario"],
                    "username": user_data["username"],
                    "rol": user_data["rol"],
                    "id_socio": user_data["id_socio"],
                    "id_instructor": user_data["id_instructor"],
                    "id_personal": user_data["id_personal"],
                    "nombre_completo": user_data["nombre_completo"],
                }

                token = create_access_token(token_payload)

                return {
                    "access_token": token,
                    "token_type": "bearer",
                    "user": user_data
                }

    except HTTPException:
        raise
    except pyodbc.Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar credenciales en SQL Server: {str(e)}"
        )


@router.get("/me", response_model=CurrentUserResponse, summary="Validar la sesión activa y obtener datos del usuario")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Lee la cabecera 'Authorization: Bearer <token>', valida la firma y vigencia del JWT
    y retorna la información del usuario en sesión.
    """
    return {
        "autenticado": True,
        "user": {
            "id_usuario": user.get("id_usuario"),
            "username": user.get("username"),
            "rol": user.get("rol"),
            "id_socio": user.get("id_socio"),
            "id_instructor": user.get("id_instructor"),
            "id_personal": user.get("id_personal"),
            "nombre_completo": user.get("nombre_completo"),
        }
    }

