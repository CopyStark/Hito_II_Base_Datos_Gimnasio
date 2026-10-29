"use client";

import { useEffect, useState, useCallback } from "react";
import {
  clasesApi,
  ClaseResponse,
  SedeSimpleResponse,
  InstructorItemResponse,
  ProgramarSesionRequest,
} from "@/services/apiClient";

export default function ProgramadorPage() {
  const [clases, setClases] = useState<ClaseResponse[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [instructores, setInstructores] = useState<InstructorItemResponse[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const [idClase, setIdClase] = useState<number>(0);
  const [idSede, setIdSede] = useState<number>(0);
  const [idInstructor, setIdInstructor] = useState<string>("");
  const [fechaSesion, setFechaSesion] = useState<string>("");
  const [horaSesion, setHoraSesion] = useState<string>("09:00:00");
  const [cupoMaximo, setCupoMaximo] = useState<number>(20);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [cData, sData, iData] = await Promise.all([
        clasesApi.getClases(),
        clasesApi.getSedes(),
        clasesApi.getInstructores(),
      ]);
      setClases(cData);
      setSedes(sData);
      setInstructores(iData);
      if (cData.length > 0) setIdClase(cData[0].id_clase);
      if (sData.length > 0) setIdSede(sData[0].id_sede);
    } catch (err: any) {
      console.error("Error al cargar catálogos:", err);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoadingForm(true);

    try {
      const body: ProgramarSesionRequest = {
        id_clase_sesion: Number(idClase),
        id_sede_sesion: Number(idSede),
        id_instructor_sesion: idInstructor ? Number(idInstructor) : null,
        fecha_sesion: fechaSesion,
        hora_sesion: horaSesion.length === 5 ? `${horaSesion}:00` : horaSesion,
        cupo_maximo_sesion: Number(cupoMaximo),
      };

      const res = await clasesApi.programarSesion(body);
      setFeedback({
        type: "success",
        message: `¡Sesión #${res.id_sesion} programada exitosamente!`,
      });
    } catch (err: any) {
      const errorMsg = err.data?.detail || err.message || "Error al programar la sesión.";
      setFeedback({
        type: "error",
        message: String(errorMsg),
      });
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-2">
          <span>🗓️</span> Programador de Sesiones (sp_Programar_Sesion)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Nueva Sesión de Clase
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Crea una nueva sesión en el calendario del gimnasio asignando sede, instructor, horario y cupo máximo.
        </p>
      </div>

      {/* Feedback Alert */}
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

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Disciplina / Clase
          </label>
          <select
            value={idClase}
            onChange={(e) => setIdClase(Number(e.target.value))}
            required
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            {clases.map((c) => (
              <option key={c.id_clase} value={c.id_clase}>
                {c.nombre_clase} ({c.nivel_exigencia_clase} &bull; {c.duracion_minutos_clase} min)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Sede
            </label>
            <select
              value={idSede}
              onChange={(e) => setIdSede(Number(e.target.value))}
              required
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              {sedes.map((s) => (
                <option key={s.id_sede} value={s.id_sede}>
                  {s.nombre_sede} ({s.nombre_ciudad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Instructor (Opcional)
            </label>
            <select
              value={idInstructor}
              onChange={(e) => setIdInstructor(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Sin instructor asignado</option>
              {instructores.map((i) => (
                <option key={i.id_instructor} value={i.id_instructor}>
                  {i.nombre_completo_instructor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Fecha (Futura)
            </label>
            <input
              type="date"
              value={fechaSesion}
              onChange={(e) => setFechaSesion(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Hora Inicio
            </label>
            <input
              type="time"
              step="1"
              value={horaSesion}
              onChange={(e) => setHoraSesion(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Cupo Máximo
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={cupoMaximo}
              onChange={(e) => setCupoMaximo(Number(e.target.value))}
              required
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loadingForm}
          className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 text-sm mt-4"
        >
          {loadingForm ? "⏳ Programando sesión..." : "Guardar y Publicar Sesión"}
        </button>
      </form>
    </div>
  );
}
