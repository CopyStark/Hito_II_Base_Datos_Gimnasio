"use client";

import { useEffect, useState, useCallback } from "react";
import {
  clasesApi,
  ClaseResponse,
  SesionDisponibleResponse,
  InscripcionSocioDetalleResponse,
  SedeSimpleResponse,
} from "@/services/apiClient";
import { SOCIO_ACTUAL } from "@/components/clases/socioActual";

interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

export default function ClasesPage() {
  // --- Estados de Datos ---
  const [clases, setClases] = useState<ClaseResponse[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [sesiones, setSesiones] = useState<SesionDisponibleResponse[]>([]);
  const [misInscripciones, setMisInscripciones] = useState<
    InscripcionSocioDetalleResponse[]
  >([]);

  // --- Estados de Carga ---
  const [loadingClases, setLoadingClases] = useState(true);
  const [loadingSesiones, setLoadingSesiones] = useState(true);
  const [loadingInscripciones, setLoadingInscripciones] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // --- Filtros de Sesiones ---
  const [filtroFecha, setFiltroFecha] = useState<string>("");
  const [filtroSede, setFiltroSede] = useState<string>("");
  const [filtroClase, setFiltroClase] = useState<string>("");

  // --- Feedback / Mensajes de Éxito o Error ---
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Cargar Catálogo de Clases
  const cargarClases = useCallback(async () => {
    try {
      setLoadingClases(true);
      const data = await clasesApi.getClases();
      setClases(data);
    } catch (err: any) {
      console.error("Error al cargar clases:", err);
    } finally {
      setLoadingClases(false);
    }
  }, []);

  // Cargar Sedes para el filtro
  const cargarSedes = useCallback(async () => {
    try {
      const data = await clasesApi.getSedes();
      setSedes(data);
    } catch (err: any) {
      console.error("Error al cargar sedes:", err);
    }
  }, []);

  // Cargar Sesiones Disponibles con filtros aplicados
  const cargarSesiones = useCallback(async () => {
    try {
      setLoadingSesiones(true);
      const params: { fecha?: string; id_sede?: number; id_clase?: number } = {};
      if (filtroFecha) params.fecha = filtroFecha;
      if (filtroSede) params.id_sede = Number(filtroSede);
      if (filtroClase) params.id_clase = Number(filtroClase);

      const data = await clasesApi.getSesiones(params);
      setSesiones(data);
    } catch (err: any) {
      console.error("Error al cargar sesiones:", err);
      setFeedback({
        type: "error",
        message: err.message || "Error al obtener las sesiones disponibles.",
      });
    } finally {
      setLoadingSesiones(false);
    }
  }, [filtroFecha, filtroSede, filtroClase]);

  // Cargar Mis Inscripciones para el socio actual
  const cargarMisInscripciones = useCallback(async () => {
    try {
      setLoadingInscripciones(true);
      const data = await clasesApi.getInscripcionesSocio(SOCIO_ACTUAL.id_socio);
      setMisInscripciones(data);
    } catch (err: any) {
      console.error("Error al cargar inscripciones:", err);
    } finally {
      setLoadingInscripciones(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    cargarClases();
    cargarSedes();
    cargarMisInscripciones();
  }, [cargarClases, cargarSedes, cargarMisInscripciones]);

  // Cargar sesiones cuando cambian los filtros
  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  // Acción: Inscribirme en una sesión
  const handleInscribir = async (id_sesion: number) => {
    setActionLoadingId(id_sesion);
    setFeedback(null);
    try {
      await clasesApi.inscribirSocio({
        id_socio_inscripcion: SOCIO_ACTUAL.id_socio,
        id_sesion_inscripcion: id_sesion,
      });

      setFeedback({
        type: "success",
        message: `¡Inscripción exitosa! Has reservado tu cupo para la sesión #${id_sesion}.`,
      });

      // Refrescar ambas listas inmediatamente
      await Promise.all([cargarSesiones(), cargarMisInscripciones()]);
    } catch (err: any) {
      // Mostrar exactamente el mensaje retornado por la API (409, 400, etc.)
      const errorMsg =
        err.data?.detail ||
        err.message ||
        "No fue posible completar la inscripción. Verifique las reglas de negocio.";
      setFeedback({
        type: "error",
        message: String(errorMsg),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Acción: Cancelar una inscripción activa
  const handleCancelar = async (id_inscripcion: number) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta inscripción?")) {
      return;
    }

    setActionLoadingId(id_inscripcion);
    setFeedback(null);
    try {
      await clasesApi.cancelarInscripcion(id_inscripcion, {
        id_socio: SOCIO_ACTUAL.id_socio,
      });

      setFeedback({
        type: "info",
        message: `Inscripción #${id_inscripcion} cancelada correctamente. Se liberó tu cupo.`,
      });

      // Refrescar ambas listas
      await Promise.all([cargarSesiones(), cargarMisInscripciones()]);
    } catch (err: any) {
      const errorMsg =
        err.data?.detail ||
        err.message ||
        "Error al cancelar la inscripción. Verifique que la sesión sea futura.";
      setFeedback({
        type: "error",
        message: String(errorMsg),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper para badges de dificultad
  const getBadgeNivel = (nivel: string) => {
    switch (nivel?.toLowerCase()) {
      case "principiante":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "intermedio":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "avanzado":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // IDs de sesiones en las que el socio ya está 'Inscrito'
  const idsSesionesInscritas = new Set(
    misInscripciones
      .filter((i) => i.estado_inscripcion === "Inscrito")
      .map((i) => i.id_sesion_inscripcion)
  );

  return (
    <div className="space-y-12">
      {/* Hero / Encabezado de la Pantalla */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 border border-purple-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-4">
            <span>✨</span> Portal del Socio &bull; Reserva de Clases
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Catálogo de Clases &amp; Reserva de Cupos
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Explora las disciplinas disponibles, consulta las sesiones programadas
            en cada sede con disponibilidad de cupos en tiempo real y reserva tu
            asistencia de forma inmediata.
          </p>
        </div>
      </div>

      {/* Banner de Feedback (Éxito / Error / Notificación) */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 shadow-xl ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-950/50 border-rose-500/50 text-rose-200"
              : "bg-blue-950/40 border-blue-500/40 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {feedback.type === "success"
                ? "✅"
                : feedback.type === "error"
                ? "⚠️"
                : "ℹ️"}
            </span>
            <div>
              <strong className="block text-sm font-semibold">
                {feedback.type === "success"
                  ? "Operación Exitosa"
                  : feedback.type === "error"
                  ? "Aviso de la Base de Datos"
                  : "Información"}
              </strong>
              <p className="text-xs sm:text-sm mt-0.5">{feedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-slate-800/60"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 1: MIS INSCRIPCIONES
         ========================================================================= */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎟️</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Mis Inscripciones
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {
                  misInscripciones.filter((i) => i.estado_inscripcion === "Inscrito")
                    .length
                }{" "}
                activas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Historial y estado de tus reservas en sesiones del gimnasio.
            </p>
          </div>

          <button
            onClick={cargarMisInscripciones}
            disabled={loadingInscripciones}
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 border border-slate-700/60"
          >
            <span className={loadingInscripciones ? "animate-spin" : ""}>🔄</span>
            <span>Actualizar</span>
          </button>
        </div>

        {loadingInscripciones ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <span className="animate-pulse">⏳ Cargando tus inscripciones...</span>
          </div>
        ) : misInscripciones.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <p className="text-2xl mb-2">📋</p>
            <p className="font-medium text-slate-300">
              No tienes inscripciones registradas todavía.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Explora las sesiones disponibles más abajo y haz clic en &quot;Inscribirme&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {misInscripciones.map((inscripcion) => {
              const estaInscrito = inscripcion.estado_inscripcion === "Inscrito";

              return (
                <div
                  key={inscripcion.id_inscripcion}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    estaInscrito
                      ? "bg-slate-950/70 border-slate-700/60 hover:border-purple-500/40"
                      : "bg-slate-950/40 border-slate-800/40 opacity-75"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                          Inscripción #{inscripcion.id_inscripcion}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {inscripcion.nombre_clase}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          estaInscrito
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                        }`}
                      >
                        {inscripcion.estado_inscripcion}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500">📍 Sede:</span>
                        <strong className="text-white">{inscripcion.nombre_sede}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500">📅 Fecha:</span>
                        <span className="font-mono text-purple-300 font-semibold">
                          {inscripcion.fecha_sesion}
                        </span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="font-mono text-purple-300 font-semibold">
                          {inscripcion.hora_sesion}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500">⏱️ Duración:</span>
                        <span>{inscripcion.duracion_minutos_clase} min</span>
                      </p>
                      {inscripcion.observaciones_inscripcion && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          &quot;{inscripcion.observaciones_inscripcion}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {estaInscrito && (
                    <button
                      onClick={() => handleCancelar(inscripcion.id_inscripcion)}
                      disabled={actionLoadingId === inscripcion.id_inscripcion}
                      className="w-full text-xs py-2 px-3 rounded-xl font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      {actionLoadingId === inscripcion.id_inscripcion ? (
                        <span>⏳ Cancelando...</span>
                      ) : (
                        <span>✕ Cancelar Inscripción</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECCIÓN 2: SESIONES DISPONIBLES & RESERVA
         ========================================================================= */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Sesiones Disponibles
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Filtra por fecha, sede o clase para reservar tu cupo en tiempo real.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400 self-start sm:self-auto bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {sesiones.length} sesiones encontradas
          </span>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Sede
            </label>
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id_sede} value={s.id_sede}>
                  {s.nombre_sede} ({s.nombre_ciudad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Disciplina / Clase
            </label>
            <select
              value={filtroClase}
              onChange={(e) => setFiltroClase(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">Todas las disciplinas</option>
              {clases.map((c) => (
                <option key={c.id_clase} value={c.id_clase}>
                  {c.nombre_clase}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroFecha("");
                setFiltroSede("");
                setFiltroClase("");
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Grilla de Sesiones */}
        {loadingSesiones ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <span className="animate-pulse">⏳ Consultando sesiones disponibles...</span>
          </div>
        ) : sesiones.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold text-slate-300">
              No hay sesiones disponibles para los filtros seleccionados.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Prueba cambiando la fecha o seleccionando todas las sedes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sesiones.map((sesion) => {
              const cuposLibres = sesion.cupos_disponibles;
              const sinCupo = cuposLibres <= 0;
              const yaInscrito = idsSesionesInscritas.has(sesion.id_sesion);

              return (
                <div
                  key={sesion.id_sesion}
                  className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between gap-5 group"
                >
                  <div className="space-y-3.5">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Sesión #{sesion.id_sesion}
                        </span>
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                          {sesion.nombre_clase}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getBadgeNivel(
                          sesion.nivel_exigencia_clase
                        )}`}
                      >
                        {sesion.nivel_exigencia_clase}
                      </span>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-2 text-xs text-slate-300">
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500">📍 Sede:</span>
                        <strong className="text-white">{sesion.nombre_sede}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-500">🧑‍🏫 Instructor:</span>
                        <span className="text-slate-300">
                          {sesion.nombre_completo_instructor || (
                            <span className="italic text-slate-500">
                              Sin asignar
                            </span>
                          )}
                        </span>
                      </p>
                      <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400">📅</span>
                          <span className="font-mono font-semibold text-white">
                            {sesion.fecha_sesion}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400">⏰</span>
                          <span className="font-mono font-semibold text-white">
                            {sesion.hora_sesion}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Indicador de Cupos */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Disponibilidad:</span>
                        <span
                          className={`font-bold ${
                            sinCupo
                              ? "text-rose-400"
                              : cuposLibres <= 3
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {sinCupo
                            ? "Agotado (0 cupos)"
                            : `${cuposLibres} de ${sesion.cupo_maximo_sesion} cupos`}
                        </span>
                      </div>
                      {/* Barra de progreso visual */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            sinCupo
                              ? "bg-rose-500"
                              : cuposLibres <= 3
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (sesion.total_inscritos /
                                  sesion.cupo_maximo_sesion) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón de Acción */}
                  <div>
                    {yaInscrito ? (
                      <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-center">
                        ✓ Ya estás inscrito en esta sesión
                      </div>
                    ) : sinCupo ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed text-center"
                      >
                        Cupo Completo
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInscribir(sesion.id_sesion)}
                        disabled={actionLoadingId === sesion.id_sesion}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {actionLoadingId === sesion.id_sesion ? (
                          <span>⏳ Reservando cupo...</span>
                        ) : (
                          <>
                            <span>Inscribirme</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECCIÓN 3: CATÁLOGO DE DISCIPLINAS
         ========================================================================= */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
          <span className="text-2xl">🥋</span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Catálogo de Disciplinas
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Conoce la oferta de clases registradas en el gimnasio, su duración y nivel de exigencia.
            </p>
          </div>
        </div>

        {loadingClases ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <span className="animate-pulse">⏳ Cargando catálogo...</span>
          </div>
        ) : clases.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No hay clases registradas en la base de datos.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clases.map((clase) => (
              <div
                key={clase.id_clase}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-base">
                      {clase.nombre_clase}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getBadgeNivel(
                        clase.nivel_exigencia_clase
                      )}`}
                    >
                      {clase.nivel_exigencia_clase}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span>⏱️ Duración estimada:</span>
                    <strong className="text-slate-200">
                      {clase.duracion_minutos_clase} minutos
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setFiltroClase(String(clase.id_clase));
                    window.scrollTo({ top: 400, behavior: "smooth" });
                  }}
                  className="text-xs py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-purple-300 font-semibold transition-colors text-center border border-slate-700/50"
                >
                  Ver sesiones de esta clase &darr;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
