# 🏋️‍♂️ GimnasioDB - Sistema de Gestión de Gimnasio

Sistema integral de gestión de gimnasios con arquitectura modular **API-First**, desacoplando frontend y backend para desarrollo colaborativo en equipo con **Google Antigravity IDE**.

---

## 🌐 Enlaces del Proyecto en Producción

* **Repositorio GitHub:** [https://github.com/CopyStark/Hito_II_Base_Datos_Gimnasio.git](https://github.com/CopyStark/Hito_II_Base_Datos_Gimnasio.git)
* **Backend en Render:** [https://gimnasio-backend-c3mu.onrender.com](https://gimnasio-backend-c3mu.onrender.com)
* **Documentación Swagger:** [https://gimnasio-backend-c3mu.onrender.com/docs](https://gimnasio-backend-c3mu.onrender.com/docs)
* **Health Check API:** [https://gimnasio-backend-c3mu.onrender.com/api/health](https://gimnasio-backend-c3mu.onrender.com/api/health)

---

## 📐 Stack y Reglas Críticas (ESTRICTAS)

* **Backend:** Python 3.10+ con **FastAPI** y servidor ASGI **Uvicorn**.
* **Acceso a Datos:** **`pyodbc`** (Conexión nativa a Microsoft SQL Server).
* **Frontend:** **Next.js 14** (React 18, App Router, TypeScript, TailwindCSS), optimizado para **Vercel**.

1. **PROHIBIDO EL USO DE ORM:**  
   No usar SQLAlchemy, Prisma ni Django ORM. Todo el acceso a datos debe ser mediante sentencias SQL explícitas y parametrizadas con `?`:
   ```python
   # ✅ CORRECTO:
   with get_db_connection() as conn:
       with conn.cursor() as cursor:
           cursor.execute("SELECT * FROM Socio WHERE rut = ?", (rut,))
   ```
2. **Arquitectura API-First:**  
   El frontend no se conecta a SQL Server. Todo el consumo se realiza vía HTTP REST a través de `frontend/src/services/apiClient.ts`.
3. **CORS:**  
   FastAPI admite peticiones locales (`http://localhost:3000`) y cualquier dominio generado por Vercel (`https://*.vercel.app`).

---

## 👥 División de Trabajo del Equipo

| Integrante | Rol | Router Backend | Archivo | Responsabilidades |
| :--- | :--- | :--- | :--- | :--- |
| **Carlos** | Persona 1 | `/socios` | `backend/routers/auth_socios.py` | Esqueleto BD, `seed_inicial.sql`, gestión y registro de socios. |
| **Integrante 2** | Persona 2 | `/clases` | `backend/routers/clases.py` | Catálogo de clases, cupos, horarios e inscripciones. |
| **Integrante 3** | Persona 3 | `/contratos` | `backend/routers/contratos.py` | Planes de membresía, contratos y registro atómico de pagos. |

---

## 🚀 Puesta en Marcha en Local

### 1. Clonar el repositorio y crear tu rama
```bash
git clone https://github.com/CopyStark/Hito_II_Base_Datos_Gimnasio.git
cd Hito_II_Base_Datos_Gimnasio
git checkout -b feature/tu-modulo
```

### 2. Cargar Base de Datos de Prueba (SQL Server)
Abre **SQL Server Management Studio (SSMS)** y ejecuta en orden:
1. `database/GimnasioDB_DDL.sql` (crea la base de datos y su esquema relacional)
2. `database/GimnasioDB_Seed.sql` (puebla los datos de prueba iniciales)

### 3. Levantar el Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1    # En Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Configura tus credenciales de SQL Server en .env
uvicorn main:app --reload --port 8000
```

### 4. Levantar el Frontend (Next.js)
En otra terminal:
```powershell
cd frontend
npm install
npm run dev
```
La aplicación web abrirá en [http://localhost:3000](http://localhost:3000) conectada por defecto a Render.

---

## 🌿 Flujo de Trabajo Git
1. Desarrolla únicamente en tu archivo asignado (`auth_socios.py`, `clases.py` o `contratos.py`).
2. Sube tus cambios a tu rama:
   ```bash
   git add .
   git commit -m "feat(modulo): descripcion de cambios"
   git push origin feature/tu-modulo
   ```
3. Realiza un Pull Request hacia `main`. Al fusionar, Render y Vercel se actualizarán automáticamente.

---

## 📂 Estructura del Proyecto

```text
/
├── backend/
│   ├── Dockerfile            # Configuración Debian 12 con drivers oficiales Microsoft
│   ├── .env.example          # Plantilla de variables para SQL Server
│   ├── requirements.txt      # fastapi, uvicorn, pyodbc, pydantic, email-validator
│   ├── main.py               # Entrada FastAPI y montaje de routers
│   ├── db/
│   │   ├── __init__.py
│   │   └── connection.py     # Manejo singleton de pyodbc con control de excepciones
│   ├── routers/              # Controladores REST modulares por persona
│   │   ├── auth_socios.py    # Persona 1
│   │   ├── clases.py         # Persona 2
│   │   └── contratos.py      # Persona 3
│   └── schemas/              # Modelos Pydantic de validación
├── database/
│   └── seed_inicial.sql      # Script T-SQL con geografía, sedes, planes y socios
├── frontend/
│   ├── package.json          # Next.js 14, React 18, TailwindCSS
│   ├── next.config.js        # Configuración para despliegue
│   ├── src/
│   │   ├── app/              # App Router (layout.tsx, page.tsx)
│   │   ├── components/       # Componentes UI reutilizables
│   │   └── services/
│   │       └── apiClient.ts  # Cliente HTTP tipado conectado a Render
├── .gitignore
└── README.md
```
