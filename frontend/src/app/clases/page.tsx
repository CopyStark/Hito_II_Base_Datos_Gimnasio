"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  User,
  Tag,
  MapPin,
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  Check,
  ArrowDown,
  Dumbbell,
} from "lucide-react";
import {
  clasesApi,
  ClaseResponse,
  SesionDisponibleResponse,
  InscripcionSocioDetalleResponse,
  SedeSimpleResponse,
} from "@/services/apiClient";
import {
  SOCIOS_PRUEBA,
  SocioActual,
  getStoredSocioActual,
  setStoredSocioActual,
  subscribeSocioActual,
} from "@/components/clases/socioActual";

interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

export default function ClasesPage() {
  // --- Socio en Sesión (Dinámico) ---
  const [socioActual, setSocioActual] = useState<SocioActual>(SOCIOS_PRUEBA[0]);

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

  // Helper fecha de hoy en formato YYYY-MM-DD
  const getFechaHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- Filtros de Sesiones Inicializados por Defecto ---
  // Fecha: Hoy | Sede: Sede del socio o primera | Disciplina: Todas
  const [filtroFecha, setFiltroFecha] = useState<string>(getFechaHoy());
  const [filtroSede, setFiltroSede] = useState<string>("");
  const [filtroClase, setFiltroClase] = useState<string>("");

  // --- Feedback / Notificaciones Flotantes (Toasts) ---
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Sincronizar socio actual con localStorage y eventos entre componentes
  useEffect(() => {
    const current = getStoredSocioActual();
    setSocioActual(current);
    if (current.id_sede_registro_socio) {
      setFiltroSede(String(current.id_sede_registro_socio));
    }
    const unsubscribe = subscribeSocioActual((nuevo) => {
      setSocioActual(nuevo);
      if (nuevo.id_sede_registro_socio) {
        setFiltroSede(String(nuevo.id_sede_registro_socio));
      }
    });
    return unsubscribe;
  }, []);

  // Auto-descartar Notificaciones Flotantes (Toast) tras 5 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

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

  // Cargar Sedes e inicializar la sede por defecto si no está seteada
  const cargarSedes = useCallback(async () => {
    try {
      const data = await clasesApi.getSedes();
      setSedes(data);
      setFiltroSede((prev) => {
        if (prev) return prev;
        const current = getStoredSocioActual();
        if (current.id_sede_registro_socio) {
          return String(current.id_sede_registro_socio);
        }
        return data.length > 0 ? String(data[0].id_sede) : "";
      });
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
  const cargarMisInscripciones = useCallback(async (idSocioOverride?: number) => {
    const id = idSocioOverride ?? socioActual.id_socio;
    if (!id) return;
    try {
      setLoadingInscripciones(true);
      const data = await clasesApi.getInscripcionesSocio(id);
      setMisInscripciones(data);
    } catch (err: any) {
      console.error("Error al cargar inscripciones:", err);
    } finally {
      setLoadingInscripciones(false);
    }
  }, [socioActual.id_socio]);

  // Carga inicial
  useEffect(() => {
    cargarClases();
    cargarSedes();
  }, [cargarClases, cargarSedes]);

  // Recargar inscripciones cuando cambie el socio actual
  useEffect(() => {
    if (socioActual.id_socio) {
      cargarMisInscripciones(socioActual.id_socio);
    }
  }, [socioActual.id_socio, cargarMisInscripciones]);

  // Cargar sesiones cuando cambian los filtros
  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  // Cambiar socio desde el selector dinámico
  const handleCambiarSocio = (nuevoId: number) => {
    const encontrado = SOCIOS_PRUEBA.find((s) => s.id_socio === nuevoId);
    if (encontrado) {
      setSocioActual(encontrado);
      setStoredSocioActual(encontrado);
      if (encontrado.id_sede_registro_socio) {
        setFiltroSede(String(encontrado.id_sede_registro_socio));
      }
    }
  };

  // Acción: Inscribirme en una sesión
  const handleInscribir = async (id_sesion: number) => {
    setActionLoadingId(id_sesion);
    setFeedback(null);
    try {
      await clasesApi.inscribirSocio({
        id_socio_inscripcion: socioActual.id_socio,
        id_sesion_inscripcion: id_sesion,
      });

      setFeedback({
        type: "success",
        message: `Inscripción exitosa. Has reservado tu cupo para la sesión #${id_sesion}.`,
      });

      // Refrescar ambas listas inmediatamente
      await Promise.all([cargarSesiones(), cargarMisInscripciones(socioActual.id_socio)]);
    } catch (err: any) {
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
        id_socio: socioActual.id_socio,
      });

      setFeedback({
        type: "info",
        message: `Inscripción #${id_inscripcion} cancelada correctamente. Se liberó tu cupo.`,
      });

      // Refrescar ambas listas
      await Promise.all([cargarSesiones(), cargarMisInscripciones(socioActual.id_socio)]);
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "intermedio":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "avanzado":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-[#f3f4f3] text-[#7a7b7b] border-[#e5e5e5]";
    }
  };

  // IDs de sesiones en las que el socio ya está 'Inscrito'
  const idsSesionesInscritas = new Set(
    misInscripciones
      .filter((i) => i.estado_inscripcion === "Inscrito")
      .map((i) => i.id_sesion_inscripcion)
  );

  return (
    <div className="space-y-10">
      {/* Hero / Encabezado de la Pantalla */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 relative">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Portal del Socio &bull; Reserva de Clases</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0a0a0a]">
            Catálogo de Clases &amp; Reserva de Cupos
          </h1>

          <div className="w-16 h-[2px] bg-[#ff6105] my-3" />

          <p className="text-[#7a7b7b] text-sm sm:text-base leading-relaxed">
            Explora las disciplinas disponibles, consulta las sesiones programadas
            en cada sede con disponibilidad de cupos en tiempo real y reserva tu
            asistencia de forma inmediata.
          </p>

          {/* Selector Dinámico de Socio para Testeo de Inscripciones */}
          <div className="mt-6 pt-5 border-t border-[#e5e5e5] flex flex-col gap-3 bg-[#f3f4f3] p-4 sm:p-5 rounded-[5px] border border-[#e5e5e5]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="selector-socio-hero"
                className="text-xs font-medium uppercase tracking-wider text-[#292b2a] flex items-center gap-1.5 shrink-0"
              >
                <User className="w-3.5 h-3.5 text-[#ff6105]" />
                <span>Socio en sesión (Pruebas):</span>
              </label>
              <select
                id="selector-socio-hero"
                value={socioActual.id_socio}
                onChange={(e) => handleCambiarSocio(Number(e.target.value))}
                className="w-full sm:w-auto bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-xs sm:text-sm text-[#0a0a0a] font-medium focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-colors"
              >
                {SOCIOS_PRUEBA.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    {s.nombre_completo_socio} (#{s.id_socio} - {s.nombre_sede_registro || `Sede ${s.id_sede_registro_socio}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-white p-3 rounded-[5px] border border-[#e5e5e5]">
              <span className="text-[#0a0a0a] font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#ff6105]" />
                <span>{socioActual.nombre_completo_socio}</span>
              </span>
              <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
              <span className="bg-[#f3f4f3] px-2.5 py-1 rounded-full text-[#292b2a] border border-[#e5e5e5] font-mono text-[11px]">
                RUT: <strong className="text-[#0a0a0a]">{socioActual.rut_socio}</strong>
              </span>
              <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
              <span className="bg-[#f3f4f3] px-2.5 py-1 rounded-full text-[#292b2a] border border-[#e5e5e5] font-mono text-[11px]">
                Correo: <strong className="text-[#0a0a0a]">{socioActual.correo_socio}</strong>
              </span>
              {socioActual.nombre_sede_registro && (
                <>
                  <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
                  <span className="text-[#7a7b7b] font-medium">
                    Sede: <strong className="text-[#0a0a0a]">{socioActual.nombre_sede_registro}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerta Flotante Fija (Toast) */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full p-4 rounded-[5px] border border-[#e5e5e5] shadow-lg bg-white flex items-start justify-between gap-3 animate-fade-in-scale"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : feedback.type === "error" ? (
                <AlertTriangle className="w-5 h-5 text-[#ff6105]" />
              ) : (
                <Info className="w-5 h-5 text-[#292b2a]" />
              )}
            </span>
            <div>
              <strong className="block text-sm font-medium text-[#0a0a0a]">
                {feedback.type === "success"
                  ? "Operación Exitosa"
                  : feedback.type === "error"
                  ? "Aviso del Sistema"
                  : "Información"}
              </strong>
              <p className="text-xs sm:text-sm mt-0.5 text-[#7a7b7b] leading-relaxed">
                {feedback.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1 rounded-full hover:bg-[#f3f4f3] shrink-0 transition-colors"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 1: MIS INSCRIPCIONES
         ========================================================================= */}
      <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium tracking-tight text-[#0a0a0a]">
                Mis Inscripciones
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20">
                {
                  misInscripciones.filter((i) => i.estado_inscripcion === "Inscrito")
                    .length
                }{" "}
                activas
              </span>
            </div>
            <div className="w-12 h-[2px] bg-[#ff6105] mt-1 mb-2" />
            <p className="text-xs sm:text-sm text-[#7a7b7b]">
              Historial y estado de tus reservas en sesiones del gimnasio.
            </p>
          </div>

          <button
            onClick={() => cargarMisInscripciones()}
            disabled={loadingInscripciones}
            className="self-start sm:self-auto text-xs px-4 py-2 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5 border border-[#e5e5e5]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInscripciones ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {loadingInscripciones ? (
          <div className="py-8 text-center text-[#7a7b7b] text-sm">
            <span className="animate-pulse">Cargando tus inscripciones...</span>
          </div>
        ) : misInscripciones.length === 0 ? (
          <div className="py-10 text-center text-[#7a7b7b] text-sm bg-[#f3f4f3] rounded-[5px] border border-dashed border-[#e5e5e5]">
            <Calendar className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
            <p className="font-medium text-[#0a0a0a]">
              No tienes inscripciones registradas todavía.
            </p>
            <p className="text-xs text-[#7a7b7b] mt-1">
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
                  className={`p-5 rounded-[5px] border transition-all duration-200 flex flex-col justify-between gap-4 ${
                    estaInscrito
                      ? "bg-[#ffdfcd]/20 border-[#ff6105]/40 hover:border-[#ff6105] hover:-translate-y-0.5"
                      : "bg-white border-[#e5e5e5] opacity-75"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#7a7b7b] block">
                          Inscripción #{inscripcion.id_inscripcion}
                        </span>
                        <h3 className="text-base font-medium text-[#0a0a0a]">
                          {inscripcion.nombre_clase}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                          estaInscrito
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-[#f3f4f3] text-[#7a7b7b] border-[#e5e5e5]"
                        }`}
                      >
                        {inscripcion.estado_inscripcion}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-[#292b2a]">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                        <span className="text-[#7a7b7b]">Sede:</span>
                        <strong className="text-[#0a0a0a]">{inscripcion.nombre_sede}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                        <span className="text-[#7a7b7b]">Fecha:</span>
                        <span className="font-mono text-[#0a0a0a] font-medium">
                          {inscripcion.fecha_sesion}
                        </span>
                        <span className="text-[#e5e5e5]">&bull;</span>
                        <Clock className="w-3.5 h-3.5 text-[#7a7b7b]" />
                        <span className="font-mono text-[#0a0a0a] font-medium">
                          {inscripcion.hora_sesion}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#7a7b7b]" />
                        <span className="text-[#7a7b7b]">Duración:</span>
                        <span>{inscripcion.duracion_minutos_clase} min</span>
                      </p>
                      {inscripcion.observaciones_inscripcion && (
                        <p className="text-[11px] text-[#7a7b7b] italic bg-white p-2 rounded-[5px] border border-[#e5e5e5]">
                          &quot;{inscripcion.observaciones_inscripcion}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {estaInscrito && (
                    <button
                      onClick={() => handleCancelar(inscripcion.id_inscripcion)}
                      disabled={actionLoadingId === inscripcion.id_inscripcion}
                      className="w-full text-xs py-2 px-3 rounded-full font-medium bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      {actionLoadingId === inscripcion.id_inscripcion ? (
                        <span>Cancelando...</span>
                      ) : (
                        <span>Cancelar Inscripción</span>
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
      <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div>
            <h2 className="text-xl font-medium tracking-tight text-[#0a0a0a]">
              Sesiones Disponibles
            </h2>
            <div className="w-12 h-[2px] bg-[#ff6105] mt-1 mb-2" />
            <p className="text-xs sm:text-sm text-[#7a7b7b]">
              Filtra por fecha, sede o clase para reservar tu cupo en tiempo real.
            </p>
          </div>

          <span className="text-xs font-mono text-[#7a7b7b] self-start sm:self-auto bg-[#f3f4f3] px-3 py-1.5 rounded-full border border-[#e5e5e5]">
            {sesiones.length} sesiones encontradas
          </span>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-[#f3f4f3] p-4 rounded-[5px] border border-[#e5e5e5]">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1">
              Sede
            </label>
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
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
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1">
              Disciplina / Clase
            </label>
            <select
              value={filtroClase}
              onChange={(e) => setFiltroClase(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
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
              className="w-full py-2 px-3 rounded-full text-xs font-medium bg-white hover:bg-[#e5e7eb] text-[#292b2a] transition-all duration-200 active:scale-[0.98] border border-[#e5e5e5]"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Grilla de Sesiones */}
        {loadingSesiones ? (
          <div className="py-12 text-center text-[#7a7b7b] text-sm">
            <span className="animate-pulse">Consultando sesiones disponibles...</span>
          </div>
        ) : sesiones.length === 0 ? (
          <div className="py-12 text-center text-[#7a7b7b] text-sm bg-[#f3f4f3] rounded-[5px] border border-dashed border-[#e5e5e5]">
            <Calendar className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
            <p className="font-medium text-[#0a0a0a]">
              No hay sesiones disponibles para los filtros seleccionados.
            </p>
            <p className="text-xs text-[#7a7b7b] mt-1">
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
                  className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/50 hover:-translate-y-0.5 rounded-[5px] p-5 transition-all duration-200 flex flex-col justify-between gap-5 group"
                >
                  <div className="space-y-3.5">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-[#7a7b7b] block">
                          Sesión #{sesion.id_sesion}
                        </span>
                        <h3 className="text-base sm:text-lg font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors">
                          {sesion.nombre_clase}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {sinCupo && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Agotado
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getBadgeNivel(
                            sesion.nivel_exigencia_clase
                          )}`}
                        >
                          {sesion.nivel_exigencia_clase}
                        </span>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-2 text-xs text-[#292b2a]">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                        <span className="text-[#7a7b7b]">Sede:</span>
                        <strong className="text-[#0a0a0a]">{sesion.nombre_sede}</strong>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#7a7b7b]" />
                        <span className="text-[#7a7b7b]">Instructor:</span>
                        <span className="text-[#0a0a0a]">
                          {sesion.nombre_completo_instructor || (
                            <span className="italic text-[#a2a3a2]">
                              Sin asignar
                            </span>
                          )}
                        </span>
                      </p>
                      <div className="flex items-center justify-between bg-[#f3f4f3] px-3 py-2 rounded-[5px] border border-[#e5e5e5]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                          <span className="font-mono font-medium text-[#0a0a0a]">
                            {sesion.fecha_sesion}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                          <span className="font-mono font-medium text-[#0a0a0a]">
                            {sesion.hora_sesion}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Indicador de Cupos */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#7a7b7b]">Disponibilidad:</span>
                        <span
                          className={`font-medium ${
                            sinCupo
                              ? "text-rose-600"
                              : cuposLibres <= 3
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {sinCupo
                            ? "Agotado (0 cupos)"
                            : `${cuposLibres} de ${sesion.cupo_maximo_sesion} cupos`}
                        </span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="w-full bg-[#e5e5e5] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            sinCupo
                              ? "bg-rose-500"
                              : cuposLibres <= 3
                              ? "bg-amber-500"
                              : "bg-[#ff6105]"
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
                      <div className="w-full py-2.5 px-4 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 text-center flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Inscrito en esta sesión</span>
                      </div>
                    ) : sinCupo ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-full text-xs font-medium bg-[#f3f4f3] text-[#a2a3a2] border border-[#e5e5e5] cursor-not-allowed text-center"
                      >
                        Agotado (Sin cupos disponibles)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInscribir(sesion.id_sesion)}
                        disabled={actionLoadingId === sesion.id_sesion}
                        className="w-full py-2.5 px-6 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {actionLoadingId === sesion.id_sesion ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Reservando cupo...</span>
                          </>
                        ) : (
                          <>
                            <span>Inscribirme</span>
                            <ChevronRight className="w-4 h-4" />
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
      <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
        <div className="border-b border-[#e5e5e5] pb-4">
          <h2 className="text-xl font-medium tracking-tight text-[#0a0a0a]">
            Catálogo de Disciplinas
          </h2>
          <div className="w-12 h-[2px] bg-[#ff6105] mt-1 mb-2" />
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Conoce la oferta de clases registradas en el gimnasio, su duración y nivel de exigencia.
          </p>
        </div>

        {loadingClases ? (
          <div className="py-8 text-center text-[#7a7b7b] text-sm">
            <span className="animate-pulse">Cargando catálogo...</span>
          </div>
        ) : clases.length === 0 ? (
          <div className="py-8 text-center text-[#7a7b7b] text-sm">
            No hay clases registradas en la base de datos.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clases.map((clase) => (
              <div
                key={clase.id_clase}
                className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:-translate-y-0.5 rounded-[5px] p-5 flex flex-col justify-between gap-3 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-[#0a0a0a] text-base">
                      {clase.nombre_clase}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getBadgeNivel(
                        clase.nivel_exigencia_clase
                      )}`}
                    >
                      {clase.nivel_exigencia_clase}
                    </span>
                  </div>
                  <p className="text-xs text-[#7a7b7b] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                    <span>Duración estimada:</span>
                    <strong className="text-[#0a0a0a]">
                      {clase.duracion_minutos_clase} minutos
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setFiltroClase(String(clase.id_clase));
                    window.scrollTo({ top: 400, behavior: "smooth" });
                  }}
                  className="text-xs py-2 px-3 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] font-medium transition-all duration-200 active:scale-[0.98] text-center border border-[#e5e5e5] flex items-center justify-center gap-1.5"
                >
                  <span>Ver sesiones de esta clase</span>
                  <ArrowDown className="w-3.5 h-3.5 text-[#ff6105]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
