# Plan, Guía de Pruebas y Documentación Técnica – Módulo Socios & Control de Acceso (Persona 1)

**Documento de Casos de Prueba para Swagger UI (`http://localhost:8000/docs`), Frontend y SSMS**  
**Responsable:** Persona 1 – Carlos (Acceso, Socios y Autenticación)  
**Router Backend:** `/socios` (`backend/routers/auth_socios.py`)  
**Vistas Frontend:** `/socios`, `/socios/sedes`, `/socios/torniquete`, `/socios/login`  
**Base de Datos:** `GimnasioDB` (Microsoft SQL Server)  
**Objetos SQL Server:**
- **Tablas:** `[dbo].[Socio]`, `[dbo].[Usuario]`, `[dbo].[Rol]`, `[dbo].[Sede]`, `[dbo].[Ciudad]`, `[dbo].[Contrato]`, `[dbo].[PlanMembresia]`
- **Vista Analítica:** `[dbo].[vw_Reporte_Socios_Por_Sede]`
- **Función Criptográfica:** `HASHBYTES('SHA2_512', @password)`

---

## 1. Resumen para Defensa Técnica Individual (Rúbrica Avance 60%)

### A. Explicación de Consultas SQL Parametrizadas y Prevención Estricta de SQL Injection
En todo el módulo (`backend/routers/auth_socios.py`) está **estrictamente prohibido el uso de ORM** (como SQLAlchemy o Prisma). Todas las interacciones con SQL Server se ejecutan mediante el driver `pyodbc` inyectando parámetros exclusivamente a través del marcador de posición posicional `?`:

```python
# Ejemplo de búsqueda dinámica segura en GET /socios/
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
cursor.execute(query, params)
```

* **Paginación nativa en el motor:** Se utiliza `OFFSET ? ROWS FETCH NEXT ? ROWS ONLY` nativo de SQL Server (disponible desde SQL Server 2012), lo que garantiza un consumo mínimo de memoria RAM y evita traer cientos de filas innecesarias a la aplicación.
* **Seguridad:** Los comodines `%` del operador `LIKE` se concatenan en la variable Python y se envían como parámetro tipado `?`, impidiendo que caracteres maliciosos (como `' OR '1'='1`) modifiquen el árbol de sintaxis de la consulta en SQL Server.

---

### B. Explicación de la Vista Analítica `[dbo].[vw_Reporte_Socios_Por_Sede]`
```sql
CREATE OR ALTER VIEW [dbo].[vw_Reporte_Socios_Por_Sede] AS
SELECT 
    s.nombre_sede,
    c.estado_contrato,
    COUNT(so.id_socio) AS cantidad_socios
FROM Sede s
INNER JOIN Socio so ON s.id_sede = so.id_sede_registro_socio
LEFT  JOIN Contrato c ON so.id_socio = c.id_socio_contrato
GROUP BY s.nombre_sede, c.estado_contrato;
```

* **Propósito:** Brinda a gerencia y recepción una vista consolidada en tiempo real de la distribución de socios por sede y por estado de contrato (`Vigente`, `Vencido`, `Cancelado` o `Sin Contrato`).
* **Justificación técnica:** 
  1. Combina `Sede` (tabla dimensional), `Socio` (entidad base) y `Contrato` (hechos operativos).
  2. Al usar `LEFT JOIN` con `Contrato`, no se excluyen del reporte aquellos socios recién inscritos que aún no han formalizado su primera membresía.
  3. Es consumida en backend mediante `GET /socios/reportes/por-sede` y presentada en frontend en la ruta `/socios/sedes` mediante tarjetas KPI y barras de desglose porcentual.

---

### C. Explicación de la Lógica de Control de Acceso en Tiempo Real (Torniquete)
El endpoint `GET /socios/acceso/validar/{identificador}` resuelve de forma atómica la validación en tiempo real para el paso físico por torniquete o recepción:

```sql
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
ORDER BY c.fecha_termino_contrato DESC;
```

* **Reglas de Negocio Evaluadas en Cascada:**
  1. **Existencia:** Si no hay coincidencia por ID ni por RUT $\rightarrow$ `acceso_permitido: false`, motivo: *"No encontrado"*.
  2. **Estado del Socio:** Si `activo_socio = 0` $\rightarrow$ `acceso_permitido: false`, motivo: *"Acceso DENEGADO: El socio se encuentra desactivado en el sistema."*
  3. **Vigencia del Contrato:** Si no existe contrato en estado `'Vigente'` o `fecha_termino_contrato < GETDATE()` $\rightarrow$ `acceso_permitido: false`, motivo: *"Acceso DENEGADO: El socio no posee un contrato o membresía vigente al día de hoy."*
  4. **Paso Concedido:** Si pasa los 3 filtros $\rightarrow$ `acceso_permitido: true`, motivo: *"Acceso PERMITIDO: Membresía 'Plan Trimestral Pro' vigente hasta AAAA-MM-DD"*.

---

### D. Explicación del Esquema Criptográfico de Autenticación
El sistema utiliza la función nativa de Microsoft SQL Server `HASHBYTES('SHA2_512', ?)` para el almacenamiento y comparación de contraseñas:

```sql
-- Inserción / Actualización de credenciales
UPDATE Usuario
SET username_usuario = ?,
    password_hash_usuario = HASHBYTES('SHA2_512', ?),
    id_rol_usuario = ?
WHERE id_socio_usuario = ?;

-- Validación en Login
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
  AND u.password_hash_usuario = HASHBYTES('SHA2_512', ?);
```

* **Beneficios técnicos:**
  1. La contraseña en texto plano nunca se guarda en disco ni en logs.
  2. Se almacena en la columna `password_hash_usuario VARBINARY(64)`.
  3. Si la cuenta de un socio se encuentra desactivada (`activo_socio = 0`), el login retorna inmediatamente `HTTP 403 Forbidden`, bloqueando el acceso a portales digitales.

---

## 2. Mapa de Datos del Seed (`database/GimnasioDB_Seed.sql`)

Para ejecutar las pruebas en Swagger UI (`/docs`) o frontend, se cuenta con los siguientes registros preconfigurados:

| ID Socio | RUT | Nombre Completo | Correo | Sede | Condición para Pruebas |
|---|---|---|---|---|---|
| **1** | `18.765.432-K` | Daniel Matus | `daniel.matus@alumnos.cl` | Sede 1 (Moneda) | **Socio Activo con Contrato Vigente**. Login: `socio1` / `Clave#socio1`. Acceso en torniquete: **PERMITIDO**. |
| **2** | `19.123.456-7` | Emilia Osorio | `emilia.osorio@alumnos.cl` | Sede 2 | Socio Activo con Contrato Vigente. Ideal para edición y actualización. |
| **3** | `19.987.654-3` | Yulissa Ulloa | `yulissa.ulloa@alumnos.cl` | Sede 1 | Socio Activo con Contrato Vigente. |
| **10** | `12.809.624-7` | Vicente Rodríguez Bravo | `socio10@alumnos.cl` | Sede 8 | Socio Activo con Contrato en el Seed. |
| **13** | `12.988.962-0` | Catalina López Reyes | `socio13@alumnos.cl` | Sede 5 | **Socio Inactivo** (`activo_socio = 0`). Login (`socio13` / `Clave#socio13`): **403 Forbidden**. Torniquete: **DENEGADO (Socio desactivado)**. |
| **15** | `13.108.521-2` | Antonia Contreras Herrera | `socio15@alumnos.cl` | Sede 1 | Socio Activo pero con **Contrato Cancelado / Sin Vigencia**. Acceso en torniquete: **DENEGADO (Sin contrato vigente)**. |

---

## 3. Matriz de Casos de Prueba (Normales, Límite y Errores)

| Caso | Tipo | Endpoint | Parámetros / Entrada | Código Esperado | Resultado / Verificación en Motor |
|---|---|---|---|---|---|
| **CP-S01** | Normal | `GET /socios` | `limite=10&offset=0` | `200 OK` | Retorna los primeros 10 socios ordenados por `id_socio DESC`. |
| **CP-S02** | Normal (Filtro) | `GET /socios` | `buscar=Daniel&activo=true` | `200 OK` | Retorna el registro de Daniel Matus coincidente por nombre. |
| **CP-S03** | Normal (ID) | `GET /socios/1` | `id_socio = 1` | `200 OK` | Retorna el objeto JSON del socio Daniel Matus con todos sus campos. |
| **CP-S04** | Error (404) | `GET /socios/99999` | `id_socio = 99999` | `404 Not Found` | *"Socio con ID 99999 no encontrado."* |
| **CP-S05** | Normal (RUT) | `GET /socios/rut/18.765.432-K` | `rut = "18.765.432-K"` | `200 OK` | Resuelve exitosamente el socio por su identificador único nacional. |
| **CP-S06** | Normal (Crear) | `POST /socios` | JSON con nuevo RUT, correo y sede válida (1) | `201 Created` | Inserta en `[dbo].[Socio]` y retorna `id_socio` generado vía cláusula `OUTPUT`. |
| **CP-S07** | Error (Unicidad) | `POST /socios` | RUT duplicado (`18.765.432-K`) | `400 Bad Request` | *"Ya existe un socio registrado con el mismo RUT o Correo."* |
| **CP-S08** | Error (FK Sede) | `POST /socios` | `id_sede_registro_socio = 999` | `400 Bad Request` | *"La sede con ID 999 no existe."* Previene violación de FK en BD. |
| **CP-S09** | Normal (Actualizar) | `PUT /socios/2` | `{"telefono_socio": "+56 9 1122 3344"}` | `200 OK` | Actualiza teléfono de contacto y verifica unicidad si se altera el correo. |
| **CP-S10** | Normal (Estado) | `PATCH /socios/2/estado` | `{"activo_socio": false}` | `200 OK` | Cambia el bit a `0`. Socio queda bloqueado para acceso al gimnasio. |
| **CP-S11** | Normal (Credenciales)| `POST /socios/2/credenciales`| `{"username_usuario": "socio2", "password": "MiPassword#2026"}` | `201 Created` | Inserta/actualiza registro en `[dbo].[Usuario]` con hash `SHA2_512`. |
| **CP-S12** | Normal (Login) | `POST /socios/login` | `{"username_o_correo": "socio1", "password": "Clave#socio1"}` | `200 OK` | `autenticado: true`, rol: `'Socio'`, retorna token/datos de sesión. |
| **CP-S13** | Error (Clave errónea) | `POST /socios/login` | `{"username_o_correo": "socio1", "password": "PasswordIncorrecta"}` | `401 Unauthorized` | *"Credenciales inválidas. Verifique su usuario/correo y contraseña."* |
| **CP-S14** | Error (Inactivo) | `POST /socios/login` | Credenciales de socio con `activo_socio = 0` | `403 Forbidden` | *"La cuenta de este socio se encuentra inactiva. Comuníquese con administración."* |
| **CP-S15** | Acceso (Permitido) | `GET /socios/acceso/validar/1` | `identificador = 1` | `200 OK` | `acceso_permitido: true` (Socio activo y contrato vigente). |
| **CP-S16** | Acceso (Sin Vigencia) | `GET /socios/acceso/validar/15` | `identificador = 15` | `200 OK` | `acceso_permitido: false`, motivo: *"Sin contrato vigente al día de hoy"*. |
| **CP-S17** | Acceso (Inactivo) | `GET /socios/acceso/validar/13` | `identificador = 13` | `200 OK` | `acceso_permitido: false`, motivo: *"Socio desactivado en el sistema"*. |
| **CP-S18** | Vista Analítica | `GET /socios/reportes/por-sede`| Sin parámetros | `200 OK` | Retorna distribución de socios por sede y estado de membresía. |

---

## 4. Proyección y Justificación de Trigger y Cursor para la Entrega Final (Criterio 10 de la Rúbrica)

Para el cumplimiento del **Criterio 10 de la Rúbrica de Evaluación Final (100%)**, se proyectan los siguientes objetos en el motor SQL Server:

### 1. Propuesta de Trigger: `trg_Socio_Inactivacion_RevocarAcceso` (Sobre tabla `[dbo].[Socio]`)
* **Necesidad real de negocio:** Cuando la administración desactiva a un socio (`activo_socio = 0`), ya sea por sanción disciplinaria, solicitud voluntaria o mora prolongada:
  1. Debe cancelarse inmediatamente cualquier reserva futura activa en la tabla `[dbo].[Inscripcion]` (`UPDATE Inscripcion SET estado_inscripcion = 'Cancelado' WHERE id_socio_inscripcion = @id_socio AND fecha_sesion > GETDATE()`), liberando los cupos a otros socios.
  2. Debe revocarse el acceso al portal web en `[dbo].[Usuario]` y registrarse el evento en una tabla de auditoría `[dbo].[LogSeguridadAcceso]`.
* **Justificación técnica:** Un trigger `AFTER UPDATE OF activo_socio` garantiza que la regla de seguridad se ejecute irrevocablemente a nivel de motor de base de datos, sin depender de que cada pantalla cliente recuerde ejecutar múltiples consultas secundarias.

### 2. Propuesta de Cursor: `sp_Auditoria_Vigencia_Y_Notificacion_Acceso`
* **Necesidad real de procesamiento secuencial fila a fila:** En el proceso de apertura y control nocturno de recepción:
  1. Se debe iterar secuencialmente sobre el conjunto de socios activos cuyo contrato finaliza en los próximos 3 días.
  2. Para cada socio analizado, se debe comprobar si tiene intentos recientes de torniquete, evaluar el saldo insoluto en el módulo de finanzas y clasificar la alerta en tramos (`Aviso Preventivo`, `Renovación Urgente` o `Cierre de Acceso`).
  3. Cada fila genera una notificación personalizada en la cola de mensajería y una anotación de bitácora en recepción.
* **Justificación técnica:** Dado que la lógica de cálculo y envío requiere validación condicional dependiente del historial del socio con inserciones en múltiples bitácoras externas, un cursor administrado mediante `CURSOR FORWARD_ONLY READ_ONLY` con manejo explícito de transacciones asegura el aislamiento necesario.

---

## 5. Scripts de Comprobación en SQL Server Management Studio (SSMS)

Puedes ejecutar estos scripts directamente en SSMS para auditar el comportamiento del módulo:

```sql
USE GimnasioDB;
GO

-- 1. Comprobar socios y credenciales activas
SELECT 
    s.id_socio,
    s.rut_socio,
    s.nombre_completo_socio,
    s.correo_socio,
    s.activo_socio,
    u.id_usuario,
    u.username_usuario,
    r.nombre_rol
FROM Socio s
LEFT JOIN Usuario u ON s.id_socio = u.id_socio_usuario
LEFT JOIN Rol r ON u.id_rol_usuario = r.id_rol
WHERE s.id_socio IN (1, 2, 3, 10, 13);

-- 2. Auditar la vista analítica oficial
SELECT * FROM vw_Reporte_Socios_Por_Sede
ORDER BY nombre_sede ASC, estado_contrato ASC;

-- 3. Simular validación de torniquete para Daniel Matus (ID 1)
DECLARE @id_test INT = 1;

SELECT 
    s.id_socio,
    s.rut_socio,
    s.nombre_completo_socio,
    s.activo_socio,
    c.id_contrato,
    c.estado_contrato,
    c.fecha_termino_contrato,
    CASE 
        WHEN s.activo_socio = 0 THEN 'DENEGADO: Socio Inactivo'
        WHEN c.id_contrato IS NULL THEN 'DENEGADO: Sin Contrato Vigente'
        ELSE 'PERMITIDO: Acceso Concedido'
    END AS resultado_torniquete
FROM Socio s
LEFT JOIN Contrato c ON s.id_socio = c.id_socio_contrato 
                    AND c.estado_contrato = 'Vigente' 
                    AND c.fecha_termino_contrato >= CAST(GETDATE() AS DATE)
WHERE s.id_socio = @id_test;
```
