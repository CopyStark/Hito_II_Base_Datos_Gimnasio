# 🏋️‍♂️ GimnasioDB - Sistema de Gestión de Gimnasio

Sistema integral de gestión de gimnasios desarrollado con una arquitectura modular **API-First**, desacoplando completamente el backend y el frontend para facilitar el trabajo colaborativo en equipo con **Google Antigravity IDE**.

---

## 📐 Stack Tecnológico y Arquitectura

* **Backend:** Python 3.10+ con **FastAPI** y servidor ASGI **Uvicorn**.
* **Acceso a Datos:** **`pyodbc`** (Conexión nativa a Microsoft SQL Server mediante sentencias explícitas T-SQL).
* **Frontend:** **Next.js 14** (React 18, App Router, TypeScript, TailwindCSS), optimizado para despliegue en **Vercel**.
* **Infraestructura Cloud:** Backend dockerizado para **Render** (Debian 12 con `msodbcsql17` y `msodbcsql18`).

### ⚠️ Reglas Críticas del Proyecto (ESTRICTAS)

1. **PROHIBIDO EL USO DE CUALQUIER ORM:**  
   Queda terminantemente prohibido el uso de SQLAlchemy ORM, Prisma, Django ORM o similares. Todo acceso a datos debe realizarse mediante **sentencias SQL nativas y explícitas**, utilizando consultas parametrizadas con marcadores de posición `?` en `pyodbc` para prevenir ataques de SQL Injection:
   ```python
   # ✅ CORRECTO (Consulta explícita parametrizada):
   with get_db_connection() as conn:
       with conn.cursor() as cursor:
           cursor.execute("SELECT * FROM Socio WHERE rut = ?", (rut,))

   # ❌ PROHIBIDO (Concatenación / SQL Injection):
   cursor.execute(f"SELECT * FROM Socio WHERE rut = '{rut}'")
   ```
2. **Arquitectura API-First:**  
   El frontend en ningún caso se conecta de forma directa a SQL Server. Toda interacción de datos se realiza consumiendo los endpoints REST provistos por la API de FastAPI a través de `frontend/src/services/apiClient.ts`.
3. **Control de CORS:**  
   El backend incluye middleware CORS configurado para admitir peticiones desde el frontend en desarrollo (`http://localhost:3000`) y cualquier dominio generado por Vercel (`https://*.vercel.app`).

---

## 👥 División de Trabajo del Equipo (3 Personas)

| Rol | Integrante | Módulo / Router | Archivo Backend | Responsabilidades Principales |
| :--- | :--- | :--- | :--- | :--- |
| **Persona 1** | Carlos | `/socios` | `backend/routers/auth_socios.py` | Esqueleto de BD, datos de prueba (`seed_inicial.sql`), registro de socios, administración, credenciales y estados de socios. |
| **Persona 2** | Integrante 2 | `/clases` | `backend/routers/clases.py` | Catálogo de clases deportivas, asignación de instructores, control de cupos y horarios, inscripción a sesiones. |
| **Persona 3** | Integrante 3 | `/contratos` | `backend/routers/contratos.py` | Gestión de planes de membresía, contratos de socios, procesamiento atómico de pagos y estados de cuenta. |

---

## 🤖 Guía Paso a Paso para Trabajar con Google Antigravity

Cada integrante del equipo debe seguir estos pasos en su propia computadora:

### 1️⃣ Clonar el Repositorio y Abrir en Antigravity
Abre la terminal de tu computadora y clona el proyecto:
```bash
git clone https://github.com/CopyStark/Hito_II_Base_Datos_Gimnasio.git
cd Hito_II_Base_Datos_Gimnasio
```
Luego, abre **Antigravity IDE** y ve a **File > Open Folder...** seleccionando la carpeta `Hito_II_Base_Datos_Gimnasio`.

---

### 2️⃣ Crear tu Rama de Git de Trabajo
Nunca trabajes directamente sobre `main`. Crea una rama con tu rol:
* **Persona 2:** `git checkout -b feature/persona2-clases`
* **Persona 3:** `git checkout -b feature/persona3-contratos`
* **Persona 1:** `git checkout -b feature/persona1-socios`

---

### 3️⃣ Cargar la Base de Datos Inicial en tu SQL Server
Abre **SQL Server Management Studio (SSMS)** o Azure Data Studio:
1. Abre el archivo `database/seed_inicial.sql`.
2. Presiona **Execute (F5)**.
3. El script creará la jerarquía geográfica (Región, Provincia, Comuna, Ciudad), las 2 Sedes, los 2 Planes, los 2 Instructores y los 3 Socios de prueba (Daniel Matus, Emilia Osorio y Yulissa Ulloa).

---

### 4️⃣ Configurar y Levantar el Backend (FastAPI) en Antigravity

Abre la terminal integrada de Antigravity (``Ctrl + ` `` o ``Cmd + ` ``):

```powershell
cd backend

# Crear entorno virtual de Python
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1    # En macOS/Linux: source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env          # En Linux/macOS: cp .env.example .env
```

Abre `backend/.env` y coloca tu contraseña de SQL Server local:
```ini
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=GimnasioDB
DB_USER=sa
DB_PASSWORD=TuPasswordDeSQLServer
DB_DRIVER=ODBC Driver 17 for SQL Server
ALLOWED_ORIGINS=http://localhost:3000
```

Inicia el backend:
```bash
uvicorn main:app --reload --port 8000
```
* **Swagger UI interactivo:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Diagnóstico de salud de BD:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 5️⃣ Configurar y Levantar el Frontend (Next.js)

En otra pestaña de la terminal integrada de Antigravity:
```powershell
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```
* **Frontend interactivo:** [http://localhost:3000](http://localhost:3000)

---

### 💬 Prompts Recomendados para Guiar a Antigravity

Cuando interactúes con el agente de Antigravity para desarrollar tu parte, copia y pega el prompt que corresponde a tu rol:

#### Para Persona 2 (Clases & Sesiones):
> *"Actúa como un desarrollador Full Stack experto. Mi rol en el equipo es **Persona 2**. Mi responsabilidad es implementar y extender el módulo en `backend/routers/clases.py` y sus schemas en `backend/schemas/__init__.py`.  
> **REGLAS ESTRICTAS DEL PROYECTO:**  
> 1. Prohibido el uso de ORM (No SQLAlchemy, No Prisma).  
> 2. Todas las consultas a SQL Server deben ser sentencias SQL explícitas y parametrizadas con `?` usando `pyodbc` e inyectando `get_db_connection()`.  
> 3. Implementa los endpoints para listar clases disponibles con sus cupos, crear clases e inscribir socios validando que no se supere el cupo máximo."*

#### Para Persona 3 (Membresías, Contratos y Pagos):
> *"Actúa como un desarrollador Full Stack experto. Mi rol en el equipo es **Persona 3**. Mi responsabilidad es implementar y extender el módulo en `backend/routers/contratos.py` y sus schemas en `backend/schemas/__init__.py`.  
> **REGLAS ESTRICTAS DEL PROYECTO:**  
> 1. Prohibido el uso de ORM (No SQLAlchemy, No Prisma).  
> 2. Todas las consultas a SQL Server deben ser sentencias SQL explícitas y parametrizadas con `?` usando `pyodbc` e inyectando `get_db_connection()`.  
> 3. Implementa los endpoints para listar contratos, crear planes de membresía para un socio y registrar pagos atómicos actualizando el estado del contrato a 'pagado'."*

---

### 6️⃣ Probar tus Cambios y Subir a GitHub

Una vez que completes y pruebes tus endpoints en Swagger (`http://localhost:8000/docs`):

```bash
git add .
git commit -m "feat(modulo): descripcion clara de tus cambios"
git push origin feature/tu-rama
```
Crea un **Pull Request** en GitHub hacia `main`. 

> **Tip de despliegue:**  
> Si quieres que tu frontend de Vercel apunte a tu backend local mientras desarrollas, abre el frontend en Vercel, presiona **`⚙️ Cambiar URL Backend`**, pega la URL de tu túnel local o instancia de Render y presiona **Guardar**.

---

## 📂 Estructura del Repositorio

```text
/
├── backend/
│   ├── Dockerfile            # Imagen Debian 12 Bookworm con drivers oficiales de Microsoft
│   ├── .env.example          # Plantilla con parámetros de conexión a SQL Server
│   ├── requirements.txt      # fastapi, uvicorn, pyodbc, pydantic, email-validator
│   ├── main.py               # Entrada FastAPI, CORS inteligente y montaje de routers
│   ├── db/
│   │   ├── __init__.py
│   │   └── connection.py     # Manejador singleton de conexión pyodbc con control de excepciones
│   ├── routers/              # Controladores REST modulares por persona
│   │   ├── __init__.py
│   │   ├── auth_socios.py    # Persona 1: Acceso y Socios
│   │   ├── clases.py         # Persona 2: Sesiones e Inscripciones
│   │   └── contratos.py      # Persona 3: Membresías y Pagos
│   └── schemas/              # Modelos Pydantic de validación
│       └── __init__.py
├── database/
│   └── seed_inicial.sql      # Script T-SQL con geografía, sedes, planes, instructores y socios
├── frontend/
│   ├── package.json          # Next.js 14, React 18, TailwindCSS, Lucide
│   ├── next.config.js        # Configuración para despliegue en Vercel
│   ├── .env.local.example    # NEXT_PUBLIC_API_URL=http://localhost:8000
│   └── src/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx      # Landing page de diagnóstico y división del equipo
│       ├── components/       # Componentes UI reutilizables
│       └── services/
│           └── apiClient.ts  # Cliente HTTP tipado con soporte para cambio dinámico de URL
├── .gitignore
└── README.md                 # Esta guía completa
```
