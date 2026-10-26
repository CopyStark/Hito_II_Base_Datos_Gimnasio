# Plan y Guía de Pruebas de Endpoints – Módulo Clases (Persona 2)

**Documento de Casos de Prueba para Swagger UI (`http://localhost:8000/docs`) y SSMS**  
**Responsable:** Persona 2 – Clases, Sesiones e Inscripciones  
**Base de Datos:** `GimnasioDB` (Microsoft SQL Server)  
**Convención DDL:** Cada atributo finaliza con el nombre de su tabla (`_clase`, `_sesion`, `_inscripcion`).  
**Códigos de Error THROW en BD:**
- `50010`: Registro no encontrado (HTTP 404).
- `50020`: Conflicto de negocio – cupo lleno o ya inscrito (HTTP 409 o 400).
- `50030`: Regla de negocio infringida – sesión pasada, contrato vencido, inactivo (HTTP 400).

---

## 1. Mapa de Datos del Seed (`database/GimnasioDB_Seed.sql`)

Para ejecutar las pruebas se utilizan los IDs y registros reales generados por el seed:

| Entidad | ID Real | Datos de Referencia | Estado / Condición para Pruebas |
|---|---|---|---|
| **Socio** | `1` | Daniel Matus | `activo_socio = 1`, Contrato `Vigente`. Ya inscrito en sesión 1 (`id_inscripcion = 1`). |
| **Socio** | `2` | Emilia Osorio | `activo_socio = 1`, Contrato `Vigente`. Ideal para inscripciones nuevas. |
| **Socio** | `3` | Yulissa Ulloa | `activo_socio = 1`, Contrato `Vigente`. Ideal para inscripciones concurrentes / límites. |
| **Socio** | `10` | Socio #10 (generado) | `activo_socio = 1`, **Contrato `Vencido`** (hace más de 1 año). Sin inscripciones previas. |
| **Socio** | `13` | Socio #13 (generado) | **`activo_socio = 0`** (Inactivo según fórmula seed `num_persona 50 % 25 = 0`). |
| **Sede** | `1` | Sede Central Moneda | Ciudad Santiago. |
| **Instructor** | `1` | Carlos Gutiérrez | Instructor asignado a Sede 1. |
| **Clase** | `1` | CrossFit Intensivo | 60 min, Nivel 'Avanzado'. |
| **Clase** | `2` | Spinning Cardio | 45 min, Nivel 'Intermedio'. |
| **Sesión** | `1` | Sesión CrossFit | Futura, cupo máximo 15. Contiene inscripción activa de `id_socio = 1`. |
| **Sesión** | `2` | Sesión Spinning | Futura, cupo máximo 20. |
| **Inscripción** | `1` | Inscripción Socio 1 en Sesión 1 | `estado_inscripcion = 'Inscrito'`, `asistio_inscripcion = NULL`. |
| **Inscripción** | `9` | Inscripción Socio elegible #9 | `estado_inscripcion = 'Cancelado'` (según `n % 9 = 0` del seed). |

---

## 2. Consulta SQL General para Verificar el Estado de `Inscripcion`

Esta consulta permite comprobar en **SQL Server Management Studio (SSMS)** el estado íntegro de cualquier inscripción antes y después de cada prueba:

```sql
-- =====================================================================================
-- Consulta de Comprobación de Estado en SSMS
-- (Reemplazar @id_inscripcion_test o filtrar por id_socio / id_sesion)
-- =====================================================================================
USE GimnasioDB;
GO

SELECT 
    i.id_inscripcion,
    i.id_socio_inscripcion,
    s.nombre_completo_socio,
    s.activo_socio,
    c_vig.estado_contrato,
    i.id_sesion_inscripcion,
    cl.nombre_clase,
    se.fecha_sesion,
    se.hora_sesion,
    i.fecha_inscripcion,
    i.estado_inscripcion,
    i.asistio_inscripcion,
    i.observaciones_inscripcion
FROM Inscripcion i
INNER JOIN Socio s ON i.id_socio_inscripcion = s.id_socio
LEFT  JOIN Contrato c_vig ON s.id_socio = c_vig.id_socio_contrato
INNER JOIN Sesion se ON i.id_sesion_inscripcion = se.id_sesion
INNER JOIN Clase cl ON se.id_clase_sesion = cl.id_clase
WHERE i.id_inscripcion = 1 -- Cambiar por el ID a comprobar
ORDER BY i.id_inscripcion DESC;
```

---

## 3. Matriz de Casos de Prueba

### CASO 1: Listar Catálogo de Clases (Caso Normal)
* **Objetivo:** Obtener la lista completa de disciplinas deportivas configuradas en el gimnasio.
* **Endpoint Swagger:** `GET /clases`
* **Parámetros / Request Body:** Ninguno.
* **Respuesta Esperada:**
  * **Código HTTP:** `200 OK`
  * **Cuerpo JSON:** Array de clases. Debe contener al menos las 12 clases del seed:
  ```json
  [
    {
      "id_clase": 1,
      "nombre_clase": "CrossFit Intensivo",
      "duracion_minutos_clase": 60,
      "nivel_exigencia_clase": "Avanzado",
      "nombre": "CrossFit Intensivo",
      "duracion_minutos": 60,
      "nivel_exigencia": "Avanzado"
    },
    {
      "id_clase": 2,
      "nombre_clase": "Spinning Cardio",
      "duracion_minutos_clase": 45,
      "nivel_exigencia_clase": "Intermedio",
      "nombre": "Spinning Cardio",
      "duracion_minutos": 45,
      "nivel_exigencia": "Intermedio"
    }
  ]
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT id_clase, nombre_clase, duracion_minutos_clase, nivel_exigencia_clase 
  FROM Clase 
  ORDER BY nombre_clase ASC;
  ```

---

### CASO 2: Listar Sesiones Disponibles y Cupos en Tiempo Real (Caso Normal)
* **Objetivo:** Consultar la vista de ocupación y cupos disponibles (`vw_Sesiones_Disponibles` o `vw_Reporte_Ocupacion_Clases`).
* **Endpoint Swagger:** `GET /clases/sesiones`
* **Parámetros opcionales:** `fecha`, `id_sede=1`, `id_clase=1`
* **Respuesta Esperada:**
  * **Código HTTP:** `200 OK`
  * **Cuerpo JSON:** Lista de sesiones con el cálculo exacto de `total_inscritos` y `cupos_disponibles`:
  ```json
  [
    {
      "id_sesion": 1,
      "nombre_clase": "CrossFit Intensivo",
      "nombre_sede": "Sede Central Moneda",
      "fecha_sesion": "2026-...",
      "hora_sesion": "09:00:00",
      "cupo_maximo_sesion": 15,
      "total_inscritos": 1,
      "cupos_disponibles": 14
    }
  ]
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT id_sesion, nombre_clase, nombre_sede, fecha_sesion, hora_sesion, 
         cupo_maximo_sesion, total_inscritos, cupos_disponibles
  FROM vw_Sesiones_Disponibles
  WHERE id_sesion = 1;
  ```

---

### CASO 3: Inscripción Exitosa de un Socio (Caso Normal / Happy Path)
* **Objetivo:** Inscribir a la socia Emilia Osorio (`id_socio = 2`, con contrato vigente) en la sesión 2 (`id_sesion = 2`).
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Schema `InscripcionCreate`):**
  ```json
  {
    "id_socio_inscripcion": 2,
    "id_sesion_inscripcion": 2,
    "observaciones_inscripcion": "Primera clase de spinning del mes"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `201 Created`
  * **Cuerpo JSON:**
  ```json
  {
    "id_inscripcion": 81,
    "id_socio_inscripcion": 2,
    "id_sesion_inscripcion": 2,
    "fecha_inscripcion": "2026-10-25T...",
    "estado_inscripcion": "Inscrito",
    "asistio_inscripcion": null,
    "observaciones_inscripcion": "Primera clase de spinning del mes"
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT TOP 1 
      id_inscripcion, 
      id_socio_inscripcion, 
      id_sesion_inscripcion, 
      fecha_inscripcion, 
      estado_inscripcion, 
      asistio_inscripcion, 
      observaciones_inscripcion
  FROM Inscripcion
  WHERE id_socio_inscripcion = 2 AND id_sesion_inscripcion = 2
  ORDER BY id_inscripcion DESC;
  ```
  *(Debe mostrar `estado_inscripcion = 'Inscrito'` y `asistio_inscripcion IS NULL`).*

---

### CASO 4: Inscripción Rechazada por Duplicidad (Caso Límite / Error 50020)
* **Objetivo:** Intentar inscribir a Daniel Matus (`id_socio = 1`) en la sesión 1 (`id_sesion = 1`), donde ya tiene una inscripción activa (`id_inscripcion = 1`).
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Schema `InscripcionCreate`):**
  ```json
  {
    "id_socio_inscripcion": 1,
    "id_sesion_inscripcion": 1,
    "observaciones_inscripcion": "Intento de reinscripción duplicada"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `409 Conflict` (o `400 Bad Request`)
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "El socio ya se encuentra inscrito en esta sesión."
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  -- Verificar que solo exista 1 registro activo para esa dupla
  SELECT COUNT(*) AS total_inscripciones_activas
  FROM Inscripcion
  WHERE id_socio_inscripcion = 1 
    AND id_sesion_inscripcion = 1 
    AND estado_inscripcion = 'Inscrito';
  ```
  *(El conteo debe ser exactamente 1; no se crea ninguna fila nueva).*

---

### CASO 5: Inscripción Rechazada por Contrato Vencido (Regla de Negocio / Error 50030)
* **Objetivo:** Intentar inscribir al Socio #10 (`id_socio = 10`), cuyo contrato en el seed expiró hace más de un año (`estado_contrato = 'Vencido'`).
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Schema `InscripcionCreate`):**
  ```json
  {
    "id_socio_inscripcion": 10,
    "id_sesion_inscripcion": 2,
    "observaciones_inscripcion": "Prueba con contrato vencido"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `400 Bad Request`
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "El socio no posee un contrato vigente que cubra la fecha de la sesión."
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  -- Comprobar estado del contrato del socio 10
  SELECT id_socio_contrato, estado_contrato, fecha_inicio_contrato, fecha_termino_contrato 
  FROM Contrato 
  WHERE id_socio_contrato = 10;

  -- Comprobar que NO se insertó la inscripción
  SELECT COUNT(*) AS inscripciones_creadas 
  FROM Inscripcion 
  WHERE id_socio_inscripcion = 10 AND id_sesion_inscripcion = 2;
  ```
  *(Debe devolver `0` filas creadas).*

---

### CASO 6: Sesión Pasada (Caso Límite / Error 50030)
* **Problema:** El procedimiento almacenado `sp_Programar_Sesion` y las reglas de negocio no permiten crear sesiones en el pasado mediante la API.
* **SQL de Preparación en SSMS (INSERT Directo Obligatorio):**
  Ejecutar el siguiente bloque en SSMS para crear una sesión con fecha de hace 7 días:
  ```sql
  USE GimnasioDB;
  GO

  -- INSERT directo para simular una sesión ocurrida en el pasado
  INSERT INTO Sesion (
      id_clase_sesion,
      id_sede_sesion,
      id_instructor_sesion,
      fecha_sesion,
      hora_sesion,
      cupo_maximo_sesion
  )
  VALUES (
      1,                                         -- Clase: CrossFit Intensivo
      1,                                         -- Sede: Central Moneda
      1,                                         -- Instructor: Carlos Gutiérrez
      DATEADD(DAY, -7, CAST(GETDATE() AS DATE)), -- Fecha de hace 7 días
      '08:00:00',
      10
  );

  -- Anotar el ID generado para la prueba:
  DECLARE @id_sesion_pasada INT = SCOPE_IDENTITY();
  SELECT @id_sesion_pasada AS id_sesion_pasada_creada;
  ```
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Schema `InscripcionCreate`, usando el ID obtenido, ej: `61`):**
  ```json
  {
    "id_socio_inscripcion": 2,
    "id_sesion_inscripcion": 61,
    "observaciones_inscripcion": "Intento de inscripción a clase pasada"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `400 Bad Request`
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "No es posible inscribirse en una sesión que ya ocurrió o está en curso."
  }
  ```
* **Consulta SQL de Verificación del Estado en SSMS:**
  ```sql
  SELECT COUNT(*) AS total_inscripciones 
  FROM Inscripcion 
  WHERE id_sesion_inscripcion = 61;
  ```
  *(El conteo debe ser `0`).*

---

### CASO 7: Límite de Cupo Máximo – Último Cupo y Cupo Lleno (Caso Límite / Error 50020)
* **Objetivo:** Verificar que una sesión con cupo de 1 persona admita exactamente la primera inscripción y rechace de inmediato la segunda con error de cupo agotado.
* **SQL de Preparación en SSMS:**
  ```sql
  USE GimnasioDB;
  GO

  -- Crear sesión con cupo exacto de 1 persona
  INSERT INTO Sesion (
      id_clase_sesion,
      id_sede_sesion,
      id_instructor_sesion,
      fecha_sesion,
      hora_sesion,
      cupo_maximo_sesion
  )
  VALUES (
      2,                                         -- Spinning Cardio
      1,                                         -- Sede Central Moneda
      2,                                         -- Instructora Valentina Ríos
      DATEADD(DAY, 4, CAST(GETDATE() AS DATE)),  -- En 4 días
      '19:00:00',
      1                                          -- CUPO MÁXIMO = 1
  );

  DECLARE @id_sesion_limite INT = SCOPE_IDENTITY();
  SELECT @id_sesion_limite AS id_sesion_cupo_uno;
  ```
  *(Supongamos que devuelve `id_sesion = 62`).*

#### Paso 7.1: Ocupar el Último Cupo (Éxito)
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Socia 2: Emilia Osorio):**
  ```json
  {
    "id_socio_inscripcion": 2,
    "id_sesion_inscripcion": 62,
    "observaciones_inscripcion": "Ocupando el último cupo"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `201 Created`
* **Verificación de Cupos en SSMS:**
  ```sql
  SELECT total_inscritos, cupos_disponibles 
  FROM vw_Sesiones_Disponibles 
  WHERE id_sesion = 62;
  ```
  *(Debe mostrar `total_inscritos = 1` y `cupos_disponibles = 0`).*

#### Paso 7.2: Intentar Inscribir con Cupo Lleno (Rechazo)
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Socia 3: Yulissa Ulloa):**
  ```json
  {
    "id_socio_inscripcion": 3,
    "id_sesion_inscripcion": 62,
    "observaciones_inscripcion": "Intento cuando ya está llena"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `409 Conflict` (o `400 Bad Request`)
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "No quedan cupos disponibles para esta sesión."
  }
  ```
* **Consulta SQL de Verificación Final en SSMS:**
  ```sql
  SELECT 
      i.id_inscripcion,
      i.id_socio_inscripcion,
      s.nombre_completo_socio,
      i.estado_inscripcion
  FROM Inscripcion i
  INNER JOIN Socio s ON i.id_socio_inscripcion = s.id_socio
  WHERE i.id_sesion_inscripcion = 62;
  ```
  *(Solo debe existir la inscripción de Emilia Osorio, id_socio = 2).*

---

### CASO 8: Inscripción a Sesión Inexistente (Caso Error / Error 50010)
* **Objetivo:** Validar el manejo de error cuando el `id_sesion` no existe en la base de datos.
* **Endpoint Swagger:** `POST /clases/inscripciones`
* **Request Body (Schema `InscripcionCreate`):**
  ```json
  {
    "id_socio_inscripcion": 2,
    "id_sesion_inscripcion": 99999,
    "observaciones_inscripcion": "Sesión que no existe"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `404 Not Found`
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "La sesión especificada no existe."
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT COUNT(*) FROM Sesion WHERE id_sesion = 99999;
  ```

---

### CASO 9: Cancelación Exitosa de una Inscripción (Caso Normal)
* **Objetivo:** Un socio cancela con anticipación su asistencia a una clase futura.
* **Endpoint Swagger:** `PATCH /clases/inscripciones/1/cancelar?id_socio=1`
* **Parámetros:**
  * `id` (path): `1`
  * `id_socio` (query o body): `1` (Daniel Matus)
* **Respuesta Esperada:**
  * **Código HTTP:** `200 OK`
  * **Cuerpo JSON:**
  ```json
  {
    "mensaje": "Inscripción cancelada exitosamente.",
    "id_inscripcion": 1,
    "estado_inscripcion": "Cancelado"
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT id_inscripcion, id_socio_inscripcion, id_sesion_inscripcion, estado_inscripcion 
  FROM Inscripcion 
  WHERE id_inscripcion = 1;
  ```
  *(El `estado_inscripcion` debe haber cambiado a `'Cancelado'`).*

---

### CASO 10: Cancelación Rechazada – Inscripción ya Cancelada (Caso Límite / Error 50030)
* **Objetivo:** Reintentar cancelar la misma inscripción `id_inscripcion = 1` que ya se encuentra en estado `'Cancelado'`.
* **Endpoint Swagger:** `PATCH /clases/inscripciones/1/cancelar?id_socio=1`
* **Respuesta Esperada:**
  * **Código HTTP:** `400 Bad Request`
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "La inscripción ya está cancelada y no puede modificarse."
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT id_inscripcion, estado_inscripcion 
  FROM Inscripcion 
  WHERE id_inscripcion = 1;
  ```

---

### CASO 11: Registro de Asistencia a Clase (Caso Normal)
* **Objetivo:** Marcar asistencia presencial de un socio a su clase.
* **Endpoint Swagger:** `PATCH /clases/inscripciones/{id}/asistencia`
* **Parámetros:**
  * `id` (path): `81` (o el `id_inscripcion` creado en el Caso 3 con estado `'Inscrito'`)
* **Request Body:**
  ```json
  {
    "asistio": true,
    "observaciones": "Llegó a la hora y completó la rutina"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `200 OK`
  * **Cuerpo JSON:**
  ```json
  {
    "id_inscripcion": 81,
    "asistio_inscripcion": true,
    "observaciones_inscripcion": "Llegó a la hora y completó la rutina"
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT 
      id_inscripcion, 
      id_socio_inscripcion, 
      estado_inscripcion, 
      asistio_inscripcion, 
      observaciones_inscripcion 
  FROM Inscripcion 
  WHERE id_inscripcion = 81;
  ```
  *(Debe mostrar `asistio_inscripcion = 1` y la observación actualizada).*

---

### CASO 12: Registro de Asistencia sobre Inscripción Cancelada (Caso Error / Error 50030)
* **Objetivo:** Intentar marcar asistencia en la inscripción `id_inscripcion = 9` (que en el seed tiene estado `'Cancelado'`).
* **Endpoint Swagger:** `PATCH /clases/inscripciones/9/asistencia`
* **Request Body:**
  ```json
  {
    "asistio": true,
    "observaciones": "Intento de marcar asistencia a una cancelación"
  }
  ```
* **Respuesta Esperada:**
  * **Código HTTP:** `400 Bad Request`
  * **Cuerpo JSON:**
  ```json
  {
    "detail": "Solo se puede registrar asistencia en inscripciones con estado 'Inscrito'."
  }
  ```
* **Consulta SQL de Verificación en SSMS:**
  ```sql
  SELECT id_inscripcion, estado_inscripcion, asistio_inscripcion 
  FROM Inscripcion 
  WHERE id_inscripcion = 9;
  ```
  *(Debe mantenerse `estado_inscripcion = 'Cancelado'` y `asistio_inscripcion = NULL`).*

---

## 4. Script Completo de Limpieza Post-Pruebas en SSMS

Al finalizar la batería de pruebas, se puede ejecutar el siguiente script para limpiar las sesiones e inscripciones de prueba generadas manualmente:

```sql
USE GimnasioDB;
GO

BEGIN TRANSACTION;

-- Eliminar inscripciones de prueba generadas por encima del seed inicial (seed llega hasta id 80)
DELETE FROM Inscripcion WHERE id_inscripcion > 80;

-- Eliminar sesiones de prueba creadas manualmente (seed llega hasta id 60)
DELETE FROM Sesion WHERE id_sesion > 60;

-- Restaurar inscripción 1 a su estado original del seed
UPDATE Inscripcion
SET estado_inscripcion = 'Inscrito',
    asistio_inscripcion = NULL,
    observaciones_inscripcion = N'Inscripción inicial'
WHERE id_inscripcion = 1;

COMMIT TRANSACTION;

PRINT 'Limpieza de pruebas completada y estado del seed restaurado.';
GO
```
