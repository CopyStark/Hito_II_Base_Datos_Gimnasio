"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  apiClient,
  clasesApi,
  ClaseResponse,
  SedeSimpleResponse,
  SesionDisponibleResponse,
  InscripcionSocioDetalleResponse,
} from "@/services/apiClient";
import {
  getStoredSocioActual,
  SOCIOS_PRUEBA,
} from "@/components/clases/socioActual";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Filter,
  BookmarkCheck,
  Layers,
} from "lucide-react";

interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

function PortalSocioContent() {
  const { user } = useAuth();
  const socioId = user?.id_socio || 1;
  const searchParams = useSearchParams();
  const querySede = searchParams.get("sede");
  const queryClase = searchParams.get("clase");

  // Pestaña principal activa: por defecto "mis-inscripciones", a menos que venga filtro por URL
  const [tabPrincipal, setTabPrincipal] = useState<
    "mis-inscripciones" | "sesiones-disponibles" | "catalogo-disciplinas"
  >(querySede || queryClase ? "sesiones-disponibles" : "mis-inscripciones");

  // Estados de datos
  const [clases, setClases] = useState<ClaseResponse[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [sesiones, setSesiones] = useState<SesionDisponibleResponse[]>([]);
  const [misInscripciones, setMisInscripciones] = useState<
    InscripcionSocioDetalleResponse[]
  >([]);

  // Filtros de sesiones
  const getFechaHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Determinar la sede inicial asociada al socio autenticado
  const getSedeInicialSocio = (): string => {
    if (querySede) return querySede;
    if ((user as any)?.id_sede) return String((user as any).id_sede);
    if ((user as any)?.id_sede_socio) return String((user as any).id_sede_socio);
    const socioLocal = getStoredSocioActual();
    if (
      socioLocal &&
      socioLocal.id_socio === socioId &&
      socioLocal.id_sede_registro_socio
    ) {
      return String(socioLocal.id_sede_registro_socio);
    }
    const matchPrueba = SOCIOS_PRUEBA.find((s) => s.id_socio === socioId);
    if (matchPrueba?.id_sede_registro_socio) {
      return String(matchPrueba.id_sede_registro_socio);
    }
    return "";
  };

  const sedeInicial = getSedeInicialSocio();
  const [filtroFecha, setFiltroFecha] = useState<string>(getFechaHoy());
  const [filtroSede, setFiltroSede] = useState<string>(sedeInicial);
  const [filtroClase, setFiltroClase] = useState<string>(queryClase || "");
  const [sedeInicialResuelta, setSedeInicialResuelta] = useState<boolean>(
    Boolean(sedeInicial)
  );

  // Resolver sede desde el backend si no estaba en caché local y no vino en la URL
  useEffect(() => {
    if (querySede || sedeInicialResuelta || !socioId) return;
    let cancelado = false;
    apiClient.socios
      .getById(socioId)
      .then((ficha) => {
        if (cancelado) return;
        const idSede =
          ficha.id_sede_registro_socio ??
          (ficha as any).id_sede_registro ??
          (ficha as any).id_sede;
        if (idSede) {
          setFiltroSede(String(idSede));
          setSedeInicialResuelta(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [socioId, querySede, sedeInicialResuelta]);

  // Si cambian los searchParams en la URL, reflejarlos
  useEffect(() => {
    if (querySede) {
      setFiltroSede(querySede);
      setSedeInicialResuelta(true);
      setTabPrincipal("sesiones-disponibles");
    }
    if (queryClase) {
      setFiltroClase(queryClase);
      setTabPrincipal("sesiones-disponibles");
    }
  }, [querySede, queryClase]);

  // Cargas y Feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [tabInscripciones, setTabInscripciones] = useState<
    "proximas" | "historial"
  >("proximas");

  // Auto-descartar Toasts
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Carga inicial de catálogo
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [listaClases, listaSedes] = await Promise.all([
          clasesApi.getClases().catch(() => []),
          clasesApi.getSedes().catch(() => []),
        ]);
        setClases(listaClases);
        setSedes(listaSedes);
      } finally {
        setLoading(false);
      }
    };
    cargarCatalogos();
  }, []);

  // Cargar inscripciones del socio
  const cargarMisInscripciones = useCallback(async () => {
    if (!socioId) return;
    try {
      const data = await clasesApi.getInscripcionesSocio(socioId);
      setMisInscripciones(Array.isArray(data) ? data : []);
    } catch {
      setMisInscripciones([]);
    }
  }, [socioId]);

  useEffect(() => {
    cargarMisInscripciones();
  }, [cargarMisInscripciones]);

  // Cargar sesiones disponibles con filtros
  const cargarSesiones = useCallback(async () => {
    try {
      const idSedeNum = filtroSede ? Number(filtroSede) : undefined;
      const idClaseNum = filtroClase ? Number(filtroClase) : undefined;
      const data = await clasesApi.getSesiones({
        fecha: filtroFecha || undefined,
        id_sede: idSedeNum,
        id_clase: idClaseNum,
      });
      setSesiones(Array.isArray(data) ? data : []);
    } catch {
      setSesiones([]);
    }
  }, [filtroFecha, filtroSede, filtroClase]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  // Manejo de Inscripción
  const handleInscribir = async (idSesion: number) => {
    setActionLoadingId(idSesion);
    try {
      await clasesApi.inscribirSocio({
        id_socio_inscripcion: socioId,
        id_sesion_inscripcion: idSesion,
      });
      setFeedback({
        type: "success",
        message: "¡Inscripción confirmada exitosamente! Tu cupo ha sido reservado.",
      });
      await Promise.all([cargarSesiones(), cargarMisInscripciones()]);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "No se pudo completar la reserva. Verifique que cumpla las condiciones del gimnasio.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Manejo de Cancelación
  const handleCancelar = async (idInscripcion: number) => {
    if (!confirm("¿Seguro que deseas cancelar esta inscripción?")) return;
    setActionLoadingId(idInscripcion);
    try {
      await clasesApi.cancelarInscripcion(idInscripcion, { id_socio: socioId });
      setFeedback({
        type: "info",
        message: "Inscripción cancelada correctamente.",
      });
      await Promise.all([cargarSesiones(), cargarMisInscripciones()]);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Error al cancelar la inscripción.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Set de IDs de sesiones donde ya está inscrito
  const sesionesInscritasIds = useMemo(() => {
    return new Set(
      misInscripciones
        .filter((i) => i.estado_inscripcion === "Inscrito")
        .map((i) => i.id_sesion_inscripcion)
    );
  }, [misInscripciones]);

  // Clasificación de inscripciones
  const hoyStr = getFechaHoy();
  const inscripcionesProximas = useMemo(
    () =>
      misInscripciones.filter(
        (i) => i.fecha_sesion >= hoyStr && i.estado_inscripcion === "Inscrito"
      ),
    [misInscripciones, hoyStr]
  );

  const inscripcionesHistorial = useMemo(
    () =>
      misInscripciones.filter(
        (i) => i.fecha_sesion < hoyStr || i.estado_inscripcion !== "Inscrito"
      ),
    [misInscripciones, hoyStr]
  );

  // Filtrar sesiones desde el catálogo de disciplinas
  const handleFiltrarPorDisciplina = (idClase: number) => {
    setFiltroClase(String(idClase));
    setTabPrincipal("sesiones-disponibles");
  };

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Toast Flotante */}
      {feedback && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in-scale shadow-xl">
          <div
            className={`p-4 rounded-[5px] border flex items-start gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : feedback.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-800"
                : "bg-blue-50 border-blue-300 text-blue-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm font-medium">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#7a7b7b] hover:text-[#0a0a0a] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner de Bienvenida */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
              Portal del Socio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#0a0a0a] tracking-[-0.03em]">
            Catálogo &amp; Reserva de Clases
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Explora las disciplinas y sesiones programadas en todas las sedes y asegura tu cupo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-4 py-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#ffdfcd]/60 border border-[#ff6105]/20 flex items-center justify-center text-[#ff6105]">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="block font-medium text-[#0a0a0a]">
              {user?.nombre_completo || user?.username}
            </span>
            <span className="text-[#7a7b7b]">
              Socio #{socioId} · Sesión Activa
            </span>
          </div>
        </div>
      </div>

      {/* Navegación por 3 Bloques Claros */}
      <div className="flex border-b border-[#e5e5e5] gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTabPrincipal("mis-inscripciones")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
            tabPrincipal === "mis-inscripciones"
              ? "border-[#ff6105] text-[#0a0a0a]"
              : "border-transparent text-[#7a7b7b] hover:text-[#0a0a0a]"
          }`}
        >
          <BookmarkCheck className={`w-4 h-4 ${tabPrincipal === "mis-inscripciones" ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
          <span>Mis Inscripciones</span>
          {inscripcionesProximas.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ffdfcd] text-[#ff6105]">
              {inscripcionesProximas.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabPrincipal("sesiones-disponibles")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
            tabPrincipal === "sesiones-disponibles"
              ? "border-[#ff6105] text-[#0a0a0a]"
              : "border-transparent text-[#7a7b7b] hover:text-[#0a0a0a]"
          }`}
        >
          <Calendar className={`w-4 h-4 ${tabPrincipal === "sesiones-disponibles" ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
          <span>Sesiones Disponibles</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f3f4f3] text-[#7a7b7b]">
            {sesiones.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabPrincipal("catalogo-disciplinas")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
            tabPrincipal === "catalogo-disciplinas"
              ? "border-[#ff6105] text-[#0a0a0a]"
              : "border-transparent text-[#7a7b7b] hover:text-[#0a0a0a]"
          }`}
        >
          <Layers className={`w-4 h-4 ${tabPrincipal === "catalogo-disciplinas" ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
          <span>Catálogo de Disciplinas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f3f4f3] text-[#7a7b7b]">
            {clases.length}
          </span>
        </button>
      </div>

      {/* BLOQUE 1: MIS INSCRIPCIONES */}
      {tabPrincipal === "mis-inscripciones" && (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-light text-[#0a0a0a] tracking-[-0.02em]">
                Mis Reservas &amp; Asistencias
              </h2>
              <p className="text-xs text-[#7a7b7b]">
                Revisa tus clases reservadas activas o consulta tu historial de participación.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTabInscripciones("proximas")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  tabInscripciones === "proximas"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#f3f4f3] text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
              >
                Próximas Reservas ({inscripcionesProximas.length})
              </button>
              <button
                type="button"
                onClick={() => setTabInscripciones("historial")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  tabInscripciones === "historial"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#f3f4f3] text-[#7a7b7b] hover:text-[#0a0a0a]"
                }`}
              >
                Historial Pasado ({inscripcionesHistorial.length})
              </button>
            </div>
          </div>

          {tabInscripciones === "proximas" && (
            <div className="space-y-3">
              {inscripcionesProximas.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#f3f4f3] flex items-center justify-center mx-auto text-[#7a7b7b]">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a]">
                    No tienes reservas próximas activas
                  </p>
                  <p className="text-xs text-[#7a7b7b] max-w-sm mx-auto">
                    Explora las sesiones disponibles para asegurar tu cupo en tu sede preferida.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTabPrincipal("sesiones-disponibles")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs font-medium transition-colors cursor-pointer mt-2"
                  >
                    <span>Ver Sesiones Disponibles</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                inscripcionesProximas.map((ins) => (
                  <div
                    key={ins.id_inscripcion}
                    className="p-5 rounded-[5px] bg-[#f8f9f8] border border-[#e5e5e5] hover:border-[#0a0a0a] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[#0a0a0a] font-medium">
                          {ins.nombre_clase}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                          Cupo Confirmado
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[#7a7b7b]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                          {ins.fecha_sesion}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                          {ins.hora_sesion} ({ins.duracion_minutos_clase} min)
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                          {ins.nombre_sede}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelar(ins.id_inscripcion)}
                      disabled={actionLoadingId === ins.id_inscripcion}
                      className="px-4 py-2 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-60"
                    >
                      {actionLoadingId === ins.id_inscripcion ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Cancelar Reserva"
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tabInscripciones === "historial" && (
            <div className="space-y-3">
              {inscripcionesHistorial.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm text-[#0a0a0a]">No hay registros históricos</p>
                  <p className="text-xs text-[#7a7b7b]">
                    Aquí se mostrarán las sesiones pasadas y el estado de tu asistencia.
                  </p>
                </div>
              ) : (
                inscripcionesHistorial.map((ins) => (
                  <div
                    key={ins.id_inscripcion}
                    className="p-4 rounded-[5px] bg-[#f8f9f8] border border-[#e5e5e5] flex items-center justify-between gap-3 text-xs opacity-85"
                  >
                    <div className="space-y-1">
                      <strong className="text-sm text-[#0a0a0a]">
                        {ins.nombre_clase}
                      </strong>
                      <div className="text-[#7a7b7b]">
                        {ins.fecha_sesion} · {ins.hora_sesion} · {ins.nombre_sede}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border ${
                        ins.estado_inscripcion === "Cancelado"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : ins.asistio_inscripcion
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {ins.estado_inscripcion === "Cancelado"
                        ? "Cancelada"
                        : ins.asistio_inscripcion
                        ? "Asistió"
                        : "No asistió"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* BLOQUE 2: SESIONES DISPONIBLES (PARA RESERVAR) */}
      {tabPrincipal === "sesiones-disponibles" && (
        <div className="space-y-6 animate-fade-in-scale">
          {/* Barra de Filtros */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#7a7b7b] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#ff6105]" />
                Filtros de Búsqueda
              </span>
              <span className="text-xs text-[#7a7b7b]">
                {sesiones.length} sesiones encontradas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#7a7b7b] font-medium">Fecha:</label>
                  {filtroFecha && (
                    <button
                      type="button"
                      onClick={() => setFiltroFecha("")}
                      className="text-[11px] text-[#ff6105] hover:underline cursor-pointer"
                    >
                      Borrar fecha (todas)
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full p-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
                />
              </div>

              <div>
                <label className="block text-[#7a7b7b] mb-1 font-medium">Sede:</label>
                <select
                  value={filtroSede}
                  onChange={(e) => {
                    setFiltroSede(e.target.value);
                    setSedeInicialResuelta(true);
                  }}
                  className="w-full p-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
                >
                  <option value="">Todas las Sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#7a7b7b] mb-1 font-medium">Disciplina:</label>
                <select
                  value={filtroClase}
                  onChange={(e) => setFiltroClase(e.target.value)}
                  className="w-full p-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
                >
                  <option value="">Todas las Disciplinas</option>
                  {clases.map((c) => (
                    <option key={c.id_clase} value={c.id_clase}>
                      {c.nombre_clase} ({c.nivel_exigencia_clase})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Listado de Sesiones */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl font-light text-[#0a0a0a] tracking-[-0.02em]">
                {filtroFecha
                  ? `Sesiones Programadas para ${filtroFecha}`
                  : "Todas las sesiones disponibles"}
              </h2>
              <div className="flex items-center gap-3">
                {filtroFecha ? (
                  <button
                    type="button"
                    onClick={() => setFiltroFecha("")}
                    className="text-xs text-[#ff6105] hover:underline cursor-pointer"
                  >
                    Ver todas las fechas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFiltroFecha(getFechaHoy())}
                    className="text-xs text-[#ff6105] hover:underline cursor-pointer"
                  >
                    Ver solo hoy
                  </button>
                )}
                {filtroClase && (
                  <button
                    type="button"
                    onClick={() => setFiltroClase("")}
                    className="text-xs text-[#ff6105] hover:underline cursor-pointer"
                  >
                    Quitar filtro disciplina
                  </button>
                )}
                {filtroSede && (
                  <button
                    type="button"
                    onClick={() => setFiltroSede("")}
                    className="text-xs text-[#ff6105] hover:underline cursor-pointer"
                  >
                    Quitar filtro sede
                  </button>
                )}
              </div>
            </div>

            {sesiones.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 text-center space-y-2">
                <p className="text-sm font-medium text-[#0a0a0a]">
                  No se encontraron sesiones para esta fecha o filtros seleccionados
                </p>
                <p className="text-xs text-[#7a7b7b]">
                  Intenta cambiar la fecha o seleccionar otra sede en los filtros superiores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sesiones.map((s) => {
                  const cuposDisponibles =
                    s.cupos_disponibles ??
                    s.cupo_maximo_sesion - s.total_inscritos;
                  const yaInscrito = sesionesInscritasIds.has(s.id_sesion);
                  const agotado = cuposDisponibles <= 0;
                  const isActionLoading = actionLoadingId === s.id_sesion;

                  return (
                    <div
                      key={s.id_sesion}
                      className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 transition-all duration-200 rounded-[5px] p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                            {s.nombre_sede}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              yaInscrito
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : agotado
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-[#ffdfcd]/50 text-[#ff6105] border-[#ff6105]/20"
                            }`}
                          >
                            {yaInscrito
                              ? "Inscrito"
                              : agotado
                              ? "Agotado"
                              : `${cuposDisponibles} cupos`}
                          </span>
                        </div>

                        <h3 className="text-base font-medium text-[#0a0a0a]">
                          {s.nombre_clase}
                        </h3>

                        <div className="space-y-1 text-xs text-[#7a7b7b]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                            <span>{s.fecha_sesion}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                            <span>
                              {s.hora_sesion} ({s.duracion_minutos_clase} min)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#ff6105]" />
                            <span>
                              Instructor: {s.nombre_completo_instructor || "Por asignar"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {yaInscrito ? (
                          <span className="w-full py-2.5 px-3 rounded-[5px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ya estás inscrito en esta sesión
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={agotado || isActionLoading}
                            onClick={() => handleInscribir(s.id_sesion)}
                            className={`w-full py-2.5 px-3 rounded-[40px] text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                              agotado
                                ? "bg-[#f3f4f3] text-[#a2a3a2] cursor-not-allowed border border-[#e5e5e5]"
                                : "bg-[#0a0a0a] hover:bg-[#ff6105] text-white"
                            }`}
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Inscribirme Ahora</span>
                                <ArrowRight className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* BLOQUE 3: CATÁLOGO DE DISCIPLINAS */}
      {tabPrincipal === "catalogo-disciplinas" && (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="space-y-1 border-b border-[#e5e5e5] pb-4">
            <h2 className="text-xl font-light text-[#0a0a0a] tracking-[-0.02em]">
              Disciplinas &amp; Modalidades de Entrenamiento
            </h2>
            <p className="text-xs text-[#7a7b7b]">
              Conoce cada formato, nivel de exigencia y duración para planificar tu rutina en el gimnasio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clases.map((c) => {
              const nivel = c.nivel_exigencia_clase || "General";
              const duracion = c.duracion_minutos_clase || 45;

              return (
                <div
                  key={c.id_clase}
                  className="p-5 rounded-[5px] border border-[#e5e5e5] hover:border-[#ff6105] transition-all bg-[#f8f9f8] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          nivel.toLowerCase().includes("avanzado")
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : nivel.toLowerCase().includes("intermedio")
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        Nivel {nivel}
                      </span>
                      <span className="text-xs text-[#7a7b7b] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                        {duracion} min
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-[#0a0a0a]">
                      {c.nombre_clase}
                    </h3>

                    <p className="text-xs text-[#7a7b7b] leading-relaxed">
                      Entrenamiento dirigido por instructores certificados con enfoque en progresión técnica, acondicionamiento y bienestar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFiltrarPorDisciplina(c.id_clase)}
                    className="w-full py-2 px-3 rounded-[40px] border border-[#e5e5e5] bg-white hover:bg-[#ff6105] hover:text-white hover:border-[#ff6105] text-[#0a0a0a] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Ver Sesiones Disponibles</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalSocioClasesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
        </div>
      }
    >
      <PortalSocioContent />
    </Suspense>
  );
}
