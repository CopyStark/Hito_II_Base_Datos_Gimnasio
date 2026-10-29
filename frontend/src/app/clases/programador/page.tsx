"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  ChevronDown,
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
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [idClase, setIdClase] = useState<number>(0);
  const [idSede, setIdSede] = useState<number>(0);
  const [idInstructor, setIdInstructor] = useState<string>("");
  const [fechaSesion, setFechaSesion] = useState<string>("");
  const [horaSesion, setHoraSesion] = useState<string>("09:00");
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
        message: `Sesión #${res.id_sesion} programada exitosamente en el calendario.`,
      });
    } catch (err: any) {
      const errorMsg =
        err.data?.detail || err.message || "Error al programar la sesión.";
      setFeedback({
        type: "error",
        message: String(errorMsg),
      });
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-scale">
      {/* Header Editorial */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[#7a7b7b]">
          <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
          Programador de Sesiones · Calendario
        </span>

        <h1 className="text-3xl sm:text-4xl font-light tracking-[-0.03em] text-[#0a0a0a] leading-[1.15]">
          Nueva Sesión de Clase
        </h1>

        <div className="w-20 h-[2px] bg-[#ff6105]" />

        <p className="text-sm sm:text-base text-[#7a7b7b] leading-relaxed pt-1">
          Publica una nueva sesión en el calendario del gimnasio asignando sede,
          instructor, horario y capacidad máxima.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-[5px] border flex items-center justify-between text-xs sm:text-sm animate-fade-in-scale ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
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

      {/* Formulario Ghost Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 hover:shadow-sm transition-all duration-200 rounded-[5px] p-6 sm:p-8 space-y-5"
      >
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
            Disciplina / Clase
          </label>
          <div className="relative">
            <select
              value={idClase}
              onChange={(e) => setIdClase(Number(e.target.value))}
              required
              className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors cursor-pointer"
            >
              {clases.map((c) => (
                <option key={c.id_clase} value={c.id_clase}>
                  {c.nombre_clase} ({c.nivel_exigencia_clase} ·{" "}
                  {c.duracion_minutos_clase} min)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#7a7b7b] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Sede
            </label>
            <div className="relative">
              <select
                value={idSede}
                onChange={(e) => setIdSede(Number(e.target.value))}
                required
                className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors cursor-pointer"
              >
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede} ({s.nombre_ciudad})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Instructor (Opcional)
            </label>
            <div className="relative">
              <select
                value={idInstructor}
                onChange={(e) => setIdInstructor(e.target.value)}
                className="w-full appearance-none bg-white border border-[#e5e5e5] rounded-full pl-4 pr-10 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors cursor-pointer"
              >
                <option value="">Sin instructor asignado</option>
                {instructores.map((i) => (
                  <option key={i.id_instructor} value={i.id_instructor}>
                    {i.nombre_completo_instructor}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Fecha (Futura)
            </label>
            <input
              type="date"
              value={fechaSesion}
              onChange={(e) => setFechaSesion(e.target.value)}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Hora Inicio (hrs)
            </label>
            <input
              type="time"
              value={horaSesion}
              onChange={(e) => setHoraSesion(e.target.value)}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] mb-1.5">
              Cupo Máximo
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={cupoMaximo}
              onChange={(e) => setCupoMaximo(Number(e.target.value))}
              required
              className="w-full bg-white border border-[#e5e5e5] rounded-full px-4 py-2.5 text-sm font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-colors"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loadingForm}
            className="w-full py-3 px-6 rounded-full font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-[1px_6px_14px_rgba(255,97,5,0.28)] hover:shadow-[1px_8px_18px_rgba(255,97,5,0.4)] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
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
        </div>
      </form>
    </div>
  );
}
