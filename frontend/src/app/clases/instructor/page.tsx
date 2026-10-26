"use client";

import { useEffect, useState, useCallback } from "react";
import {
  clasesApi,
  SesionInstructorResponse,
} from "@/services/apiClient";
import { INSTRUCTOR_ACTUAL } from "@/components/clases/instructorActual";

export default function InstructorPage() {
  const [sesiones, setSesiones] = useState<SesionInstructorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const cargarSesiones = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: { desde?: string; hasta?: string } = {};
      if (filtroDesde) params.desde = filtroDesde;
      if (filtroHasta) params.hasta = filtroHasta;

      const data = await clasesApi.getSesionesInstructor(
        INSTRUCTOR_ACTUAL.id_instructor,
        params
      );
      setSesiones(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar las sesiones del instructor.");
    } finally {
      setLoading(false);
    }
  }, [filtroDesde, filtroHasta]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
            <span>🧑‍🏫</span> Portal del Instructor (sp_Sesiones_Por_Instructor)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Agenda de Sesiones
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Instructor en sesión: <strong className="text-white">{INSTRUCTOR_ACTUAL.nombre_completo_instructor}</strong> &bull; Correo: {INSTRUCTOR_ACTUAL.correo_instructor}
          </p>
        </div>

        <button
          onClick={cargarSesiones}
          disabled={loading}
          className="self-start sm:self-auto text-xs px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-600/25 flex items-center gap-2"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          <span>Actualizar Agenda</span>
        </button>
      </div>

      {/* Filtros de Rango */}
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

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Listado de Sesiones */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
          ⏳ Consultando sesiones del instructor...
        </div>
      ) : sesiones.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <p className="text-3xl mb-2">📭</p>
          <p className="font-semibold text-slate-300">
            No hay sesiones asignadas en el rango seleccionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map((s) => (
            <div
              key={s.id_sesion}
              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Sesión #{s.id_sesion}
                  </span>
                  <h3 className="text-base font-bold text-white">{s.nombre_clase}</h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {s.total_inscritos} / {s.cupo_maximo_sesion} inscritos
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-300">
                <p>📍 Sede: <strong className="text-white">{s.nombre_sede}</strong></p>
                <p>📅 Fecha: <span className="font-mono text-purple-300">{s.fecha}</span> &bull; ⏰ {s.hora}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
