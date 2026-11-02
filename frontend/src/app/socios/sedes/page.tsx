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
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Infraestructura · Analítica por Sucursal</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Sedes y Distribución
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Consulta el directorio de sucursales operativas, ubicación geográfica y
            métricas consolidadas de afiliados según el estado de su membresía en cada sede.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="btn-primary-pill inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-medium tracking-[-0.01em] self-start lg:self-auto shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar Reportes</span>
        </button>
      </div>

      {/* KPI Ghost Cards + 1 Featured Peach Card — DESIGN.md compliant (zero secondary hues, zero shadows) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Sedes Operativas</p>
            <Building2 className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {catalogo.length}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Sucursales registradas</p>
        </div>

        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Contratos Evaluados</p>
            <Users className="w-4 h-4 text-[#292b2a]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {totales.totalContratos}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Total consolidado por sede</p>
        </div>

        <div className="bg-[#ffdfcd] border border-[#ffa069]/40 rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#292b2a] font-medium">Membresías Vigentes</p>
            <UserCheck className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {totales.totalVigentes}
          </p>
          <p className="text-[12px] text-[#292b2a] mt-1">Con pase activo de ingreso</p>
        </div>

        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Vencidos o Cancelados</p>
            <UserX className="w-4 h-4 text-[#7a7b7b]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {totales.totalNoVigentes}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Pendientes de renovación</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-12 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
          <p className="text-[14px] text-[#7a7b7b]">Consultando sedes y métricas...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-10 text-center space-y-4">
          <p className="text-[14px] text-[#0a0a0a] font-medium">{errorMsg}</p>
          <button
            type="button"
            onClick={cargarDatos}
            className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Catálogo de Sedes — DESIGN.md Ghost Cards 5px, flat hairline border, zero shadow */}
          <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[#ff6105] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[20px] sm:text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
                    Directorio de Sucursales
                  </h2>
                  <p className="text-[13px] text-[#7a7b7b]">
                    Información de ubicación, ciudad y teléfono de contacto por sede
                  </p>
                </div>
              </div>
              <span className="text-[12px] px-3 py-1 rounded-[8px] bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] self-start sm:self-auto">
                {catalogo.length} sucursales
              </span>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogo.map((sede) => (
                <div
                  key={sede.id_sede}
                  className="bg-[#f3f4f3] border border-[#dfe0df] hover:border-[#ff6105]/50 hover:bg-[#ffffff] rounded-[5px] p-5 flex flex-col justify-between gap-4 transition-colors duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap text-[12px] font-medium px-2.5 py-0.5 rounded-[8px] bg-[#ffffff] text-[#0a0a0a] border border-[#e5e5e5]">
                        Sede #{sede.id_sede}
                      </span>
                      {sede.nombre_ciudad && (
                        <span className="whitespace-nowrap text-[12px] text-[#7a7b7b]">
                          {sede.nombre_ciudad}
                        </span>
                      )}
                    </div>

                    <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                      {sede.nombre_sede}
                    </h3>

                    <div className="space-y-1.5 pt-2 border-t border-[#e5e5e5] text-[13px] text-[#292b2a]">
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
                    className="inline-flex items-center justify-between text-[13px] font-medium text-[#0a0a0a] hover:text-[#ff6105] pt-2 border-t border-[#e5e5e5] transition-colors"
                  >
                    <span>Ver socios de esta sede</span>
                    <ArrowUpRight className="w-4 h-4 text-[#ff6105]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de Distribución de Membresías por Sede — Monochrome + Orange */}
          <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[#ff6105] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[20px] sm:text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
                    Distribución de Membresías por Sede
                  </h2>
                  <p className="text-[13px] text-[#7a7b7b]">
                    Comparativa consolidada de contratos vigentes, vencidos y cancelados
                  </p>
                </div>
              </div>
              <span className="text-[12px] px-3 py-1 rounded-[8px] bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] self-start sm:self-auto">
                {resumenPorSede.length} sedes evaluadas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f3f4f3] border-b border-[#e5e5e5] text-[12px] text-[#7a7b7b]">
                    <th className="py-3 px-5 font-medium whitespace-nowrap">Sucursal</th>
                    <th className="py-3 px-4 font-medium text-center whitespace-nowrap">
                      Total Contratos
                    </th>
                    <th className="py-3 px-4 font-medium text-center whitespace-nowrap">
                      Vigentes
                    </th>
                    <th className="py-3 px-4 font-medium text-center whitespace-nowrap">
                      Vencidos
                    </th>
                    <th className="py-3 px-4 font-medium text-center whitespace-nowrap">
                      Cancelados
                    </th>
                    <th className="py-3 px-5 font-medium whitespace-nowrap">
                      Cobertura Vigente
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] text-[14px]">
                  {resumenPorSede.map((r) => {
                    const pct =
                      r.total > 0 ? Math.round((r.vigentes / r.total) * 100) : 0;

                    return (
                      <tr
                        key={r.nombre_sede}
                        className="hover:bg-[#f3f4f3]/50 transition-colors"
                      >
                        <td className="py-3.5 px-5 font-medium text-[#0a0a0a] whitespace-nowrap">
                          {r.nombre_sede}
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-[#0a0a0a]">
                          {r.total}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-[8px] text-[12px] font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ffa069]/40">
                            {r.vigentes}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-[8px] text-[12px] font-normal bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]">
                            {r.vencidos}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-[8px] text-[12px] font-normal bg-[#ffffff] text-[#7a7b7b] border border-[#e5e5e5]">
                            {r.cancelados}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 min-w-[170px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#f3f4f3] rounded-[50px] overflow-hidden">
                              <div
                                className="h-full bg-[#ff6105] rounded-[50px] transition-all duration-500"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-mono text-[#7a7b7b] w-10 text-right">
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
