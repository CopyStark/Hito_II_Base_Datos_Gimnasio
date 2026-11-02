CREATE OR ALTER VIEW [dbo].[vw_Reporte_Ingresos_Por_Sede] AS
SELECT 
    -- Sede a la que pertenece el socio que realizó el pago
    nombre_sede,

    -- Período contable extraído de la fecha del pago
    YEAR(fecha_pago) AS anio_pago,
    MONTH(fecha_pago) AS mes_pago,

    -- Recaudación total acumulada en esa sede y período
    SUM(monto_cancelado_pago) AS total_ingresos
FROM Pago
-- Contrato: obligatorio (todo pago abona a un contrato específico)
INNER JOIN Contrato ON id_contrato_pago = id_contrato
-- Socio: obligatorio (todo contrato pertenece a un socio titular)
INNER JOIN Socio    ON id_socio_contrato = id_socio
-- Sede: obligatoria (todo socio está registrado en una sede del gimnasio)
INNER JOIN Sede     ON id_sede_registro_socio = id_sede
GROUP BY 
    nombre_sede, 
    YEAR(fecha_pago), 
    MONTH(fecha_pago);
GO
