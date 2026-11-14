"""
Módulo de Seguridad y Autenticación JWT para GimnasioDB
Soporta:
- Cifrado y verificación SHA2_512 compatible con HASHBYTES('SHA2_512', ...) de SQL Server.
- Emisión y validación de tokens JWT (HS256) con expiración de 8 horas.
- Dependencias de FastAPI para inyección de usuario autenticado y control de acceso basado en roles (Socio, Instructor, Personal).
"""

import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Set
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# =========================================================================
# CONFIGURACIÓN DE SEGURIDAD
# =========================================================================

SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "gimnasiodb_jwt_secret_key_2026_hito_ii_sha512_secure"))
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

# Conjunto de roles con privilegios administrativos o de personal en GimnasioDB
ROLES_PERSONAL: Set[str] = {
    "personal",
    "administrador",
    "gerente de sede",
    "recepcionista",
    "contador",
    "marketing",
    "mantenimiento",
    "soporte",
    "auditor",
}


# =========================================================================
# FUNCIONES HASHING SHA2_512 (Compatibles con SQL Server)
# =========================================================================

def hash_password_sha512(password: str) -> bytes:
    """
    Calcula el hash SHA-512 binario (64 bytes) de una contraseña en texto plano.
    Produce exactamente el mismo resultado que HASHBYTES('SHA2_512', password) en SQL Server.
    """
    return hashlib.sha512(password.encode("utf-8")).digest()


def verify_password_sha512(plain_password: str, stored_hash: Any) -> bool:
    """
    Compara de forma segura una contraseña en texto plano contra el hash binario
    (varbinary) o hexadecimal devuelto por SQL Server.
    """
    if not stored_hash:
        return False

    calculated_bytes = hash_password_sha512(plain_password)

    if isinstance(stored_hash, (bytes, bytearray, memoryview)):
        return hmac.compare_digest(calculated_bytes, bytes(stored_hash))

    if isinstance(stored_hash, str):
        # Soporte para hashes en formato hex (con o sin prefijo 0x)
        clean_hex = stored_hash[2:] if stored_hash.startswith("0x") or stored_hash.startswith("0X") else stored_hash
        try:
            return hmac.compare_digest(calculated_bytes, bytes.fromhex(clean_hex))
        except ValueError:
            return hmac.compare_digest(
                hashlib.sha512(plain_password.encode("utf-8")).hexdigest().lower(),
                stored_hash.lower()
            )

    return False


# =========================================================================
# GESTIÓN DE TOKENS JWT
# =========================================================================

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Genera un token JWT firmado con HS256 y expiración configurable (por defecto 8 horas).
    El payload incluye los campos requeridos:
    id_usuario, username, rol, id_socio, id_instructor, id_personal, nombre_completo.
    """
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    # Identificador de sujeto y fechas estándar JWT
    if "sub" not in to_encode and "id_usuario" in to_encode:
        to_encode["sub"] = str(to_encode["id_usuario"])

    to_encode["iat"] = int(now.timestamp())
    to_encode["exp"] = int(expire.timestamp())

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodifica y valida la firma y expiración de un token JWT.
    Lanza HTTPException 401 si expiró o si la firma es inválida.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de autenticación ha expirado. Por favor inicie sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de autenticación inválido: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# =========================================================================
# DEPENDENCIAS FASTAPI (Authorization: Bearer <token>)
# =========================================================================

http_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
) -> Dict[str, Any]:
    """
    Dependencia obligatoria: Requiere cabecera 'Authorization: Bearer <token>'.
    Retorna el payload decodificado del usuario actual.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Se requiere cabecera 'Authorization: Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials)


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer)
) -> Optional[Dict[str, Any]]:
    """
    Dependencia opcional: Si viene cabecera 'Authorization: Bearer <token>' válida,
    retorna el payload del usuario. Si no viene cabecera, retorna None sin error.
    Permite mantener compatibilidad hacia atrás en endpoints abiertos.
    """
    if not credentials or not credentials.credentials:
        return None
    return decode_access_token(credentials.credentials)


def require_socio(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Valida que el usuario tenga rol 'Socio' o cuente con un 'id_socio' vinculado.
    Permite también a 'Administrador'.
    """
    rol = str(user.get("rol", "")).strip().lower()
    id_socio = user.get("id_socio")
    if rol in ["socio", "administrador"] or id_socio is not None:
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido: se requiere perfil de Socio.",
    )


def require_instructor(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Valida que el usuario tenga rol 'Instructor' o cuente con un 'id_instructor' vinculado.
    Permite también a 'Administrador'.
    """
    rol = str(user.get("rol", "")).strip().lower()
    id_instructor = user.get("id_instructor")
    if rol in ["instructor", "administrador"] or id_instructor is not None:
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido: se requiere perfil de Instructor.",
    )


def require_personal(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Valida que el usuario tenga rol perteneciente a Personal / Funcionarios o cuente
    con 'id_personal' vinculado.
    """
    rol = str(user.get("rol", "")).strip().lower()
    id_personal = user.get("id_personal")
    if rol in ROLES_PERSONAL or id_personal is not None:
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido: se requiere perfil de Personal o Funcionario del gimnasio.",
    )

