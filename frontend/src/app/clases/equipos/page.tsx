"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wrench,
  Plus,
  User,
  Building,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
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
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<PersonalResponsable>(
    PERSONAL_RESPONSABLE_MOCK[0]
  );

  // Filtro por Sede (sincronizado con la sede del empleado)
  const [filtroSede, setFiltroSede] = useState<string>(
    String(PERSONAL_RESPONSABLE_MOCK[0].id_sede_personal)
  );
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form para agregar nuevo equipo
  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaSede, setNuevaSede] = useState<number>(PERSONAL_RESPONSABLE_MOCK[0].id_sede_personal);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [guardando, setGuardando] = useState(false);

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
      setFeedback({ type: "error", message: err.message || "Error al cargar equipos." });
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
    const encontrado = PERSONAL_RESPONSABLE_MOCK.find((e) => e.id_personal === idPersonal);
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
    setShowAddModal(true);
  };

  const handleCrearEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaFecha || !nuevaSede) return;
    setGuardando(true);
    setFeedback(null);
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
      const msg = err.data?.detail || err.message || "Error al registrar el equipamiento.";
      setFeedback({ type: "error", message: String(msg) });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm(`¿Estás seguro de eliminar el equipamiento #${id}?`)) return;
    try {
      await clasesApi.eliminarEquipo(id);
      setFeedback({ type: "success", message: `Equipamiento #${id} eliminado.` });
      cargarEquipos(filtroSede);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || "Error al eliminar.";
      setFeedback({ type: "error", message: String(msg) });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 mb-2">
            <Wrench className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Inventario de Equipos (vw_Inventario_Equipos)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0a0a0a]">
            Equipamiento &amp; Máquinas
          </h1>
          <div className="w-16 h-[2px] bg-[#ff6105] my-2" />
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Control de inventario, cálculo de antigüedad y registro por sede.
          </p>
        </div>

        <button
          onClick={handleAbrirModalRegistro}
          className="self-start sm:self-auto text-xs px-5 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Equipo</span>
        </button>
      </div>

      {/* Selector de Personal / Empleado Responsable */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Fila 1: Label + Select de Empleado */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="selector-empleado"
            className="text-xs font-medium uppercase tracking-wider text-[#292b2a] flex items-center gap-1.5 shrink-0"
          >
            <User className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Personal Responsable:</span>
          </label>
          <select
            id="selector-empleado"
            value={empleadoSeleccionado.id_personal}
            onChange={(e) => handleCambiarEmpleado(Number(e.target.value))}
            className="w-full sm:w-auto flex-1 max-w-2xl bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-xs sm:text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] font-medium cursor-pointer transition-colors"
          >
            {PERSONAL_RESPONSABLE_MOCK.map((emp) => (
              <option key={emp.id_personal} value={emp.id_personal}>
                {emp.nombre_completo_personal} — {emp.cargo_personal} ({emp.nombre_sede_personal})
              </option>
            ))}
          </select>
        </div>

        {/* Fila 2: Badges con datos del empleado */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-[#f3f4f3] p-3 rounded-[5px] border border-[#e5e5e5]">
          <div className="flex items-center gap-1.5 bg-[#ffdfcd] border border-[#ff6105]/20 px-3 py-1 rounded-full text-[#0a0a0a] font-medium">
            <Building className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>Sede:</span>
            <strong className="text-[#0a0a0a]">{empleadoSeleccionado.nombre_sede_personal}</strong>
          </div>
          <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e5] px-3 py-1 rounded-full text-[#292b2a]">
            <Briefcase className="w-3.5 h-3.5 text-[#7a7b7b]" />
            <span>Cargo:</span>
            <strong className="text-[#0a0a0a]">{empleadoSeleccionado.cargo_personal}</strong>
          </div>
          <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e5] px-3 py-1 rounded-full text-[#7a7b7b] font-mono text-[11px]">
            <Mail className="w-3.5 h-3.5 text-[#7a7b7b]" />
            <span>{empleadoSeleccionado.correo_personal}</span>
          </div>
          {empleadoSeleccionado.telefono_personal && (
            <>
              <span className="text-[#e5e5e5] hidden sm:inline">&bull;</span>
              <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e5] px-3 py-1 rounded-full text-[#7a7b7b] font-mono text-[11px]">
                <Phone className="w-3.5 h-3.5 text-[#7a7b7b]" />
                <span>{empleadoSeleccionado.telefono_personal}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-[5px] border flex items-center justify-between text-xs sm:text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1 rounded-full hover:bg-black/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filtro por Sede */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wider text-[#7a7b7b] shrink-0">
            Filtrar por Sede:
          </label>
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-full px-3.5 py-1.5 text-xs text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] cursor-pointer transition-colors"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id_sede} value={s.id_sede}>
                {s.nombre_sede} {s.id_sede === empleadoSeleccionado.id_sede_personal ? "(Sede del Responsable)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#7a7b7b]">
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
            Restablecer a Sede del Empleado ({empleadoSeleccionado.nombre_sede_personal})
          </button>
          <span className="text-[#e5e5e5]">&bull;</span>
          <span className="font-mono text-[#7a7b7b]">
            {equipos.length} máquinas registradas
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
          <p className="font-medium text-[#0a0a0a]">No se encontraron equipos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipos.map((eq) => (
            <div
              key={eq.id_equipamiento}
              className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:-translate-y-0.5 rounded-[5px] p-5 space-y-3 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#7a7b7b] block">
                      Equipo #{eq.id_equipamiento}
                    </span>
                    <h3 className="text-base font-medium text-[#0a0a0a]">
                      {eq.nombre_descriptivo_equipamiento}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] shrink-0">
                    {eq.antiguedad_anios} {eq.antiguedad_anios === 1 ? "año" : "años"}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-[#292b2a] mt-2">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                    <span className="text-[#7a7b7b]">Sede:</span>
                    <strong className="text-[#0a0a0a]">{eq.nombre_sede}</strong>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#7a7b7b]" />
                    <span className="text-[#7a7b7b]">Adquirido:</span>
                    <span className="font-mono text-[#0a0a0a]">{eq.fecha_adquisicion_equipamiento}</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#e5e5e5] flex justify-end">
                <button
                  onClick={() => handleEliminar(eq.id_equipamiento)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-full transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Formulario Registrar Equipo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-scale">
          <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div>
                <h3 className="text-lg font-medium text-[#0a0a0a]">Registrar Equipamiento</h3>
                <p className="text-xs text-[#7a7b7b] mt-0.5">
                  Responsable: <span className="text-[#ff6105] font-medium">{empleadoSeleccionado.nombre_completo_personal}</span>
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#7a7b7b] hover:text-[#0a0a0a] p-1 rounded-full hover:bg-[#f3f4f3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearEquipo} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#7a7b7b] uppercase tracking-wider mb-1">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Caminadora Eléctrica Pro 5000"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#7a7b7b] uppercase tracking-wider mb-1">
                  Sede Asignada
                </label>
                <select
                  value={nuevaSede}
                  onChange={(e) => setNuevaSede(Number(e.target.value))}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} {s.id_sede === empleadoSeleccionado.id_sede_personal ? "(Sede del Responsable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#7a7b7b] uppercase tracking-wider mb-1">
                  Fecha de Adquisición (No futura)
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2 text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] text-sm transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-[#7a7b7b] hover:text-[#0a0a0a] hover:bg-[#f3f4f3] border border-[#e5e5e5] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
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
    </div>
  );
}
