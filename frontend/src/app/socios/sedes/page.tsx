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
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-cyan-950/60 border border-blue-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
            <span>🏢</span>
            <span>GET /socios/sedes/catalogo &bull; GET /socios/reportes/por-sede</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sedes & Reporte Analítico
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Catálogo de infraestructura de sedes y distribución de membresías por sucursal consultando
            directamente la vista oficial de base de datos <code className="text-cyan-300">vw_Reporte_Socios_Por_Sede</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            <span>Actualizar Datos</span>
          </button>
          <Link
            href="/socios"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all active:scale-95 shadow-md"
          >
            Ver Socios
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchData}
            className="text-xs px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 block mb-1">Sedes Operativas</span>
          <span className="text-3xl font-black text-white">{sedes.length}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Con cobertura nacional</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-900/30 shadow-lg">
          <span className="text-xs text-emerald-400 block mb-1">Membresías Vigentes</span>
          <span className="text-3xl font-black text-emerald-300">{stats.vigentes}</span>
          <span className="text-[11px] text-emerald-500/80 block mt-1">Acceso permitido</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-900/30 shadow-lg">
          <span className="text-xs text-amber-400 block mb-1">Membresías Vencidas</span>
          <span className="text-3xl font-black text-amber-300">{stats.vencidos}</span>
          <span className="text-[11px] text-amber-500/80 block mt-1">Pendientes de renovación</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-900/30 shadow-lg">
          <span className="text-xs text-cyan-400 block mb-1">Total Registros en Vista</span>
          <span className="text-3xl font-black text-cyan-300">{stats.totalContratos}</span>
          <span className="text-[11px] text-cyan-500/80 block mt-1">Consolidados por sede</span>
        </div>
      </div>

      {/* ===== SECTION 1: Catálogo de Sedes ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📍</span>
            <span>Catálogo de Sedes Disponibles (GET /socios/sedes/catalogo)</span>
          </h2>
          <span className="text-xs text-slate-400">Total: {sedes.length} sedes</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Cargando catálogo de sedes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((sede) => (
              <div
                key={sede.id_sede}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      ID #{sede.id_sede}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors mt-2">
                      {sede.nombre_sede}
                    </h3>
                  </div>
                  <span className="text-2xl">🏢</span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">🏙️ Ciudad:</span>
                    <strong className="text-cyan-300 font-medium">{sede.nombre_ciudad}</strong>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500">📍 Calle:</span>
                    <span className="text-slate-300">{sede.direccion_calle_sede}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">📞 Teléfono:</span>
                    <span className="text-slate-400 font-mono">{sede.telefono_sede}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Operativa</span>
                  </span>
                  <Link
                    href={`/socios?sede=${sede.id_sede}`}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Ver socios de esta sede →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SECTION 2: Reporte Analítico vw_Reporte_Socios_Por_Sede ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>Reporte Analítico: Socios por Sede & Estado de Contrato</span>
            </h2>
            <p className="text-xs text-slate-400">
              Datos provistos por la vista SQL Server <code className="text-cyan-300">vw_Reporte_Socios_Por_Sede</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Detailed Table */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] border-b border-slate-800 font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nombre de la Sede</th>
                    <th className="px-4 py-3">Estado de Contrato</th>
                    <th className="px-4 py-3 text-right">Cantidad de Socios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reporte.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        {loading ? "Consultando vista SQL Server..." : "No hay registros disponibles."}
                      </td>
                    </tr>
                  ) : (
                    reporte.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                          <span>🏢</span>
                          <span>{item.nombre_sede}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.estado_contrato === "Vigente"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : item.estado_contrato === "Vencido"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-700/50 text-slate-300 border border-slate-600"
                            }`}
                          >
                            {item.estado_contrato}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-white text-sm">
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
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
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
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-white font-semibold">{sedeName}</strong>
                        <span className="text-slate-400 font-mono">
                          {totalEnSede} socios ({pctVigentes}% vigentes)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pctVigentes}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                          title={`Vigentes: ${vigentesEnSede}`}
                        ></div>
                        <div
                          style={{ width: `${100 - pctVigentes}%` }}
                          className="bg-amber-500 h-full transition-all duration-500"
                          title="Vencidos / Otros"
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="text-emerald-400">
                          ● {vigentesEnSede} Vigentes
                        </span>
                        <span className="text-amber-400">
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
      </div>
    </div>
  );
}
