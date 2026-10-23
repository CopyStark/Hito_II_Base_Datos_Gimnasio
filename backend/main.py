import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import sys
from pathlib import Path

# Asegurar que tanto 'backend' como la raíz del proyecto estén en sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Cargar variables de entorno
load_dotenv()

# Importar routers y utilidades de base de datos
try:
    from backend.routers import auth_socios_router, clases_router, contratos_router
    from backend.db.connection import test_connection
except ImportError:
    from routers import auth_socios_router, clases_router, contratos_router
    from db.connection import test_connection

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("gimnasiodb.main")

# Inicialización de la aplicación FastAPI
app = FastAPI(
    title="GimnasioDB API",
    description=(
        "API REST para el sistema de gestión de gimnasios (GimnasioDB).\n\n"
        "**Arquitectura y Reglas:**\n"
        "- **API-First:** Comunicación desacoplada con el frontend Next.js.\n"
        "- **Sin ORM:** Acceso directo a SQL Server mediante consultas explícitas y parametrizadas con `pyodbc`.\n"
        "- **Modularidad:**\n"
        "  - **Persona 1:** Acceso y Administración de Socios (`/socios`)\n"
        "  - **Persona 2:** Clases, Sesiones e Inscripciones (`/clases`)\n"
        "  - **Persona 3:** Membresías, Contratos y Pagos (`/contratos`)"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# -------------------------------------------------------------------------
# Configuración de CORS (Cross-Origin Resource Sharing)
# -------------------------------------------------------------------------
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

# Asegurar que localhost y 127.0.0.1 estén en la lista para desarrollo
default_dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
for dev_origin in default_dev_origins:
    if dev_origin not in origins:
        origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configurado para los orígenes: {origins}")

# -------------------------------------------------------------------------
# Montaje de Routers Modulares
# -------------------------------------------------------------------------
app.include_router(auth_socios_router)
app.include_router(clases_router)
app.include_router(contratos_router)

# -------------------------------------------------------------------------
# Rutas Base y Diagnóstico (Health Check)
# -------------------------------------------------------------------------
@app.get("/", tags=["General"])
def read_root():
    """
    Ruta raíz para verificar que el servicio FastAPI está operativo.
    """
    return {
        "sistema": "GimnasioDB API",
        "estado": "En línea",
        "version": "1.0.0",
        "documentacion": "/docs",
        "modulos": {
            "persona_1": "/socios",
            "persona_2": "/clases",
            "persona_3": "/contratos"
        }
    }

@app.get("/api/health", tags=["General"])
def health_check():
    """
    Verifica el estado del backend y la conectividad a SQL Server mediante pyodbc.
    """
    db_status = test_connection()
    return {
        "backend": "ok",
        "database": db_status
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
