"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wrench,
  Plus,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  clasesApi,
  EquipamientoItemResponse,
  SedeSimpleResponse,
} from "@/services/apiClient";
import {
  PERSONAL_RESPONSABLE_MOCK,
  PersonalResponsable,
} from "@/components/clases/empleadoActual";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<EquipamientoItemResponse[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Empleado / Personal Responsable
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<PersonalResponsable>(PERSONAL_RESPONSABLE_MOCK[0]);

  // Filtro por Sede (sincronizado con la sede del empleado)
  const [filtroSede, setFiltroSede] = useState<string>(
    String(PERSONAL_RESPONSABLE_MOCK[0].id_sede_personal)
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form para agregar nuevo equipo
  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaSede, setNuevaSede] = useState<number>(
    PERSONAL_RESPONSABLE_MOCK[0].id_sede_personal
  );
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorModalRegistro, setErrorModalRegistro] = useState<string | null>(null);

  // Form para editar equipo existente
  const [equipoAEditar, setEquipoAEditar] = useState<EquipamientoItemResponse | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorModalEdit, setErrorModalEdit] = useState<string | null>(null);

  // Helper para normalizar errores de API / SQL Server
  const extraerMensajeError = (err: any, fallback: string): string => {
    const raw =
      err?.response?.data?.detail ||
      err?.data?.detail ||
      err?.message ||
      fallback;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) {
      return raw
        .map((d: any) => (typeof d === "string" ? d : d.msg || JSON.stringify(d)))
        .join(" | ");
    }
    if (typeof raw === "object") {
      return raw.msg || raw.message || JSON.stringify(raw);
    }
    return String(raw);
  };

  // Cargar lista de sedes
  const cargarSedes = useCallback(async () => {
    try {
      const data = await clasesApi.getSedes();
      setSedes(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Cargar inventario de equipos (recibe la sede a consultar)
  const cargarEquipos = useCallback(async (sedeAUsar: string) => {
    setLoading(true);
    try {
      const params = sedeAUsar ? { id_sede: Number(sedeAUsar) } : undefined;
      const data = await clasesApi.getEquipos(params);
      setEquipos(data);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al cargar equipos.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSedes();
  }, [cargarSedes]);

  // Carga reactiva de equipos cada vez que cambia el filtro de sede sincronizado
  useEffect(() => {
    cargarEquipos(filtroSede);
  }, [filtroSede, cargarEquipos]);

  // Cambiar empleado responsable y sincronizar sede estricta
  const handleCambiarEmpleado = (idPersonal: number) => {
    const encontrado = PERSONAL_RESPONSABLE_MOCK.find(
      (e) => e.id_personal === idPersonal
    );
    if (encontrado) {
      setEmpleadoSeleccionado(encontrado);
      const nuevaSedeStr = String(encontrado.id_sede_personal);
      setNuevaSede(encontrado.id_sede_personal);
      if (filtroSede !== nuevaSedeStr) {
        setFiltroSede(nuevaSedeStr);
      } else {
        cargarEquipos(nuevaSedeStr);
      }
    }
  };

  // Abrir modal de nuevo equipo precargando la sede del empleado
  const handleAbrirModalRegistro = () => {
    setNuevaSede(empleadoSeleccionado.id_sede_personal);
    setNuevoNombre("");
    setNuevaFecha("");
    setErrorModalRegistro(null);
    setShowAddModal(true);
  };

  const handleCrearEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModalRegistro(null);

    if (!nuevoNombre.trim()) {
      setErrorModalRegistro("Por favor, ingrese el nombre descriptivo del equipamiento.");
      return;
    }
    if (!nuevaFecha) {
      setErrorModalRegistro("Por favor, seleccione una fecha de adquisición válida.");
      return;
    }

    const fechaDate = new Date(nuevaFecha + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fechaDate > hoy) {
      setErrorModalRegistro("La fecha de adquisición del equipamiento no puede ser futura.");
      return;
    }

    setGuardando(true);
    try {
      const res = await clasesApi.registrarEquipo({
        id_sede_equipamiento: Number(nuevaSede),
        nombre_descriptivo_equipamiento: nuevoNombre.trim(),
        fecha_adquisicion_equipamiento: nuevaFecha,
      });
      setFeedback({
        type: "success",
        message: `Equipamiento #${res.id_equipamiento} registrado correctamente en sede.`,
      });
      setNuevoNombre("");
      setNuevaFecha("");
      setShowAddModal(false);
      cargarEquipos(filtroSede);
    } catch (err: any) {
      const msg = extraerMensajeError(err, "Error al registrar el equipamiento.");
      setErrorModalRegistro(msg);
    } finally {
      setGuardando(false);
    }
  };

  // Abrir modal de edición pre-cargado
  const handleAbrirModalEdicion = (eq: EquipamientoItemResponse) => {
    setEquipoAEditar(eq);
    setEditNombre(eq.nombre_descriptivo_equipamiento);
    const fStr = String(eq.fecha_adquisicion_equipamiento).slice(0, 10);
    setEditFecha(fStr);
    setErrorModalEdit(null);
  };

  // Guardar cambios de edición mediante PUT /clases/equipos/{id}
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoAEditar) return;
    setErrorModalEdit(null);

    if (!editNombre.trim()) {
      setErrorModalEdit("El nombre descriptivo del equipamiento no puede estar vacío.");
      return;
    }
    if (!editFecha) {
      setErrorModalEdit("Debe seleccionar una fecha de adquisición válida.");
      return;
    }

    const fechaDate = new Date(editFecha + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fechaDate > hoy) {
      setErrorModalEdit("La fecha de adquisición del equipamiento no puede ser futura.");
      return;
    }

    setGuardandoEdit(true);
    try {
      await clasesApi.actualizarEquipo(equipoAEditar.id_equipamiento, {
        nombre_descriptivo_equipamiento: editNombre.trim(),
        fecha_adquisicion_equipamiento: editFecha,
      });

      setFeedback({
        type: "success",
        message: `Equipamiento #${equipoAEditar.id_equipamiento} actualizado exitosamente.`,
      });
      setEquipoAEditar(null);
      cargarEquipos(filtroSede);
    } catch (err: any) {
      const msg = extraerMensajeError(err, "Error al actualizar el equipamiento.");
      setErrorModalEdit(msg);
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm(`¿Estás seguro de eliminar el equipamiento #${id}?`)) return;
    try {
      await clasesApi.eliminarEquipo(id);
      setFeedback({
        type: "success",
        message: `Equipamiento #${id} eliminado.`,
      });
      cargarEquipos(filtroSede);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al eliminar.";
      setFeedback({ type: "error", message: String(msg) });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Header Editorial + Barra Compacta de Personal Responsable */}
      <div className="space-y-5">
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
              <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
              Inventario por Sede · Maquinaria
            </span>

            <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
              Equipamiento &amp; Máquinas
            </h1>

            <div className="w-20 h-[2px] bg-[#ff6105]" />

            <p className="text-sm sm:text-base text-[#7a7b7b] leading-relaxed pt-1">
              Control de inventario activo, cálculo de antigüedad operativa y
              registro de equipamiento por sede.
            </p>
          </div>

          <button
            onClick={handleAbrirModalRegistro}
            className="self-start sm:self-auto text-xs sm:text-sm px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Equipo</span>
          </button>
        </div>

        {/* Barra Compacta de Perfil: Personal Responsable */}
        <div className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#ffdfcd]/60 border border-[#ff6105]/25 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#ff6105]" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Responsable
              </span>
            </div>

            <div className="relative">
              <select
                id="selector-empleado"
                value={empleadoSeleccionado.id_personal}
                onChange={(e) => handleCambiarEmpleado(Number(e.target.value))}
                className="w-full sm:w-auto appearance-none bg-[#f3f4f3]/80 hover:bg-[#f3f4f3] border border-[#e5e5e5] rounded-full pl-4 pr-9 py-1.5 text-xs sm:text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] font-medium cursor-pointer transition-all duration-200"
              >
                {PERSONAL_RESPONSABLE_MOCK.map((emp) => (
                  <option key={emp.id_personal} value={emp.id_personal}>
                    {emp.nombre_completo_personal} — {emp.nombre_sede_personal}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdfcd]/50 text-[#0a0a0a] border border-[#ff6105]/20 font-medium">
              <MapPin className="w-3 h-3 text-[#ff6105]" />
              <span>{empleadoSeleccionado.nombre_sede_personal}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
              <Briefcase className="w-3 h-3 text-[#7a7b7b]" />
              <span className="font-medium text-[#0a0a0a]">
                {empleadoSeleccionado.cargo_personal}
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
              <Mail className="w-3 h-3 text-[#7a7b7b]" />
              <span>{empleadoSeleccionado.correo_personal}</span>
            </span>

            {empleadoSeleccionado.telefono_personal && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]/80">
                <Phone className="w-3 h-3 text-[#7a7b7b]" />
                <span>{empleadoSeleccionado.telefono_personal}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-[5px] border flex items-center justify-between text-xs sm:text-sm animate-fade-in-scale shadow-lg ${
            feedback.type === "success"
              ? "bg-[#ffdfcd] border-[#ffa069]/60 text-[#0a0a0a]"
              : "bg-[#202120] border-[#ef4444] text-[#ffffff] ring-1 ring-[#ef4444]/40 shadow-red-950/30"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#ff6105] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
            )}
            <div>
              <strong
                className={`block font-semibold ${
                  feedback.type === "error" ? "text-[#fca5a5]" : "text-[#0a0a0a]"
                }`}
              >
                {feedback.type === "success"
                  ? "Operación Exitosa"
                  : "Aviso del Sistema"}
              </strong>
              <span
                className={
                  feedback.type === "error" ? "text-zinc-200" : "text-[#292b2a]"
                }
              >
                {feedback.message}
              </span>
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className={`p-1 rounded-full ${
              feedback.type === "error"
                ? "text-zinc-400 hover:text-white"
                : "text-[#7a7b7b] hover:text-[#0a0a0a]"
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filtro por Sede */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] shrink-0">
            Filtrar por Sede:
          </label>
          <div className="relative">
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="appearance-none bg-[#f3f4f3]/80 hover:bg-[#f3f4f3] border border-[#e5e5e5] rounded-full pl-3.5 pr-9 py-1.5 text-xs sm:text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-colors"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id_sede} value={s.id_sede}>
                  {s.nombre_sede}{" "}
                  {s.id_sede === empleadoSeleccionado.id_sede_personal
                    ? "(Sede del Responsable)"
                    : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7a7b7b]">
          <button
            onClick={() => {
              const sedeEmpStr = String(empleadoSeleccionado.id_sede_personal);
              if (filtroSede !== sedeEmpStr) {
                setFiltroSede(sedeEmpStr);
              } else {
                cargarEquipos(sedeEmpStr);
              }
            }}
            className="text-[#ff6105] hover:underline font-medium"
          >
            Restablecer a {empleadoSeleccionado.nombre_sede_personal}
          </button>
          <span className="text-[#e5e5e5]">·</span>
          <span className="font-medium text-[#292b2a]">
            {equipos.length}{" "}
            {equipos.length === 1
              ? "máquina registrada"
              : "máquinas registradas"}
          </span>
        </div>
      </div>

      {/* Grilla de Equipos */}
      {loading ? (
        <div className="py-12 text-center text-[#7a7b7b] text-sm animate-pulse">
          Consultando inventario de equipamiento...
        </div>
      ) : equipos.length === 0 ? (
        <div className="py-12 text-center text-[#7a7b7b] text-sm bg-white rounded-[5px] border border-dashed border-[#e5e5e5]">
          <Wrench className="w-8 h-8 text-[#a2a3a2] mx-auto mb-2" />
          <p className="font-medium text-[#0a0a0a]">
            No se encontraron equipos registrados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {equipos.map((eq) => (
            <div
              key={eq.id_equipamiento}
              className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm hover:-translate-y-0.5 rounded-[5px] p-5 space-y-4 transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#7a7b7b] block">
                      Equipo #{eq.id_equipamiento}
                    </span>
                    <h3 className="text-base font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors mt-0.5">
                      {eq.nombre_descriptivo_equipamiento}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] shrink-0">
                    {eq.antiguedad_anios}{" "}
                    {eq.antiguedad_anios === 1 ? "año" : "años"}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#e5e5e5]/70">
                  <p className="flex items-center gap-2 text-xs text-[#7a7b7b]">
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                    <span>Sede:</span>
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      {eq.nombre_sede}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-[#7a7b7b]">
                    <Calendar className="w-3.5 h-3.5 text-[#7a7b7b] shrink-0" />
                    <span>Adquirido:</span>
                    <span className="text-sm font-medium text-[#0a0a0a]">
                      {eq.fecha_adquisicion_equipamiento}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#e5e5e5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleAbrirModalEdicion(eq)}
                  className="text-xs text-[#292b2a] hover:text-[#0a0a0a] hover:bg-[#f3f4f3] px-3 py-1 rounded-full transition-colors border border-[#e5e5e5] hover:border-[#a2a3a2] flex items-center gap-1 font-medium"
                  title="Editar equipamiento"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#ff6105]" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEliminar(eq.id_equipamiento)}
                  className="text-xs text-[#7a7b7b] hover:text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-full transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1"
                  title="Eliminar equipamiento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Formulario Registrar Equipo */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-scale"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e5e5e5] rounded-[8px] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
              <div>
                <h3 className="text-lg font-medium text-[#0a0a0a]">
                  Registrar Equipamiento
                </h3>
                <p className="text-xs text-[#7a7b7b] mt-0.5">
                  Responsable:{" "}
                  <span className="text-[#0a0a0a] font-medium">
                    {empleadoSeleccionado.nombre_completo_personal}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1.5 rounded-full hover:bg-[#f3f4f3] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error específico dentro del formulario de registro */}
            {errorModalRegistro && (
              <div className="p-3.5 rounded-[5px] bg-[#202120] border border-[#ef4444] text-[#ffffff] ring-1 ring-[#ef4444]/30 text-xs flex items-start gap-2.5 animate-fade-in-scale">
                <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-semibold text-[#fca5a5]">
                    Error de Validación
                  </strong>
                  <span className="text-zinc-200 leading-relaxed">
                    {errorModalRegistro}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorModalRegistro(null)}
                  className="text-zinc-400 hover:text-white p-0.5"
                  title="Cerrar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleCrearEquipo} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#7a7b7b] uppercase tracking-wider mb-1.5">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Caminadora Eléctrica Pro 5000"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-[#0a0a0a] placeholder-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#7a7b7b] uppercase tracking-wider mb-1.5">
                  Sede Asignada
                </label>
                <div className="relative">
                  <select
                    value={nuevaSede}
                    onChange={(e) => setNuevaSede(Number(e.target.value))}
                    required
                    className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-4 pr-10 py-2.5 text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors cursor-pointer"
                  >
                    {sedes.map((s) => (
                      <option key={s.id_sede} value={s.id_sede}>
                        {s.nombre_sede}{" "}
                        {s.id_sede === empleadoSeleccionado.id_sede_personal
                          ? "(Sede del Responsable)"
                          : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7a7b7b] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#7a7b7b] uppercase tracking-wider mb-1.5">
                  Fecha de Adquisición (No futura)
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-[24px] text-[#292b2a] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {guardando ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Formulario Editar Equipamiento (PUT /clases/equipos/{id}) */}
      {equipoAEditar && (
        <div
          onClick={() => setEquipoAEditar(null)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-scale"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e5e5e5] rounded-[8px] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
              <div>
                <h3 className="text-lg font-medium text-[#0a0a0a]">
                  Editar Equipamiento #{equipoAEditar.id_equipamiento}
                </h3>
                <p className="text-xs text-[#7a7b7b] mt-0.5">
                  Sede:{" "}
                  <span className="text-[#0a0a0a] font-medium">
                    {equipoAEditar.nombre_sede}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setEquipoAEditar(null)}
                className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1.5 rounded-full hover:bg-[#f3f4f3] transition-colors"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error específico dentro del formulario de edición */}
            {errorModalEdit && (
              <div className="p-3.5 rounded-[5px] bg-[#202120] border border-[#ef4444] text-[#ffffff] ring-1 ring-[#ef4444]/30 text-xs flex items-start gap-2.5 animate-fade-in-scale">
                <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-semibold text-[#fca5a5]">
                    Error de Validación
                  </strong>
                  <span className="text-zinc-200 leading-relaxed">
                    {errorModalEdit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorModalEdit(null)}
                  className="text-zinc-400 hover:text-white p-0.5"
                  title="Cerrar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#7a7b7b] uppercase tracking-wider mb-1.5">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Máquina Prensa de Piernas 45°"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#7a7b7b] uppercase tracking-wider mb-1.5">
                  Fecha de Adquisición (No futura)
                </label>
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors font-medium"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEquipoAEditar(null)}
                  className="px-4 py-2.5 rounded-[24px] text-[#292b2a] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit}
                  className="px-6 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {guardandoEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
