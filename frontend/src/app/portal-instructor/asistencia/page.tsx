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

/**
 * Extrae el apellido o segmento clave para ordenamiento alfabético.
 * Si el nombre es "Daniel Matus", extrae "Matus".
 * Si es "Camila Valenzuela Soto", extrae "Valenzuela Soto".
 */
function extraerApellido(nombreCompleto?: string | null): string {
  if (!nombreCompleto) return "";
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length <= 1) return partes[0] || "";
  return partes.slice(1).join(" ");
}

function compararAlumnosPorApellido(
  a: InscritoEnSesionResponse,
  b: InscritoEnSesionResponse
): number {
  const apellidoA = extraerApellido(
    (a as any).apellido_socio || a.nombre_completo_socio
  ).toLowerCase();
  const apellidoB = extraerApellido(
    (b as any).apellido_socio || b.nombre_completo_socio
  ).toLowerCase();
  const comp = apellidoA.localeCompare(apellidoB, "es", { sensitivity: "base" });
  if (comp !== 0) return comp;
  return a.nombre_completo_socio.localeCompare(b.nombre_completo_socio, "es", {
    sensitivity: "base",
  });
}

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
  const [inscripcionesCanceladas, setInscripcionesCanceladas] = useState<
    InscritoEnSesionResponse[]
  >([]);
  const [loadingSesiones, setLoadingSesiones] = useState<boolean>(true);
  const [loadingAlumnos, setLoadingAlumnos] = useState<boolean>(false);
  const [savingAll, setSavingAll] = useState<boolean>(false);
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

      // 1. Filtrar y separar inscripciones canceladas de activas
      const activas: InscritoEnSesionResponse[] = [];
      const canceladas: InscritoEnSesionResponse[] = [];

      list.forEach((item) => {
        const est = (item.estado_inscripcion || "").trim().toLowerCase();
        if (est === "cancelada" || est === "cancelado") {
          canceladas.push(item);
        } else {
          activas.push(item);
        }
      });

      // 2. Ordenar alfabéticamente por apellido
      activas.sort(compararAlumnosPorApellido);
      canceladas.sort(compararAlumnosPorApellido);

      setAlumnos(activas);
      setInscripcionesCanceladas(canceladas);

      // 3. Inicializar borrador EXCLUSIVAMENTE para los alumnos activos
      const draft: Record<number, { asistio: boolean; observaciones: string }> = {};
      activas.forEach((a) => {
        draft[a.id_inscripcion] = {
          asistio: a.asistio_inscripcion === true,
          observaciones: a.observaciones_inscripcion || "",
        };
      });
      setBorradorAsistencia(draft);
    } catch {
      setAlumnos([]);
      setInscripcionesCanceladas([]);
    } finally {
      setLoadingAlumnos(false);
    }
  }, []);

  useEffect(() => {
    if (sesionSeleccionadaId) {
      cargarAlumnos(sesionSeleccionadaId);
    }
  }, [sesionSeleccionadaId, cargarAlumnos]);

  // Acciones en lote: Marcar todos Presentes / Ausentes en el estado local
  const handleMarcarTodos = (asistio: boolean) => {
    setBorradorAsistencia((prev) => {
      const next = { ...prev };
      alumnos.forEach((a) => {
        next[a.id_inscripcion] = {
          asistio,
          observaciones:
            next[a.id_inscripcion]?.observaciones ??
            a.observaciones_inscripcion ??
            "",
        };
      });
      return next;
    });
  };

  // Guardar asistencia de todos los alumnos en lote (Promise.all)
  const handleGuardarTodo = async () => {
    if (alumnos.length === 0) return;

    setSavingAll(true);
    try {
      const promesas = alumnos.map((a) => {
        const draft = borradorAsistencia[a.id_inscripcion] || {
          asistio: a.asistio_inscripcion === true,
          observaciones: a.observaciones_inscripcion || "",
        };
        return clasesApi.registrarAsistencia(a.id_inscripcion, {
          asistio: draft.asistio,
          observaciones: draft.observaciones ? draft.observaciones.trim() : undefined,
        });
      });

      await Promise.all(promesas);

      setFeedback({
        type: "success",
        message: `Asistencia actualizada correctamente para ${alumnos.length} ${
          alumnos.length === 1 ? "alumno" : "alumnos"
        }.`,
      });

      // Refrescar lista de alumnos con los datos guardados
      if (sesionSeleccionadaId) {
        cargarAlumnos(sesionSeleccionadaId);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.detail ||
          err.message ||
          "Error al registrar la asistencia en lote.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const sesionActual = sesiones.find((s) => s.id_sesion === sesionSeleccionadaId);

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Toast Feedback Flotante Inferior Derecho */}
      {feedback && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in-scale shadow-2xl">
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

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#f3f4f3] border border-[#e5e5e5] text-xs font-medium text-[#292b2a]">
              {alumnos.length} {alumnos.length === 1 ? "alumno activo" : "alumnos activos"}
            </span>
            {inscripcionesCanceladas.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {inscripcionesCanceladas.length} {inscripcionesCanceladas.length === 1 ? "cancelada" : "canceladas"}
              </span>
            )}
          </div>
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
          <div className="py-8 text-center text-xs text-[#7a7b7b] space-y-2">
            <p>No hay alumnos activos para pase de lista en esta sesión.</p>
            {inscripcionesCanceladas.length > 0 && (
              <p className="text-rose-600 font-medium">
                ({inscripcionesCanceladas.length} inscripción cancelada omitida)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra superior de acciones rápidas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ff6105]" />
                <span className="text-xs font-medium text-[#0a0a0a]">
                  Alumnos activos ({alumnos.length})
                </span>
                <span className="text-[11px] text-[#7a7b7b]">
                  — Ordenados alfabéticamente por apellido
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarcarTodos(true)}
                  className="px-3 py-1.5 rounded-[5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Marcar todos Presentes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMarcarTodos(false)}
                  className="px-3 py-1.5 rounded-[5px] bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-medium border border-rose-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Marcar todos Ausentes</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e5e5] text-[#7a7b7b] font-medium">
                    <th className="py-2.5 px-3">Socio (por Apellido)</th>
                    <th className="py-2.5 px-3">Contacto</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Pase de Asistencia</th>
                    <th className="py-2.5 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {alumnos.map((a) => {
                    const draft = borradorAsistencia[a.id_inscripcion] || {
                      asistio: a.asistio_inscripcion === true,
                      observaciones: a.observaciones_inscripcion || "",
                    };

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
                                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700 font-semibold"
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
                                  ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-700 font-semibold"
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
                            className="w-full max-w-sm p-1.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Nota informativa de inscripciones canceladas excluidas */}
            {inscripcionesCanceladas.length > 0 && (
              <div className="p-3 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs text-[#7a7b7b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  <strong className="text-[#0a0a0a]">Nota:</strong> Se han
                  excluido {inscripcionesCanceladas.length}{" "}
                  {inscripcionesCanceladas.length === 1
                    ? "inscripción cancelada"
                    : "inscripciones canceladas"}{" "}
                  del pase de asistencia (
                  {inscripcionesCanceladas
                    .map((c) => c.nombre_completo_socio)
                    .join(", ")}
                  ). No bloquean el guardado de los alumnos activos.
                </span>
                <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded bg-white border border-[#e5e5e5] text-[#7a7b7b] self-start sm:self-auto shrink-0">
                  Canceladas
                </span>
              </div>
            )}

            {/* Pie de tabla con botón único de Guardar Asistencia */}
            <div className="pt-4 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#7a7b7b]">
                Los cambios se mantienen de forma local en pantalla hasta pulsar el botón de guardar.
              </p>
              <button
                type="button"
                onClick={handleGuardarTodo}
                disabled={savingAll || alumnos.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {savingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando asistencia...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Asistencia ({alumnos.length})</span>
                  </>
                )}
              </button>
            </div>
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

