"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { sociosApi, ControlAccesoResult } from "@/services/apiClient";

interface AccessLogEntry {
  id: string;
  timestamp: string;
  identificador: string;
  resultado: ControlAccesoResult;
}

function TorniqueteContent() {
  const searchParams = useSearchParams();
  const initialRut = searchParams.get("rut") || "";

  const [identificador, setIdentificador] = useState(initialRut);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ControlAccesoResult | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [lastTestedId, setLastTestedId] = useState<string>("");

  const handleValidarAcceso = async (idToTest?: string) => {
    const val = (idToTest || identificador).trim();
    if (!val) return;

    setLoading(true);
    setLastTestedId(val);

    try {
      const res = await sociosApi.validarAcceso(val);
      setCurrentResult(res);

      // Append to logs
      const newEntry: AccessLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        identificador: val,
        resultado: res,
      };
      setAccessLogs((prev) => [newEntry, ...prev.slice(0, 19)]); // keep last 20
    } catch (err: any) {
      const errRes: ControlAccesoResult = {
        acceso_permitido: false,
        motivo: `Error al conectar con la base de datos: ${err.message}`,
        nombre_completo_socio: null,
      };
      setCurrentResult(errRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRut) {
      handleValidarAcceso(initialRut);
    }
  }, [initialRut]);

  // Preset buttons for quick validation tests
  const presetTests = [
    { label: "Socio #1 (Daniel Matus)", value: "1" },
    { label: "RUT 18.765.432-K", value: "18.765.432-K" },
    { label: "Socio #2 (Camila)", value: "2" },
    { label: "No Registrado (9999)", value: "9999" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-indigo-950/60 border border-blue-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-3">
            <span>🚪</span>
            <span>GET /socios/acceso/validar/{`{identificador}`}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Control de Acceso & Torniquete
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Simulador de torniquete inteligente de portería. Valida en tiempo real si el socio existe,
            se encuentra activo y cuenta con un contrato vigente al día de hoy en SQL Server.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/socios"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-all"
          >
            ← Volver a Socios
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input and Scanner Control */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📟</span>
              <span>Lector de Acceso / Simulación RFID</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ingrese el RUT (con o sin puntos/guión) o el ID numérico del socio para simular el escaneo en el torniquete.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidarAcceso();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Identificador del Socio (RUT o ID)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    🪪
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 18.765.432-K o 1"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                  {identificador && (
                    <button
                      type="button"
                      onClick={() => setIdentificador("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identificador.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-900/40 border border-cyan-400/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-base">🌀</span>
                    <span>Validando contra SQL Server...</span>
                  </>
                ) : (
                  <>
                    <span>Validar Paso en Torniquete</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Presets */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-400 block">
                Pruebas Rápidas Sugeridas:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presetTests.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setIdentificador(preset.value);
                      handleValidarAcceso(preset.value);
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 text-left text-xs text-slate-300 hover:text-white transition-all flex flex-col"
                  >
                    <span className="font-semibold">{preset.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">{preset.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Turnstile Visualizer & Barrier Status */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Estado Físico del Torniquete</span>
              </h2>
              {currentResult && (
                <span className="text-xs text-slate-400">
                  Última prueba: <strong className="text-slate-200">{lastTestedId}</strong>
                </span>
              )}
            </div>

            {/* Interactive Turnstile Display */}
            {!currentResult ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl space-y-3 bg-slate-950/30">
                <span className="text-6xl block opacity-60">🚪</span>
                <p className="text-base font-semibold text-slate-300">
                  Torniquete en Espera (Standby)
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Acerque una tarjeta o ingrese un RUT/ID en el panel izquierdo para consultar el motor de acceso.
                </p>
              </div>
            ) : currentResult.acceso_permitido ? (
              /* GRANTED ACCESS CARD */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/70 shadow-2xl shadow-emerald-950/60 space-y-6 animate-fade-in">
                {/* Visual Gate Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/40">
                      🔓
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>BARRERA ABIERTA &bull; PASE ADELANTE</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {currentResult.nombre_completo_socio}
                      </h3>
                      <p className="text-xs font-mono text-emerald-300/80">
                        RUT: {currentResult.rut_socio} &bull; ID Socio: #{currentResult.id_socio}
                      </p>
                    </div>
                  </div>

                  <span className="text-4xl hidden sm:inline">✅</span>
                </div>

                {/* Feedback message banner */}
                <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-xs sm:text-sm text-emerald-200">
                  {currentResult.motivo}
                </div>

                {/* Membership Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Sede de Registro:</span>
                    <strong className="text-white text-sm">
                      {currentResult.sede_registro || "Principal"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Plan de Membresía:</span>
                    <strong className="text-cyan-300 text-sm">
                      {currentResult.nombre_plan || "Vigente"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Vencimiento Contrato:</span>
                    <strong className="text-emerald-400 text-sm">
                      {currentResult.fecha_termino_contrato
                        ? String(currentResult.fecha_termino_contrato)
                        : "Vigente"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              /* DENIED ACCESS CARD */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-950/80 via-slate-900 to-rose-950/60 border-2 border-rose-500/70 shadow-2xl shadow-rose-950/60 space-y-6 animate-fade-in">
                {/* Visual Gate Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-3xl shadow-lg shadow-rose-500/40">
                      🔒
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-500/30 text-rose-300 border border-rose-400/50 mb-1">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>BARRERA BLOQUEADA &bull; ACCESO DENEGADO</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {currentResult.nombre_completo_socio || "Socio No Identificado"}
                      </h3>
                      {currentResult.rut_socio && (
                        <p className="text-xs font-mono text-rose-300/80">
                          RUT: {currentResult.rut_socio} &bull; ID: #{currentResult.id_socio}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-4xl hidden sm:inline">🚫</span>
                </div>

                {/* Motive Details */}
                <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-xs sm:text-sm text-rose-200 font-medium">
                  {currentResult.motivo}
                </div>

                {/* State breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Estado del Socio:</span>
                    <strong
                      className={
                        currentResult.activo_socio ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {currentResult.activo_socio === null
                        ? "No Registrado"
                        : currentResult.activo_socio
                        ? "Activo"
                        : "Inactivo en Sistema"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Contrato Vigente:</span>
                    <strong
                      className={
                        currentResult.contrato_vigente ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {currentResult.contrato_vigente
                        ? "Vigente"
                        : "Sin Contrato Vigente / Vencido"}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Access Audit Log */}
          {accessLogs.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Historial de Escaneos de la Sesión</span>
                </h3>
                <button
                  onClick={() => setAccessLogs([])}
                  className="text-xs text-slate-400 hover:text-rose-300 transition-colors"
                >
                  Limpiar historial
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Hora</th>
                      <th className="px-3 py-2">Identificador</th>
                      <th className="px-3 py-2">Socio</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2 font-mono text-slate-400">{log.timestamp}</td>
                        <td className="px-3 py-2 font-mono text-slate-300">
                          {log.identificador}
                        </td>
                        <td className="px-3 py-2 font-medium text-white">
                          {log.resultado.nombre_completo_socio || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              log.resultado.acceso_permitido
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {log.resultado.acceso_permitido ? "PERMITIDO" : "DENEGADO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-[220px]">
                          {log.resultado.motivo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Iniciando simulador de torniquete...</p>
        </div>
      }
    >
      <TorniqueteContent />
    </Suspense>
  );
}
