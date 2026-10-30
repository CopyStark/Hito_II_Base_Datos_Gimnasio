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

      const newEntry: AccessLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        identificador: val,
        resultado: res,
      };
      setAccessLogs((prev) => [newEntry, ...prev.slice(0, 19)]);
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
    { label: "Socio #1 · Daniel Matus (Permitido)", value: "1" },
    { label: "RUT 18.765.432-K (Permitido)", value: "18.765.432-K" },
    { label: "Socia #2 · Emilia Osorio (Permitido)", value: "2" },
    { label: "Socia #13 · Inactiva (Denegado)", value: "13" },
    { label: "Socia #15 · Sin Contrato (Denegado)", value: "15" },
    { label: "No Registrado #9999 (Denegado)", value: "9999" },
  ];

  return (
    <div className="space-y-12">
      {/* Editorial Section Heading (amp: weight 300, negative tracking, orange accent rule) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-step">
                Step 2 &bull; Control
              </span>
              <span className="badge-neutral">
                GET /socios/acceso/validar/{`{identificador}`}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-amp-ink tracking-[-0.030em] leading-[1.15]">
              Control de Acceso & Torniquete
            </h1>
            <div className="h-[2.5px] w-24 bg-amp-orange mt-3"></div>

            <p className="text-sm text-amp-carbon mt-3 max-w-2xl font-normal leading-relaxed">
              Simulador de torniquete inteligente de portería. Valida en tiempo real si el socio existe en el catálogo,
              se encuentra activo y cuenta con un contrato vigente al día de hoy en SQL Server.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/socios"
              className="btn-secondary-pill bg-amp-white hover:bg-amp-linen border border-amp-hairline text-amp-carbon text-xs font-normal px-4 py-2.5 flex items-center gap-2"
            >
              <span>← Volver al Directorio</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Grid: Left Column Scanner / Right Column Physical Turnstile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Scanner Control */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-ghost p-6 space-y-5">
            <div>
              <span className="text-xs text-amp-orange font-medium uppercase tracking-wider">Lectura RFID</span>
              <h2 className="text-base font-medium text-amp-ink mt-0.5">
                Simulación de Escáner de Entrada
              </h2>
              <p className="text-xs text-amp-slate mt-1 font-normal">
                Ingrese el RUT (con o sin puntos/guión) o el ID numérico del socio para simular el paso por el sensor.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidarAcceso();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1.5">
                  Identificador del Socio (RUT o ID) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amp-slate text-sm">
                    🪪
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 18.765.432-K o 1"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="input-pill w-full pl-11 pr-8 py-2.5 text-xs sm:text-sm font-mono placeholder-amp-ash"
                  />
                  {identificador && (
                    <button
                      type="button"
                      onClick={() => setIdentificador("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-amp-slate hover:text-amp-ink"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identificador.trim()}
                className="btn-primary-pill w-full py-3 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Validando en SQL Server...</span>
                ) : (
                  <>
                    <span>Validar Paso en Torniquete</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Presets */}
            <div className="pt-4 border-t border-amp-hairline space-y-2.5">
              <span className="text-xs font-medium text-amp-carbon block">
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
                    className="p-2.5 rounded-[5px] bg-amp-linen hover:bg-amp-bone border border-amp-hairline text-left text-xs transition-all flex flex-col"
                  >
                    <span className="font-medium text-amp-ink">{preset.label}</span>
                    <span className="text-[10px] font-mono text-amp-slate">{preset.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Turnstile Status & Visual Feedback */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-ghost p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-amp-hairline">
              <h2 className="text-base font-medium text-amp-ink">
                Estado Físico del Torniquete
              </h2>
              {currentResult && (
                <span className="text-xs text-amp-slate font-normal">
                  Última prueba: <strong className="text-amp-carbon font-medium">{lastTestedId}</strong>
                </span>
              )}
            </div>

            {/* Standby state */}
            {!currentResult ? (
              <div className="py-16 text-center border border-dashed border-amp-hairline rounded-[5px] space-y-3 bg-amp-linen/50">
                <span className="text-4xl block opacity-60">🚪</span>
                <p className="text-base font-light text-amp-ink tracking-tight">
                  Torniquete en Espera (Standby)
                </p>
                <p className="text-xs text-amp-slate max-w-sm mx-auto font-normal">
                  Acerque una credencial o digite un RUT/ID en el panel lateral para ejecutar la verificación de membresía.
                </p>
              </div>
            ) : currentResult.acceso_permitido ? (
              /* GRANTED ACCESS: Featured Peach Wash Card (#ffdfcd, 5px radius) */
              <div className="card-peach p-6 sm:p-8 space-y-6 animate-fade-in-scale">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="badge-step text-[11px] py-0.5 px-2.5">
                      BARRERA DESBLOQUEADA &bull; PASE ADELANTE
                    </span>
                    <h3 className="text-2xl font-light text-amp-ink tracking-tight mt-2">
                      {currentResult.nombre_completo_socio}
                    </h3>
                    <p className="text-xs font-mono text-amp-carbon">
                      RUT: {currentResult.rut_socio} &bull; ID Socio: #{currentResult.id_socio}
                    </p>
                  </div>
                  <span className="text-3xl">🔓</span>
                </div>

                <div className="p-3.5 rounded-[5px] bg-amp-white/80 border border-amp-hairline text-xs text-amp-carbon font-normal">
                  {currentResult.motivo}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-[5px] bg-amp-white/70 border border-amp-hairline">
                    <span className="text-amp-slate block text-[11px]">Sede de Registro:</span>
                    <strong className="text-amp-ink font-medium text-xs mt-0.5 block">
                      {currentResult.sede_registro || "Principal"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-[5px] bg-amp-white/70 border border-amp-hairline">
                    <span className="text-amp-slate block text-[11px]">Plan de Membresía:</span>
                    <strong className="text-amp-orange font-medium text-xs mt-0.5 block">
                      {currentResult.nombre_plan || "Vigente"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-[5px] bg-amp-white/70 border border-amp-hairline">
                    <span className="text-amp-slate block text-[11px]">Vencimiento Contrato:</span>
                    <strong className="text-amp-ink font-medium text-xs mt-0.5 block">
                      {currentResult.fecha_termino_contrato
                        ? String(currentResult.fecha_termino_contrato)
                        : "Vigente"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              /* DENIED ACCESS: Charcoal Dark elevated section (#202120 Charcoal, 5px radius) */
              <div className="rounded-[5px] bg-amp-charcoal text-amp-white p-6 sm:p-8 space-y-6 animate-fade-in-scale">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] bg-amp-smoke border border-amp-hairline/20 text-xs text-amp-peach font-medium">
                      BARRERA BLOQUEADA &bull; ACCESO DENEGADO
                    </span>
                    <h3 className="text-2xl font-light text-amp-white tracking-tight mt-2">
                      {currentResult.nombre_completo_socio || "Socio No Identificado"}
                    </h3>
                    {currentResult.rut_socio && (
                      <p className="text-xs font-mono text-amp-ash">
                        RUT: {currentResult.rut_socio} &bull; ID: #{currentResult.id_socio}
                      </p>
                    )}
                  </div>
                  <span className="text-3xl">🔒</span>
                </div>

                <div className="p-3.5 rounded-[5px] bg-amp-smoke/70 border border-amp-hairline/10 text-xs text-amp-peach font-normal">
                  {currentResult.motivo}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-[5px] bg-amp-smoke/40 border border-amp-hairline/10">
                    <span className="text-amp-ash block text-[11px]">Estado del Socio:</span>
                    <strong className="text-amp-white font-medium text-xs mt-0.5 block">
                      {currentResult.activo_socio === null
                        ? "No Registrado en BD"
                        : currentResult.activo_socio
                        ? "Activo"
                        : "Inactivo"}
                    </strong>
                  </div>
                  <div className="p-3 rounded-[5px] bg-amp-smoke/40 border border-amp-hairline/10">
                    <span className="text-amp-ash block text-[11px]">Contrato Vigente:</span>
                    <strong className="text-amp-white font-medium text-xs mt-0.5 block">
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
            <div className="card-ghost p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-amp-ink">
                  Historial de Escaneos de la Sesión
                </h3>
                <button
                  onClick={() => setAccessLogs([])}
                  className="text-xs text-amp-slate hover:text-amp-orange transition-colors"
                >
                  Limpiar historial
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amp-linen text-amp-slate border-b border-amp-hairline uppercase text-[10px] font-medium">
                    <tr>
                      <th className="px-3 py-2">Hora</th>
                      <th className="px-3 py-2">Identificador</th>
                      <th className="px-3 py-2">Socio</th>
                      <th className="px-3 py-2">Resultado</th>
                      <th className="px-3 py-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amp-hairline">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-amp-linen/50 transition-colors">
                        <td className="px-3 py-2 font-mono text-amp-slate">{log.timestamp}</td>
                        <td className="px-3 py-2 font-mono text-amp-carbon">{log.identificador}</td>
                        <td className="px-3 py-2 font-medium text-amp-ink">
                          {log.resultado.nombre_completo_socio || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-[8px] font-medium text-[10px] ${
                              log.resultado.acceso_permitido
                                ? "bg-amp-peach text-amp-ink border border-amp-orange"
                                : "bg-amp-bone text-amp-slate border border-amp-hairline"
                            }`}
                          >
                            {log.resultado.acceso_permitido ? "PERMITIDO" : "DENEGADO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-amp-slate truncate max-w-[220px]">
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
        <div className="p-16 text-center text-amp-slate">
          <div className="w-6 h-6 border-2 border-amp-orange border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-normal">Iniciando simulador de torniquete...</p>
        </div>
      }
    >
      <TorniqueteContent />
    </Suspense>
  );
}
