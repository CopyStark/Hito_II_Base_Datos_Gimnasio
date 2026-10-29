"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowUpRight,
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

/**
 * Formatea una cadena de hora (ej. "20:30:00" o "09:00:00.000") a "20:30 hrs" sin segundos.
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

/**
 * Determina si una fecha y hora de sesión aún no ha transcurrido respecto al momento actual.
 */
function esSesionFutura(fechaStr?: string | null, horaStr?: string | null): boolean {
  if (!fechaStr) return false;
  const soloFecha = String(fechaStr).slice(0, 10);
  const partesFecha = soloFecha.split("-").map(Number);
  if (partesFecha.length !== 3 || partesFecha.some(isNaN)) return false;
  const [year, month, day] = partesFecha;

  let hours = 23;
  let minutes = 59;
  let seconds = 59;

  if (horaStr) {
    const partesHora = String(horaStr).trim().split(":");
    if (partesHora.length >= 2) {
      const h = parseInt(partesHora[0], 10);
      const m = parseInt(partesHora[1], 10);
      const s = partesHora[2] ? parseInt(partesHora[2], 10) : 0;
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
      if (!isNaN(s)) seconds = s;
    }
  }

  const fechaHoraSesion = new Date(year, month - 1, day, hours, minutes, seconds);
  return fechaHoraSesion.getTime() >= Date.now();
}

export default function ClasesPage() {
  // --- Socio en Sesión (Dinámico) ---
  const [socioActual, setSocioActual] = useState<SocioActual>(SOCIOS_PRUEBA[0]);

  // --- Estados de Datos ---
  const [clases, setClases] = useState<ClaseResponse[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const sedesRef = useRef<SedeSimpleResponse[]>([]);
  const [sesiones, setSesiones] = useState<SesionDisponibleResponse[]>([]);
  const [misInscripciones, setMisInscripciones] = useState<
    InscripcionSocioDetalleResponse[]
  >([]);

  // --- Estados de Carga ---
  const [loadingClases, setLoadingClases] = useState(true);
  const [loadingSesiones, setLoadingSesiones] = useState(true);
  const [loadingInscripciones, setLoadingInscripciones] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // --- Tab secundario en Mis Inscripciones ---
  const [tabInscripciones, setTabInscripciones] = useState<"proximas" | "historial">(
    "proximas"
  );

  // --- Referencia para scroll suave hacia 'Sesiones Disponibles' ---
  const sesionesDisponiblesRef = useRef<HTMLElement | null>(null);

  // Helper fecha de hoy en formato YYYY-MM-DD
  const getFechaHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- Filtros de Sesiones Inicializados por Defecto ---
  const [filtroFecha, setFiltroFecha] = useState<string>(getFechaHoy());
  const [filtroSede, setFiltroSede] = useState<string>("");
  const [filtroClase, setFiltroClase] = useState<string>("");

  // --- Feedback / Notificaciones Flotantes (Toasts) ---
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Mantener ref de sedes sincronizada para resolución inmediata al cambiar de socio
  useEffect(() => {
    sedesRef.current = sedes;
  }, [sedes]);

  // Resolver ID de sede válido a partir de los datos del socio y el catálogo de sedes
  const resolverIdSedeSocio = useCallback(
    (socio: SocioActual, listaSedes: SedeSimpleResponse[]): string => {
      if (listaSedes.length > 0) {
        if (socio.nombre_sede_registro) {
          const porNombreExacto = listaSedes.find(
            (s) =>
              s.nombre_sede.toLowerCase() ===
              socio.nombre_sede_registro!.toLowerCase()
          );
          if (porNombreExacto) return String(porNombreExacto.id_sede);
        }
        if (socio.id_sede_registro_socio) {
          const porId = listaSedes.find(
            (s) => s.id_sede === socio.id_sede_registro_socio
          );
          if (porId) return String(porId.id_sede);
        }
        if (socio.nombre_sede_registro) {
          const porNombreParcial = listaSedes.find(
            (s) =>
              s.nombre_sede
                .toLowerCase()
                .includes(socio.nombre_sede_registro!.toLowerCase()) ||
              socio
                .nombre_sede_registro!.toLowerCase()
                .includes(s.nombre_sede.toLowerCase())
          );
          if (porNombreParcial) return String(porNombreParcial.id_sede);
        }
      }
      return socio.id_sede_registro_socio
        ? String(socio.id_sede_registro_socio)
        : "";
    },
    []
  );

  // Sincronizar socio actual con localStorage y eventos entre componentes (ej. selector del layout)
  useEffect(() => {
    const current = getStoredSocioActual();
    setSocioActual(current);
    const sedeInicial = resolverIdSedeSocio(current, sedesRef.current);
    if (sedeInicial) {
      setFiltroSede(sedeInicial);
    }

    const unsubscribe = subscribeSocioActual((nuevo) => {
      setSocioActual(nuevo);
      const nuevaSede = resolverIdSedeSocio(nuevo, sedesRef.current);
      setFiltroSede(nuevaSede);
    });
    return unsubscribe;
  }, [resolverIdSedeSocio]);

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

  // Cargar Sedes y sincronizar la sede del socio activo
  const cargarSedes = useCallback(async () => {
    try {
      const data = await clasesApi.getSedes();
      setSedes(data);
      sedesRef.current = data;

      const current = getStoredSocioActual();
      const sedeResuelta = resolverIdSedeSocio(current, data);
      if (sedeResuelta) {
        setFiltroSede(sedeResuelta);
      } else if (data.length > 0) {
        setFiltroSede((prev) => prev || String(data[0].id_sede));
      }
    } catch (err: any) {
      console.error("Error al cargar sedes:", err);
    }
  }, [resolverIdSedeSocio]);

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
  const cargarMisInscripciones = useCallback(
    async (idSocioOverride?: number) => {
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
    },
    [socioActual.id_socio]
  );

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

  // Cambiar socio desde el selector de perfil y sincronizar filtro de sede de inmediato
  const handleCambiarSocio = (nuevoId: number) => {
    const encontrado = SOCIOS_PRUEBA.find((s) => s.id_socio === nuevoId);
    if (encontrado) {
      setSocioActual(encontrado);
      setStoredSocioActual(encontrado);
      const nuevaSede = resolverIdSedeSocio(encontrado, sedesRef.current);
      setFiltroSede(nuevaSede);
    }
  };

  // Acción: Ver todas las sesiones disponibles de una disciplina específica
  const handleVerSesionesDeClase = (idClaseSeleccionada: number) => {
    setFiltroClase(String(idClaseSeleccionada));
    setFiltroSede("");
    setFiltroFecha("");
    sesionesDisponiblesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
      setTabInscripciones("proximas");

      // Refrescar ambas listas inmediatamente
      await Promise.all([
        cargarSesiones(),
        cargarMisInscripciones(socioActual.id_socio),
      ]);
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
      await Promise.all([
        cargarSesiones(),
        cargarMisInscripciones(socioActual.id_socio),
      ]);
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

  // Separación de Mis Inscripciones en 'Próximas Clases' vs 'Historial'
  const { inscripcionesProximas, inscripcionesHistorial } = useMemo(() => {
    const proximas: InscripcionSocioDetalleResponse[] = [];
    const historial: InscripcionSocioDetalleResponse[] = [];

    misInscripciones.forEach((insc) => {
      const esActiva = insc.estado_inscripcion?.toLowerCase() === "inscrito";
      const esFutura = esSesionFutura(insc.fecha_sesion, insc.hora_sesion);

      if (esActiva && esFutura) {
        proximas.push(insc);
      } else {
        historial.push(insc);
      }
    });

    return {
      inscripcionesProximas: proximas,
      inscripcionesHistorial: historial,
    };
  }, [misInscripciones]);

  // IDs de sesiones en las que el socio ya está 'Inscrito'
  const idsSesionesInscritas = useMemo(
    () =>
      new Set(
        misInscripciones
          .filter((i) => i.estado_inscripcion === "Inscrito")
          .map((i) => i.id_sesion_inscripcion)
      ),
    [misInscripciones]
  );

  // Nombre de sede legible para el socio actual
  const nombreSedeSocioActual = useMemo(() => {
    if (sedes.length > 0 && socioActual.id_sede_registro_socio) {
      const match = sedes.find(
        (s) => s.id_sede === socioActual.id_sede_registro_socio
      );
      if (match && !socioActual.nombre_sede_registro) {
        return match.nombre_sede;
      }
    }
    return (
      socioActual.nombre_sede_registro ||
      (socioActual.id_sede_registro_socio
        ? `Sede #${socioActual.id_sede_registro_socio}`
        : "Sin sede")
    );
  }, [sedes, socioActual]);

  const listaInscripcionesVisible =
    tabInscripciones === "proximas"
      ? inscripcionesProximas
      : inscripcionesHistorial;

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in-scale">
      {/* =========================================================================
          ENCABEZADO EDITORIAL + BARRA COMPACTA DE SOCIO EN SESIÓN
         ========================================================================= */}
      <div className="space-y-5">
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
              <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
              Portal del Socio · Reserva en Línea
            </span>

            <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
              Catálogo de Clases &amp; Reserva de Cupos
            </h1>

            <div className="w-20 h-[2px] bg-[#ff6105]" />

            <p className="text-[#7a7b7b] text-sm sm:text-base leading-relaxed pt-1">
              Explora las disciplinas dirigidas, consulta las sesiones programadas
              por sede con disponibilidad en tiempo real y asegura tu lugar al
              instante.
            </p>
          </div>
        </div>

        {/* Barra Compacta de Perfil: Socio en Sesión */}
        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Izquierda: Avatar minimalista + Selector en píldora */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ffdfcd]/60 border border-[#ff6105]/25 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#ff6105]" />
              </div>
              <div className="leading-tight">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                  Socio en sesión
                </span>
                <span className="text-xs text-[#292b2a] sm:hidden font-medium">
                  Simulación activa
                </span>
              </div>
            </div>

            <div className="relative">
              <select
                id="selector-socio-hero"
                aria-label="Cambiar socio en sesión"
                value={socioActual.id_socio}
                onChange={(e) => handleCambiarSocio(Number(e.target.value))}
                className="w-full sm:w-auto appearance-none bg-[#f3f4f3]/80 hover:bg-[#f3f4f3] border border-[#e5e5e5] rounded-full pl-4 pr-9 py-1.5 text-xs sm:text-sm text-[#0a0a0a] font-medium focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-all duration-200"
              >
                {SOCIOS_PRUEBA.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    {s.nombre_completo_socio} —{" "}
                    {s.nombre_sede_registro || `Sede ${s.id_sede_registro_socio}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Derecha: Badges limpios de RUT, Correo y Sede */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
              <span className="text-[#7a7b7b]">RUT</span>
              <strong className="font-medium text-[#0a0a0a]">
                {socioActual.rut_socio}
              </strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
              <Mail className="w-3 h-3 text-[#7a7b7b]" />
              <span>{socioActual.correo_socio}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdfcd]/50 text-[#0a0a0a] border border-[#ff6105]/20 font-medium">
              <MapPin className="w-3 h-3 text-[#ff6105]" />
              <span>{nombreSedeSocioActual}</span>
            </span>
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
          SECCIÓN 1: MIS INSCRIPCIONES (PRÓXIMAS CLASES VS HISTORIAL)
         ========================================================================= */}
      <section className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
              Mis Inscripciones
            </h2>
            <div className="w-12 h-[2px] bg-[#ff6105] mt-1.5 mb-2" />
            <p className="text-xs sm:text-sm text-[#7a7b7b]">
              Gestiona tus próximas reservas activas o revisa tu historial de
              clases anteriores y canceladas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Tabs Secundarios: Próximas Clases vs Historial */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setTabInscripciones("proximas")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  tabInscripciones === "proximas"
                    ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                    : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
              >
                <span>Próximas Clases</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                    tabInscripciones === "proximas"
                      ? "bg-[#ffdfcd] text-[#0a0a0a]"
                      : "bg-[#e5e7eb] text-[#7a7b7b]"
                  }`}
                >
                  {inscripcionesProximas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabInscripciones("historial")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  tabInscripciones === "historial"
                    ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5]"
                    : "text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
              >
                <span>Historial</span>
                <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-[#e5e7eb] text-[#7a7b7b]">
                  {inscripcionesHistorial.length}
                </span>
              </button>
            </div>

            <button
              onClick={() => cargarMisInscripciones()}
              disabled={loadingInscripciones}
              className="text-xs px-3.5 py-2 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] font-medium transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5 border border-[#e5e5e5]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingInscripciones ? "animate-spin" : ""
                }`}
              />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {loadingInscripciones ? (
          <div className="py-10 text-center text-[#7a7b7b] text-sm">
            <span className="animate-pulse">Cargando tus inscripciones...</span>
          </div>
        ) : listaInscripcionesVisible.length === 0 ? (
          <div className="py-10 px-4 text-center text-[#7a7b7b] text-sm bg-[#f3f4f3]/60 rounded-[5px] border border-dashed border-[#e5e5e5]">
            <Calendar className="w-7 h-7 text-[#a2a3a2] mx-auto mb-2" />
            {tabInscripciones === "proximas" ? (
              <>
                <p className="font-medium text-[#0a0a0a]">
                  No tienes próximas clases reservadas.
                </p>
                <p className="text-xs text-[#7a7b7b] mt-1">
                  Explora las sesiones disponibles más abajo para reservar tu
                  próximo entrenamiento.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-[#0a0a0a]">
                  Tu historial de clases está vacío.
                </p>
                <p className="text-xs text-[#7a7b7b] mt-1">
                  Aquí aparecerán tus sesiones finalizadas o reservas canceladas.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            key={tabInscripciones}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-scale"
          >
            {listaInscripcionesVisible.map((inscripcion) => {
              const esProximaActiva = tabInscripciones === "proximas";
              const fueCancelada =
                inscripcion.estado_inscripcion?.toLowerCase() !== "inscrito";

              return (
                <div
                  key={inscripcion.id_inscripcion}
                  className={`p-5 rounded-[5px] border bg-white hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-4 ${
                    esProximaActiva
                      ? "border-[#e5e5e5]"
                      : "border-[#e5e5e5] opacity-70"
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#7a7b7b] block">
                          Reserva #{inscripcion.id_inscripcion}
                        </span>
                        <h3 className="text-base font-medium text-[#0a0a0a] mt-0.5">
                          {inscripcion.nombre_clase}
                        </h3>
                      </div>

                      {esProximaActiva ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/25 shrink-0">
                          {inscripcion.estado_inscripcion}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 shrink-0">
                          {fueCancelada
                            ? inscripcion.estado_inscripcion
                            : "Finalizada"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pt-1 border-t border-[#e5e5e5]/70">
                      <p className="flex items-center gap-2 text-xs text-[#7a7b7b]">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                        <span className="text-sm font-medium text-[#0a0a0a]">
                          {inscripcion.nombre_sede}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                          <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                          {inscripcion.fecha_sesion}
                        </span>
                        <span className="text-[#e5e5e5]">·</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a0a0a]">
                          <Clock className="w-3.5 h-3.5 text-[#7a7b7b]" />
                          {formatearHora(inscripcion.hora_sesion)}
                        </span>
                      </div>

                      <p className="text-xs text-[#7a7b7b] flex items-center gap-1.5">
                        <span>Duración:</span>
                        <span className="text-sm font-medium text-[#0a0a0a]">
                          {inscripcion.duracion_minutos_clase} min
                        </span>
                      </p>

                      {inscripcion.observaciones_inscripcion && (
                        <p className="text-xs text-[#7a7b7b] italic bg-[#f3f4f3]/70 p-2.5 rounded-[5px] border border-[#e5e5e5]">
                          &quot;{inscripcion.observaciones_inscripcion}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {esProximaActiva && (
                    <button
                      onClick={() => handleCancelar(inscripcion.id_inscripcion)}
                      disabled={actionLoadingId === inscripcion.id_inscripcion}
                      className="w-full text-xs py-2 px-4 rounded-[24px] font-medium bg-[#f3f4f3] hover:bg-rose-50 text-[#292b2a] hover:text-rose-600 border border-[#e5e5e5] hover:border-rose-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      {actionLoadingId === inscripcion.id_inscripcion
                        ? "Cancelando..."
                        : "Cancelar reserva"}
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
      <section
        ref={sesionesDisponiblesRef}
        id="sesiones-disponibles"
        className="scroll-mt-32 bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
              Sesiones Disponibles
            </h2>
            <div className="w-12 h-[2px] bg-[#ff6105] mt-1.5 mb-2" />
            <p className="text-xs sm:text-sm text-[#7a7b7b]">
              Filtra por fecha, sede o disciplina para reservar tu cupo en tiempo
              real.
            </p>
          </div>

          <span className="text-xs font-medium text-[#292b2a] self-start sm:self-auto bg-[#f3f4f3] px-3.5 py-1.5 rounded-full border border-[#e5e5e5]">
            {sesiones.length}{" "}
            {sesiones.length === 1 ? "sesión encontrada" : "sesiones encontradas"}
          </span>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 bg-[#f3f4f3]/70 p-4 rounded-[5px] border border-[#e5e5e5]">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-3.5 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Sede
            </label>
            <div className="relative">
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-3.5 pr-9 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors cursor-pointer"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede} ({s.nombre_ciudad})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Disciplina / Clase
            </label>
            <div className="relative">
              <select
                value={filtroClase}
                onChange={(e) => setFiltroClase(e.target.value)}
                className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-3.5 pr-9 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors cursor-pointer"
              >
                <option value="">Todas las disciplinas</option>
                {clases.map((c) => (
                  <option key={c.id_clase} value={c.id_clase}>
                    {c.nombre_clase}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroFecha("");
                setFiltroSede("");
                setFiltroClase("");
              }}
              className="w-full py-2 px-4 rounded-[24px] text-xs sm:text-sm font-medium bg-white hover:bg-[#e5e7eb] text-[#292b2a] transition-all duration-200 active:scale-[0.98] border border-[#e5e5e5]"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Grilla de Sesiones */}
        {loadingSesiones ? (
          <div className="py-12 text-center text-[#7a7b7b] text-sm">
            <span className="animate-pulse">
              Consultando sesiones disponibles...
            </span>
          </div>
        ) : sesiones.length === 0 ? (
          <div className="py-12 text-center text-[#7a7b7b] text-sm bg-[#f3f4f3]/60 rounded-[5px] border border-dashed border-[#e5e5e5]">
            <Calendar className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
            <p className="font-medium text-[#0a0a0a]">
              No hay sesiones disponibles para los filtros seleccionados.
            </p>
            <p className="text-xs text-[#7a7b7b] mt-1">
              Prueba limpiando la fecha o seleccionando todas las sedes.
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
                  className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm hover:-translate-y-0.5 rounded-[5px] p-5 transition-all duration-200 flex flex-col justify-between gap-5 group"
                >
                  <div className="space-y-4">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#7a7b7b] block">
                          Sesión #{sesion.id_sesion}
                        </span>
                        <h3 className="text-lg font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors mt-0.5">
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

                    {/* Detalles de Sede, Instructor, Fecha, Hora y Duración */}
                    <div className="space-y-2.5 text-xs text-[#292b2a]">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                        <span className="text-[#7a7b7b]">Sede:</span>
                        <span className="text-sm font-medium text-[#0a0a0a]">
                          {sesion.nombre_sede}
                        </span>
                      </p>

                      <p className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#7a7b7b] shrink-0" />
                        <span className="text-[#7a7b7b]">Instructor:</span>
                        <span className="text-sm font-medium text-[#0a0a0a]">
                          {sesion.nombre_completo_instructor || (
                            <span className="font-normal italic text-[#a2a3a2]">
                              Sin asignar
                            </span>
                          )}
                        </span>
                      </p>

                      <div className="bg-[#f3f4f3]/80 px-3.5 py-2.5 rounded-[5px] border border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            {sesion.fecha_sesion}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            {formatearHora(sesion.hora_sesion)}
                          </span>
                        </div>

                        {sesion.duracion_minutos_clase ? (
                          <span className="text-sm font-medium text-[#0a0a0a]">
                            · {sesion.duracion_minutos_clase} min
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Indicador de Cupos */}
                    <div className="pt-0.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#7a7b7b]">Disponibilidad</span>
                        <span
                          className={`font-medium ${
                            sinCupo
                              ? "text-rose-600"
                              : cuposLibres <= 3
                              ? "text-amber-600"
                              : "text-[#0a0a0a]"
                          }`}
                        >
                          {sinCupo
                            ? "Agotado (0 cupos)"
                            : `${cuposLibres} de ${sesion.cupo_maximo_sesion} cupos`}
                        </span>
                      </div>
                      <div className="w-full bg-[#e5e5e5] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
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
                      <div className="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium bg-[#ffdfcd]/60 text-[#0a0a0a] border border-[#ff6105]/30 text-center flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-[#ff6105]" />
                        <span>Ya estás inscrito</span>
                      </div>
                    ) : sinCupo ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium bg-[#f3f4f3] text-[#a2a3a2] border border-[#e5e5e5] cursor-not-allowed text-center"
                      >
                        Sin cupos disponibles
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInscribir(sesion.id_sesion)}
                        disabled={actionLoadingId === sesion.id_sesion}
                        className="w-full py-2.5 px-6 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        <div className="border-b border-[#e5e5e5] pb-5">
          <h2 className="text-xl sm:text-2xl font-light tracking-[-0.02em] text-[#0a0a0a]">
            Catálogo de Disciplinas
          </h2>
          <div className="w-12 h-[2px] bg-[#ff6105] mt-1.5 mb-2" />
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Conoce la oferta de clases dirigidas del gimnasio, su duración y
            nivel de exigencia física.
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
                className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm hover:-translate-y-0.5 rounded-[5px] p-5 flex flex-col justify-between gap-4 transition-all duration-200 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[#0a0a0a] text-base group-hover:text-[#ff6105] transition-colors">
                      {clase.nombre_clase}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border shrink-0 ${getBadgeNivel(
                        clase.nivel_exigencia_clase
                      )}`}
                    >
                      {clase.nivel_exigencia_clase}
                    </span>
                  </div>

                  <p className="text-xs text-[#7a7b7b] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                    <span>Duración:</span>
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      {clase.duracion_minutos_clase} min
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleVerSesionesDeClase(clase.id_clase)}
                  className="group/btn text-xs sm:text-[13px] py-2 px-4 rounded-[24px] bg-[#f3f4f3] hover:bg-[#ffdfcd]/60 text-[#292b2a] hover:text-[#0a0a0a] font-medium transition-all duration-200 active:scale-[0.98] text-center border border-[#e5e5e5] hover:border-[#ff6105]/30 flex items-center justify-center gap-1.5"
                >
                  <span>Ver sesiones de esta clase</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#ff6105] transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
