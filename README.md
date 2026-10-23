# 🏋️‍♂️ GimnasioDB - Sistema de Gestión de Gimnasio

Sistema integral de gestión de gimnasios desarrollado con una arquitectura modular **API-First**, desacoplando completamente el backend y el frontend para facilitar el trabajo colaborativo en equipo.

---

## 📐 Stack Tecnológico y Arquitectura

* **Backend:** Python 3.10+ con **FastAPI** y servidor ASGI **Uvicorn**.
* **Acceso a Datos:** **`pyodbc`** (Conexión nativa a Microsoft SQL Server).
* **Frontend:** **Next.js** (React 18, App Router, TypeScript, TailwindCSS), optimizado para despliegue en **Vercel**.

### ⚠️ Reglas Críticas del Proyecto (ESTRICTAS)

1. **PROHIBIDO EL USO DE CUALQUIER ORM:**  
   Queda terminantemente prohibido el uso de SQLAlchemy ORM, Prisma, Django ORM o similares. Todo acceso a datos debe realizarse mediante **sentencias SQL nativas y explícitas**, utilizando consultas parametrizadas con marcadores de posición `?` en `pyodbc` para prevenir ataques de SQL Injection:
   ```python
   # ✅ CORRECTO:
   cursor.execute("SELECT * FROM Socios WHERE dni = ?", (dni,))

   # ❌ PROHIBIDO (Concatenación / SQL Injection):
   cursor.execute(f"SELECT * FROM Socios WHERE dni = '{dni}'")
   ```
2. **Arquitectura API-First:**  
   El frontend en ningún caso se conecta de forma directa a SQL Server. Toda interacción de datos se realiza consumiendo los endpoints REST provistos por la API de FastAPI.
3. **Control de CORS:**  
   El backend incluye middleware CORS configurado para admitir peticiones desde el frontend en desarrollo (`http://localhost:3000`) y entornos de producción.

---

## 👥 División de Trabajo del Equipo (3 Personas)

| Rol | Integrante | Módulo / Router | Archivo Backend | Responsabilidades Principales |
| :--- | :--- | :--- | :--- | :--- |
| **Persona 1** | Desarrollador 1 | `/socios` | `backend/routers/auth_socios.py` | Acceso, registro de socios, administración, credenciales y estados de socios. |
| **Persona 2** | Desarrollador 2 | `/clases` | `backend/routers/clases.py` | Catálogo de clases deportivas, asignación de entrenadores, control de cupos y horarios, inscripción a sesiones. |
| **Persona 3** | Desarrollador 3 | `/contratos` | `backend/routers/contratos.py` | Gestión de tipos de planes, contratos de membresías, procesamiento atómico de pagos y estados de cuenta. |

---

## 📂 Estructura del Repositorio

```text
/
├── backend/
│   ├── .env.example          # Plantilla de variables para SQL Server y servidor
│   ├── requirements.txt      # fastapi, uvicorn, pyodbc, pydantic, python-dotenv
│   ├── main.py               # Punto de entrada FastAPI, CORS y montaje de routers
│   ├── db/
│   │   ├── __init__.py
│   │   └── connection.py     # Manejador singleton de conexión pyodbc con control de errores
│   ├── routers/              # Controladores REST modulares por persona
│   │   ├── __init__.py
│   │   ├── auth_socios.py    # Persona 1: Acceso y Administración
│   │   ├── clases.py         # Persona 2: Sesiones e Inscripciones
│   │   └── contratos.py      # Persona 3: Membresías y Pagos
│   └── schemas/              # Modelos de validación Pydantic de entrada y salida
│       └── __init__.py
├── frontend/
│   ├── package.json          # Next.js, React, TailwindCSS, Lucide
│   ├── next.config.js        # Configuración para despliegue en Vercel
│   ├── tsconfig.json         # Configuración TypeScript
│   ├── tailwind.config.js    # Configuración de estilos y tema
│   ├── postcss.config.js
│   ├── .env.local.example    # NEXT_PUBLIC_API_URL=http://localhost:8000
│   └── src/
│       ├── app/
│       │   ├── globals.css   # Estilos globales y Tailwind directives
│       │   ├── layout.tsx    # Root layout
│       │   └── page.tsx      # Landing page de diagnóstico y división del equipo
│       ├── components/       # Componentes UI reutilizables (ej: TeamCard)
│       └── services/         # Consumo HTTP de la API REST
│           └── apiClient.ts  # Cliente HTTP tipado hacia FastAPI
├── .gitignore                # Ignora node_modules, .env, venv, pycache, .next
└── README.md                 # Guía para el equipo
```

---

## 🚀 Guía de Instalación y Puesta en Marcha

Sigue estos pasos para clonar y ejecutar el entorno completo en tu máquina local.

### Prerrequisitos en tu Computadora
* **Python:** Versión 3.10 o superior ([python.org](https://www.python.org/downloads/)).
* **Node.js:** Versión 18.x o superior ([nodejs.org](https://nodejs.org/)).
* **Microsoft ODBC Driver for SQL Server:** Necesario para que `pyodbc` pueda comunicarse con SQL Server.  
  *(Windows suele tener instalada la versión 17 o 18; si no, descargar "ODBC Driver 17 or 18 for SQL Server" desde la web oficial de Microsoft).*
* **Microsoft SQL Server:** Instancia activa (Local, Express o Docker).

---

### 1️⃣ Clonar el Repositorio

Abre tu terminal (PowerShell en Windows o Bash en macOS/Linux):

```bash
git clone <URL_DEL_REPOSITORIO>
cd Hito_II_Base_Datos_Gimnasio
```

---

### 2️⃣ Configurar y Levantar el Backend (FastAPI)

#### A. Crear y activar el entorno virtual de Python

* **En Windows (PowerShell):**
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
  *(Si PowerShell bloquea la ejecución de scripts, ejecuta una vez: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

* **En macOS / Linux:**
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  ```

#### B. Instalar dependencias del backend

Con el entorno virtual activado:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### C. Configurar variables de entorno (`.env`)

Copia el archivo de ejemplo a un archivo `.env`:
* **En Windows:**
  ```powershell
  copy .env.example .env
  ```
* **En Linux/macOS:**
  ```bash
  cp .env.example .env
  ```

Abre `backend/.env` y ajusta las credenciales de tu SQL Server:
```ini
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=GimnasioDB
DB_USER=sa
DB_PASSWORD=TuPasswordSeguro123!
DB_DRIVER={ODBC Driver 17 for SQL Server}
ALLOWED_ORIGINS=http://localhost:3000
```
> **Nota:** Si utilizas autenticación de Windows, puedes activar `DB_TRUSTED_CONNECTION=yes`.

#### D. Iniciar el servidor FastAPI

```bash
uvicorn main:app --reload --port 8000
```

* **API en ejecución:** [http://localhost:8000](http://localhost:8000)
* **Documentación interactiva Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check & Diagnóstico BD:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 3️⃣ Configurar y Levantar el Frontend (Next.js)

Abre **otra pestaña o ventana de la terminal** y navega a la carpeta `frontend`:

```bash
cd frontend
```

#### A. Configurar variables de entorno (`.env.local`)

* **En Windows:**
  ```powershell
  copy .env.local.example .env.local
  ```
* **En Linux/macOS:**
  ```bash
  cp .env.local.example .env.local
  ```

El contenido por defecto apunta a tu backend local:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### B. Instalar dependencias de Node.js

```bash
npm install
```

#### C. Iniciar el servidor de desarrollo

```bash
npm run dev
```

* **Aplicación Frontend:** [http://localhost:3000](http://localhost:3000)

En la pantalla principal de la aplicación, podrás probar la conectividad con el backend haciendo clic en el botón de **"Probar Conexión con FastAPI"**.

---

## 🛠️ Flujo de Trabajo para Cada Desarrollador

1. **Crear una rama para tu tarea:**
   ```bash
   git checkout -b feature/persona1-registro-socios
   # o
   git checkout -b feature/persona2-catalogo-clases
   # o
   git checkout -b feature/persona3-pagos-contratos
   ```
2. **Desarrollar tus consultas SQL nativas:**
   Trabaja dentro de tu archivo correspondiente (`auth_socios.py`, `clases.py` o `contratos.py`).
   Utiliza siempre:
   ```python
   with get_db_connection() as conn:
       with conn.cursor() as cursor:
           cursor.execute("SELECT ... WHERE columna = ?", (valor,))
   ```
3. **Consumir los endpoints desde Next.js:**
   Importa `apiClient` desde `@/services/apiClient` para realizar peticiones desde tus componentes React.
4. **Hacer commit y push a tu rama:**
   ```bash
   git add .
   git commit -m "feat(socios): agregar endpoint para listar socios por estado"
   git push origin feature/persona1-registro-socios
   ```

---

## ☁️ Despliegue en Vercel (Frontend)

1. Sube tu repositorio a GitHub.
2. Inicia sesión en [Vercel](https://vercel.com/) e importa el proyecto seleccionando el directorio raíz como `frontend`.
3. En la sección **Environment Variables** de Vercel, agrega:
   * `NEXT_PUBLIC_API_URL`: La URL pública donde tengas desplegado tu backend FastAPI.
4. Presiona **Deploy**. Next.js compilará y desplegará la interfaz de forma automática.
