# Guía Técnica de Arquitectura y Defensa de Proyecto: GimnasioDB
> **Documento Oficial de Preparación para la Defensa ante la Comisión Evaluadora**  
> **Proyecto:** Sistema Integral de Gestión Deportiva y Base de Datos Transaccional (`GimnasioDB`)  
> **Integrantes y Distribución Modular:**  
> - **Persona 1:** Módulo Socios, Autenticación y Control de Acceso (Torniquete)  
> - **Persona 2:** Módulo Clases, Sesiones, Inscripciones, Asistencia e Inventario  
> - **Persona 3:** Módulo Contratos, Planes de Membresía, Pagos y Finanzas  

---

## 1. Flujo de Datos Completo (End-to-End)

El sistema opera bajo un patrón estricto **API-First desacoplado**: la interfaz web en React (Next.js) **nunca** se conecta directamente a la base de datos ni expone credenciales en el cliente; toda la lógica de negocio, persistencia y validaciones transaccionales se canalizan a través de la API REST construida en **FastAPI** y el driver de bajo nivel **`pyodbc`**, delegando la integridad referencial y las reglas críticas a **Microsoft SQL Server**.

```
[ Usuario en Navegador ]
         │
         ▼  (1) Evento de usuario (ej. Clic en "Inscribirme" a una sesión)
[ React Client Component ] ───► hook / handler (page.tsx)
         │
         ▼  (2) Invocación de método tipado
[ apiClient.ts ] ─────────────► fetch() HTTP POST con JSON Payload
         │
         ▼  (3) Tráfico seguro HTTPS / TLS hacia Render
[ FastAPI Router ] ───────────► Ingestión en @router.post("/clases/inscripciones")
         │
         ▼  (4) Validación sintáctica y estructural
[ Esquema Pydantic ] ─────────► InscribirSocioRequest (tipos, campos obligatorios, rangos)
         │
         ▼  (5) Context Manager seguro con manejo transaccional
[ backend/db/connection.py ] ─► get_db_connection() [autocommit=False]
         │
         ▼  (6) Consulta parametrizada pura (Sin ORM)
[ pyodbc Cursor ] ────────────► cursor.execute("EXEC sp_Inscribir_Socio ?, ?", (id_socio, id_sesion))
         │
         ▼  (7) Protocolo TDS (Tabular Data Stream) sobre TCP 1433
[ Microsoft SQL Server ] ─────► Motor Transact-SQL
                                  ├── Bloqueo concurrente: WITH (UPDLOCK, HOLDLOCK)
                                  ├── Validaciones de negocio (Socio activo, contrato vigente, cupos libres)
                                  ├── INSERT transaccional en tabla [Inscripcion]
                                  └── Retorno de SCOPE_IDENTITY() o THROW 50010/50020/50030
         │
         ▼  (8) Retorno pyodbc (conn.commit() si éxito / conn.rollback() si excepción)
[ FastAPI Exception Handler ] ─► _sp_error_to_http() traduce THROW a HTTP 400 / 404 / 409
         │
         ▼  (9) Respuesta HTTP JSON ({ "id_inscripcion": ... } o { "detail": "..." })
[ apiClient.ts ] ─────────────► Deserialización y captura de ApiError con .response.data.detail
         │
         ▼  (10) Actualización reactiva del estado
[ React UI / Toast Flotante ] ─► Notificación flotante fija en pantalla con estilo de alerta
```

### Trace Detallado de una Operación (Ejemplo: Inscripción de un Socio)
1. **Disparador en Interfaz (React Client):** En `frontend/src/app/clases/page.tsx`, el usuario selecciona una sesión disponible y hace clic en "Inscribirme". Se desactiva el botón y se activa `actionLoadingId` para prevenir doble envío accidental.
2. **Cliente HTTP (`apiClient.ts`):** `clasesApi.inscribirSocio()` ejecuta una petición `POST` al endpoint `/clases/inscripciones` con el payload `{ id_socio_inscripcion, id_sesion_inscripcion }`.
3. **CORS & Middleware:** FastAPI valida el encabezado `Origin` contra los dominios permitidos (Vercel y desarrollo local).
4. **Validación Pydantic:** Se valida el payload contra `InscribirSocioRequest`. Si un parámetro viene corrupto o nulo, FastAPI responde `HTTP 422 Unprocessable Entity` inmediatamente, protegiendo a la base de datos de cargas espurias.
5. **Apertura de Conexión ODBC:** Mediante el context manager `get_db_connection()`, se toma una conexión ODBC con `autocommit=False`.
6. **Ejecución Parametrizada del SP:** Se ejecuta `"EXEC sp_Inscribir_Socio ?, ?"` pasando los valores en una tupla. El driver `pyodbc` enlaza las variables a nivel de protocolo, haciendo la inyección SQL matemáticamente imposible.
7. **Lógica Transaccional en SQL Server:**
   - Verifica existencia y estado activo del socio (`activo_socio = 1`).
   - Verifica que la fecha y hora de la sesión sean futuras respecto al reloj del servidor.
   - Verifica que el socio posea un contrato en estado `'Vigente'` que cubra la fecha de la clase.
   - Aplica bloqueo exclusivo con `WITH (UPDLOCK, HOLDLOCK)` sobre la fila de la sesión para evitar condiciones de carrera (overbooking cuando dos personas reservan el último cupo en el mismo milisegundo).
   - Valida cupos disponibles (`total_inscritos < cupo_maximo_sesion`).
   - Inserta la fila en la tabla `Inscripcion` con estado `'Inscrito'` y devuelve el identificador recién creado.
8. **Compromiso / Retorno:** El context manager ejecuta `conn.commit()`, FastAPI retorna el JSON `{ "id_inscripcion": <ID> }` con código `HTTP 201 Created`.
9. **Respuesta en React:** El frontend recibe el código de éxito, recarga automáticamente las sesiones (actualizando el cupo en pantalla) y la lista de próximas clases del socio, mostrando un Toast de confirmación.

---

## 2. Endpoints Implementados, Stored Procedures y Vistas SQL

Cada módulo del sistema cuenta con una separación de responsabilidades clara y armónica entre los tres integrantes del equipo:

### Persona 1: Módulo Socios, Autenticación y Control de Acceso (`/socios`)
*Responsable del ciclo de vida del afiliado, seguridad de credenciales y validación física en torniquetes.*

| Método HTTP | Ruta Endpoint | Stored Procedure / Vista SQL | Propósito Técnico |
|---|---|---|---|
| `GET` | `/socios` | Consulta parametrizada sobre `[dbo].[Socio]` | Catálogo general de socios con búsqueda por RUT/nombre y filtro por sede. |
| `GET` | `/socios/{id}` | `SELECT ... WHERE id_socio = ?` | Consulta detallada del perfil de un afiliado. |
| `POST` | `/socios` | `sp_Registrar_Socio` | Alta de socio con validación de unicidad de RUT y correo (`THROW 50020`). |
| `PUT` | `/socios/{id}` | Consulta parametrizada `UPDATE` | Actualización de datos de contacto (teléfono, correo, sede habitual). |
| `PATCH` | `/socios/{id}/estado` | Consulta parametrizada `UPDATE` | Alta/baja lógica del socio (`activo_socio = 0/1`). |
| `POST` | `/socios/{id}/credenciales` | `sp_Asignar_Credenciales_Socio` | Configuración segura de usuario y contraseña para el portal web. |
| `POST` | `/socios/login` | Consulta con verificación de credenciales | Validación de credenciales de acceso para afiliados. |
| `GET` | `/socios/acceso/validar/{id}` | `sp_Validar_Acceso_Torniquete` | Validación en tiempo real para torniquete: evalúa contrato vigente y estado activo (`THROW 50030`). |
| `GET` | `/socios/sedes/catalogo` | `SELECT id_sede, nombre_sede FROM Sede` | Catálogo liviano para selectores y combos en formularios. |
| `GET` | `/socios/reportes/por-sede` | `vw_Reporte_Socios_Por_Sede` | Muestra cantidad de socios totales y activos agrupados por cada sede. |

### Persona 2: Módulo Clases, Sesiones, Inscripciones y Equipamiento (`/clases`)
*Responsable del agendamiento deportivo, reserva de cupos con concurrencia controlada, pase de asistencia e inventario.*

| Método HTTP | Ruta Endpoint | Stored Procedure / Vista SQL | Propósito Técnico |
|---|---|---|---|
| `GET` | `/clases` | `SELECT ... FROM [dbo].[Clase]` | Catálogo de disciplinas, duración y niveles de exigencia. |
| `GET` | `/clases/sesiones` | `vw_Sesiones_Disponibles` | Sesiones con cálculo dinámico de cupos libres (`cupo_maximo - total_inscritos`). Filtros por fecha, sede y clase. |
| `POST` | `/clases/inscripciones` | `sp_Inscribir_Socio` | Reserva de cupo con bloqueo `UPDLOCK, HOLDLOCK`. Valida socio activo, sesión futura, contrato vigente y cupo disponible. |
| `PATCH` | `/clases/inscripciones/{id}/cancelar` | `sp_Cancelar_Inscripcion` | Cancela reserva activa de sesión futura y libera automáticamente el cupo en el catálogo. |
| `GET` | `/clases/sesiones/{id}/inscritos` | `SELECT ... Inscripcion INNER JOIN Socio` | Nómina de alumnos inscritos en una sesión específica para el pase de lista del instructor. |
| `PATCH` | `/clases/inscripciones/{id}/asistencia` | `sp_Registrar_Asistencia` | Registro de asistencia (`asistio_inscripcion = 1/0`) y observaciones del instructor sobre inscripciones válidas. |
| `POST` | `/clases/sesiones` | `sp_Programar_Sesion` | Publicación de nueva clase en calendario. Valida horario futuro, instructor disponible y sede. |
| `GET` | `/clases/socios/{id}/inscripciones` | `SELECT ... FROM Inscripcion` con JOINs | Consulta de 'Próximas Clases' e 'Historial' para el socio en sesión. |
| `GET` | `/clases/instructores` | `SELECT ... FROM [dbo].[Instructor]` | Catálogo de profesores con sede habitual asignada. |
| `GET` | `/clases/instructores/{id}/sesiones` | `sp_Sesiones_Por_Instructor` | Agenda personalizada del instructor para el pase de asistencia. |
| `GET` | `/clases/sedes` | `SELECT ... FROM [dbo].[Sede]` | Sedes activas con ubicación física. |
| `GET` | `/clases/equipos` | `vw_Inventario_Equipos` | Inventario de máquinas por sede con cálculo de antigüedad en años. |
| `POST` | `/clases/equipos` | `sp_Registrar_Equipamiento` | Alta de nuevo equipamiento deportivo en una sede. |
| `PUT` | `/clases/equipos/{id}` | `sp_Actualizar_Equipamiento` | Actualización de descripción o estado de máquinas. |
| `DELETE` | `/clases/equipos/{id}` | `sp_Eliminar_Equipamiento` | Baja física/lógica de máquinas en desuso. |
| `GET` | `/clases/reportes/ocupacion` | `vw_Reporte_Ocupacion_Clases` | Porcentaje de ocupación por disciplina y sede para toma de decisiones. |
| `GET` | `/clases/reportes/ranking` | `vw_Ranking_Clases_Demandadas` | Top de disciplinas más concurridas ordenadas por volumen de reservas. |

### Persona 3: Módulo Planes, Contratos, Pagos y Finanzas (`/contratos`)
*Responsable de la viabilidad económica, suscripciones de membresías, recaudación en caja y mantenimiento de contratos.*

| Método HTTP | Ruta Endpoint | Stored Procedure / Vista SQL | Propósito Técnico |
|---|---|---|---|
| `GET` | `/contratos/planes` | `SELECT ... FROM [dbo].[PlanMembresia]` | Catálogo de planes vigentes con duración en meses y arancel. |
| `POST` | `/contratos/planes` | `INSERT ... INTO PlanMembresia` | Creación de nuevos planes de suscripción. |
| `GET` | `/contratos` | Consulta parametrizada sobre `[dbo].[Contrato]` | Consulta de contratos emitidos con filtros por estado, plan y socio. |
| `POST` | `/contratos/emitir` | `sp_Emitir_Contrato_Con_Pago` | Emisión atómica transaccional: crea el contrato y registra su pago inicial en un único paso ACID. |
| `PATCH` | `/contratos/{id}/estado` | `UPDATE ... SET estado_contrato = ?` | Transición manual de estado (`Vigente`, `Vencido`, `Cancelado`). |
| `POST` | `/contratos/actualizar-vencidos`| `sp_Actualizar_Contratos_Vencidos` | Proceso batch automático: cambia a `'Vencido'` todo contrato cuya fecha de término haya expirado. |
| `GET` | `/contratos/pagos` | Consulta sobre `[dbo].[Pago]` | Auditoría de cobros recibidos con desglose de medio de pago y fecha. |
| `POST` | `/contratos/pagos` | `sp_Registrar_Pago_Contrato` | Cobro de cuotas subsecuentes asociadas a un contrato vigente (`THROW 50010/50030`). |
| `GET` | `/contratos/personal` | `SELECT ... FROM [dbo].[Personal]` | Nómina de funcionarios administrativos y de operaciones. |
| `POST` | `/contratos/personal` | `INSERT ... INTO Personal` | Contratación y registro de nuevo funcionario asignado a sede. |
| `GET` | `/contratos/reportes/ingresos-sede`| `vw_Reporte_Ingresos_Por_Sede` | Resumen financiero consolidado de ingresos brutos por sede y período. |

---

## 3. Conexión y Gestión Segura de Credenciales

La arquitectura de conexión está centralizada en `backend/db/connection.py` bajo rigurosos estándares de seguridad informática y buenas prácticas de despliegue cloud:

### 3.1. Aislamiento de Secretos mediante `.env`
- Ninguna credencial, host, puerto ni contraseña se encuentra hardcodeada en el código fuente.
- El archivo `.env` reside exclusivamente en el entorno de ejecución local o en las variables secretas de Render en producción.
- El archivo `.gitignore` excluye taxativamente `.env` para impedir fugas de credenciales en repositorios Git públicos o privados.
- Parámetros esenciales leídos por `os.getenv()`:
  * `DB_SERVER`: Hostname del servidor (ej. Azure SQL, RDS o servidor dedicado de SQL Server).
  * `DB_PORT`: Puerto TCP (por defecto `1433`).
  * `DB_NAME`: Base de datos de destino (`GimnasioDB`).
  * `DB_USER`: Usuario autorizado con privilegios mínimos requeridos (Principio de Menor Privilegio).
  * `DB_PASSWORD`: Clave criptográfica del usuario de base de datos.
  * `DB_DRIVER`: Driver oficial ODBC (`ODBC Driver 17 for SQL Server`).
  * `DB_ENCRYPT`: Canal cifrado TLS/SSL (`yes`/`no`).
  * `DB_TRUST_SERVER_CERTIFICATE`: Configuración de validación de certificados de servidor.

### 3.2. Ciclo de Vida Administrado con Context Manager (`get_db_connection()`)
En lugar de mantener conexiones globales abiertas (que sufren caídas por timeout o fugas de sockets), se implementó un generador decorado con `@contextmanager`:

```python
@contextmanager
def get_db_connection() -> Generator[pyodbc.Connection, None, None]:
    conn = None
    conn_str = get_connection_string()
    try:
        conn = pyodbc.connect(conn_str, autocommit=False)
        yield conn
        conn.commit()  # Compromiso automático si el bloque 'with' finaliza sin error
    except pyodbc.Error as db_err:
        if conn:
            conn.rollback()  # Rollback inmediato ante cualquier fallo de SQL Server
        logging.error(f"[ERROR pyodbc.Error] Fallo en operación de base de datos: {db_err}")
        raise db_err
    except Exception as exc:
        if conn:
            conn.rollback()
        logging.error(f"[ERROR INESPERADO] Excepción general: {exc}")
        raise exc
    finally:
        if conn:
            conn.close()  # Cierre garantizado del socket ODBC
```

#### Ventajas Técnicas para la Defensa:
1. **Transacciones Atómicas:** `autocommit=False` obliga a que cada bloque de ejecución sea una transacción formal. Si el código falla a la mitad, `conn.rollback()` anula los cambios parciales, garantizando que la base de datos nunca quede en estado inconsistente.
2. **Cero Fuga de Conexiones (Connection Leak Prevention):** El bloque `finally: conn.close()` se ejecuta **siempre**, incluso si ocurre un kernel panic en Python o una excepción imprevista.
3. **Cero Inyección SQL:** Todas las consultas ejecutan la sintaxis `cursor.execute(sql, tupla_parametros)`. Los parámetros se transmiten en secciones de datos independientes del comando SQL.

---

## 4. Mecanismo de Captura y Traducción de Errores (`_sp_error_to_http`)

Uno de los puntos más sólidos del sistema es su **alta resiliencia**: la aplicación web y la API de FastAPI **nunca colapsan ni generan un Crash 500 incontrolado** cuando SQL Server rechaza una operación.

### 4.1. Convención de Códigos de Error Transact-SQL (`THROW`)
En los Stored Procedures (`sp_clases.sql`, `sp_socios.sql`, `sp_contratos.sql`), las reglas de negocio inválidas no se ignoran ni devuelven códigos mágicos: se lanzan mediante la sentencia nativa `THROW` con rangos numéricos bien definidos:
- **`50010` (Recurso No Encontrado):** El socio, sesión, contrato o instructor especificado no existe en la BD.
- **`50020` (Conflicto de Estado / Concurrencia):** Intento de inscripción en sesión sin cupos disponibles, socio que ya estaba inscrito previamente, o RUT duplicado.
- **`50030` (Regla de Negocio Incumplida):** Socio inactivo, sesión en fecha pasada, socio sin contrato vigente al momento de la clase, o intento de cancelar una clase que ya comenzó.

### 4.2. Función Traductora en FastAPI
Cuando `pyodbc` detecta un error de SQL Server, empaqueta el error nativo en una excepción `pyodbc.Error`. La función `_sp_error_to_http(exc)` intercepta este objeto antes de que llegue a FastAPI:

```python
def _sp_error_to_http(exc: pyodbc.Error) -> HTTPException:
    msg_completo = str(exc)

    # 1. Extrae el código numérico de error usando expresión regular: (500XX)
    numero_error: Optional[int] = None
    match = re.search(r"\((\d+)\)", msg_completo)
    if match:
        numero_error = int(match.group(1))

    # 2. Limpia el mensaje para remover metadatos del driver ODBC
    # Ejemplo entrada: "[SQL Server]El socio no cuenta con un contrato vigente. (50030) (SQLExecDirectW)"
    # Salida limpia  : "El socio no cuenta con un contrato vigente."
    msg_sp = msg_completo
    partes = msg_completo.split("]")
    if len(partes) > 1:
        msg_sp = partes[-1].split("(")[0].strip().rstrip(",").strip()

    # 3. Mapeo semántico a códigos estándar del protocolo HTTP
    if numero_error == 50010:
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg_sp)
    if numero_error == 50020:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg_sp)
    if numero_error == 50030:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg_sp)

    # 4. Fallback de seguridad ante fallos inesperados de infraestructura (sin filtrar datos sensibles)
    logging.exception("Error de base de datos no controlado: %s", exc)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error interno en la base de datos. Contacte al administrador.",
    )
```

### 4.3. Consumo en Frontend y Despliegue en Toast Flotante
1. El backend responde con el código HTTP correspondiente (ej. `400 Bad Request`) y el cuerpo JSON:
   ```json
   { "detail": "El socio no cuenta con un contrato vigente para la fecha seleccionada." }
   ```
2. La clase `ApiError` de `apiClient.ts` empaqueta la respuesta exponiendo `err.response.data.detail`.
3. El componente React (`frontend/src/app/clases/page.tsx`) captura el error en su bloque `try...catch`:
   ```typescript
   catch (err: any) {
     const errorMsg = extraerMensajeError(err, "No fue posible completar la reserva.");
     setFeedback({ type: "error", message: errorMsg });
   }
   ```
4. El Toast Flotante (`fixed bottom-6 right-6 z-[9999]`) con estilo de alerta oscura de alta visibilidad (`bg-[#202120] border-[#ef4444] text-white`) presenta el mensaje exacto entregado por SQL Server al usuario de inmediato.

---

## 5. Justificación Técnica: Stored Procedures, Vistas y Pydantic vs. SQL Plano en Cursor

Durante la defensa técnica, es habitual que la comisión pregunte: *¿Por qué no ejecutaron consultas SQL directas en un cursor o utilizaron un ORM como SQLAlchemy o Prisma?*  
A continuación se presentan las razones técnicas y de ingeniería de software que fundamentan esta decisión:

| Criterio | Stored Procedures y Vistas (Arquitectura Elegida) | SQL Plano en Cursor / ORM Genérico |
|---|---|---|
| **Seguridad e Inmunidad a SQLi** | **Inmunidad absoluta.** La lógica reside precompilada en el motor SQL Server. Los datos se envían únicamente como parámetros tipados sin interpretación léxica. | **Alto riesgo.** Concatenar cadenas o interpolar variables (`f"SELECT... {id}"`) abre vectores de inyección SQL críticos. |
| **Rendimiento y Plan de Ejecución** | **Máximo rendimiento.** SQL Server analiza, compila y almacena en caché el plan de ejecución óptimo la primera vez que se ejecuta el SP. | **Sobrecarga de compilación.** El optimizador de consultas debe parsear y recalcular el plan de acceso en cada petición HTTP individual. |
| **Control de Concurrencia y Transacciones** | **Bloqueos finos en motor.** Uso nativo de `WITH (UPDLOCK, HOLDLOCK)` dentro del SP para reservas simultáneas sin sobrecupos. | **Riesgo de condición de carrera.** Manejar transacciones concurrentes desde código de aplicación suele provocar sobreventa de cupos (overbooking). |
| **Encapsulamiento de Reglas de Negocio** | **Reglas centralizadas.** Si la regla de validación de contratos cambia, se modifica el Stored Procedure sin necesidad de recompilar ni desplegar el frontend o el backend. | **Lógica dispersa.** Las reglas quedan repartidas en múltiples archivos de Python o TypeScript, dificultando el mantenimiento y auditoría. |
| **Abstracción de Reportes con Vistas** | **Vistas SQL optimizadas.** Consultas analíticas complejas con `JOIN`, `GROUP BY` y agregaciones se resuelven eficientemente dentro de la BD (`vw_Sesiones_Disponibles`). | **Tráfico de red innecesario.** Extraer cientos de registros para filtrarlos en bucles de Python satura el ancho de banda y la memoria del servidor. |
| **Validación de Tipos con Pydantic** | **Tipado estricto en el borde (Edge Validation).** Pydantic valida que los tipos, longitudes y formatos sean válidos antes de tocar la base de datos, auto-generando Swagger/OpenAPI. | **Validación manual propensa a fallos.** Requiere decenas de `if/else` en cada ruta para validar si los enteros son positivos o las cadenas no son nulas. |

### Conclusión para la Defensa
El uso combinado de **Stored Procedures** para operaciones transaccionales de escritura, **Vistas SQL** para consultas analíticas de lectura y esquemas **Pydantic** en FastAPI proporciona la combinación perfecta entre **seguridad empresarial**, **rendimiento optimizado**, **control de concurrencia** y **alta resiliencia ante errores**, cumpliendo de manera rigurosa con los objetivos académicos y técnicos del Hito II.

