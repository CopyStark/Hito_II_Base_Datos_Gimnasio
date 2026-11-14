"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  apiClient,
  LogContratoItem,
  LogInscripcionItem,
  SocioFidelidadCursorItem,
} from "@/services/apiClient";
import {
  History,
  Shield,
  ShieldAlert,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  UserCheck,
  UserX,
  Search,
  Filter,
  ArrowRight,
  X,
  FileText,
  Database,
  Cpu,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";

interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

function formatearFechaHora(fechaStr?: string | null): string {
  if (!fechaStr) return "—";
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return fechaStr;
  }
}

function BadgeOperacion({ tipo }: { tipo: string }) {
  const t = (tipo || "").toUpperCase();
  if (t === "INSERT") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        INSERT
      </span>
    );
  }
  if (t === "UPDATE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        UPDATE
      </span>
    );
  }
  if (t === "DELETE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        DELETE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
      {tipo}
    </span>
  );
}

function BadgeFidelidad({ clasificacion }: { clasificacion: string }) {
  const c = (clasificacion || "").toUpperCase();
  if (c === "RIESGO DE DESERCION" || c.includes("DESERCION")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        RIESGO DE DESERCIÓN
      </span>
    );
  }
  if (c === "FRECUENTE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        FRECUENTE
      </span>
    );
  }
  if (c === "OCASIONAL") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        OCASIONAL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      SIN ACTIVIDAD
    </span>
  );
}

export default function AuditoriaFidelidadPage() {
  // Pestaña principal: "triggers" o "cursor"
  const [tabActiva, setTabActiva] = useState<"triggers" | "cursor">("triggers");

  // Sub-selector de triggers: "inscripciones" o "contratos"
  const [subTipoLog, setSubTipoLog] = useState<"inscripciones" | "contratos">("inscripciones");

  // Estados de datos
  const [logsInscripciones, setLogsInscripciones] = useState<LogInscripcionItem[]>([]);
  const [logsContratos, setLogsContratos] = useState<LogContratoItem[]>([]);
  const [datosCursor, setDatosCursor] = useState<SocioFidelidadCursorItem[]>([]);

  // Estados de carga y filtros
  const [cargandoLogs, setCargandoLogs] = useState(false);
  const [cargandoCursor, setCargandoCursor] = useState(false);
  const [busquedaLog, setBusquedaLog] = useState("");
  const [filtroOperacion, setFiltroOperacion] = useState<string>("TODAS");

  const [busquedaCursor, setBusquedaCursor] = useState("");
  const [filtroClasificacion, setFiltroClasificacion] = useState<string>("TODAS");

  // Notificación flotante (Toast)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Auto-cierre del Toast
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Carga de logs de triggers
  const cargarLogs = useCallback(async (tipo?: "inscripciones" | "contratos") => {
    const objetivo = tipo || subTipoLog;
    setCargandoLogs(true);
    try {
      if (objetivo === "inscripciones") {
        const data = await apiClient.auditoria.getLogsInscripciones();
        setLogsInscripciones(Array.isArray(data) ? data : []);
      } else {
        const data = await apiClient.auditoria.getLogsContratos();
        setLogsContratos(Array.isArray(data) ? data : []);
      }
      setFeedback({
        type: "success",
        message: `Logs de ${objetivo === "inscripciones" ? "inscripciones y asistencias" : "contratos"} actualizados correctamente.`,
      });
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al conectar con el servidor para consultar logs.";
      setFeedback({
        type: "error",
        message: `Error al cargar logs: ${msg}`,
      });
    } finally {
      setCargandoLogs(false);
    }
  }, [subTipoLog]);

  // Carga inicial de logs al montar o cambiar sub-tipo
  useEffect(() => {
    cargarLogs(subTipoLog);
  }, [subTipoLog]);

  // Ejecución del cursor procedural
  const ejecutarCursor = useCallback(async () => {
    setCargandoCursor(true);
    try {
      const data = await apiClient.auditoria.getFidelidadCursor();
      const lista = Array.isArray(data) ? data : [];
      setDatosCursor(lista);
      setFeedback({
        type: "success",
        message: `Análisis procedural con cursor ejecutado exitosamente. Se evaluaron ${lista.length} socios activos.`,
      });
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al ejecutar sp_Reporte_Fidelidad_Socios_Cursor.";
      setFeedback({
        type: "error",
        message: `Fallo al ejecutar cursor: ${msg}`,
      });
    } finally {
      setCargandoCursor(false);
    }
  }, []);

  // Cargar cursor si entra a la pestaña y aún no hay datos
  useEffect(() => {
    if (tabActiva === "cursor" && datosCursor.length === 0 && !cargandoCursor) {
      ejecutarCursor();
    }
  }, [tabActiva]);

  // Filtrado de logs de inscripciones
  const logsInscripcionesFiltrados = useMemo(() => {
    return logsInscripciones.filter((item) => {
      const cumpleOperacion =
        filtroOperacion === "TODAS" || item.tipo_operacion.toUpperCase() === filtroOperacion;
      const q = busquedaLog.trim().toLowerCase();
      const cumpleBusqueda =
        !q ||
        String(item.id_inscripcion).includes(q) ||
        String(item.id_log).includes(q) ||
        (item.usuario_sql && item.usuario_sql.toLowerCase().includes(q)) ||
        (item.equipo_origen && item.equipo_origen.toLowerCase().includes(q)) ||
        (item.estado_nuevo && item.estado_nuevo.toLowerCase().includes(q));
      return cumpleOperacion && cumpleBusqueda;
    });
  }, [logsInscripciones, filtroOperacion, busquedaLog]);

  // Filtrado de logs de contratos
  const logsContratosFiltrados = useMemo(() => {
    return logsContratos.filter((item) => {
      const cumpleOperacion =
        filtroOperacion === "TODAS" || item.tipo_operacion.toUpperCase() === filtroOperacion;
      const q = busquedaLog.trim().toLowerCase();
      const cumpleBusqueda =
        !q ||
        String(item.id_contrato).includes(q) ||
        String(item.id_log).includes(q) ||
        (item.usuario_sql && item.usuario_sql.toLowerCase().includes(q)) ||
        (item.equipo_origen && item.equipo_origen.toLowerCase().includes(q)) ||
        (item.estado_nuevo && item.estado_nuevo.toLowerCase().includes(q));
      return cumpleOperacion && cumpleBusqueda;
    });
  }, [logsContratos, filtroOperacion, busquedaLog]);

  // Métricas del cursor de fidelidad
  const metricasCursor = useMemo(() => {
    const total = datosCursor.length;
    let riesgo = 0;
    let frecuente = 0;
    let ocasional = 0;
    let sinActividad = 0;

    for (const s of datosCursor) {
      const c = (s.clasificacion_fidelidad || "").toUpperCase();
      if (c === "RIESGO DE DESERCION" || c.includes("DESERCION")) {
        riesgo++;
      } else if (c === "FRECUENTE") {
        frecuente++;
      } else if (c === "OCASIONAL") {
        ocasional++;
      } else {
        sinActividad++;
      }
    }

    return {
      total,
      riesgo,
      frecuente,
      ocasional,
      sinActividad,
      pctRiesgo: total > 0 ? Math.round((riesgo / total) * 100) : 0,
      pctFrecuente: total > 0 ? Math.round((frecuente / total) * 100) : 0,
      pctOcasional: total > 0 ? Math.round((ocasional / total) * 100) : 0,
      pctSinActividad: total > 0 ? Math.round((sinActividad / total) * 100) : 0,
    };
  }, [datosCursor]);

  // Filtrado de la tabla del cursor
  const datosCursorFiltrados = useMemo(() => {
    return datosCursor.filter((s) => {
      const cumpleClasificacion =
        filtroClasificacion === "TODAS" ||
        (s.clasificacion_fidelidad || "").toUpperCase() === filtroClasificacion;
      const q = busquedaCursor.trim().toLowerCase();
      const cumpleBusqueda =
        !q ||
        s.rut_socio.toLowerCase().includes(q) ||
        s.nombre_completo_socio.toLowerCase().includes(q) ||
        s.nombre_sede.toLowerCase().includes(q) ||
        String(s.id_socio).includes(q);
      return cumpleClasificacion && cumpleBusqueda;
    });
  }, [datosCursor, filtroClasificacion, busquedaCursor]);

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* =========================================================================
          NOTIFICACIÓN FLOTANTE (TOAST EN ESQUINA INFERIOR DERECHA)
         ========================================================================= */}
      {feedback && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in-scale shadow-2xl">
          <div
            className={`p-4 rounded-[5px] border flex items-start gap-3 backdrop-blur-md ${
              feedback.type === "success"
                ? "bg-white/95 border-emerald-300 text-emerald-900 shadow-emerald-500/10"
                : feedback.type === "error"
                ? "bg-white/95 border-rose-300 text-rose-900 shadow-rose-500/10"
                : "bg-white/95 border-[#ff6105]/30 text-[#0a0a0a] shadow-[#ff6105]/10"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#ff6105] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
              {feedback.message}
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#7a7b7b] hover:text-[#0a0a0a] cursor-pointer p-0.5"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ENCABEZADO EDITORIAL DE AUDITORÍA & CURSORES
         ========================================================================= */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            Control Procedural &amp; Evidencia Forense en SQL Server
          </span>

          <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
            Auditoría &amp; Análisis de Fidelidad
          </h1>

          <div className="w-20 h-[2px] bg-[#ff6105]" />

          <p className="text-sm sm:text-base text-[#7a7b7b] leading-relaxed pt-1">
            Monitoreo en tiempo real de triggers transaccionales (<code className="text-xs bg-[#f3f4f3] px-1.5 py-0.5 rounded text-[#0a0a0a]">LOG_CAMBIO_CONTRATO</code> y <code className="text-xs bg-[#f3f4f3] px-1.5 py-0.5 rounded text-[#0a0a0a]">LOG_CAMBIO_INSCRIPCION</code>) y ejecución bajo demanda del cursor procedural <code className="text-xs bg-[#f3f4f3] px-1.5 py-0.5 rounded text-[#0a0a0a]">sp_Reporte_Fidelidad_Socios_Cursor</code>.
          </p>
        </div>

        {/* Selector de Pestaña Principal (Triggers vs Cursor) */}
        <div className="inline-flex p-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5] shrink-0 self-start lg:self-end">
          <button
            onClick={() => setTabActiva("triggers")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
              tabActiva === "triggers"
                ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                : "text-[#7a7b7b] hover:text-[#0a0a0a]"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Bitácora de Triggers</span>
          </button>
          <button
            onClick={() => setTabActiva("cursor")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
              tabActiva === "cursor"
                ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                : "text-[#7a7b7b] hover:text-[#0a0a0a]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Análisis de Fidelidad (Cursor)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CONTENIDO: TAB 1 — BITÁCORA DE TRIGGERS
         ========================================================================= */}
      {tabActiva === "triggers" && (
        <div className="space-y-6">
          {/* Barra de Controles y Filtros */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Sub-selector: Inscripciones vs Contratos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#7a7b7b] uppercase tracking-wider mr-1">
                Tabla de Log:
              </span>
              <button
                onClick={() => setSubTipoLog("inscripciones")}
                className={`px-3.5 py-1.5 rounded-[5px] text-xs font-medium border transition-colors ${
                  subTipoLog === "inscripciones"
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-[#292b2a] border-[#e5e5e5] hover:bg-[#f3f4f3]"
                }`}
              >
                Inscripciones &amp; Asistencia (LOG_CAMBIO_INSCRIPCION)
              </button>
              <button
                onClick={() => setSubTipoLog("contratos")}
                className={`px-3.5 py-1.5 rounded-[5px] text-xs font-medium border transition-colors ${
                  subTipoLog === "contratos"
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-[#292b2a] border-[#e5e5e5] hover:bg-[#f3f4f3]"
                }`}
              >
                Contratos &amp; Membresías (LOG_CAMBIO_CONTRATO)
              </button>
            </div>

            {/* Acciones: Filtro operación, búsqueda y botón actualizar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7a7b7b] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por ID o usuario..."
                  value={busquedaLog}
                  onChange={(e) => setBusquedaLog(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-[5px] border border-[#e5e5e5] bg-[#f8f9f8] focus:bg-white focus:outline-none focus:border-[#ff6105] text-[#0a0a0a] w-48"
                />
              </div>

              <select
                value={filtroOperacion}
                onChange={(e) => setFiltroOperacion(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-[5px] border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#ff6105]"
              >
                <option value="TODAS">Todas las operaciones</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>

              <button
                onClick={() => cargarLogs()}
                disabled={cargandoLogs}
                className="text-xs px-4 py-1.5 rounded-[5px] font-medium bg-[#ff6105] hover:bg-[#e05504] text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoLogs ? "animate-spin" : ""}`} />
                <span>Actualizar Logs</span>
              </button>
            </div>
          </div>

          {/* Tabla de Logs */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafbfa]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  {subTipoLog === "inscripciones"
                    ? "Eventos de Inscripción y Pase de Asistencia (Últimos 50)"
                    : "Eventos de Ciclo de Vida de Contratos (Últimos 50)"}
                </h3>
              </div>
              <span className="text-xs text-[#7a7b7b]">
                {subTipoLog === "inscripciones"
                  ? `${logsInscripcionesFiltrados.length} registros encontrados`
                  : `${logsContratosFiltrados.length} registros encontrados`}
              </span>
            </div>

            <div className="overflow-x-auto">
              {subTipoLog === "inscripciones" ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#f8f9f8] text-[#7a7b7b] uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-medium"># Log</th>
                      <th className="py-3 px-4 font-medium">Operación</th>
                      <th className="py-3 px-4 font-medium">ID Inscripción</th>
                      <th className="py-3 px-4 font-medium">Transición de Estado / Asistencia</th>
                      <th className="py-3 px-4 font-medium">Usuario SQL</th>
                      <th className="py-3 px-4 font-medium">Origen (Host / App)</th>
                      <th className="py-3 px-4 font-medium text-right">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cargandoLogs ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                            <span>Cargando eventos desde SQL Server...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logsInscripcionesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                            <Shield className="w-8 h-8 text-[#a2a3a2]" />
                            <p className="font-medium text-[#0a0a0a]">
                              No hay eventos de auditoría registrados en LOG_CAMBIO_INSCRIPCION
                            </p>
                            <p className="text-xs">
                              Los registros se generan automáticamente al cancelar inscripciones desde el portal o guardar asistencia en el pase de lista de instructores.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logsInscripcionesFiltrados.map((item) => (
                        <tr key={item.id_log} className="hover:bg-[#fbfcfb] transition-colors">
                          <td className="py-3 px-4 font-mono text-[#7a7b7b]">
                            #{item.id_log}
                          </td>
                          <td className="py-3 px-4">
                            <BadgeOperacion tipo={item.tipo_operacion} />
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0a0a0a]">
                            Inscripción #{item.id_inscripcion}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#7a7b7b]">
                                  {item.estado_anterior || "—"}
                                </span>
                                <ArrowRight className="w-3 h-3 text-[#ff6105]" />
                                <span className="font-semibold text-[#0a0a0a]">
                                  {item.estado_nuevo || "—"}
                                </span>
                              </div>
                              {(item.asistio_anterior !== null || item.asistio_nuevo !== null) && (
                                <div className="text-[10px] text-[#7a7b7b]">
                                  Asistió: {item.asistio_anterior === true ? "Sí" : item.asistio_anterior === false ? "No" : "Pendiente"} →{" "}
                                  <span className="font-medium text-[#0a0a0a]">
                                    {item.asistio_nuevo === true ? "Sí" : item.asistio_nuevo === false ? "No" : "Pendiente"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#292b2a]">
                            <span className="font-mono bg-[#f3f4f3] px-1.5 py-0.5 rounded text-[11px]">
                              {item.usuario_sql || "sa"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#7a7b7b] text-[11px]">
                            <p className="truncate max-w-[160px]" title={item.equipo_origen || "—"}>
                              Host: {item.equipo_origen || "—"}
                            </p>
                            <p className="truncate max-w-[160px] text-[10px]" title={item.aplicacion_origen || "—"}>
                              App: {item.aplicacion_origen || "—"}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#7a7b7b]">
                            {formatearFechaHora(item.fecha_cambio)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-[#f8f9f8] text-[#7a7b7b] uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-medium"># Log</th>
                      <th className="py-3 px-4 font-medium">Operación</th>
                      <th className="py-3 px-4 font-medium">ID Contrato</th>
                      <th className="py-3 px-4 font-medium">Transición de Estado / Término</th>
                      <th className="py-3 px-4 font-medium">Usuario SQL</th>
                      <th className="py-3 px-4 font-medium">Origen (Host / App)</th>
                      <th className="py-3 px-4 font-medium text-right">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cargandoLogs ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                            <span>Cargando eventos desde SQL Server...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logsContratosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                            <Shield className="w-8 h-8 text-[#a2a3a2]" />
                            <p className="font-medium text-[#0a0a0a]">
                              No hay eventos de auditoría registrados en LOG_CAMBIO_CONTRATO
                            </p>
                            <p className="text-xs">
                              Los registros se generan automáticamente al emitir un nuevo contrato, renovar, cambiar estado o cancelar una membresía.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logsContratosFiltrados.map((item) => (
                        <tr key={item.id_log} className="hover:bg-[#fbfcfb] transition-colors">
                          <td className="py-3 px-4 font-mono text-[#7a7b7b]">
                            #{item.id_log}
                          </td>
                          <td className="py-3 px-4">
                            <BadgeOperacion tipo={item.tipo_operacion} />
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0a0a0a]">
                            Contrato #{item.id_contrato}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#7a7b7b]">
                                  {item.estado_anterior || "—"}
                                </span>
                                <ArrowRight className="w-3 h-3 text-[#ff6105]" />
                                <span className="font-semibold text-[#0a0a0a]">
                                  {item.estado_nuevo || "—"}
                                </span>
                              </div>
                              {(item.fecha_fin_anterior || item.fecha_fin_nueva) && (
                                <div className="text-[10px] text-[#7a7b7b]">
                                  Vencimiento: {item.fecha_fin_anterior || "—"} →{" "}
                                  <span className="font-medium text-[#0a0a0a]">
                                    {item.fecha_fin_nueva || "—"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#292b2a]">
                            <span className="font-mono bg-[#f3f4f3] px-1.5 py-0.5 rounded text-[11px]">
                              {item.usuario_sql || "sa"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#7a7b7b] text-[11px]">
                            <p className="truncate max-w-[160px]" title={item.equipo_origen || "—"}>
                              Host: {item.equipo_origen || "—"}
                            </p>
                            <p className="truncate max-w-[160px] text-[10px]" title={item.aplicacion_origen || "—"}>
                              App: {item.aplicacion_origen || "—"}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#7a7b7b]">
                            {formatearFechaHora(item.fecha_cambio)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENIDO: TAB 2 — ANÁLISIS DE FIDELIDAD (CURSOR PROCEDURAL)
         ========================================================================= */}
      {tabActiva === "cursor" && (
        <div className="space-y-6">
          {/* Cabecera de Control del Cursor */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  Procedimiento Stored: <code className="font-mono text-xs bg-[#f3f4f3] px-1 py-0.5 rounded">sp_Reporte_Fidelidad_Socios_Cursor</code>
                </h3>
              </div>
              <p className="text-xs text-[#7a7b7b]">
                Procesa individualmente mediante un cursor <code className="font-mono text-[11px]">FAST_FORWARD</code> el historial de asistencias, inasistencias y vigencia de contratos.
              </p>
            </div>

            <button
              onClick={ejecutarCursor}
              disabled={cargandoCursor}
              className="text-xs sm:text-sm px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {cargandoCursor ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Iterando Cursor SQL...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Ejecutar Análisis con Cursor</span>
                </>
              )}
            </button>
          </div>

          {/* Tarjetas Resumen por Categoría (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Riesgo de Deserción */}
            <div className="bg-white border border-[#e5e5e5] hover:border-rose-300 rounded-[5px] p-5 space-y-2 transition-all">
              <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
                <span className="font-medium uppercase tracking-wider text-rose-700">
                  Riesgo de Deserción
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light tracking-[-0.02em] text-rose-700">
                  {cargandoCursor ? "..." : metricasCursor.riesgo}
                </span>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasCursor.pctRiesgo}%`}
                </span>
              </div>
              <p className="text-[11px] text-[#7a7b7b] leading-tight">
                2+ inasistencias o contrato por vencer sin asistencia registrada.
              </p>
            </div>

            {/* 2. Frecuente */}
            <div className="bg-white border border-[#e5e5e5] hover:border-emerald-300 rounded-[5px] p-5 space-y-2 transition-all">
              <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
                <span className="font-medium uppercase tracking-wider text-emerald-700">
                  Frecuente
                </span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light tracking-[-0.02em] text-emerald-700">
                  {cargandoCursor ? "..." : metricasCursor.frecuente}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasCursor.pctFrecuente}%`}
                </span>
              </div>
              <p className="text-[11px] text-[#7a7b7b] leading-tight">
                3 o más asistencias efectivas a sesiones dirigidas.
              </p>
            </div>

            {/* 3. Ocasional */}
            <div className="bg-white border border-[#e5e5e5] hover:border-blue-300 rounded-[5px] p-5 space-y-2 transition-all">
              <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
                <span className="font-medium uppercase tracking-wider text-blue-700">
                  Ocasional
                </span>
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light tracking-[-0.02em] text-blue-700">
                  {cargandoCursor ? "..." : metricasCursor.ocasional}
                </span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasCursor.pctOcasional}%`}
                </span>
              </div>
              <p className="text-[11px] text-[#7a7b7b] leading-tight">
                1 a 2 asistencias registradas en clases del gimnasio.
              </p>
            </div>

            {/* 4. Sin Actividad */}
            <div className="bg-white border border-[#e5e5e5] hover:border-gray-300 rounded-[5px] p-5 space-y-2 transition-all">
              <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
                <span className="font-medium uppercase tracking-wider text-gray-700">
                  Sin Actividad
                </span>
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-light tracking-[-0.02em] text-gray-700">
                  {cargandoCursor ? "..." : metricasCursor.sinActividad}
                </span>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasCursor.pctSinActividad}%`}
                </span>
              </div>
              <p className="text-[11px] text-[#7a7b7b] leading-tight">
                Socios activos sin asistencias registradas a la fecha.
              </p>
            </div>
          </div>

          {/* Filtros de la Tabla de Fidelidad */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[#7a7b7b] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por RUT, nombre de socio o sede..."
                value={busquedaCursor}
                onChange={(e) => setBusquedaCursor(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[5px] border border-[#e5e5e5] bg-[#f8f9f8] focus:bg-white focus:outline-none focus:border-[#ff6105] text-[#0a0a0a]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7a7b7b] whitespace-nowrap">Clasificación:</span>
              <select
                value={filtroClasificacion}
                onChange={(e) => setFiltroClasificacion(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-[5px] border border-[#e5e5e5] bg-white text-[#0a0a0a] focus:outline-none focus:border-[#ff6105]"
              >
                <option value="TODAS">Todas las categorías</option>
                <option value="RIESGO DE DESERCION">Riesgo de Deserción</option>
                <option value="FRECUENTE">Frecuente</option>
                <option value="OCASIONAL">Ocasional</option>
                <option value="SIN ACTIVIDAD">Sin Actividad</option>
              </select>
            </div>
          </div>

          {/* Tabla de Detalle del Cursor */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafbfa]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  Padrón de Socios Evaluados por el Cursor ({datosCursorFiltrados.length} de {datosCursor.length})
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-[#f8f9f8] text-[#7a7b7b] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-medium">RUT</th>
                    <th className="py-3 px-4 font-medium">Nombre Completo</th>
                    <th className="py-3 px-4 font-medium">Sede de Registro</th>
                    <th className="py-3 px-4 font-medium text-center">Asistencias</th>
                    <th className="py-3 px-4 font-medium text-center">Inasistencias</th>
                    <th className="py-3 px-4 font-medium text-center">Días Restantes Contrato</th>
                    <th className="py-3 px-4 font-medium text-right">Clasificación Procedural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {cargandoCursor ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                          <span>Recorriendo cursor FAST_FORWARD en SQL Server...</span>
                        </div>
                      </td>
                    </tr>
                  ) : datosCursorFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                          <UserX className="w-8 h-8 text-[#a2a3a2]" />
                          <p className="font-medium text-[#0a0a0a]">
                            No se encontraron socios que coincidan con los filtros
                          </p>
                          <p className="text-xs">
                            Haz clic en &quot;Ejecutar Análisis con Cursor&quot; para regenerar el lote de evaluación desde la base de datos.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    datosCursorFiltrados.map((socio) => (
                      <tr key={socio.id_socio} className="hover:bg-[#fbfcfb] transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[#0a0a0a]">
                          {socio.rut_socio}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0a0a0a]">
                          {socio.nombre_completo_socio}
                        </td>
                        <td className="py-3 px-4 text-[#7a7b7b]">
                          {socio.nombre_sede}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {socio.total_asistencias}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              socio.total_inasistencias > 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {socio.total_inasistencias}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {socio.dias_vencimiento_contrato === -999 ? (
                            <span className="text-[#7a7b7b] text-[11px] italic">Sin contrato</span>
                          ) : socio.dias_vencimiento_contrato < 0 ? (
                            <span className="text-rose-700 font-semibold text-[11px]">
                              Vencido ({socio.dias_vencimiento_contrato}d)
                            </span>
                          ) : socio.dias_vencimiento_contrato <= 7 ? (
                            <span className="text-amber-700 font-semibold text-[11px]">
                              {socio.dias_vencimiento_contrato} días (crítico)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium text-[11px]">
                              {socio.dias_vencimiento_contrato} días
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <BadgeFidelidad clasificacion={socio.clasificacion_fidelidad} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
