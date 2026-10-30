"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  sociosApi,
  SedeSimpleResponse,
  ReporteSedeItem,
} from "@/services/apiClient";

export default function SedesReportesPage() {
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [reporte, setReporte] = useState<ReporteSedeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sedesData, reporteData] = await Promise.all([
        sociosApi.getSedesCatalogo(),
        sociosApi.getReportePorSede(),
      ]);
      setSedes(sedesData);
      setReporte(reporteData);
    } catch (err: any) {
      console.error("Error al cargar sedes y reporte:", err);
      setErrorMsg(err.message || "Error al obtener datos de sedes y reportes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate stats from the analytical view
  const stats = useMemo(() => {
    let totalContratos = 0;
    let vigentes = 0;
    let vencidos = 0;
    let otros = 0;

    reporte.forEach((item) => {
      const cant = Number(item.cantidad_socios) || 0;
      totalContratos += cant;
      const estado = (item.estado_contrato || "").toLowerCase();
      if (estado === "vigente") {
        vigentes += cant;
      } else if (estado === "vencido") {
        vencidos += cant;
      } else {
        otros += cant;
      }
    });

    return { totalContratos, vigentes, vencidos, otros };
  }, [reporte]);

  // Group report by sede
  const reportePorSedeMap = useMemo(() => {
    const map = new Map<string, { [estado: string]: number }>();
    reporte.forEach((item) => {
      const sede = item.nombre_sede || "Desconocida";
      const estado = item.estado_contrato || "Sin Estado";
      const cant = Number(item.cantidad_socios) || 0;

      if (!map.has(sede)) {
        map.set(sede, {});
      }
      const prev = map.get(sede)!;
      prev[estado] = (prev[estado] || 0) + cant;
    });
    return map;
  }, [reporte]);

  return (
    <div className="space-y-12">
      {/* Editorial Section Heading (amp: weight 300, negative tracking, orange accent rule) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-step">
                Step 3 &bull; Infraestructura
              </span>
              <span className="badge-neutral">
                vw_Reporte_Socios_Por_Sede
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-amp-ink tracking-[-0.030em] leading-[1.15]">
              Sedes & Reporte Analítico
            </h1>
            <div className="h-[2.5px] w-24 bg-amp-orange mt-3"></div>

            <p className="text-sm text-amp-carbon mt-3 max-w-2xl font-normal leading-relaxed">
              Catálogo de infraestructura de sedes y distribución de contratos por sucursal consultando
              directamente la vista oficial de base de datos en SQL Server <code className="text-amp-orange font-mono">vw_Reporte_Socios_Por_Sede</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn-secondary-pill px-4 py-2.5 bg-amp-white hover:bg-amp-linen text-amp-carbon text-xs font-normal border border-amp-hairline flex items-center gap-2"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
              <span>Actualizar Datos</span>
            </button>
            <Link
              href="/socios"
              className="btn-primary-pill text-xs font-medium px-4 py-2.5"
            >
              Ver Socios →
            </Link>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-[5px] bg-[#fff2f0] border border-[#ffccc7] text-xs text-amp-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amp-orange">⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchData}
            className="btn-secondary-pill text-xs px-2.5 py-1 bg-amp-white border border-amp-hairline text-amp-carbon"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Cards (amp: 5px radius, 1px border #e5e5e5, featured Peach Wash card for key metric) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-ghost p-4">
          <span className="text-xs text-amp-slate font-normal block">Sedes Operativas</span>
          <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
            {sedes.length}
          </span>
          <span className="text-[11px] text-amp-slate block mt-1">Cobertura nacional</span>
        </div>

        {/* Featured Card (Peach Wash) */}
        <div className="card-peach p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amp-carbon font-medium">Membresías Vigentes</span>
            <span className="w-2 h-2 rounded-full bg-amp-orange"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-medium text-amp-ink tracking-tight mt-1 block">
            {stats.vigentes}
          </span>
          <span className="text-[11px] text-amp-carbon block mt-1">Acceso autorizado</span>
        </div>

        <div className="card-ghost p-4">
          <span className="text-xs text-amp-slate font-normal block">Membresías Vencidas</span>
          <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
            {stats.vencidos}
          </span>
          <span className="text-[11px] text-amp-slate block mt-1">Pendiente renovación</span>
        </div>

        <div className="card-ghost p-4">
          <span className="text-xs text-amp-slate font-normal block">Total Registros en Vista</span>
          <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
            {stats.totalContratos}
          </span>
          <span className="text-[11px] text-amp-slate block mt-1">Consolidado por sede</span>
        </div>
      </div>

      {/* ===== SECTION 1: Catálogo de Sedes ===== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-amp-hairline">
          <div>
            <span className="text-xs text-amp-orange font-medium uppercase tracking-wider">Red de Gimnasios</span>
            <h2 className="text-base font-medium text-amp-ink mt-0.5">
              Catálogo de Sedes Disponibles (GET /socios/sedes/catalogo)
            </h2>
          </div>
          <span className="text-xs text-amp-slate font-normal">Total: {sedes.length} sedes</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-amp-slate">
            <div className="w-6 h-6 border-2 border-amp-orange border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-normal">Cargando catálogo de sedes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((sede) => (
              <div
                key={sede.id_sede}
                className="card-ghost p-5 hover:border-amp-orange transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="badge-step text-[10px] py-0.5 px-2">
                        ID #{sede.id_sede}
                      </span>
                      <h3 className="text-base font-medium text-amp-ink mt-2">
                        {sede.nombre_sede}
                      </h3>
                    </div>
                    <span className="text-xl opacity-75">🏢</span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-amp-carbon font-normal">
                    <div className="flex items-center gap-2">
                      <span className="text-amp-slate">Ciudad:</span>
                      <strong className="text-amp-ink font-medium">{sede.nombre_ciudad}</strong>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amp-slate">Calle:</span>
                      <span>{sede.direccion_calle_sede}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amp-slate">Teléfono:</span>
                      <span className="font-mono text-amp-slate">{sede.telefono_sede}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-amp-hairline flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-amp-slate text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amp-orange"></span>
                    <span>Operativa</span>
                  </span>
                  <Link
                    href={`/socios?sede=${sede.id_sede}`}
                    className="text-amp-orange hover:underline font-medium text-xs flex items-center gap-1"
                  >
                    <span>Ver socios</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== SECTION 2: Reporte Analítico vw_Reporte_Socios_Por_Sede ===== */}
      <section className="space-y-4">
        <div className="pb-2 border-b border-amp-hairline">
          <span className="text-xs text-amp-orange font-medium uppercase tracking-wider">Analítica de Datos</span>
          <h2 className="text-base font-medium text-amp-ink mt-0.5">
            Reporte Analítico: Socios por Sede & Estado de Contrato
          </h2>
          <p className="text-xs text-amp-slate font-normal mt-0.5">
            Distribución provista por la vista SQL Server <code className="text-amp-carbon font-mono">vw_Reporte_Socios_Por_Sede</code>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Detailed Table (amp: 5px radius, 1px border #e5e5e5) */}
          <div className="lg:col-span-7 card-ghost overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-amp-linen text-amp-slate uppercase text-[11px] border-b border-amp-hairline font-medium tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nombre de la Sede</th>
                    <th className="px-4 py-3">Estado de Contrato</th>
                    <th className="px-4 py-3 text-right">Cantidad de Socios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amp-hairline">
                  {reporte.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-amp-slate text-xs font-normal">
                        {loading ? "Consultando vista SQL Server..." : "No hay registros disponibles."}
                      </td>
                    </tr>
                  ) : (
                    reporte.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amp-linen/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-amp-ink flex items-center gap-2">
                          <span>🏢</span>
                          <span>{item.nombre_sede}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-[8px] text-xs font-normal border ${
                              item.estado_contrato === "Vigente"
                                ? "bg-amp-peach text-amp-ink border-amp-orange"
                                : item.estado_contrato === "Vencido"
                                ? "bg-amp-linen text-amp-carbon border-amp-hairline"
                                : "bg-amp-bone text-amp-slate border-amp-hairline"
                            }`}
                          >
                            {item.estado_contrato}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-amp-ink text-sm">
                          {item.cantidad_socios}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Summary Cards by Sede */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card-ghost p-5 space-y-4">
              <h3 className="text-sm font-medium text-amp-ink flex items-center gap-2">
                <span>📈</span>
                <span>Distribución Visual por Sucursal</span>
              </h3>

              <div className="space-y-4">
                {Array.from(reportePorSedeMap.entries()).map(([sedeName, estados]) => {
                  const totalEnSede = Object.values(estados).reduce((a, b) => a + b, 0);
                  const vigentesEnSede = estados["Vigente"] || 0;
                  const pctVigentes = totalEnSede > 0 ? Math.round((vigentesEnSede / totalEnSede) * 100) : 0;

                  return (
                    <div
                      key={sedeName}
                      className="p-3.5 rounded-[5px] bg-amp-linen border border-amp-hairline space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-amp-ink font-medium">{sedeName}</strong>
                        <span className="text-amp-slate font-mono text-[11px]">
                          {totalEnSede} socios ({pctVigentes}% vigentes)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-amp-bone rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pctVigentes}%` }}
                          className="bg-amp-orange h-full transition-all duration-500"
                          title={`Vigentes: ${vigentesEnSede}`}
                        ></div>
                        <div
                          style={{ width: `${100 - pctVigentes}%` }}
                          className="bg-amp-slate h-full transition-all duration-500 opacity-40"
                          title="Vencidos / Otros"
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-amp-slate pt-1">
                        <span className="text-amp-carbon font-normal">
                          ● {vigentesEnSede} Vigentes
                        </span>
                        <span className="text-amp-slate font-normal">
                          ● {totalEnSede - vigentesEnSede} Vencidos/Otros
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
