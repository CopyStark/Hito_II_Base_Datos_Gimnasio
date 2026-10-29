"use client";

import { useEffect, useState, useCallback } from "react";
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
      // Sincroniza la sede por defecto para nuevos registros
      setNuevaSede(encontrado.id_sede_personal);
      // Sincroniza la sede del filtro con la sede del empleado responsable
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
        message: `¡Equipamiento #${res.id_equipamiento} registrado correctamente en sede!`,
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-2">
            <span>⚙️</span> Inventario de Equipos (vw_Inventario_Equipos)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Equipamiento &amp; Máquinas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control de inventario, cálculo de antigüedad y registro por sede.
          </p>
        </div>

        <button
          onClick={handleAbrirModalRegistro}
          className="self-start sm:self-auto text-xs px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Registrar Equipo</span>
        </button>
      </div>

      {/* Selector de Personal / Empleado Responsable */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
        {/* Fila 1: Label + Select de Empleado */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="selector-empleado"
            className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 shrink-0"
          >
            <span>👷</span>
            <span>Personal Responsable:</span>
          </label>
          <select
            id="selector-empleado"
            value={empleadoSeleccionado.id_personal}
            onChange={(e) => handleCambiarEmpleado(Number(e.target.value))}
            className="w-full sm:w-auto flex-1 max-w-2xl bg-slate-900 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 font-medium cursor-pointer shadow-inner"
          >
            {PERSONAL_RESPONSABLE_MOCK.map((emp) => (
              <option key={emp.id_personal} value={emp.id_personal}>
                {emp.nombre_completo_personal} — {emp.cargo_personal} ({emp.nombre_sede_personal})
              </option>
            ))}
          </select>
        </div>

        {/* Fila 2: Badges con datos del empleado distribuidos en filas/wrap sin solapamiento */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-lg text-purple-200 font-medium">
            <span>🏢</span>
            <span>Sede asignada:</span>
            <strong className="text-white font-bold">{empleadoSeleccionado.nombre_sede_personal}</strong>
          </div>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-700/60 px-2.5 py-1 rounded-lg text-slate-300">
            <span>💼</span>
            <span>Cargo:</span>
            <strong className="text-slate-100">{empleadoSeleccionado.cargo_personal}</strong>
          </div>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <div className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-700/60 px-2.5 py-1 rounded-lg text-slate-400 font-mono">
            <span>✉️</span>
            <span>{empleadoSeleccionado.correo_personal}</span>
          </div>
          {empleadoSeleccionado.telefono_personal && (
            <>
              <span className="text-slate-600 hidden sm:inline">&bull;</span>
              <div className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-700/60 px-2.5 py-1 rounded-lg text-slate-400 font-mono">
                <span>📞</span>
                <span>{empleadoSeleccionado.telefono_personal}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/40 border-rose-500/40 text-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filtro por Sede */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Filtrar por Sede:
          </label>
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id_sede} value={s.id_sede}>
                {s.nombre_sede} {s.id_sede === empleadoSeleccionado.id_sede_personal ? "⭐ (Sede del Responsable)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={() => {
              const sedeEmpStr = String(empleadoSeleccionado.id_sede_personal);
              if (filtroSede !== sedeEmpStr) {
                setFiltroSede(sedeEmpStr);
              } else {
                cargarEquipos(sedeEmpStr);
              }
            }}
            className="text-purple-400 hover:text-purple-300 underline font-medium"
          >
            Restablecer a Sede del Empleado ({empleadoSeleccionado.nombre_sede_personal})
          </button>
          <span className="text-slate-600">&bull;</span>
          <span className="font-mono text-slate-500">
            {equipos.length} máquinas registradas
          </span>
        </div>
      </div>

      {/* Grilla de Equipos */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
          ⏳ Consultando inventario de equipamiento...
        </div>
      ) : equipos.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <p className="text-3xl mb-2">🏋️‍♂️</p>
          <p className="font-semibold text-slate-300">No se encontraron equipos registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipos.map((eq) => (
            <div
              key={eq.id_equipamiento}
              className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Equipo #{eq.id_equipamiento}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {eq.nombre_descriptivo_equipamiento}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                    {eq.antiguedad_anios} {eq.antiguedad_anios === 1 ? "año" : "años"}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-300 mt-2">
                  <p>📍 Sede: <strong className="text-white">{eq.nombre_sede}</strong></p>
                  <p>📅 Adquirido: <span className="font-mono text-purple-300">{eq.fecha_adquisicion_equipamiento}</span></p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => handleEliminar(eq.id_equipamiento)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Formulario Registrar Equipo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Registrar Equipamiento</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Responsable: <span className="text-purple-300">{empleadoSeleccionado.nombre_completo_personal}</span>
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEquipo} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Caminadora Eléctrica Pro 5000"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1">
                  Sede Asignada
                </label>
                <select
                  value={nuevaSede}
                  onChange={(e) => setNuevaSede(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} {s.id_sede === empleadoSeleccionado.id_sede_personal ? "(Sede del Responsable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1">
                  Fecha de Adquisición (No futura)
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  {guardando ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
