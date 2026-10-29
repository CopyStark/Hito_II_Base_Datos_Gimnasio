# Plan, Guía de Pruebas y Documentación Técnica – Módulo Contratos & Finanzas (Persona 3)

**Responsable:** Persona 3 – Daniel Matus  
**Router Backend:** `/contratos` (`backend/routers/contratos.py`)  
**Vistas Frontend:** `/contratos`, `/contratos/caja`, `/contratos/estado-cuenta`, `/contratos/personal`  
**Objetos SQL Server:**
- **Tablas:** `[dbo].[PlanMembresia]`, `[dbo].[Contrato]`, `[dbo].[Pago]`, `[dbo].[Personal]`
- **Vista:** `[dbo].[vw_Reporte_Ingresos_Por_Sede]`
- **Procedimientos Almacenados (`database/sp_contratos.sql`):**
  - `[dbo].[sp_Emitir_Contrato_Con_Pago]`
  - `[dbo].[sp_Registrar_Pago_Contrato]`
  - `[dbo].[sp_Actualizar_Contratos_Vencidos]`

---

## 1. Resumen para Defensa Técnica Individual (Rúbrica Avance 60%)

### A. Explicación de Consulta SQL Explícita con `JOIN` y Agrupación
En `GET /contratos/` y `GET /contratos/socio/{id_socio}/estado-cuenta`, se calcula en tiempo real cuánto ha pagado cada socio por cada contrato y cuál es su saldo pendiente sin usar ORM:
```sql
SELECT 
    c.id_contrato,
    c.id_socio_contrato,
    c.id_planmembresia_contrato,
    c.fecha_inicio_contrato,
    c.fecha_termino_contrato,
    c.estado_contrato,
    c.precio_pactado_contrato,
    s.rut_socio,
    s.nombre_completo_socio,
    pm.nombre_planmembresia,
    pm.duracion_meses_planmembresia,
    ISNULL(SUM(p.monto_cancelado_pago), 0) AS total_pagado
FROM Contrato c
INNER JOIN Socio s ON c.id_socio_contrato = s.id_socio
INNER JOIN PlanMembresia pm ON c.id_planmembresia_contrato = pm.id_planmembresia
LEFT JOIN Pago p ON c.id_contrato = p.id_contrato_pago
GROUP BY 
    c.id_contrato, c.id_socio_contrato, c.id_planmembresia_contrato,
    c.fecha_inicio_contrato, c.fecha_termino_contrato, c.estado_contrato,
    c.precio_pactado_contrato, s.rut_socio, s.nombre_completo_socio,
    pm.nombre_planmembresia, pm.duracion_meses_planmembresia
```
* **¿Por qué `INNER JOIN` con `Socio` y `PlanMembresia`?** Porque todo contrato pertenece obligatoriamente (`NOT NULL` + `FK`) a un socio y a un plan comercial.
* **¿Por qué `LEFT JOIN` con `Pago`?** Porque un contrato recién emitido puede aún no tener pagos registrados, y con `LEFT JOIN` + `ISNULL(SUM(p.monto_cancelado_pago), 0)` no se pierde el contrato en el listado y su monto abonado se reporta como `0`.

### B. Explicación de la Vista `[dbo].[vw_Reporte_Ingresos_Por_Sede]`
```sql
CREATE OR ALTER VIEW [dbo].[vw_Reporte_Ingresos_Por_Sede] AS
SELECT 
    nombre_sede,
    YEAR(fecha_pago) AS anio_pago,
    MONTH(fecha_pago) AS mes_pago,
    SUM(monto_cancelado_pago) AS total_ingresos
FROM Pago
INNER JOIN Contrato ON id_contrato_pago = id_contrato
INNER JOIN Socio    ON id_socio_contrato = id_socio
INNER JOIN Sede     ON id_sede_registro_socio = id_sede
GROUP BY nombre_sede, YEAR(fecha_pago), MONTH(fecha_pago);
```
* **Propósito:** Simplifica el análisis financiero gerencial uniendo 4 tablas (`Pago` → `Contrato` → `Socio` → `Sede`) y agrupando la recaudación por sucursal, año y mes. Es consumida directamente en `GET /contratos/reportes/ingresos-por-sede` y visualizada en `/contratos/personal`.

### C. Explicación del Procedimiento Almacenado `[dbo].[sp_Emitir_Contrato_Con_Pago]`
* **Propósito:** Encapsula la venta en Caja como una **transacción atómica (`BEGIN TRANSACTION` ... `COMMIT` / `ROLLBACK`)**.
* **Flujo y Validaciones:**
  1. Verifica que el socio exista (`50010`) y que su cuenta esté activa (`activo_socio = 1`, o lanza `50030`).
  2. Obtiene la duración en meses y precio vigente del plan desde `PlanMembresia` (`50010` si no existe).
  3. Calcula automáticamente `fecha_termino_contrato = DATEADD(MONTH, @duracion_meses, @fecha_inicio)`.
  4. Valida que el pago inicial sea `> 0` (`50030`) y no supere el precio pactado (`50020`).
  5. Inserta el registro en `Contrato` y el recibo en `Pago` dentro de la misma transacción. Si el `INSERT` en `Pago` falla, el bloque `CATCH` ejecuta `ROLLBACK TRANSACTION`, impidiendo contratos huérfanos sin respaldo de caja.

---

## 2. Matriz de Casos de Prueba (Normales, Límite y Errores)

| Caso | Tipo | Endpoint | Entrada de Prueba | Resultado Esperado |
|---|---|---|---|---|
| **CP-01** | Normal | `GET /contratos/planes` | Sin filtros | `200 OK` – Lista los 10 planes comerciales ordenados por duración y precio. |
| **CP-02** | Normal | `GET /contratos/socio/1/estado-cuenta` | `id_socio = 1` (Daniel Matus) | `200 OK` – Retorna contratos, recibos, `saldo_pendiente = 0` y `estado_financiero = "Al día"`. |
| **CP-03** | Normal (SP Transaccional) | `POST /contratos/emitir-con-pago` | `{"id_socio_contrato": 2, "id_planmembresia_contrato": 1, "medio_pago": "Tarjeta"}` | `201 Created` – Crea el contrato con `fecha_termino` calculada (+1 mes) y el recibo de pago en una sola transacción. |
| **CP-04** | Caso Límite / Error | `POST /contratos/` | `fecha_termino_contrato < fecha_inicio_contrato` | `400 Bad Request` – Rechazado por validación de fechas coherentes (`CK_Contrato_Fechas`). |
| **CP-05** | Caso de Error (Regla de Negocio) | `POST /contratos/pagos` | `id_contrato_pago = 15` (Contrato en estado `'Cancelado'`) | `400 Bad Request` (`50030`) – No se permite cobrar un contrato cancelado. |
| **CP-06** | Caso de Error (No encontrado) | `GET /contratos/socio/9999/estado-cuenta` | `id_socio = 9999` | `404 Not Found` – Socio inexistente. |
| **CP-07** | Caso de Error (Unicidad) | `POST /contratos/personal` | RUT o correo ya registrado en `[Personal]` | `400 Bad Request` – Violación controlada de unicidad de RUT/Correo. |
| **CP-08** | Normal (Vista SQL) | `GET /contratos/reportes/ingresos-por-sede` | `?anio=2026` | `200 OK` – Recaudación mensual agrupada por sede desde `vw_Reporte_Ingresos_Por_Sede`. |

---

## 3. Proyección y Justificación de Trigger y Cursor para la Entrega Final (Criterio 10 de la Rúbrica)

De acuerdo con los requisitos de la rúbrica para la **Entrega Final (100%)**, se definen y justifican los siguientes objetos en el ámbito de Contratos y Finanzas:

### 1. Propuesta de Trigger: `trg_Pago_ValidarYActualizarContrato` (Sobre tabla `[dbo].[Pago]`)
* **Necesidad real de negocio:** Garantizar la integridad financiera transversal directamente en el motor SQL Server (independiente de qué aplicación o cliente inserte el pago):
  1. Impedir que se registren pagos sobre contratos en estado `'Cancelado'` o cuyo monto acumulado de pagos (`SUM(monto_cancelado_pago)`) supere el `precio_pactado_contrato` (evitando cobros duplicados accidentales).
  2. Reactivar automáticamente el `estado_contrato` a `'Vigente'` si un contrato tenía pagos pendientes y completa el 100% de su `precio_pactado_contrato` dentro de su período de vigencia.
* **Justificación técnica:** Un trigger `AFTER INSERT` sobre `[dbo].[Pago]` protege la regla contable de forma centralizada e ineludible ante cualquier transacción concurrente.

### 2. Propuesta de Cursor: `sp_Cierre_Contable_Y_Liquidacion_Morosidad`
* **Necesidad real de procesamiento secuencial fila a fila:** Al cierre de cada mes contable, el gimnasio requiere recorrer los contratos activos o vencidos con saldo insoluto (`precio_pactado_contrato > SUM(monto_cancelado_pago)`), evaluar secuencialmente la antigüedad de mora de cada socio, aplicar reglas escalonadas por tramo (bloqueo de socio si supera 30 días de mora, cancelación automática de contrato si supera 60 días y generación de registro individual en bitácora de cobranza).
* **Justificación frente a SQL orientado a conjuntos:** Mientras que el reporte de ingresos se resuelve óptimamente mediante operaciones orientadas a conjuntos (`vw_Reporte_Ingresos_Por_Sede` con `SUM` y `GROUP BY`), el proceso de liquidación escalonada con evaluación condicional multi-etapa y emisión de bitácora individual por contrato/socio justifica el uso de un `CURSOR FAST_FORWARD` dentro de un procedimiento almacenado administrativo.
