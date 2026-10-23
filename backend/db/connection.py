import os
from contextlib import contextmanager
from typing import Generator
import pyodbc
from dotenv import load_dotenv

# 1. Cargar variables de entorno desde el archivo .env
load_dotenv()

# Parámetros de conexión a SQL Server
DB_SERVER = os.getenv("DB_SERVER", "localhost")
DB_PORT = os.getenv("DB_PORT", "1433")
DB_NAME = os.getenv("DB_NAME", "GimnasioDB")
DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
DB_TRUSTED_CONNECTION = os.getenv("DB_TRUSTED_CONNECTION", "no").lower() in ("yes", "true", "1")
DB_ENCRYPT = os.getenv("DB_ENCRYPT", "no")
DB_TRUST_CERT = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")

def get_connection_string() -> str:
    """
    Construye y retorna el Connection String oficial para Microsoft SQL Server
    utilizando ODBC Driver 17 for SQL Server.
    """
    driver_name = DB_DRIVER if DB_DRIVER.startswith("{") else f"{{{DB_DRIVER}}}"
    server_address = f"{DB_SERVER},{DB_PORT}" if DB_PORT else DB_SERVER

    if DB_TRUSTED_CONNECTION:
        # Autenticación Integrada de Windows
        conn_str = (
            f"DRIVER={driver_name};"
            f"SERVER={server_address};"
            f"DATABASE={DB_NAME};"
            f"Trusted_Connection=yes;"
            f"Encrypt={DB_ENCRYPT};"
            f"TrustServerCertificate={DB_TRUST_CERT};"
        )
    else:
        # Autenticación con Usuario y Contraseña de SQL Server
        conn_str = (
            f"DRIVER={driver_name};"
            f"SERVER={server_address};"
            f"DATABASE={DB_NAME};"
            f"UID={DB_USER};"
            f"PWD={DB_PASSWORD};"
            f"Encrypt={DB_ENCRYPT};"
            f"TrustServerCertificate={DB_TRUST_CERT};"
        )
    return conn_str

@contextmanager
def get_db_connection() -> Generator[pyodbc.Connection, None, None]:
    """
    Función generadora que administra el ciclo de vida de la conexión a GimnasioDB con pyodbc.
    
    REGLA ESTRICTA DEL PROYECTO:
    - PROHIBIDO EL USO DE ORM (SQLAlchemy, Prisma, etc.).
    - Uso exclusivo de consultas SQL explícitas y parametrizadas:
      cursor.execute("SELECT * FROM Socio WHERE id_socio = ?", (socio_id,))
      
    Ciclo de vida:
    1. Abre la conexión.
    2. Cede el control mediante yield (usable en FastAPI Depends o con bloques 'with').
    3. Realiza commit al finalizar con éxito.
    4. Realiza rollback si ocurre un error y captura excepciones críticas de pyodbc.Error.
    5. Cierra la conexión de forma segura en el bloque finally.
    """
    conn = None
    conn_str = get_connection_string()
    try:
        conn = pyodbc.connect(conn_str, autocommit=False)
        yield conn
        conn.commit()
    except pyodbc.Error as db_err:
        if conn:
            conn.rollback()
        print(f"[ERROR CRÍTICO pyodbc.Error] Fallo en la conexión o consulta a SQL Server: {db_err}")
        raise db_err
    except Exception as exc:
        if conn:
            conn.rollback()
        print(f"[ERROR INESPERADO] Excepción general en operación de base de datos: {exc}")
        raise exc
    finally:
        if conn:
            conn.close()

def test_connection() -> dict:
    """
    Función utilitaria de diagnóstico para verificar la conexión a GimnasioDB.
    """
    conn_str = get_connection_string()
    try:
        with pyodbc.connect(conn_str, timeout=5) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1 AS is_alive, @@VERSION AS sql_version")
                row = cursor.fetchone()
                return {
                    "status": "connected",
                    "database": DB_NAME,
                    "server": DB_SERVER,
                    "sql_version": row[1] if row else "Desconocido"
                }
    except pyodbc.Error as e:
        print(f"[ERROR CRÍTICO pyodbc.Error] Fallo en test_connection(): {e}")
        return {
            "status": "error",
            "message": str(e),
            "database": DB_NAME
        }
