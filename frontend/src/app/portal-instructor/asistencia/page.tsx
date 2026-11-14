"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  clasesApi,
  SesionInstructorResponse,
  InscritoEnSesionResponse,
} from "@/services/apiClient";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Save,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  X,
} from "lucide-react";

function AsistenciaContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const instructorId = user?.id_instructor || 1;
  const sesionQueryId = searchParams.get("sesion");

  const [sesiones, setSesiones] = useState<SesionInstructorResponse[]>([]);
  const [sesionSeleccionadaId, setSesionSeleccionadaId] = useState<number | null>(
    sesionQueryId ? Number(sesionQueryId) : null
  );
  const [alumnos, setAlumnos] = useState<InscritoEnSesionResponse[]>([]);
  const [loadingSesiones, setLoadingSesiones] = useState<boolean>(true);
  const [loadingAlumnos, setLoadingAlumnos] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-descartar Toast flotante
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Estados locales editables por alumno (asistió, observaciones)
  const [borradorAsistencia, setBorradorAsistencia] = useState<
    Record<number, { asistio: boolean; observaciones: string }>
  >({});

  // Cargar lista de sesiones del instructor
  useEffect(() => {
    if (!instructorId) return;
    setLoadingSesiones(true);
    clasesApi
      .getSesionesInstructor(instructorId)
      .then((data: SesionInstructorResponse[]) => {
        const list = Array.isArray(data) ? data : [];
        setSesiones(list);
        if (!sesionSeleccionadaId && list.length > 0) {
          setSesionSeleccionadaId(list[0].id_sesion);
        }
      })
      .catch(() => setSesiones([]))
      .finally(() => setLoadingSesiones(false));
  }, [instructorId]);

  // Cargar alumnos cuando cambia la sesión seleccionada
  const cargarAlumnos = useCallback(async (idSesion: number) => {
    setLoadingAlumnos(true);
    try {
      const data = await clasesApi.getInscritosSesion(idSesion);
      const list = Array.isArray(data) ? data : [];
      setAlumnos(list);

      // Inicializar borrador
      const draft: Record<number, { asistio: boolean; observaciones: string }> = {};
      list.forEach((a) => {
        draft[a.id_inscripcion] = {
          asistio: a.asistio_inscripcion === true,
          observaciones: a.observaciones_inscripcion || "",
        };
      });
      setBorradorAsistencia(draft);
    } catch {
      setAlumnos([]);
    } finally {
      setLoadingAlumnos(false);
    }
  }, []);

  useEffect(() => {
    if (sesionSeleccionadaId) {
      cargarAlumnos(sesionSeleccionadaId);
    }
  }, [sesionSeleccionadaId, cargarAlumnos]);

  // Guardar asistencia individual
  const handleGuardar = async (idInscripcion: number) => {
    const draft = borradorAsistencia[idInscripcion];
    if (!draft) return;

    setSavingId(idInscripcion);
    try {
      await clasesApi.registrarAsistencia(idInscripcion, {
        asistio: draft.asistio,
        observaciones: draft.observaciones || undefined,
      });

      setFeedback({
        type: "success",
        message: "Asistencia actualizada correctamente en la base de datos.",
      });

      // Refrescar lista de alumnos
      if (sesionSeleccionadaId) {
        cargarAlumnos(sesionSeleccionadaId);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.detail ||
          err.message ||
          "Error al registrar la asistencia.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const sesionActual = sesiones.find((s) => s.id_sesion === sesionSeleccionadaId);

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Toast Feedback Flotante Superior Derecho */}
      {feedback && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-slide-down shadow-2xl">
          <div
            className={`p-4 rounded-[5px] border flex items-start gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-rose-50 border-rose-300 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#7a7b7b] hover:text-[#0a0a0a] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
              Control en Sala
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#0a0a0a] tracking-[-0.03em]">
            Pase de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Verifica y registra en tiempo real la concurrencia de los socios a tus clases.
          </p>
        </div>

        {/* Selector de Sesión */}
        <div className="w-full md:w-auto min-w-[280px]">
          <label className="block text-[11px] font-medium text-[#7a7b7b] mb-1">
            Seleccionar Sesión:
          </label>
          <select
            value={sesionSeleccionadaId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSesionSeleccionadaId(id);
              router.replace(`/portal-instructor/asistencia?sesion=${id}`);
            }}
            className="w-full p-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs font-medium text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
          >
            {sesiones.map((s) => (
              <option key={s.id_sesion} value={s.id_sesion}>
                {s.nombre_clase} — {String(s.fecha)} {s.hora} ({s.nombre_sede})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Detalle de la Sesión Activa */}
      {sesionActual && (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-sm text-[#0a0a0a]">
              {sesionActual.nombre_clase}
            </span>
            <span className="text-[#7a7b7b]">·</span>
            <span className="text-[#7a7b7b] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
              {String(sesionActual.fecha)}
            </span>
            <span className="text-[#7a7b7b]">·</span>
            <span className="text-[#7a7b7b] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
              {sesionActual.hora}
            </span>
            <span className="text-[#7a7b7b]">·</span>
            <span className="text-[#7a7b7b]">
              Sede: {sesionActual.nombre_sede}
            </span>
          </div>

          <span className="px-3 py-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5] text-xs font-medium text-[#292b2a]">
            {alumnos.length} inscritos en lista
          </span>
        </div>
      )}

      {/* Lista de Alumnos para Pase de Lista */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 space-y-4">
        {loadingAlumnos ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
            <span className="text-xs text-[#7a7b7b]">Cargando lista de inscritos...</span>
          </div>
        ) : alumnos.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7a7b7b]">
            No hay alumnos inscritos en esta sesión.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e5] text-[#7a7b7b] font-medium">
                  <th className="py-2.5 px-3">Socio</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Asistencia</th>
                  <th className="py-2.5 px-3">Observaciones</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {alumnos.map((a) => {
                  const draft = borradorAsistencia[a.id_inscripcion] || {
                    asistio: a.asistio_inscripcion === true,
                    observaciones: a.observaciones_inscripcion || "",
                  };
                  const isSaving = savingId === a.id_inscripcion;

                  return (
                    <tr key={a.id_inscripcion} className="hover:bg-[#f8f9f8]">
                      <td className="py-3 px-3">
                        <strong className="block text-[#0a0a0a]">
                          {a.nombre_completo_socio}
                        </strong>
                        <span className="text-[10px] text-[#7a7b7b]">
                          Inscripción #{a.id_inscripcion}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[#7a7b7b]">
                        {a.correo_socio || "-"}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            a.estado_inscripcion === "Inscrito"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {a.estado_inscripcion}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setBorradorAsistencia((prev) => ({
                                ...prev,
                                [a.id_inscripcion]: {
                                  ...draft,
                                  asistio: true,
                                },
                              }))
                            }
                            className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                              draft.asistio
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-[#f3f4f3] text-[#7a7b7b] hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBorradorAsistencia((prev) => ({
                                ...prev,
                                [a.id_inscripcion]: {
                                  ...draft,
                                  asistio: false,
                                },
                              }))
                            }
                            className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-all cursor-pointer ${
                              !draft.asistio
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-[#f3f4f3] text-[#7a7b7b] hover:bg-rose-50 hover:text-rose-700"
                            }`}
                          >
                            Ausente
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={draft.observaciones}
                          onChange={(e) =>
                            setBorradorAsistencia((prev) => ({
                              ...prev,
                              [a.id_inscripcion]: {
                                ...draft,
                                observaciones: e.target.value,
                              },
                            }))
                          }
                          placeholder="Nota u observación..."
                          className="w-full max-w-xs p-1.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
                        />
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleGuardar(a.id_inscripcion)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-full bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaseAsistenciaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#7a7b7b]">
          Cargando panel de asistencia...
        </div>
      }
    >
      <AsistenciaContent />
    </Suspense>
  );
}

