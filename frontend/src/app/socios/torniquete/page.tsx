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

interface PresetAcceso {
  val: string;
  titulo: string;
  subtitulo: string;
  autorizado: boolean | null; // null mientras sincroniza en vivo
}

const INITIAL_PRESETS: PresetAcceso[] = [
  {
    val: "1",
    titulo: "Daniel Matus",
    subtitulo: "RUT 18.765.432-K · Membresía vigente",
    autorizado: true,
  },
  {
    val: "2",
    titulo: "Emilia Osorio",
    subtitulo: "RUT 19.123.456-7 · Membresía vigente",
    autorizado: true,
  },
  {
    val: "15",
    titulo: "Antonia Contreras Herrera",
    subtitulo: "RUT 13.108.521-2 · Sin contrato vigente",
    autorizado: false,
  },
  {
    val: "13",
    titulo: "Catalina López Reyes",
    subtitulo: "RUT 12.988.962-0 · Cuenta inactiva",
    autorizado: false,
  },
  {
    val: "99.999.999-9",
    titulo: "RUT 99.999.999-9",
    subtitulo: "Identificador no registrado en padrón",
    autorizado: false,
  },
];

function resumenCortoDesdeResultado(res: ControlAccesoResult, val: string): PresetAcceso {
  if (!res.id_socio) {
    return {
      val,
      titulo: `RUT ${val}`,
      subtitulo: "Identificador no registrado en padrón",
      autorizado: false,
    };
  }
  const rutTxt = res.rut_socio ? `RUT ${res.rut_socio}` : `Socio #${res.id_socio}`;
  let estadoTxt = "Membresía vigente";
  if (!res.acceso_permitido) {
    estadoTxt = res.activo_socio === false ? "Cuenta inactiva" : "Sin contrato vigente";
  } else if (res.nombre_plan) {
    estadoTxt = res.nombre_plan;
  }
  return {
    val,
    titulo: res.nombre_completo_socio || `Socio #${res.id_socio}`,
    subtitulo: `${rutTxt} · ${estadoTxt}`,
    autorizado: res.acceso_permitido,
  };
}

function TorniqueteContent() {
  const searchParams = useSearchParams();
  const initialIdentificador = searchParams.get("identificador") || "";

  const [identificador, setIdentificador] = useState<string>(initialIdentificador);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ControlAccesoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialIngreso[]>([]);
  const [presets, setPresets] = useState<PresetAcceso[]>(INITIAL_PRESETS);

  // Sincronizar en vivo los perfiles de prueba con la base de datos real al montar
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const checks = await Promise.allSettled(
        INITIAL_PRESETS.map((p) => apiClient.socios.validarAcceso(p.val))
      );
      if (cancelado) return;
      setPresets((prev) =>
        prev.map((item, idx) => {
          const r = checks[idx];
          if (r.status === "fulfilled" && r.value) {
            return resumenCortoDesdeResultado(r.value, item.val);
          }
          return item;
        })
      );
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const validarAcceso = useCallback(async (valor: string) => {
    const clean = valor.trim();
    if (!clean) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: ControlAccesoResult = await apiClient.socios.validarAcceso(clean);
      setResultado(data);

      // Si el identificador corresponde a un perfil rápido, mantener su insignia sincronizada
      setPresets((prev) =>
        prev.map((p) =>
          p.val === clean || (data.rut_socio && p.val === data.rut_socio)
            ? resumenCortoDesdeResultado(data, p.val)
            : p
        )
      );

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
              Ingresa el RUT (con guión) o el número de socio para validar su pase.
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
                  placeholder="Ej: 18.765.432-K o 1"
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

          {/* Accesos rápidos de prueba sincronizados con SQL Server */}
          <div className="pt-5 border-t border-[#e5e5e5] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
                Perfiles de Prueba en Vivo
              </p>
              <span className="text-[10px] text-[#7a7b7b]">Clic para escanear</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {presets.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setIdentificador(p.val);
                    validarAcceso(p.val);
                  }}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[5px] bg-[#f8f9f8] hover:bg-[#f3f4f3] border border-[#e5e5e5] hover:border-[#ff6105]/40 text-xs transition-all cursor-pointer text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#0a0a0a] truncate">{p.titulo}</p>
                    <p className="text-[11px] text-[#7a7b7b] truncate">{p.subtitulo}</p>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                      p.autorizado
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {p.autorizado ? "Autorizado" : "Denegado"}
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
              className={`bg-white border border-[#e5e5e5] border-t-2 rounded-[5px] p-6 sm:p-8 transition-all animate-fade-in-scale ${
                resultado.acceso_permitido
                  ? "border-t-emerald-500"
                  : "border-t-rose-500"
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
                  <span className="whitespace-nowrap font-mono text-xs px-3 py-1.5 rounded-full bg-[#f8f9f8] border border-[#e5e5e5] text-[#292b2a] self-start sm:self-auto">
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

              {/* Ficha Resumen del Socio (Grilla 2x2 espaciosa sin truncado) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Sede Base
                    </span>
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a] leading-snug">
                    {resultado.sede_registro || "No asignada"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Plan Activo
                    </span>
                    <CreditCard className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a] leading-snug">
                    {resultado.nombre_plan || "Sin plan vigente"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Estado de Membresía
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a] leading-snug">
                    {resultado.contrato_vigente ? "Contrato Vigente" : "Sin vigencia activa"}
                  </p>
                </div>

                <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                  <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium">
                      Fecha de Término
                    </span>
                    <Calendar className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a] leading-snug">
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
                    className="px-6 py-3 flex items-center justify-between gap-4 text-xs hover:bg-[#f8f9f8] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.acceso_permitido ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-[#0a0a0a] truncate">
                          {item.nombre_completo_socio || item.identificador_consultado}
                        </p>
                        <p className="text-[11px] text-[#7a7b7b] truncate">
                          {item.motivo}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#7a7b7b] whitespace-nowrap shrink-0">
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
