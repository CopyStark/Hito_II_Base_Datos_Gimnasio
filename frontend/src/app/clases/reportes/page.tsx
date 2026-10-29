"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  clasesApi,
  OcupacionClaseItem,
  RankingClaseItem,
} from "@/services/apiClient";

export default function ReportesClasesPage() {
  const [ocupacion, setOcupacion] = useState<OcupacionClaseItem[]>([]);
  const [ranking, setRanking] = useState<RankingClaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorOcupacion, setErrorOcupacion] = useState<string | null>(null);
  const [errorRanking, setErrorRanking] = useState<string | null>(null);

  // Filtros interactivos para el reporte de ocupación
  const [filtroSede, setFiltroSede] = useState("");
  const [busquedaClase, setBusquedaClase] = useState("");
  const [filtroEstadoOcupacion, setFiltroEstadoOcupacion] = useState<"todas" | "llenas" | "disponibles">("todas");

  // Pestaña activa dentro de la vista de reportes
  const [vistaActiva, setVistaActiva] = useState<"todos" | "ocupacion" | "ranking">("todos");

  // Cargar datos de ambas vistas analíticas
  const cargarReportes = useCallback(async () => {
    setLoading(true);
    setErrorOcupacion(null);
    setErrorRanking(null);

    // Cargar Ocupación
    try {
      const dataOcupacion = await clasesApi.getReporteOcupacion();
      setOcupacion(Array.isArray(dataOcupacion) ? dataOcupacion : []);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al cargar reporte de ocupación.";
      setErrorOcupacion(String(msg));
    }

    // Cargar Ranking
    try {
      const dataRanking = await clasesApi.getReporteRanking();
      setRanking(Array.isArray(dataRanking) ? dataRanking : []);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al cargar ranking de clases.";
      setErrorRanking(String(msg));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  // Lista única de sedes para el filtro de ocupación
  const sedesDisponibles = useMemo(() => {
    const setSedes = new Set<string>();
    ocupacion.forEach((item) => {
      if (item.nombre_sede) setSedes.add(item.nombre_sede);
    });
    return Array.from(setSedes).sort();
  }, [ocupacion]);

  // Filtrado de sesiones de ocupación
  const ocupacionFiltrada = useMemo(() => {
    return ocupacion.filter((item) => {
      // Filtro Sede
      if (filtroSede && item.nombre_sede !== filtroSede) return false;
      // Búsqueda por Clase
      if (
        busquedaClase &&
        !item.nombre_clase.toLowerCase().includes(busquedaClase.toLowerCase())
      ) {
        return false;
      }
      // Filtro Estado
      if (filtroEstadoOcupacion === "llenas" && item.cupos_disponibles > 0) {
        return false;
      }
      if (filtroEstadoOcupacion === "disponibles" && item.cupos_disponibles <= 0) {
        return false;
      }
      return true;
    });
  }, [ocupacion, filtroSede, busquedaClase, filtroEstadoOcupacion]);

  // KPIs Generales
  const metricas = useMemo(() => {
    const totalSesiones = ocupacion.length;
    if (totalSesiones === 0) {
      return {
        totalSesiones: 0,
        promedioOcupacion: 0,
        sesionesAgotadas: 0,
        topClase: ranking.length > 0 ? ranking[0].nombre_clase : "—",
        topInscripciones: ranking.length > 0 ? ranking[0].total_inscripciones : 0,
      };
    }

    let sumaPorcentaje = 0;
    let agotadas = 0;

    ocupacion.forEach((s) => {
      const pct = s.cupo_maximo_sesion > 0
        ? (s.total_inscritos / s.cupo_maximo_sesion) * 100
        : 0;
      sumaPorcentaje += pct;
      if (s.cupos_disponibles <= 0) agotadas++;
    });

    return {
      totalSesiones,
      promedioOcupacion: Math.round(sumaPorcentaje / totalSesiones),
      sesionesAgotadas: agotadas,
      topClase: ranking.length > 0 ? ranking[0].nombre_clase : "—",
      topInscripciones: ranking.length > 0 ? ranking[0].total_inscripciones : 0,
    };
  }, [ocupacion, ranking]);

  // Máximo de inscripciones para escala relativa en barras de ranking
  const maxInscripcionesRanking = useMemo(() => {
    if (ranking.length === 0) return 1;
    return Math.max(...ranking.map((r) => r.total_inscripciones), 1);
  }, [ranking]);

  // Helper para insignias de nivel
  const getBadgeNivel = (nivel: string) => {
    switch (nivel?.toLowerCase()) {
      case "principiante":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "intermedio":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "avanzado":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-8">
      {/* =========================================================================
          ENCABEZADO DE REPORTES
         ========================================================================= */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-2">
            <span>📊</span> Analítica &amp; Vistas SQL
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Reportes &amp; Métricas de Clases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Monitoreo en tiempo real de ocupación de sesiones por sede (<code>vw_Reporte_Ocupacion_Clases</code>) y ranking de popularidad de disciplinas (<code>vw_Ranking_Clases_Demandadas</code>).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Selector de sub-vista */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setVistaActiva("todos")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                vistaActiva === "todos"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vista Completa
            </button>
            <button
              onClick={() => setVistaActiva("ranking")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                vistaActiva === "ranking"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Ranking
            </button>
            <button
              onClick={() => setVistaActiva("ocupacion")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                vistaActiva === "ocupacion"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Ocupación
            </button>
          </div>

          <button
            onClick={cargarReportes}
            disabled={loading}
            className="text-xs px-4 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TARJETAS KPI RESUMEN
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sesiones Analizadas */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Sesiones Monitoreadas</span>
            <span className="text-base">🗓️</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {loading ? "..." : metricas.totalSesiones}
          </div>
          <p className="text-[11px] text-slate-500">
            Total en <code>vw_Reporte_Ocupacion_Clases</code>
          </p>
        </div>

        {/* KPI 2: Ocupación Promedio */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Ocupación Promedio</span>
            <span className="text-base">📈</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-300">
            {loading ? "..." : `${metricas.promedioOcupacion}%`}
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, metricas.promedioOcupacion)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Sesiones Agotadas */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Sesiones Agotadas</span>
            <span className="text-base">🚫</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">
            {loading ? "..." : metricas.sesionesAgotadas}
          </div>
          <p className="text-[11px] text-slate-500">
            Capacidad al 100% (sin cupos libres)
          </p>
        </div>

        {/* KPI 4: Disciplina Líder */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Clase Más Demandada</span>
            <span className="text-base">🥇</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-300 truncate" title={metricas.topClase}>
            {loading ? "..." : metricas.topClase}
          </div>
          <p className="text-[11px] text-slate-400">
            {loading ? "..." : `${metricas.topInscripciones} inscripciones activas`}
          </p>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN A: RANKING DE CLASES MÁS DEMANDADAS
         ========================================================================= */}
      {(vistaActiva === "todos" || vistaActiva === "ranking") && (
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Ranking de Clases Más Demandadas
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Ordenado por volumen total de socios inscritos en estado activo (<code>vw_Ranking_Clases_Demandadas</code>).
              </p>
            </div>

            <span className="text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-500/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              {ranking.length} disciplinas clasificadas
            </span>
          </div>

          {/* Error Ranking */}
          {errorRanking && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
              <span>⚠️ Error al cargar ranking: {errorRanking}</span>
              <button onClick={cargarReportes} className="underline text-xs hover:text-white">
                Reintentar
              </button>
            </div>
          )}

          {/* Skeletons / Estado de Carga */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 space-y-3 animate-pulse"
                >
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                  <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : ranking.length === 0 && !errorRanking ? (
            <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <p className="text-3xl mb-2">📭</p>
              <p className="font-semibold text-slate-300">No hay datos de ranking disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ranking.map((item, index) => {
                const posicion = index + 1;
                const porcentajeRelativo = Math.round(
                  (item.total_inscripciones / maxInscripcionesRanking) * 100
                );

                return (
                  <div
                    key={item.nombre_clase}
                    className={`bg-slate-950/80 border rounded-2xl p-5 space-y-4 shadow-lg transition-all flex flex-col justify-between ${
                      posicion === 1
                        ? "border-amber-500/50 shadow-amber-950/20 ring-1 ring-amber-500/20"
                        : posicion === 2
                        ? "border-slate-400/40"
                        : posicion === 3
                        ? "border-amber-700/40"
                        : "border-slate-800 hover:border-purple-500/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                            posicion === 1
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : posicion === 2
                              ? "bg-slate-300/20 text-slate-200 border border-slate-400/40"
                              : posicion === 3
                              ? "bg-amber-800/30 text-amber-300 border border-amber-700/40"
                              : "bg-slate-900 text-slate-400 border border-slate-800"
                          }`}
                        >
                          <span>{posicion === 1 ? "🥇 #1" : posicion === 2 ? "🥈 #2" : posicion === 3 ? "🥉 #3" : `#${posicion}`}</span>
                        </span>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getBadgeNivel(
                            item.nivel_exigencia_clase
                          )}`}
                        >
                          {item.nivel_exigencia_clase}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white">
                          {item.nombre_clase}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Demanda acumulada:{" "}
                          <strong className="text-purple-300 font-semibold">
                            {item.total_inscripciones} socios
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* Barra de popularidad relativa */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Popularidad relativa</span>
                        <span className="font-mono text-purple-300">{porcentajeRelativo}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            posicion === 1
                              ? "bg-gradient-to-r from-amber-500 to-amber-300"
                              : "bg-gradient-to-r from-purple-600 to-indigo-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, porcentajeRelativo))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECCIÓN B: REPORTE DE OCUPACIÓN POR CLASE Y SEDE
         ========================================================================= */}
      {(vistaActiva === "todos" || vistaActiva === "ocupacion") && (
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Reporte de Ocupación por Sesión y Sede
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Disponibilidad de cupos, inscritos activos y porcentaje de llenado (<code>vw_Reporte_Ocupacion_Clases</code>).
              </p>
            </div>

            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              {ocupacionFiltrada.length} de {ocupacion.length} sesiones
            </span>
          </div>

          {/* Filtros Interactivos de la Tabla de Ocupación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Filtrar por Sede
              </label>
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">Todas las sedes</option>
                {sedesDisponibles.map((sede) => (
                  <option key={sede} value={sede}>
                    {sede}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Buscar Disciplina
              </label>
              <input
                type="text"
                placeholder="Ej: Yoga, CrossFit, Spinning..."
                value={busquedaClase}
                onChange={(e) => setBusquedaClase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Disponibilidad
              </label>
              <select
                value={filtroEstadoOcupacion}
                onChange={(e) => setFiltroEstadoOcupacion(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="todas">Todos los estados</option>
                <option value="disponibles">Con cupos disponibles</option>
                <option value="llenas">Agotadas (100% de ocupación)</option>
              </select>
            </div>
          </div>

          {/* Error Ocupación */}
          {errorOcupacion && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
              <span>⚠️ Error al cargar ocupación: {errorOcupacion}</span>
              <button onClick={cargarReportes} className="underline text-xs hover:text-white">
                Reintentar
              </button>
            </div>
          )}

          {/* Skeletons / Estado de Carga */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 animate-pulse flex items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-slate-800 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : ocupacionFiltrada.length === 0 && !errorOcupacion ? (
            <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <p className="text-3xl mb-2">🔍</p>
              <p className="font-semibold text-slate-300">
                No hay sesiones que coincidan con los filtros de ocupación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Sesión / Clase</th>
                    <th className="py-3 px-4">Sede</th>
                    <th className="py-3 px-4">Fecha &amp; Hora</th>
                    <th className="py-3 px-4 text-center">Inscritos / Cupo</th>
                    <th className="py-3 px-4 text-center">Disponibles</th>
                    <th className="py-3 px-4">Tasa de Ocupación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-slate-950/60">
                  {ocupacionFiltrada.map((item) => {
                    const porcentaje = item.cupo_maximo_sesion > 0
                      ? Math.round((item.total_inscritos / item.cupo_maximo_sesion) * 100)
                      : 0;
                    const agotada = item.cupos_disponibles <= 0;

                    return (
                      <tr
                        key={item.id_sesion}
                        className="hover:bg-slate-900/60 transition-colors"
                      >
                        {/* Clase e ID */}
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-mono text-slate-500 block">
                            #{item.id_sesion}
                          </span>
                          <strong className="text-white text-sm font-semibold">
                            {item.nombre_clase}
                          </strong>
                        </td>

                        {/* Sede */}
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          📍 {item.nombre_sede}
                        </td>

                        {/* Fecha y Hora */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <span>{item.fecha_sesion}</span>
                          <span className="text-slate-600 mx-1">&bull;</span>
                          <span className="text-purple-300 font-semibold">{item.hora_sesion}</span>
                        </td>

                        {/* Inscritos vs Cupo */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-white">
                            {item.total_inscritos}
                          </span>
                          <span className="text-slate-500"> / {item.cupo_maximo_sesion}</span>
                        </td>

                        {/* Cupos Libres */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                              agotada
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : item.cupos_disponibles <= 3
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {agotada ? "Agotado" : `${item.cupos_disponibles} libres`}
                          </span>
                        </td>

                        {/* Porcentaje y Barra */}
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`font-bold ${
                                agotada
                                  ? "text-rose-400"
                                  : porcentaje >= 70
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {porcentaje}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {agotada ? "100% Lleno" : `${item.cupos_disponibles} restantes`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all ${
                                agotada
                                  ? "bg-rose-500"
                                  : porcentaje >= 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, porcentaje)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
