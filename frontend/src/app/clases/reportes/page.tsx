"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Award,
  RefreshCw,
  MapPin,
  Clock,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  clasesApi,
  OcupacionClaseItem,
  RankingClaseItem,
} from "@/services/apiClient";

/**
 * Formatea una cadena de hora (ej. "20:30:00") a "20:30 hrs" sin segundos.
 */
function formatearHora(hora?: string | null): string {
  if (!hora) return "—";
  const limpia = String(hora).trim();
  const partes = limpia.split(":");
  if (partes.length >= 2) {
    return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")} hrs`;
  }
  return `${limpia} hrs`;
}

export default function ReportesClasesPage() {
  const [ocupacion, setOcupacion] = useState<OcupacionClaseItem[]>([]);
  const [ranking, setRanking] = useState<RankingClaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorOcupacion, setErrorOcupacion] = useState<string | null>(null);
  const [errorRanking, setErrorRanking] = useState<string | null>(null);

  // Filtros interactivos para el reporte de ocupación
  const [filtroSede, setFiltroSede] = useState("");
  const [busquedaClase, setBusquedaClase] = useState("");
  const [filtroEstadoOcupacion, setFiltroEstadoOcupacion] = useState<
    "todas" | "llenas" | "disponibles"
  >("todas");

  // Pestaña activa dentro de la vista de reportes
  const [vistaActiva, setVistaActiva] = useState<
    "todos" | "ocupacion" | "ranking"
  >("todos");

  // Cargar datos de ambas vistas analíticas
  const cargarReportes = useCallback(async () => {
    setLoading(true);
    setErrorOcupacion(null);
    setErrorRanking(null);

    try {
      const dataOcupacion = await clasesApi.getReporteOcupacion();
      setOcupacion(Array.isArray(dataOcupacion) ? dataOcupacion : []);
    } catch (err: any) {
      const msg =
        err.data?.detail ||
        err.message ||
        "Error al cargar reporte de ocupación.";
      setErrorOcupacion(String(msg));
    }

    try {
      const dataRanking = await clasesApi.getReporteRanking();
      setRanking(Array.isArray(dataRanking) ? dataRanking : []);
    } catch (err: any) {
      const msg =
        err.data?.detail ||
        err.message ||
        "Error al cargar ranking de clases.";
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
      if (filtroSede && item.nombre_sede !== filtroSede) return false;
      if (
        busquedaClase &&
        !item.nombre_clase.toLowerCase().includes(busquedaClase.toLowerCase())
      ) {
        return false;
      }
      if (filtroEstadoOcupacion === "llenas" && item.cupos_disponibles > 0) {
        return false;
      }
      if (
        filtroEstadoOcupacion === "disponibles" &&
        item.cupos_disponibles <= 0
      ) {
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
        topInscripciones:
          ranking.length > 0 ? ranking[0].total_inscripciones : 0,
      };
    }

    let sumaPorcentaje = 0;
    let agotadas = 0;

    ocupacion.forEach((s) => {
      const pct =
        s.cupo_maximo_sesion > 0
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "intermedio":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "avanzado":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-[#f3f4f3] text-[#7a7b7b] border-[#e5e5e5]";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* =========================================================================
          ENCABEZADO EDITORIAL DE REPORTES
         ========================================================================= */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            Analítica en Tiempo Real · Métricas
          </span>

          <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
            Reportes &amp; Métricas de Clases
          </h1>

          <div className="w-20 h-[2px] bg-[#ff6105]" />

          <p className="text-sm sm:text-base text-[#7a7b7b] leading-relaxed pt-1">
            Monitoreo de ocupación de sesiones por sede y ranking de
            popularidad acumulada de disciplinas dirigidas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Selector de sub-vista */}
          <div className="inline-flex p-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5]">
            <button
              onClick={() => setVistaActiva("todos")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${vistaActiva === "todos"
                  ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                  : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
            >
              Vista Completa
            </button>
            <button
              onClick={() => setVistaActiva("ranking")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${vistaActiva === "ranking"
                  ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                  : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
            >
              Ranking
            </button>
            <button
              onClick={() => setVistaActiva("ocupacion")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${vistaActiva === "ocupacion"
                  ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                  : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
            >
              Ocupación
            </button>
          </div>

          <button
            onClick={cargarReportes}
            disabled={loading}
            className="text-xs sm:text-sm px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TARJETAS KPI RESUMEN (GHOST CARDS)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
            <span className="font-medium uppercase tracking-wider">
              Sesiones Monitoreadas
            </span>
            <Calendar className="w-4 h-4 text-[#7a7b7b]" />
          </div>
          <div className="text-3xl font-light tracking-[-0.02em] text-[#0a0a0a]">
            {loading ? "..." : metricas.totalSesiones}
          </div>
          <p className="text-xs text-[#7a7b7b]">
            Sesiones activas en calendario
          </p>
        </div>

        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
            <span className="font-medium uppercase tracking-wider">
              Ocupación Promedio
            </span>
            <TrendingUp className="w-4 h-4 text-[#ff6105]" />
          </div>
          <div className="text-3xl font-light tracking-[-0.02em] text-[#ff6105]">
            {loading ? "..." : `${metricas.promedioOcupacion}%`}
          </div>
          <div className="w-full bg-[#e5e5e5] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-[#ff6105] h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, metricas.promedioOcupacion)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
            <span className="font-medium uppercase tracking-wider">
              Sesiones Agotadas
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-light tracking-[-0.02em] text-rose-600">
            {loading ? "..." : metricas.sesionesAgotadas}
          </div>
          <p className="text-xs text-[#7a7b7b]">
            Capacidad al 100% (sin cupos)
          </p>
        </div>

        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-[#7a7b7b] text-[11px]">
            <span className="font-medium uppercase tracking-wider">
              Clase Más Demandada
            </span>
            <Award className="w-4 h-4 text-[#ff6105]" />
          </div>
          <div
            className="text-lg sm:text-xl font-medium text-[#0a0a0a] truncate pt-0.5"
            title={metricas.topClase}
          >
            {loading ? "..." : metricas.topClase}
          </div>
          <p className="text-xs text-[#7a7b7b]">
            {loading ? "..." : `${metricas.topInscripciones} inscripciones activas`}
          </p>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN A: RANKING DE CLASES MÁS DEMANDADAS
         ========================================================================= */}
      {(vistaActiva === "todos" || vistaActiva === "ranking") && (
        <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
                Ranking de Clases Más Demandadas
              </h2>
              <div className="w-12 h-[2px] bg-[#ff6105] mt-1.5 mb-2" />
              <p className="text-xs sm:text-sm text-[#7a7b7b]">
                Ordenado por volumen total de socios inscritos en estado activo.
              </p>
            </div>

            <span className="text-xs font-medium text-[#0a0a0a] bg-[#ffdfcd] border border-[#ff6105]/20 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              {ranking.length} disciplinas clasificadas
            </span>
          </div>

          {errorRanking && (
            <div className="p-4 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between">
              <span>Error al cargar ranking: {errorRanking}</span>
              <button
                onClick={cargarReportes}
                className="underline text-xs hover:text-rose-950 font-medium"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-5 space-y-3 animate-pulse"
                >
                  <div className="h-4 bg-[#e5e5e5] rounded w-1/3"></div>
                  <div className="h-6 bg-[#e5e5e5] rounded w-3/4"></div>
                  <div className="h-3 bg-[#e5e5e5] rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : ranking.length === 0 && !errorRanking ? (
            <div className="py-12 text-center text-[#7a7b7b] text-sm bg-white rounded-[5px] border border-dashed border-[#e5e5e5]">
              <Award className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
              <p className="font-medium text-[#0a0a0a]">
                No hay datos de ranking disponibles.
              </p>
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
                    className={`bg-white border rounded-[5px] p-5 space-y-4 transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5 hover:border-[#ff6105]/40 hover:shadow-sm ${posicion === 1
                        ? "border-[#ff6105]/60 bg-[#ffdfcd]/20"
                        : "border-[#e5e5e5]"
                      }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${posicion === 1
                              ? "bg-[#ff6105] text-white"
                              : "bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]"
                            }`}
                        >
                          #{posicion}
                        </span>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getBadgeNivel(
                            item.nivel_exigencia_clase
                          )}`}
                        >
                          {item.nivel_exigencia_clase}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-medium text-[#0a0a0a]">
                          {item.nombre_clase}
                        </h3>
                        <p className="text-xs text-[#7a7b7b] mt-1">
                          Demanda acumulada:{" "}
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            {item.total_inscripciones} socios
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2.5 border-t border-[#e5e5e5]">
                      <div className="flex items-center justify-between text-xs text-[#7a7b7b]">
                        <span>Popularidad relativa</span>
                        <span className="font-medium text-[#0a0a0a]">
                          {porcentajeRelativo}%
                        </span>
                      </div>
                      <div className="w-full bg-[#e5e5e5] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-[#ff6105]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(5, porcentajeRelativo)
                            )}%`,
                          }}
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
        <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
                Reporte de Ocupación por Sesión y Sede
              </h2>
              <div className="w-12 h-[2px] bg-[#ff6105] mt-1.5 mb-2" />
              <p className="text-xs sm:text-sm text-[#7a7b7b]">
                Disponibilidad de cupos, inscritos activos y porcentaje de
                llenado por horario.
              </p>
            </div>

            <span className="text-xs font-medium text-[#292b2a] bg-[#f3f4f3] px-3.5 py-1.5 rounded-full border border-[#e5e5e5] self-start sm:self-auto">
              {ocupacionFiltrada.length} de {ocupacion.length} sesiones
            </span>
          </div>

          {/* Filtros Interactivos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#f3f4f3]/70 p-4 rounded-[5px] border border-[#e5e5e5]">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
                Filtrar por Sede
              </label>
              <div className="relative">
                <select
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-3.5 pr-9 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-colors"
                >
                  <option value="">Todas las sedes</option>
                  {sedesDisponibles.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
                Buscar Disciplina
              </label>
              <input
                type="text"
                placeholder="Ej: Yoga, CrossFit, Spinning..."
                value={busquedaClase}
                onChange={(e) => setBusquedaClase(e.target.value)}
                className="w-full bg-white border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] placeholder-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
                Disponibilidad
              </label>
              <div className="relative">
                <select
                  value={filtroEstadoOcupacion}
                  onChange={(e) =>
                    setFiltroEstadoOcupacion(e.target.value as any)
                  }
                  className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-3.5 pr-9 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-colors"
                >
                  <option value="todas">Todos los estados</option>
                  <option value="disponibles">Con cupos disponibles</option>
                  <option value="llenas">Agotadas (100% de ocupación)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {errorOcupacion && (
            <div className="p-4 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between">
              <span>Error al cargar ocupación: {errorOcupacion}</span>
              <button
                onClick={cargarReportes}
                className="underline text-xs hover:text-rose-950 font-medium"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-4 animate-pulse flex items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[#e5e5e5] rounded w-1/4"></div>
                    <div className="h-3 bg-[#e5e5e5] rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-[#e5e5e5] rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : ocupacionFiltrada.length === 0 && !errorOcupacion ? (
            <div className="py-12 text-center text-[#7a7b7b] text-sm bg-white rounded-[5px] border border-dashed border-[#e5e5e5]">
              <Search className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
              <p className="font-medium text-[#0a0a0a]">
                No hay sesiones que coincidan con los filtros de ocupación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[5px] border border-[#e5e5e5]">
              <table className="w-full text-left text-xs text-[#292b2a]">
                <thead className="bg-[#f3f4f3] text-[#7a7b7b] uppercase tracking-wider text-[11px] border-b border-[#e5e5e5]">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Sesión / Clase</th>
                    <th className="py-3.5 px-4 font-medium">Sede</th>
                    <th className="py-3.5 px-4 font-medium">Fecha &amp; Hora</th>
                    <th className="py-3.5 px-4 text-center font-medium">
                      Inscritos / Cupo
                    </th>
                    <th className="py-3.5 px-4 text-center font-medium">
                      Disponibles
                    </th>
                    <th className="py-3.5 px-4 font-medium">
                      Tasa de Ocupación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] bg-white">
                  {ocupacionFiltrada.map((item) => {
                    const porcentaje =
                      item.cupo_maximo_sesion > 0
                        ? Math.round(
                          (item.total_inscritos / item.cupo_maximo_sesion) *
                          100
                        )
                        : 0;
                    const agotada = item.cupos_disponibles <= 0;

                    return (
                      <tr
                        key={item.id_sesion}
                        className="hover:bg-[#f3f4f3]/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] text-[#7a7b7b] block">
                            Sesión #{item.id_sesion}
                          </span>
                          <strong className="text-[#0a0a0a] text-sm font-medium">
                            {item.nombre_clase}
                          </strong>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                            <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                            {item.nombre_sede}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#0a0a0a]">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                              {item.fecha_sesion}
                            </span>
                            <span className="text-[#e5e5e5]">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                              {formatearHora(item.hora_sesion)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            {item.total_inscritos}
                          </span>
                          <span className="text-[#7a7b7b]">
                            {" "}
                            / {item.cupo_maximo_sesion}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-medium text-xs border ${agotada
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : item.cupos_disponibles <= 3
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                          >
                            {agotada
                              ? "Agotado"
                              : `${item.cupos_disponibles} libres`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-medium ${agotada
                                  ? "text-rose-600"
                                  : porcentaje >= 70
                                    ? "text-amber-600"
                                    : "text-[#0a0a0a]"
                                }`}
                            >
                              {porcentaje}%
                            </span>
                            <span className="text-[11px] text-[#7a7b7b]">
                              {agotada
                                ? "100% Lleno"
                                : `${item.cupos_disponibles} restantes`}
                            </span>
                          </div>
                          <div className="w-full bg-[#e5e5e5] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${agotada
                                  ? "bg-rose-500"
                                  : porcentaje >= 70
                                    ? "bg-amber-500"
                                    : "bg-[#ff6105]"
                                }`}
                              style={{
                                width: `${Math.min(100, porcentaje)}%`,
                              }}
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
