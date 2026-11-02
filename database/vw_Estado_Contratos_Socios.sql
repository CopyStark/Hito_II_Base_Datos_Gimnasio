CREATE OR ALTER VIEW [dbo].[vw_Estado_Contratos_Socios] AS
SELECT
    -- Identificadores del contrato y relaciones
    c.id_contrato,
    c.id_socio_contrato,
    c.id_planmembresia_contrato,

    -- Datos del socio titular
    s.rut_socio,
    s.nombre_completo_socio,

    -- Datos del plan comercial contratado
    pm.nombre_planmembresia,
    pm.duracion_meses_planmembresia,

    -- Vigencia y estado del contrato
    c.fecha_inicio_contrato,
    c.fecha_termino_contrato,
    c.estado_contrato,
    c.precio_pactado_contrato,

    -- Suma de abonos registrados en Caja (0 si aún no tiene pagos)
    ISNULL(SUM(p.monto_cancelado_pago), 0) AS total_pagado,

    -- Saldo pendiente de pago (0 si el contrato está Cancelado)
    CASE 
        WHEN c.estado_contrato = 'Cancelado' THEN 0
        WHEN (c.precio_pactado_contrato - ISNULL(SUM(p.monto_cancelado_pago), 0)) < 0 THEN 0
        ELSE (c.precio_pactado_contrato - ISNULL(SUM(p.monto_cancelado_pago), 0))
    END AS saldo_pendiente
FROM Contrato AS c
-- Socio: obligatorio (todo contrato tiene un socio titular)
INNER JOIN Socio         AS s  ON c.id_socio_contrato         = s.id_socio
-- PlanMembresia: obligatorio (todo contrato corresponde a un plan)
INNER JOIN PlanMembresia AS pm ON c.id_planmembresia_contrato = pm.id_planmembresia
-- Pago: opcional (LEFT JOIN para no perder contratos que aún no registran pagos)
LEFT  JOIN Pago          AS p  ON c.id_contrato               = p.id_contrato_pago
GROUP BY
    c.id_contrato,
    c.id_socio_contrato,
    c.id_planmembresia_contrato,
    s.rut_socio,
    s.nombre_completo_socio,
    pm.nombre_planmembresia,
    pm.duracion_meses_planmembresia,
    c.fecha_inicio_contrato,
    c.fecha_termino_contrato,
    c.estado_contrato,
    c.precio_pactado_contrato;
GO
