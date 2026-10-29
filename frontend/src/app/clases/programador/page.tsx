"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Dumbbell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
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
        message: `Sesión #${res.id_sesion} programada exitosamente en el sistema.`,
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
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 mb-2">
          <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
          <span>Programador de Sesiones (sp_Programar_Sesion)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0a0a0a]">
          Nueva Sesión de Clase
        </h1>
        <div className="w-16 h-[2px] bg-[#ff6105] my-2" />
        <p className="text-xs sm:text-sm text-[#7a7b7b]">
          Crea una nueva sesión en el calendario del gimnasio asignando sede, instructor, horario y cupo máximo.
        </p>
      </div>

      {/* Feedback Alert */}
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

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-5 shadow-none"
      >
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
            Disciplina / Clase
          </label>
          <select
            value={idClase}
            onChange={(e) => setIdClase(Number(e.target.value))}
            required
            className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
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
            <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Sede
            </label>
            <select
              value={idSede}
              onChange={(e) => setIdSede(Number(e.target.value))}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            >
              {sedes.map((s) => (
                <option key={s.id_sede} value={s.id_sede}>
                  {s.nombre_sede} ({s.nombre_ciudad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Instructor (Opcional)
            </label>
            <select
              value={idInstructor}
              onChange={(e) => setIdInstructor(e.target.value)}
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
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
            <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Fecha (Futura)
            </label>
            <input
              type="date"
              value={fechaSesion}
              onChange={(e) => setFechaSesion(e.target.value)}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Hora Inicio
            </label>
            <input
              type="time"
              step="1"
              value={horaSesion}
              onChange={(e) => setHoraSesion(e.target.value)}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Cupo Máximo
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={cupoMaximo}
              onChange={(e) => setCupoMaximo(Number(e.target.value))}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm text-[#0a0a0a] focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loadingForm}
          className="w-full py-3 px-6 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-sm mt-4 flex items-center justify-center gap-2"
        >
          {loadingForm ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Programando sesión...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Guardar y Publicar Sesión</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
