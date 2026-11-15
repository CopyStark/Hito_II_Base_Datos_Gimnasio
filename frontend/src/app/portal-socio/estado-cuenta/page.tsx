"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient, { EstadoCuentaSocio } from "@/services/apiClient";
import {
  Wallet,
  Receipt,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Building2,
  MapPin,
  RefreshCw,
} from "lucide-react";

export default function MiEstadoCuentaPage() {
  const { user } = useAuth();
  const socioId = user?.id_socio || 1;

  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaSocio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargarEstadoCuenta = async () => {
    if (!socioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.contratos.getEstadoCuentaSocio(socioId);
      setEstadoCuenta(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "No se pudo cargar el estado de cuenta financiero."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadoCuenta();
  }, [socioId]);

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
              Portal Financiero
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#0a0a0a] tracking-[-0.03em]">
            Mi Estado de Cuenta &amp; Pagos
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Revisa tus contratos vigentes, abonos realizados y saldo de membresía en tiempo real.
          </p>
        </div>

        <button
          onClick={cargarEstadoCuenta}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e5e5e5] hover:border-[#ff6105]/40 bg-[#f8f9f8] hover:bg-white text-xs font-medium text-[#292b2a] transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff6105]" : ""}`} />
          <span>Actualizar Saldo</span>
        </button>
      </div>

      {loading && !estadoCuenta && (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
          <span className="text-xs text-[#7a7b7b]">Consultando estado de cuenta en línea...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {estadoCuenta && (
        <>
          {/* Tarjetas KPI de Resumen Financiero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] flex items-center justify-between">
                <span>Estado Financiero</span>
                {estadoCuenta.saldo_pendiente <= 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </span>
              <div className="text-xl font-medium text-[#0a0a0a]">
                {estadoCuenta.saldo_pendiente <= 0 ? (
                  <span className="text-emerald-700">Al día</span>
                ) : (
                  <span className="text-amber-700">Con saldo pendiente</span>
                )}
              </div>
              <span className="block text-[11px] text-[#7a7b7b]">
                {estadoCuenta.tiene_contrato_vigente
                  ? "Membresía activa vigente"
                  : "Sin contrato vigente actualmente"}
              </span>
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Total Pactado
              </span>
              <div className="text-xl font-medium text-[#0a0a0a]">
                ${Number(estadoCuenta.total_pactado).toLocaleString("es-CL")}
              </div>
              <span className="block text-[11px] text-[#7a7b7b]">
                En {estadoCuenta.total_contratos} contratos suscritos
              </span>
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Total Pagado
              </span>
              <div className="text-xl font-medium text-emerald-700">
                ${Number(estadoCuenta.total_pagado).toLocaleString("es-CL")}
              </div>
              <span className="block text-[11px] text-[#7a7b7b]">
                Abonos registrados en caja
              </span>
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Saldo Pendiente
              </span>
              <div className="text-xl font-medium text-rose-700">
                ${Number(estadoCuenta.saldo_pendiente).toLocaleString("es-CL")}
              </div>
              <span className="block text-[11px] text-[#7a7b7b]">
                {estadoCuenta.saldo_pendiente <= 0 ? "Sin deuda pendiente" : "Deuda total acumulada"}
              </span>
            </div>
          </div>

          {/* Listado de Contratos */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <h2 className="text-base font-medium text-[#0a0a0a] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ff6105]" />
                <span>Mis Contratos de Membresía</span>
              </h2>
              <span className="text-xs text-[#7a7b7b]">
                {estadoCuenta.contratos.length} contratos
              </span>
            </div>

            {estadoCuenta.contratos.length === 0 ? (
              <p className="text-xs text-[#7a7b7b] py-4 text-center">
                No tienes contratos registrados. Acércate a recepción para emitir tu plan.
              </p>
            ) : (
              <div className="divide-y divide-[#e5e5e5]">
                {estadoCuenta.contratos.map((c) => (
                  <div
                    key={c.id_contrato}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[#0a0a0a]">
                          {c.nombre_planmembresia}
                        </strong>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            c.estado_contrato === "Vigente"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : c.estado_contrato === "Vencido"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {c.estado_contrato}
                        </span>
                      </div>
                      <div className="text-[#7a7b7b]">
                        Vigencia: {String(c.fecha_inicio_contrato)} al {String(c.fecha_termino_contrato)}
                        {c.duracion_meses_planmembresia ? ` (${c.duracion_meses_planmembresia} meses)` : ""}
                      </div>
                    </div>

                    <div className="text-right sm:self-auto self-start">
                      <div className="font-medium text-[#0a0a0a]">
                        ${Number(c.precio_pactado_contrato).toLocaleString("es-CL")}
                      </div>
                      <div className="text-[11px] text-[#7a7b7b]">
                        Pagado: ${Number(c.total_pagado ?? 0).toLocaleString("es-CL")}
                        {(c.saldo_pendiente ?? 0) > 0 && (
                          <span className="text-rose-600 ml-1.5 font-medium">
                            (Resta: ${Number(c.saldo_pendiente ?? 0).toLocaleString("es-CL")})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Pagos y Recibos */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <h2 className="text-base font-medium text-[#0a0a0a] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#ff6105]" />
                <span>Historial de Pagos y Recibos en Caja</span>
              </h2>
              <span className="text-xs text-[#7a7b7b]">
                {estadoCuenta.pagos.length} recibos
              </span>
            </div>

            {estadoCuenta.pagos.length === 0 ? (
              <p className="text-xs text-[#7a7b7b] py-4 text-center">
                No hay pagos registrados en tu historial.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] text-[#7a7b7b] font-medium">
                      <th className="py-2.5 px-3">Recibo</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Plan Asociado</th>
                      <th className="py-2.5 px-3">Medio de Pago</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {estadoCuenta.pagos.map((p) => (
                      <tr key={p.id_pago} className="hover:bg-[#f8f9f8]">
                        <td className="py-3 px-3 font-medium text-[#0a0a0a]">
                          #{p.id_pago}
                        </td>
                        <td className="py-3 px-3 text-[#7a7b7b]">
                          {String(p.fecha_pago).replace("T", " ")}
                        </td>
                        <td className="py-3 px-3 text-[#292b2a]">
                          {p.nombre_planmembresia}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] text-[10px]">
                            {p.medio_pago}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700">
                          +${Number(p.monto_cancelado_pago).toLocaleString("es-CL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

