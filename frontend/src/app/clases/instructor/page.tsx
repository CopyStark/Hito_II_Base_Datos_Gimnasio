"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Mail,
  Phone,
  Lock,
  Save,
} from "lucide-react";
import {
  clasesApi,
  InstructorItemResponse,
  SesionInstructorResponse,
  InscritoEnSesionResponse,
} from "@/services/apiClient";
import {
  INSTRUCTOR_ACTUAL,
  InstructorActual,
} from "@/components/clases/instructorActual";

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

  // Helper fecha de hoy en formato YYYY-MM-DD
  const getFechaHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- Filtros de Rango ---
  const [filtroDesde, setFiltroDesde] = useState(getFechaHoy());
  const [filtroHasta, setFiltroHasta] = useState("");

  // --- Estados del Modal de Inscritos y Asistencia ---
  const [sesionSeleccionada, setSesionSeleccionada] =
    useState<SesionInstructorResponse | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [inscritos, setInscritos] = useState<InscritoEnSesionResponse[]>([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [errorInscritos, setErrorInscritos] = useState<string | null>(null);

  // Borradores de asistencia por id_inscripcion
  const [asistenciaDrafts, setAsistenciaDrafts] = useState<
    Record<number, AsistenciaDraft>
  >({});
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
          setInstructorSeleccionado(data[0]);
        } else {
          setInstructores([]);
          setInstructorSeleccionado(INSTRUCTOR_ACTUAL);
        }
      } catch (err: any) {
        console.error(
          "Error al cargar instructores de la API, usando respaldo:",
          err
        );
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
        setErrorMsg(
          err.message || "Error al cargar las sesiones del instructor."
        );
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
      const msg =
        err.data?.detail ||
        err.message ||
        "Error al cargar la lista de inscritos.";
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

  const setDraftObservaciones = (
    idInscripcion: number,
    observaciones: string
  ) => {
    setAsistenciaDrafts((prev) => ({
      ...prev,
      [idInscripcion]: {
        ...(prev[idInscripcion] || { asistio: true, saving: false }),
        observaciones,
      },
    }));
  };

  // 4. Guardar registro de asistencia
  const handleGuardarAsistencia = async (inscrito: InscritoEnSesionResponse) => {
    const draft = asistenciaDrafts[inscrito.id_inscripcion];
    if (!draft) return;

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
    <div className="space-y-8 animate-fade-in-scale">
      {/* =========================================================================
          CABECERA DEL PORTAL DEL INSTRUCTOR + BARRA DE PERFIL
         ========================================================================= */}
      <div className="space-y-5">
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
              <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
              Portal del Instructor · Pase de Lista
            </span>

            <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
              Agenda de Sesiones
            </h1>

            <div className="w-20 h-[2px] bg-[#ff6105]" />

            <p className="text-[#7a7b7b] text-sm sm:text-base leading-relaxed pt-1">
              Consulta tus clases asignadas, revisa el listado de socios
              inscritos y registra la asistencia en línea.
            </p>
          </div>

          <button
            onClick={() => cargarSesiones()}
            disabled={loadingSesiones}
            className="self-start sm:self-auto text-xs sm:text-sm px-6 py-2.5 rounded-full bg-[#ff6105] hover:bg-[#e05504] text-white font-medium shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingSesiones ? "animate-spin" : ""}`}
            />
            <span>Actualizar Agenda</span>
          </button>
        </div>

        {/* Barra Compacta del Instructor Activo */}
        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ffdfcd]/60 border border-[#ff6105]/25 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-[#ff6105]" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Instructor activo
              </span>
            </div>

            <div className="relative">
              <select
                id="selector-instructor"
                value={instructorSeleccionado.id_instructor}
                onChange={handleCambioInstructor}
                disabled={loadingInstructores && instructores.length === 0}
                className="w-full sm:w-auto appearance-none bg-[#f3f4f3]/80 hover:bg-[#f3f4f3] border border-[#e5e5e5] rounded-full pl-4 pr-9 py-1.5 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] font-medium cursor-pointer transition-all duration-200"
              >
                {instructores.length > 0 ? (
                  instructores.map((inst) => (
                    <option key={inst.id_instructor} value={inst.id_instructor}>
                      {inst.nombre_completo_instructor}
                      {inst.nombre_sede ? ` — ${inst.nombre_sede}` : ""}
                    </option>
                  ))
                ) : (
                  <option value={INSTRUCTOR_ACTUAL.id_instructor}>
                    {INSTRUCTOR_ACTUAL.nombre_completo_instructor}
                  </option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {instructorSeleccionado.rut_instructor && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
                <span className="text-[#7a7b7b]">RUT</span>
                <strong className="font-medium text-[#0a0a0a]">
                  {instructorSeleccionado.rut_instructor}
                </strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
              <Mail className="w-3 h-3 text-[#ff6105]" />
              <span>{instructorSeleccionado.correo_instructor}</span>
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FILTROS DE FECHA (DESDE / HASTA)
         ========================================================================= */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3.5">
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
            Desde
          </label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-full bg-[#f3f4f3]/70 border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
          />
        </div>
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
            Hasta
          </label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-full bg-[#f3f4f3]/70 border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
          />
        </div>
        <div className="w-full sm:w-auto flex items-end">
          <button
            onClick={() => {
              setFiltroDesde("");
              setFiltroHasta("");
            }}
            className="w-full py-2 px-5 rounded-[24px] text-xs sm:text-sm font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] transition-all duration-200 active:scale-[0.98] border border-[#e5e5e5]"
          >
            Limpiar Rango
          </button>
        </div>
      </div>

      {/* Error de Sesiones */}
      {errorMsg && (
        <div className="p-4 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => cargarSesiones()}
            className="text-xs underline hover:text-rose-950 font-medium"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* =========================================================================
          LISTADO DE SESIONES ASIGNADAS AL INSTRUCTOR
         ========================================================================= */}
      {loadingSesiones ? (
        <div className="py-16 text-center text-[#7a7b7b] text-sm">
          <span className="animate-pulse">
            Consultando agenda de sesiones del instructor...
          </span>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="py-12 text-center text-[#7a7b7b] text-sm bg-white rounded-[5px] border border-dashed border-[#e5e5e5]">
          <Calendar className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
          <p className="font-medium text-[#0a0a0a]">
            No hay sesiones asignadas para este instructor en el rango
            seleccionado.
          </p>
          <p className="text-xs text-[#7a7b7b] mt-1">
            Puedes cambiar de instructor en el selector o modificar el filtro de
            fechas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sesiones.map((s) => (
            <div
              key={s.id_sesion}
              onClick={() => handleAbrirSesion(s)}
              className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm hover:-translate-y-0.5 rounded-[5px] p-5 space-y-4 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#7a7b7b] block">
                      Sesión #{s.id_sesion}
                    </span>
                    <h3 className="text-lg font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors mt-0.5">
                      {s.nombre_clase}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 shrink-0">
                    {s.total_inscritos} / {s.cupo_maximo_sesion} inscritos
                  </span>
                </div>

                <div className="space-y-2 bg-[#f3f4f3]/80 p-3.5 rounded-[5px] border border-[#e5e5e5]">
                  <p className="flex items-center gap-2 text-xs text-[#7a7b7b]">
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      {s.nombre_sede}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                      <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                      {s.fecha}
                    </span>
                    <span className="text-[#e5e5e5]">·</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                      <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                      {formatearHora(s.hora)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón / Indicador de acción */}
              <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
                <span className="text-[#7a7b7b] group-hover:text-[#292b2a] transition-colors">
                  Pase de Asistencia
                </span>
                <span className="text-[#ff6105] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Ver inscritos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
        <div
          onClick={handleCerrarModal}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in-scale"
        >
          <div
            className="bg-white border border-[#e5e5e5] rounded-[8px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex items-start justify-between gap-4 bg-[#f3f4f3]/80">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 mb-2">
                  <UserCheck className="w-3 h-3 text-[#ff6105]" />
                  <span>
                    Sesión #{sesionSeleccionada.id_sesion} · Control de
                    Asistencia
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
                  {sesionSeleccionada.nombre_clase}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                    {sesionSeleccionada.nombre_sede}
                  </span>
                  <span className="text-[#e5e5e5]">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                    <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                    {sesionSeleccionada.fecha}
                  </span>
                  <span className="text-[#e5e5e5]">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                    <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                    {formatearHora(sesionSeleccionada.hora)}
                  </span>
                  <span className="text-[#e5e5e5]">·</span>
                  <span className="text-xs font-medium text-[#7a7b7b]">
                    Capacidad:{" "}
                    <strong className="text-[#0a0a0a]">
                      {sesionSeleccionada.cupo_maximo_sesion} cupos
                    </strong>
                  </span>
                </div>
              </div>

              <button
                onClick={handleCerrarModal}
                className="text-[#7a7b7b] hover:text-[#0a0a0a] p-2 rounded-full bg-white hover:bg-[#e5e7eb] transition-colors border border-[#e5e5e5] shrink-0"
                title="Cerrar modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {toastFeedback && (
                <div
                  className={`p-3.5 rounded-[5px] border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all animate-fade-in-scale ${
                    toastFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {toastFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toastFeedback.message}</span>
                  </div>
                  <button
                    onClick={() => setToastFeedback(null)}
                    className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1 rounded-full hover:bg-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {loadingInscritos ? (
                <div className="py-16 text-center text-[#7a7b7b] text-sm">
                  <span className="animate-pulse">
                    Consultando socios inscritos en la sesión...
                  </span>
                </div>
              ) : errorInscritos ? (
                <div className="p-4 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between">
                  <span>{errorInscritos}</span>
                  <button
                    onClick={() =>
                      cargarInscritos(sesionSeleccionada.id_sesion)
                    }
                    className="text-xs underline hover:text-rose-950 font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              ) : inscritos.length === 0 ? (
                <div className="py-12 text-center text-[#7a7b7b] text-sm bg-[#f3f4f3]/60 rounded-[5px] border border-dashed border-[#e5e5e5]">
                  <UserCheck className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
                  <p className="font-medium text-[#0a0a0a]">
                    No hay socios inscritos en esta sesión.
                  </p>
                  <p className="text-xs text-[#7a7b7b] mt-1">
                    Los socios pueden inscribirse desde la pestaña Catálogo y
                    Reserva.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#7a7b7b] px-1">
                    <span>
                      Total de inscripciones registradas:{" "}
                      <strong className="text-[#0a0a0a]">
                        {inscritos.length}
                      </strong>
                    </span>
                    <button
                      onClick={() =>
                        cargarInscritos(sesionSeleccionada.id_sesion)
                      }
                      className="text-[#ff6105] hover:underline font-medium"
                    >
                      Refrescar lista
                    </button>
                  </div>

                  {inscritos.map((inscrito) => {
                    const draft = asistenciaDrafts[inscrito.id_inscripcion];
                    const esInscrito =
                      inscrito.estado_inscripcion === "Inscrito";

                    return (
                      <div
                        key={inscrito.id_inscripcion}
                        className={`bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-4 sm:p-5 space-y-4 ${
                          !esInscrito ? "opacity-70" : ""
                        }`}
                      >
                        {/* Cabecera del Inscrito */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-medium text-[#0a0a0a]">
                                {inscrito.nombre_completo_socio}
                              </h3>
                              <span className="text-xs text-[#7a7b7b]">
                                #{inscrito.id_socio_inscripcion}
                              </span>
                            </div>

                            <div className="text-xs text-[#7a7b7b] mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              <span className="flex items-center gap-1 text-[#292b2a]">
                                <Mail className="w-3.5 h-3.5 text-[#ff6105]" />
                                {inscrito.correo_socio}
                              </span>
                              <span className="text-[#e5e5e5]">·</span>
                              <span className="flex items-center gap-1 text-[#292b2a]">
                                <Phone className="w-3.5 h-3.5 text-[#7a7b7b]" />
                                {inscrito.telefono_socio}
                              </span>
                            </div>
                          </div>

                          {/* Badges de Estado y Asistencia Actual */}
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                esInscrito
                                  ? "bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {inscrito.estado_inscripcion}
                            </span>

                            {inscrito.asistio_inscripcion === true ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Asistió
                              </span>
                            ) : inscrito.asistio_inscripcion === false ? (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <X className="w-3 h-3" /> No Asistió
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controles de Asistencia y Observaciones */}
                        {!esInscrito ? (
                          <div className="bg-[#f3f4f3]/70 border border-[#e5e5e5] rounded-[5px] p-3 text-xs text-[#7a7b7b] flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-[#a2a3a2] shrink-0" />
                            <span>
                              Inscripción en estado{" "}
                              <strong className="text-[#0a0a0a]">
                                {inscrito.estado_inscripcion}
                              </strong>
                              . El registro de asistencia solo está permitido
                              para inscripciones activas.
                            </span>
                          </div>
                        ) : (
                          <div className="bg-[#f3f4f3]/80 border border-[#e5e5e5] rounded-[5px] p-3.5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[#292b2a]">
                                  Asistencia:
                                </span>
                                <div className="inline-flex rounded-full p-1 bg-white border border-[#e5e5e5]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftAsistio(
                                        inscrito.id_inscripcion,
                                        true
                                      )
                                    }
                                    disabled={draft?.saving}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                                      draft?.asistio === true
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Asistió</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftAsistio(
                                        inscrito.id_inscripcion,
                                        false
                                      )
                                    }
                                    disabled={draft?.saving}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                                      draft?.asistio === false
                                        ? "bg-rose-600 text-white shadow-sm"
                                        : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                                    }`}
                                  >
                                    <X className="w-3 h-3" />
                                    <span>No Asistió</span>
                                  </button>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleGuardarAsistencia(inscrito)
                                }
                                disabled={draft?.saving}
                                className="py-2 px-5 rounded-full text-xs font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 self-end sm:self-auto"
                              >
                                {draft?.saving ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Guardando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Guardar Asistencia</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-[#7a7b7b] mb-1">
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
                                className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-xs text-[#0a0a0a] placeholder-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
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
            <div className="p-4 border-t border-[#e5e5e5] bg-[#f3f4f3]/80 flex items-center justify-between text-xs text-[#7a7b7b]">
              <span>
                Presiona{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[#0a0a0a]">
                  Esc
                </kbd>{" "}
                para salir
              </span>
              <button
                onClick={handleCerrarModal}
                className="px-4 py-2 rounded-[24px] bg-white hover:bg-[#e5e7eb] text-[#292b2a] font-medium transition-colors border border-[#e5e5e5]"
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
