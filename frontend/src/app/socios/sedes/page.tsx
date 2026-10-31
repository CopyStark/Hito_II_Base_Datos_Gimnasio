"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import apiClient, { ReporteSedeItem } from "@/services/apiClient";
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  MapPin,
  Phone,
  BarChart3,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface SedeCatalogoItem {
  id_sede: number;
  nombre_sede: string;
  direccion_calle_sede?: string;
  telefono_sede?: string;
  nombre_ciudad?: string;
}

export default function SedesReportesPage() {
  const [catalogo, setCatalogo] = useState<SedeCatalogoItem[]>([]);
  const [reporte, setReporte] = useState<ReporteSedeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [catData, repData] = await Promise.all([
        apiClient.socios.getSedesCatalogo(),
        apiClient.socios.getReportePorSede(),
      ]);
      setCatalogo(Array.isArray(catData) ? catData : []);
      setReporte(Array.isArray(repData) ? repData : []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al consultar sedes y reportes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Agrupación de métricas por sede a partir del reporte SQL
  const resumenPorSede = useMemo(() => {
    const mapa: Record<
      string,
      {
        nombre_sede: string;
        vigentes: number;
        vencidos: number;
        cancelados: number;
        total: number;
      }
    > = {};

    catalogo.forEach((c) => {
      mapa[c.nombre_sede] = {
        nombre_sede: c.nombre_sede,
        vigentes: 0,
        vencidos: 0,
        cancelados: 0,
        total: 0,
      };
    });

    reporte.forEach((item) => {
      const nombre = item.nombre_sede || "Sede General";
      if (!mapa[nombre]) {
        mapa[nombre] = {
          nombre_sede: nombre,
          vigentes: 0,
          vencidos: 0,
          cancelados: 0,
          total: 0,
        };
      }
      const cant = Number(item.cantidad_socios || 0);
      const est = (item.estado_contrato || "").toLowerCase();
      if (est.includes("vigente")) {
        mapa[nombre].vigentes += cant;
      } else if (est.includes("cancelado")) {
        mapa[nombre].cancelados += cant;
      } else {
        mapa[nombre].vencidos += cant;
      }
      mapa[nombre].total += cant;
    });

    return Object.values(mapa);
  }, [catalogo, reporte]);

  const totales = useMemo(() => {
    const totalContratos = resumenPorSede.reduce((acc, r) => acc + r.total, 0);
    const totalVigentes = resumenPorSede.reduce((acc, r) => acc + r.vigentes, 0);
    const totalNoVigentes = totalContratos - totalVigentes;
    return { totalContratos, totalVigentes, totalNoVigentes };
  }, [resumenPorSede]);

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Infraestructura · Analítica por Sucursal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#0a0a0a]">
            Sedes y Distribución de Socios
          </h1>
          <div className="w-20 h-[2px] bg-[#ff6105]" />
          <p className="text-sm text-[#7a7b7b] max-w-xl pt-1">
            Consulta el directorio de sucursales operativas, ubicación geográfica y
            métricas consolidadas de afiliados según el estado de su membresía en cada sede.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm hover:shadow transition-all self-start sm:self-auto cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar Reportes</span>
        </button>
      </div>

      {/* KPI Ghost Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-[#ff6105]/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Sedes Operativas
            </p>
            <Building2 className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-3xl font-light text-[#0a0a0a] mt-2">{catalogo.length}</p>
          <p className="text-xs text-[#7a7b7b] mt-1">Sucursales registradas</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-[#ff6105]/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Contratos Evaluados
            </p>
            <Users className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-3xl font-light text-[#0a0a0a] mt-2">
            {totales.totalContratos}
          </p>
          <p className="text-xs text-[#7a7b7b] mt-1">Total consolidado por sede</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Membresías Vigentes
            </p>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-light text-emerald-600 mt-2">
            {totales.totalVigentes}
          </p>
          <p className="text-xs text-[#7a7b7b] mt-1">Con pase activo de ingreso</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-rose-500/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Vencidos o Cancelados
            </p>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-light text-rose-600 mt-2">
            {totales.totalNoVigentes}
          </p>
          <p className="text-xs text-[#7a7b7b] mt-1">Pendientes de renovación</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 text-center space-y-3">
          <Loader2 className="w-7 h-7 text-[#ff6105] animate-spin mx-auto" />
          <p className="text-sm text-[#7a7b7b]">Consultando sedes y métricas...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-10 text-center space-y-3">
          <p className="text-sm text-[#dc2626] font-medium">{errorMsg}</p>
          <button
            type="button"
            onClick={cargarDatos}
            className="px-4 py-2 rounded-full bg-[#ff6105] text-white text-xs font-medium cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Catálogo de Sedes */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#ffdfcd] text-[#ff6105] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-[#0a0a0a]">
                    Directorio de Sucursales
                  </h2>
                  <p className="text-xs text-[#7a7b7b]">
                    Información de ubicación, ciudad y teléfono de contacto por sede
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] self-start sm:self-auto">
                {catalogo.length} sucursales
              </span>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogo.map((sede) => (
                <div
                  key={sede.id_sede}
                  className="bg-[#f8f9f8] border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:bg-white hover:shadow-xs rounded-[5px] p-5 flex flex-col justify-between gap-4 transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20">
                        Sede #{sede.id_sede}
                      </span>
                      {sede.nombre_ciudad && (
                        <span className="whitespace-nowrap text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#7a7b7b] border border-[#e5e5e5]">
                          {sede.nombre_ciudad}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-medium text-[#0a0a0a]">
                        {sede.nombre_sede}
                      </h3>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#e5e5e5] text-xs text-[#292b2a]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                        <span>{sede.direccion_calle_sede || "Dirección no registrada"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#7a7b7b]">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{sede.telefono_sede || "Sin teléfono registrado"}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/socios?id_sede=${sede.id_sede}`}
                    className="inline-flex items-center justify-between text-xs font-medium text-[#292b2a] hover:text-[#ff6105] pt-2 border-t border-[#e5e5e5] transition-colors"
                  >
                    <span>Ver socios de esta sede</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de Distribución de Socios por Sede */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#ffdfcd] text-[#ff6105] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-[#0a0a0a]">
                    Distribución de Membresías por Sede
                  </h2>
                  <p className="text-xs text-[#7a7b7b]">
                    Comparativa consolidada de contratos vigentes, vencidos y cancelados
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] self-start sm:self-auto">
                {resumenPorSede.length} sedes evaluadas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f9f8] border-b border-[#e5e5e5] text-[11px] uppercase tracking-wider text-[#7a7b7b]">
                    <th className="py-3.5 px-5 font-medium whitespace-nowrap">Sucursal</th>
                    <th className="py-3.5 px-4 font-medium text-center whitespace-nowrap">
                      Total Contratos
                    </th>
                    <th className="py-3.5 px-4 font-medium text-center whitespace-nowrap">
                      Vigentes
                    </th>
                    <th className="py-3.5 px-4 font-medium text-center whitespace-nowrap">
                      Vencidos
                    </th>
                    <th className="py-3.5 px-4 font-medium text-center whitespace-nowrap">
                      Cancelados
                    </th>
                    <th className="py-3.5 px-5 font-medium whitespace-nowrap">
                      Cobertura Vigente
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] text-sm">
                  {resumenPorSede.map((r) => {
                    const pct =
                      r.total > 0 ? Math.round((r.vigentes / r.total) * 100) : 0;

                    return (
                      <tr
                        key={r.nombre_sede}
                        className="hover:bg-[#f8f9f8]/80 transition-colors"
                      >
                        <td className="py-3.5 px-5 font-medium text-[#0a0a0a] whitespace-nowrap">
                          {r.nombre_sede}
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-[#0a0a0a]">
                          {r.total}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {r.vigentes}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            {r.vencidos}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                            {r.cancelados}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 min-w-[180px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#f3f4f3] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#ff6105] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-[#7a7b7b] w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
