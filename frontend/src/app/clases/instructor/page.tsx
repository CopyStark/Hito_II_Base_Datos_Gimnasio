"use client";

import { useEffect, useState, useCallback } from "react";
import {
  clasesApi,
  InstructorItemResponse,
  SesionInstructorResponse,
  InscritoEnSesionResponse,
} from "@/services/apiClient";
import { INSTRUCTOR_ACTUAL, InstructorActual } from "@/components/clases/instructorActual";

interface AsistenciaDraft {
  asistio: boolean;
  observaciones: string;
  saving: boolean;
}

interface ToastFeedback {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function InstructorPage() {
  // --- Estados del Instructor y Agenda ---
  const [instructores, setInstructores] = useState<InstructorItemResponse[]>([]);
  const [instructorSeleccionado, setInstructorSeleccionado] = useState<
    InstructorItemResponse | InstructorActual
  >(INSTRUCTOR_ACTUAL);
  const [loadingInstructores, setLoadingInstructores] = useState(true);

  const [sesiones, setSesiones] = useState<SesionInstructorResponse[]>([]);
  const [loadingSesiones, setLoadingSesiones] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Filtros de Rango ---
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // --- Estados del Modal de Inscritos y Asistencia ---
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionInstructorResponse | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [inscritos, setInscritos] = useState<InscritoEnSesionResponse[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [errorInscritos, setErrorInscritos] = useState<string | null>(null);

  // Borradores de asistencia por id_inscripcion
  const [asistenciaDrafts, setAsistenciaDrafts] = useState<Record<number, AsistenciaDraft>>({});
  // Mensaje de feedback / toast visual dentro o fuera del modal
  const [toastFeedback, setToastFeedback] = useState<ToastFeedback | null>(null);

  // 1. Cargar lista real de instructores desde la API
  useEffect(() => {
    let isMounted = true;
    async function cargarInstructores() {
      try {
        setLoadingInstructores(true);
        const data = await clasesApi.getInstructores();
        if (!isMounted) return;

        if (Array.isArray(data) && data.length > 0) {
          setInstructores(data);
          // El primer instructor de la lista por defecto al cargar
          setInstructorSeleccionado(data[0]);
        } else {
          // Fallback a instructorActual.ts
          setInstructores([]);
          setInstructorSeleccionado(INSTRUCTOR_ACTUAL);
        }
      } catch (err: any) {
        console.error("Error al cargar instructores de la API, usando respaldo:", err);
        if (isMounted) {
          setInstructores([]);
          setInstructorSeleccionado(INSTRUCTOR_ACTUAL);
        }
      } finally {
        if (isMounted) {
          setLoadingInstructores(false);
        }
      }
    }

    cargarInstructores();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Cargar sesiones para el instructor actual
  const cargarSesiones = useCallback(
    async (idInstructorTarget?: number) => {
      const id = idInstructorTarget ?? instructorSeleccionado.id_instructor;
      if (!id) return;

      setLoadingSesiones(true);
      setErrorMsg(null);
      try {
        const params: { desde?: string; hasta?: string } = {};
        if (filtroDesde) params.desde = filtroDesde;
        if (filtroHasta) params.hasta = filtroHasta;

        const data = await clasesApi.getSesionesInstructor(id, params);
        setSesiones(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar las sesiones del instructor.");
      } finally {
        setLoadingSesiones(false);
      }
    },
    [instructorSeleccionado.id_instructor, filtroDesde, filtroHasta]
  );

  // Recargar sesiones automáticamente cuando cambia el instructor o los filtros
  useEffect(() => {
    if (instructorSeleccionado.id_instructor) {
      cargarSesiones(instructorSeleccionado.id_instructor);
    }
  }, [instructorSeleccionado.id_instructor, cargarSesiones]);

  // Manejar cambio en el selector desplegable
  const handleCambioInstructor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const encontrado = instructores.find((inst) => inst.id_instructor === id);
    if (encontrado) {
      setInstructorSeleccionado(encontrado);
    } else if (id === INSTRUCTOR_ACTUAL.id_instructor) {
      setInstructorSeleccionado(INSTRUCTOR_ACTUAL);
    }
  };

  // 3. Cargar socios inscritos de la sesión seleccionada
  const cargarInscritos = useCallback(async (idSesion: number) => {
    setLoadingInscritos(true);
    setErrorInscritos(null);
    try {
      const data = await clasesApi.getInscritosSesion(idSesion);
      setInscritos(data);

      // Inicializar borradores de edición para cada inscripción
      const drafts: Record<number, AsistenciaDraft> = {};
      data.forEach((item) => {
        drafts[item.id_inscripcion] = {
          asistio: item.asistio_inscripcion ?? true,
          observaciones: item.observaciones_inscripcion ?? "",
          saving: false,
        };
      });
      setAsistenciaDrafts(drafts);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al cargar la lista de inscritos.";
      setErrorInscritos(String(msg));
    } finally {
      setLoadingInscritos(false);
    }
  }, []);

  // Abrir modal de sesión
  const handleAbrirSesion = (sesion: SesionInstructorResponse) => {
    setSesionSeleccionada(sesion);
    setModalAbierto(true);
    setToastFeedback(null);
    cargarInscritos(sesion.id_sesion);
  };

  // Cerrar modal
  const handleCerrarModal = () => {
    setModalAbierto(false);
    setSesionSeleccionada(null);
    setInscritos([]);
    setErrorInscritos(null);
  };

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalAbierto) {
        handleCerrarModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalAbierto]);

  // Auto-desaparecer mensaje toast tras 4.5 segundos
  useEffect(() => {
    if (toastFeedback) {
      const timer = setTimeout(() => {
        setToastFeedback(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastFeedback]);

  // Modificar borradores de asistencia
  const setDraftAsistio = (idInscripcion: number, asistio: boolean) => {
    setAsistenciaDrafts((prev) => ({
      ...prev,
      [idInscripcion]: {
        ...(prev[idInscripcion] || { observaciones: "", saving: false }),
        asistio,
      },
    }));
  };

  const setDraftObservaciones = (idInscripcion: number, observaciones: string) => {
    setAsistenciaDrafts((prev) => ({
      ...prev,
      [idInscripcion]: {
        ...(prev[idInscripcion] || { asistio: true, saving: false }),
        observaciones,
      },
    }));
  };

  // 4. Guardar registro de asistencia (PATCH /clases/inscripciones/{id}/asistencia)
  const handleGuardarAsistencia = async (inscrito: InscritoEnSesionResponse) => {
    const draft = asistenciaDrafts[inscrito.id_inscripcion];
    if (!draft) return;

    // Marcar estado guardando
    setAsistenciaDrafts((prev) => ({
      ...prev,
      [inscrito.id_inscripcion]: {
        ...prev[inscrito.id_inscripcion],
        saving: true,
      },
    }));

    try {
      const res = await clasesApi.registrarAsistencia(inscrito.id_inscripcion, {
        asistio: draft.asistio,
        observaciones: draft.observaciones,
      });

      // Actualizar el registro en la lista local de inscritos
      setInscritos((prev) =>
        prev.map((item) =>
          item.id_inscripcion === inscrito.id_inscripcion
            ? {
                ...item,
                asistio_inscripcion: res.asistio_inscripcion,
                observaciones_inscripcion: draft.observaciones,
              }
            : item
        )
      );

      // Mostrar mensaje visual claro de éxito
      setToastFeedback({
        id: Date.now(),
        type: "success",
        message: `Asistencia guardada para ${inscrito.nombre_completo_socio} (${
          draft.asistio ? "Asistió" : "No Asistió"
        }).`,
      });
    } catch (err: any) {
      const msg =
        err.data?.detail ||
        err.message ||
        "No fue posible actualizar la asistencia. Intente nuevamente.";
      setToastFeedback({
        id: Date.now(),
        type: "error",
        message: `Error al registrar asistencia: ${String(msg)}`,
      });
    } finally {
      setAsistenciaDrafts((prev) => ({
        ...prev,
        [inscrito.id_inscripcion]: {
          ...prev[inscrito.id_inscripcion],
          saving: false,
        },
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* =========================================================================
          CABECERA DEL PORTAL DEL INSTRUCTOR
         ========================================================================= */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span>🧑‍🏫</span> Portal del Instructor (sp_Sesiones_Por_Instructor)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Agenda de Sesiones
          </h1>

          {/* Información del Instructor Actual */}
          <p className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Instructor en sesión:</span>
            <strong className="text-white font-semibold">
              {instructorSeleccionado.nombre_completo_instructor}
            </strong>
            <span className="text-slate-600">&bull;</span>
            <span>Correo:</span>
            <span className="text-purple-300 font-mono">
              {instructorSeleccionado.correo_instructor}
            </span>
            {instructorSeleccionado.rut_instructor && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-500 font-mono text-xs">
                  RUT: {instructorSeleccionado.rut_instructor}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Controles de Cabecera: Selector de Instructor y Botón Actualizar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="selector-instructor"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Seleccionar Instructor:
            </label>
            <select
              id="selector-instructor"
              value={instructorSeleccionado.id_instructor}
              onChange={handleCambioInstructor}
              disabled={loadingInstructores && instructores.length === 0}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 font-medium shadow-inner cursor-pointer"
            >
              {instructores.length > 0 ? (
                instructores.map((inst) => (
                  <option key={inst.id_instructor} value={inst.id_instructor}>
                    {inst.nombre_completo_instructor}
                    {inst.nombre_sede ? ` (${inst.nombre_sede})` : ""}
                  </option>
                ))
              ) : (
                <option value={INSTRUCTOR_ACTUAL.id_instructor}>
                  {INSTRUCTOR_ACTUAL.nombre_completo_instructor} (Respaldo)
                </option>
              )}
            </select>
          </div>

          <button
            onClick={() => cargarSesiones()}
            disabled={loadingSesiones}
            className="self-end sm:self-auto text-xs px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 mt-auto"
          >
            <span className={loadingSesiones ? "animate-spin" : ""}>🔄</span>
            <span>Actualizar Agenda</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FILTROS DE FECHA (DESDE / HASTA)
         ========================================================================= */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="w-full sm:w-auto flex items-end">
          <button
            onClick={() => {
              setFiltroDesde("");
              setFiltroHasta("");
            }}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
          >
            Limpiar Rango
          </button>
        </div>
      </div>

      {/* Error de Sesiones */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button
            onClick={() => cargarSesiones()}
            className="text-xs underline hover:text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* =========================================================================
          LISTADO DE SESIONES ASIGNADAS AL INSTRUCTOR
         ========================================================================= */}
      {loadingSesiones ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <span className="animate-pulse">⏳ Consultando agenda de sesiones del instructor...</span>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <p className="text-3xl mb-2">📭</p>
          <p className="font-semibold text-slate-300">
            No hay sesiones asignadas para este instructor en el rango seleccionado.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Puedes cambiar de instructor en el selector o modificar el filtro de fechas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map((s) => (
            <div
              key={s.id_sesion}
              onClick={() => handleAbrirSesion(s)}
              className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-5 space-y-4 shadow-lg hover:shadow-2xl hover:shadow-purple-900/20 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Sesión #{s.id_sesion}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                      {s.nombre_clase}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    {s.total_inscritos} / {s.cupo_maximo_sesion} inscritos
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                  <p className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Sede:</span>
                    <strong className="text-white font-medium">{s.nombre_sede}</strong>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span>Fecha:</span>
                    <span className="font-mono text-purple-300 font-semibold">{s.fecha}</span>
                    <span className="text-slate-600">&bull;</span>
                    <span>⏰</span>
                    <span>{s.hora}</span>
                  </p>
                </div>
              </div>

              {/* Botón / Indicador de acción */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  Pase de Asistencia
                </span>
                <span className="text-purple-400 group-hover:text-purple-300 font-semibold flex items-center gap-1">
                  <span>Ver inscritos</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          MODAL: LISTADO DE INSCRITOS Y GESTIÓN DE ASISTENCIA
         ========================================================================= */}
      {modalAbierto && sesionSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div
            className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-purple-950/40 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/60">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1.5">
                  <span>📋</span> Sesión #{sesionSeleccionada.id_sesion} &bull; Control de Asistencia
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {sesionSeleccionada.nombre_clase}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                  <span>📍 {sesionSeleccionada.nombre_sede}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span>📅 {sesionSeleccionada.fecha}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span>⏰ {sesionSeleccionada.hora}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="font-semibold text-purple-300">
                    Capacidad: {sesionSeleccionada.cupo_maximo_sesion} cupos
                  </span>
                </div>
              </div>

              <button
                onClick={handleCerrarModal}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors border border-slate-700/60 shrink-0"
                title="Cerrar modal (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Notificación Toast interna del modal */}
              {toastFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-lg transition-all animate-fade-in ${
                    toastFeedback.type === "success"
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/80 border-rose-500/50 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">
                      {toastFeedback.type === "success" ? "✅" : "⚠️"}
                    </span>
                    <span>{toastFeedback.message}</span>
                  </div>
                  <button
                    onClick={() => setToastFeedback(null)}
                    className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Estado de Carga */}
              {loadingInscritos ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <span className="animate-pulse">⏳ Consultando socios inscritos en la sesión...</span>
                </div>
              ) : errorInscritos ? (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between">
                  <span>⚠️ {errorInscritos}</span>
                  <button
                    onClick={() => cargarInscritos(sesionSeleccionada.id_sesion)}
                    className="text-xs underline hover:text-white"
                  >
                    Reintentar
                  </button>
                </div>
              ) : inscritos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="font-semibold text-slate-300">
                    No hay socios inscritos en esta sesión.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Los socios pueden inscribirse desde la pestaña Catálogo y Reserva.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>
                      Total de inscripciones registradas:{" "}
                      <strong className="text-white">{inscritos.length}</strong>
                    </span>
                    <button
                      onClick={() => cargarInscritos(sesionSeleccionada.id_sesion)}
                      className="text-purple-400 hover:text-purple-300 underline font-medium"
                    >
                      Refrescar lista
                    </button>
                  </div>

                  {inscritos.map((inscrito) => {
                    const draft = asistenciaDrafts[inscrito.id_inscripcion];
                    const esInscrito = inscrito.estado_inscripcion === "Inscrito";

                    return (
                      <div
                        key={inscrito.id_inscripcion}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md"
                      >
                        {/* Cabecera del Inscrito */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-white">
                                {inscrito.nombre_completo_socio}
                              </h3>
                              <span className="text-xs font-mono text-slate-500">
                                #{inscrito.id_socio_inscripcion}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>✉️ {inscrito.correo_socio}</span>
                              <span className="text-slate-600">&bull;</span>
                              <span>📞 {inscrito.telefono_socio}</span>
                            </p>
                          </div>

                          {/* Badges de Estado y Asistencia Actual */}
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {/* Estado Inscripción */}
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                                esInscrito
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              }`}
                            >
                              {inscrito.estado_inscripcion}
                            </span>

                            {/* Asistencia Registrada en BD */}
                            {inscrito.asistio_inscripcion === true ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                                ✓ Asistió
                              </span>
                            ) : inscrito.asistio_inscripcion === false ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold bg-rose-950 text-rose-400 border border-rose-800/80">
                                ✗ No Asistió
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold bg-amber-950/70 text-amber-400 border border-amber-800/80">
                                ⏳ Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controles de Asistencia y Observaciones */}
                        {!esInscrito ? (
                          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                            <span>🔒</span>
                            <span>
                              Inscripción en estado <strong>{inscrito.estado_inscripcion}</strong>. El registro de asistencia solo está permitido para inscripciones activas.
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Toggle Asistió / No Asistió */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-300">
                                  Control de Asistencia:
                                </span>
                                <div className="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftAsistio(inscrito.id_inscripcion, true)
                                    }
                                    disabled={draft?.saving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      draft?.asistio === true
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
                                        : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                                    }`}
                                  >
                                    <span>✓</span>
                                    <span>Asistió</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftAsistio(inscrito.id_inscripcion, false)
                                    }
                                    disabled={draft?.saving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      draft?.asistio === false
                                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400"
                                        : "text-slate-400 hover:text-rose-300 hover:bg-slate-800"
                                    }`}
                                  >
                                    <span>✕</span>
                                    <span>No Asistió</span>
                                  </button>
                                </div>
                              </div>

                              {/* Botón Guardar Asistencia */}
                              <button
                                type="button"
                                onClick={() => handleGuardarAsistencia(inscrito)}
                                disabled={draft?.saving}
                                className="py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 self-end sm:self-auto"
                              >
                                {draft?.saving ? (
                                  <>
                                    <span className="animate-spin">🔄</span>
                                    <span>Guardando...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>💾</span>
                                    <span>Guardar Asistencia</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Campo de texto para Observaciones */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                Observaciones de Asistencia (opcional):
                              </label>
                              <input
                                type="text"
                                value={draft?.observaciones ?? ""}
                                onChange={(e) =>
                                  setDraftObservaciones(
                                    inscrito.id_inscripcion,
                                    e.target.value
                                  )
                                }
                                disabled={draft?.saving}
                                maxLength={500}
                                placeholder="Ej: Puntual, presentó molestias en tobillo, retiro anticipado..."
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>
                Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-300">Esc</kbd> para salir
              </span>
              <button
                onClick={handleCerrarModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors border border-slate-700/60"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
