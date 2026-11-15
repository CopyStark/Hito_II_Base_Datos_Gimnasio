"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  apiClient,
  LogContratoItem,
  LogInscripcionItem,
  SocioFidelidadCursorItem,
} from "@/services/apiClient";
import { useToast } from "@/context/ToastContext";
import {
  History,
  Shield,
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
  FileText,
  Activity,
  Layers,
  FileCheck,
  TrendingUp,
} from "lucide-react";

function formatearFechaHora(fechaStr?: string | null): string {
  if (!fechaStr) return "—";
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");
    const segundos = String(d.getSeconds()).padStart(2, "0");
    return `${dia}-${mes}-${anio} ${horas}:${minutos}:${segundos}`;
  } catch {
    return fechaStr;
  }
}

function BadgeOperacion({ tipo }: { tipo: string }) {
  const t = (tipo || "").toUpperCase();
  if (t === "INSERT") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        ALTA (INSERT)
      </span>
    );
  }
  if (t === "UPDATE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        MODIFICACIÓN (UPDATE)
      </span>
    );
  }
  if (t === "DELETE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        BAJA (DELETE)
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
  const toast = useToast();

  // Pestaña principal: "historial" o "fidelidad"
  const [tabActiva, setTabActiva] = useState<"historial" | "fidelidad">("historial");

  // Sub-selector de historial: "inscripciones" o "contratos"
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

  // Carga de historial de auditoría
  const cargarLogs = useCallback(
    async (tipo?: "inscripciones" | "contratos") => {
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
        toast.success(
          `Historial de ${
            objetivo === "inscripciones" ? "inscripciones y asistencias" : "contratos y membresías"
          } actualizado correctamente.`
        );
      } catch (err: any) {
        const msg =
          err.data?.detail || err.message || "Error al conectar con el servidor para consultar registros.";
        toast.error(`Error al consultar auditoría: ${msg}`);
      } finally {
        setCargandoLogs(false);
      }
    },
    [subTipoLog, toast]
  );

  // Carga inicial al montar o cambiar sub-tipo
  useEffect(() => {
    cargarLogs(subTipoLog);
  }, [subTipoLog]);

  // Ejecución del diagnóstico de fidelidad y retención
  const ejecutarDiagnostico = useCallback(async () => {
    setCargandoCursor(true);
    try {
      const data = await apiClient.auditoria.getFidelidadCursor();
      const lista = Array.isArray(data) ? data : [];
      setDatosCursor(lista);
      toast.success(
        `Diagnóstico de fidelidad y retención actualizado exitosamente. Se evaluaron ${lista.length} socios activos.`
      );
    } catch (err: any) {
      const msg =
        err.data?.detail || err.message || "Error al procesar la evaluación de fidelidad de socios.";
      toast.error(`Fallo al actualizar diagnóstico de socios: ${msg}`);
    } finally {
      setCargandoCursor(false);
    }
  }, [toast]);

  // Cargar evaluación si entra a la pestaña y aún no hay datos
  useEffect(() => {
    if (tabActiva === "fidelidad" && datosCursor.length === 0 && !cargandoCursor) {
      ejecutarDiagnostico();
    }
  }, [tabActiva]);

  // Filtrado de historial de inscripciones
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

  // Filtrado de historial de contratos
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

  // Métricas del diagnóstico de fidelidad
  const metricasFidelidad = useMemo(() => {
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

  // Filtrado de la tabla de fidelidad
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
          ENCABEZADO EDITORIAL DE AUDITORÍA & FIDELIDAD
         ========================================================================= */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            Control Operativo &amp; Trazabilidad de Gestión
          </span>

          <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
            Auditoría &amp; Fidelización de Clientes
          </h1>

          <div className="w-20 h-[2px] bg-[#ff6105]" />

          <p className="text-sm sm:text-base text-[#7a7b7b] leading-relaxed pt-1">
            Supervisa la bitácora histórica de modificaciones en inscripciones, asistencias y contratos, junto con la evaluación periódica de retención y riesgo de deserción del padrón de socios.
          </p>
        </div>

        {/* Selector de Pestaña Principal (Historial vs Fidelidad) */}
        <div className="inline-flex p-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5] shrink-0 self-start lg:self-end">
          <button
            onClick={() => setTabActiva("historial")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              tabActiva === "historial"
                ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                : "text-[#7a7b7b] hover:text-[#0a0a0a]"
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Historial de Auditoría y Cambios</span>
          </button>
          <button
            onClick={() => setTabActiva("fidelidad")}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              tabActiva === "fidelidad"
                ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                : "text-[#7a7b7b] hover:text-[#0a0a0a]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Evaluación de Fidelidad y Retención</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CONTENIDO: TAB 1 — HISTORIAL DE AUDITORÍA Y CAMBIOS
         ========================================================================= */}
      {tabActiva === "historial" && (
        <div className="space-y-6">
          {/* Barra de Controles y Filtros */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Sub-selector: Inscripciones vs Contratos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#7a7b7b] uppercase tracking-wider mr-1">
                Módulo Operativo:
              </span>
              <button
                onClick={() => setSubTipoLog("inscripciones")}
                className={`px-3.5 py-1.5 rounded-[5px] text-xs font-medium border transition-colors cursor-pointer ${
                  subTipoLog === "inscripciones"
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-[#292b2a] border-[#e5e5e5] hover:bg-[#f3f4f3]"
                }`}
              >
                Inscripciones y Asistencias
              </button>
              <button
                onClick={() => setSubTipoLog("contratos")}
                className={`px-3.5 py-1.5 rounded-[5px] text-xs font-medium border transition-colors cursor-pointer ${
                  subTipoLog === "contratos"
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                    : "bg-white text-[#292b2a] border-[#e5e5e5] hover:bg-[#f3f4f3]"
                }`}
              >
                Contratos y Membresías
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
                <option value="INSERT">Altas (INSERT)</option>
                <option value="UPDATE">Modificaciones (UPDATE)</option>
                <option value="DELETE">Bajas (DELETE)</option>
              </select>

              <button
                onClick={() => cargarLogs()}
                disabled={cargandoLogs}
                className="text-xs px-4 py-1.5 rounded-[5px] font-medium bg-[#ff6105] hover:bg-[#e05504] text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoLogs ? "animate-spin" : ""}`} />
                <span>Actualizar Historial</span>
              </button>
            </div>
          </div>

          {/* Tabla de Historial */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafbfa]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  {subTipoLog === "inscripciones"
                    ? "Registro de Inscripciones y Control de Asistencia (Últimos 50)"
                    : "Registro de Modificaciones en Contratos y Planes (Últimos 50)"}
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
                      <th className="py-3 px-4 font-medium"># Registro</th>
                      <th className="py-3 px-4 font-medium">Tipo de Cambio</th>
                      <th className="py-3 px-4 font-medium">Elemento Afectado</th>
                      <th className="py-3 px-4 font-medium">Transición de Estado / Asistencia</th>
                      <th className="py-3 px-4 font-medium">Usuario Responsable</th>
                      <th className="py-3 px-4 font-medium">Origen del Registro</th>
                      <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cargandoLogs ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                            <span>Cargando registros de auditoría...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logsInscripcionesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                            <Shield className="w-8 h-8 text-[#a2a3a2]" />
                            <p className="font-medium text-[#0a0a0a]">
                              No hay registros de auditoría en inscripciones y asistencias
                            </p>
                            <p className="text-xs">
                              Los registros se generan de forma automática cuando se confirman asistencias en sala o se cancelan inscripciones de socios.
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
                                  Asistencia: {item.asistio_anterior === true ? "Presente" : item.asistio_anterior === false ? "Ausente" : "Pendiente"} →{" "}
                                  <span className="font-medium text-[#0a0a0a]">
                                    {item.asistio_nuevo === true ? "Presente" : item.asistio_nuevo === false ? "Ausente" : "Pendiente"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                <span className="font-mono bg-[#f3f4f3] px-2 py-0.5 rounded-[4px] text-[11px] font-semibold text-[#0a0a0a] border border-[#e5e5e5]">
                                  {item.usuario_sql || "Sistema"}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7a7b7b]">Gestión en Línea</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            <div className="space-y-0.5">
                              <p className="font-medium text-[#0a0a0a]">
                                Canal Web Central
                              </p>
                              <p
                                className="text-xs text-neutral-400 truncate max-w-[180px]"
                                title={item.equipo_origen || "servidor-central"}
                              >
                                Origen: {item.equipo_origen || "servidor-central"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#7a7b7b] whitespace-nowrap">
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
                      <th className="py-3 px-4 font-medium"># Registro</th>
                      <th className="py-3 px-4 font-medium">Tipo de Cambio</th>
                      <th className="py-3 px-4 font-medium">Elemento Afectado</th>
                      <th className="py-3 px-4 font-medium">Transición de Estado / Vencimiento</th>
                      <th className="py-3 px-4 font-medium">Usuario Responsable</th>
                      <th className="py-3 px-4 font-medium">Origen del Registro</th>
                      <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cargandoLogs ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                            <span>Cargando registros de auditoría...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logsContratosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                            <Shield className="w-8 h-8 text-[#a2a3a2]" />
                            <p className="font-medium text-[#0a0a0a]">
                              No hay registros de auditoría en contratos y membresías
                            </p>
                            <p className="text-xs">
                              Los registros se generan de forma automática al emitir un nuevo contrato, renovar una membresía o cancelar planes.
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
                                  Término: {item.fecha_fin_anterior || "—"} →{" "}
                                  <span className="font-medium text-[#0a0a0a]">
                                    {item.fecha_fin_nueva || "—"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                <span className="font-mono bg-[#f3f4f3] px-2 py-0.5 rounded-[4px] text-[11px] font-semibold text-[#0a0a0a] border border-[#e5e5e5]">
                                  {item.usuario_sql || "Sistema"}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7a7b7b]">Gestión en Línea</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            <div className="space-y-0.5">
                              <p className="font-medium text-[#0a0a0a]">
                                Canal Web Central
                              </p>
                              <p
                                className="text-xs text-neutral-400 truncate max-w-[180px]"
                                title={item.equipo_origen || "servidor-central"}
                              >
                                Origen: {item.equipo_origen || "servidor-central"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#7a7b7b] whitespace-nowrap">
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
          CONTENIDO: TAB 2 — EVALUACIÓN DE FIDELIDAD Y RETENCIÓN
         ========================================================================= */}
      {tabActiva === "fidelidad" && (
        <div className="space-y-6">
          {/* Cabecera de Control del Diagnóstico */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  Diagnóstico Automatizado de Retención y Asistencia
                </h3>
              </div>
              <p className="text-xs text-[#7a7b7b]">
                Evalúa el comportamiento de asistencia presencial, inasistencias acumuladas y vigencia de membresías para proyectar la retención de cada socio.
              </p>
            </div>

            <button
              onClick={ejecutarDiagnostico}
              disabled={cargandoCursor}
              className="text-xs sm:text-sm px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {cargandoCursor ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluando padrón de socios...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Actualizar Diagnóstico de Socios</span>
                </>
              )}
            </button>
          </div>

          {/* Tarjetas Resumen por Categoría (KPIs de Negocio) */}
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
                  {cargandoCursor ? "..." : metricasFidelidad.riesgo}
                </span>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasFidelidad.pctRiesgo}%`}
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
                  {cargandoCursor ? "..." : metricasFidelidad.frecuente}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasFidelidad.pctFrecuente}%`}
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
                  {cargandoCursor ? "..." : metricasFidelidad.ocasional}
                </span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasFidelidad.pctOcasional}%`}
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
                  {cargandoCursor ? "..." : metricasFidelidad.sinActividad}
                </span>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {cargandoCursor ? "—" : `${metricasFidelidad.pctSinActividad}%`}
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

          {/* Tabla de Detalle de Fidelidad */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafbfa]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff6105]" />
                <h3 className="text-sm font-medium text-[#0a0a0a]">
                  Padrón de Socios Analizados ({datosCursorFiltrados.length} de {datosCursor.length})
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
                    <th className="py-3 px-4 font-medium text-right">Nivel de Fidelidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {cargandoCursor ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#7a7b7b]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#ff6105]" />
                          <span>Calculando nivel de fidelidad de socios...</span>
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
                            Haz clic en &quot;Actualizar Diagnóstico de Socios&quot; para regenerar la evaluación desde el sistema.
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
