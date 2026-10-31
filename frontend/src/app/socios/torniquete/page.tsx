"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import apiClient, { ControlAccesoResult } from "@/services/apiClient";
import {
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  CheckCircle2,
  XCircle,
  MapPin,
  CreditCard,
  Calendar,
  Clock,
  ArrowUpRight,
  Trash2,
  Loader2,
} from "lucide-react";

interface HistorialIngreso extends ControlAccesoResult {
  hora: string;
  identificador_consultado: string;
}

const PRESETS = [
  { label: "Socio #13 (Vigente)", val: "13", badge: "Autorizado" },
  { label: "RUT 18.900.013-K", val: "18.900.013-K", badge: "Autorizado" },
  { label: "Socio #1 (Vencido)", val: "1", badge: "Denegado" },
  { label: "Socio #2 (Sin contrato)", val: "2", badge: "Denegado" },
  { label: "Socio #5 (Inactivo)", val: "5", badge: "Denegado" },
];

function TorniqueteContent() {
  const searchParams = useSearchParams();
  const initialIdentificador = searchParams.get("identificador") || "";

  const [identificador, setIdentificador] = useState<string>(initialIdentificador);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ControlAccesoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialIngreso[]>([]);

  const validarAcceso = useCallback(async (valor: string) => {
    const clean = valor.trim();
    if (!clean) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: ControlAccesoResult = await apiClient.socios.validarAcceso(clean);
      setResultado(data);
      const nuevoRegistro: HistorialIngreso = {
        ...data,
        identificador_consultado: clean,
        hora: new Date().toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setHistorial((prev) => [nuevoRegistro, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al validar el acceso en el servidor.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialIdentificador) {
      validarAcceso(initialIdentificador);
    }
  }, [initialIdentificador, validarAcceso]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validarAcceso(identificador);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Control de Acceso · Recepción</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#0a0a0a]">
            Validador de Torniquete
          </h1>
          <div className="w-20 h-[2px] bg-[#ff6105]" />
          <p className="text-sm text-[#7a7b7b] max-w-xl pt-1">
            Verifica en tiempo real el ingreso de socios mediante RUT o ID, comprobando
            estado de cuenta, vigencia de membresía y sede asignada.
          </p>
        </div>

        <Link
          href="/socios"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-all self-start sm:self-auto"
        >
          <span>Ver Directorio de Socios</span>
          <ArrowUpRight className="w-4 h-4 text-[#ff6105]" />
        </Link>
      </div>

      {/* Layout Principal: Lector a la izquierda, Semáforo a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Lector / Escáner */}
        <div className="lg:col-span-5 bg-white border border-[#e5e5e5] rounded-[5px] p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-[#0a0a0a]">
              Terminal de Lectura
            </h2>
            <p className="text-xs text-[#7a7b7b]">
              Ingresa el RUT (con o sin guión) o el número de socio para validar su pase.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium mb-1.5">
                RUT o ID del Socio
              </label>
              <div className="relative">
                <ScanLine className="w-4 h-4 text-[#ff6105] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej: 18.900.013-K o 13"
                  className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-full pl-10 pr-4 py-2.5 text-sm font-mono text-[#0a0a0a] placeholder-[#7a7b7b] focus:outline-none focus:border-[#ff6105] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identificador.trim()}
              className="w-full py-3 px-6 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credencial...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validar Ingreso</span>
                </>
              )}
            </button>
          </form>

          {/* Accesos rápidos de prueba */}
          <div className="pt-5 border-t border-[#e5e5e5] space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Perfiles de Prueba Rápida
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setIdentificador(p.val);
                    validarAcceso(p.val);
                  }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-[5px] bg-[#f8f9f8] hover:bg-[#f3f4f3] border border-[#e5e5e5] hover:border-[#ff6105]/40 text-xs transition-all cursor-pointer text-left"
                >
                  <span className="font-medium text-[#0a0a0a]">{p.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      p.badge === "Autorizado"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel de Estado del Torniquete + Bitácora */}
        <div className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-[5px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs sm:text-sm flex items-center gap-2.5">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!resultado && !loading ? (
            <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#f8f9f8] border border-[#e5e5e5] flex items-center justify-center mx-auto text-[#7a7b7b]">
                <ScanLine className="w-6 h-6 text-[#ff6105]" />
              </div>
              <h3 className="text-lg font-medium text-[#0a0a0a]">
                Torniquete en Espera de Lectura
              </h3>
              <p className="text-xs text-[#7a7b7b] max-w-md mx-auto">
                Escanea el RUT o selecciona uno de los perfiles de prueba a la izquierda
                para consultar la autorización de ingreso en tiempo real.
              </p>
            </div>
          ) : resultado ? (
            <div
              className={`rounded-[5px] border p-6 sm:p-8 transition-all animate-fade-in-scale ${
                resultado.acceso_permitido
                  ? "bg-white border-emerald-300 shadow-xs"
                  : "bg-white border-rose-300 shadow-xs"
              }`}
            >
              {/* Encabezado de Estado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      resultado.acceso_permitido
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-rose-50 text-rose-600 border border-rose-200"
                    }`}
                  >
                    {resultado.acceso_permitido ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`inline-block text-[10px] uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full border ${
                        resultado.acceso_permitido
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {resultado.acceso_permitido ? "Pase Autorizado" : "Ingreso Denegado"}
                    </span>
                    <h2 className="text-2xl font-medium text-[#0a0a0a] mt-1">
                      {resultado.nombre_completo_socio || "Socio no registrado"}
                    </h2>
                  </div>
                </div>

                {resultado.rut_socio && (
                  <span className="font-mono text-xs px-3 py-1.5 rounded-full bg-[#f8f9f8] border border-[#e5e5e5] text-[#292b2a] self-start sm:self-auto">
                    RUT {resultado.rut_socio}
                  </span>
                )}
              </div>

              {/* Motivo de la resolución */}
              <div
                className={`mt-5 p-4 rounded-[5px] border text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                  resultado.acceso_permitido
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/70 border-rose-200 text-rose-900"
                }`}
              >
                {resultado.acceso_permitido ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{resultado.motivo}</span>
              </div>

              {/* Ficha Resumen del Socio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-3.5">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Sede Base
                    </span>
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                  </div>
                  <p className="text-xs font-medium text-[#0a0a0a] truncate">
                    {resultado.sede_registro || "—"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-3.5">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Plan Activo
                    </span>
                    <CreditCard className="w-3.5 h-3.5 text-[#ff6105]" />
                  </div>
                  <p className="text-xs font-medium text-[#0a0a0a] truncate">
                    {resultado.nombre_plan || "Sin plan"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-3.5">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Contrato
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ff6105]" />
                  </div>
                  <p className="text-xs font-medium text-[#0a0a0a]">
                    {resultado.contrato_vigente ? "Vigente" : "Sin vigencia"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-3.5">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Fecha Término
                    </span>
                    <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                  </div>
                  <p className="text-xs font-medium text-[#0a0a0a]">
                    {resultado.fecha_termino_contrato || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Bitácora de lecturas recientes */}
          {historial.length > 0 && (
            <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
              <div className="p-4 sm:px-6 border-b border-[#e5e5e5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ff6105]" />
                  <h3 className="text-sm font-medium text-[#0a0a0a]">
                    Bitácora de Lecturas en esta Sesión
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorial([])}
                  className="inline-flex items-center gap-1 text-xs text-[#7a7b7b] hover:text-[#0a0a0a] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>
              <div className="divide-y divide-[#e5e5e5]">
                {historial.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-6 py-3 flex items-center justify-between text-xs hover:bg-[#f8f9f8] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.acceso_permitido ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-[#0a0a0a]">
                          {item.nombre_completo_socio || item.identificador_consultado}
                        </p>
                        <p className="text-[11px] text-[#7a7b7b]">{item.motivo}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#7a7b7b]">
                      {item.hora}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TorniquetePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-[#7a7b7b]">
          Cargando validador de acceso...
        </div>
      }
    >
      <TorniqueteContent />
    </Suspense>
  );
}
