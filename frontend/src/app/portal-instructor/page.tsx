"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  clasesApi,
  SesionInstructorResponse,
} from "@/services/apiClient";
import {
  Calendar,
  Clock,
  ClipboardCheck,
  RefreshCw,
  Loader2,
  History,
  CalendarCheck,
} from "lucide-react";

export default function MisSesionesInstructorPage() {
  const { user } = useAuth();
  const instructorId = user?.id_instructor || 1;

  const getFechaHoy = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hoyStr = getFechaHoy();

  const [sesiones, setSesiones] = useState<SesionInstructorResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subTab, setSubTab] = useState<"proximas" | "historial">("proximas");
  const [desde, setDesde] = useState<string>(hoyStr);
  const [hasta, setHasta] = useState<string>("");

  const cargarSesiones = useCallback(async () => {
    if (!instructorId) return;
    setLoading(true);
    try {
      const data = await clasesApi.getSesionesInstructor(
        instructorId,
        {
          desde: desde || undefined,
          hasta: hasta || undefined,
        }
      );
      const list = Array.isArray(data) ? data : [];
      setSesiones(list);
    } catch {
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  }, [instructorId, desde, hasta]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  // Clasificación: hoy en adelante vs pasadas
  const sesionesProximas = useMemo(() => {
    return sesiones
      .filter((s) => String(s.fecha) >= hoyStr)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  }, [sesiones, hoyStr]);

  const sesionesHistorial = useMemo(() => {
    return sesiones
      .filter((s) => String(s.fecha) < hoyStr)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [sesiones, hoyStr]);

  const sesionesAMostrar = subTab === "proximas" ? sesionesProximas : sesionesHistorial;

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
              Agenda Docente
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#0a0a0a] tracking-[-0.03em]">
            Mis Sesiones Asignadas
          </h1>
          <p className="text-xs sm:text-sm text-[#7a7b7b]">
            Consulta tus clases programadas por sede y gestiona el pase de lista de tus alumnos.
          </p>
        </div>

        <button
          onClick={cargarSesiones}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e5e5e5] hover:border-[#ff6105]/40 bg-[#f8f9f8] hover:bg-white text-xs font-medium text-[#292b2a] transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff6105]" : ""}`} />
          <span>Actualizar Agenda</span>
        </button>
      </div>

      {/* Pestañas Centradas: Próximas vs Historial */}
      <div className="flex justify-center border-b border-[#e5e5e5] gap-2 overflow-x-auto w-full">
        <button
          type="button"
          onClick={() => {
            setSubTab("proximas");
            if (!desde && !hasta) {
              setDesde(hoyStr);
            }
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
            subTab === "proximas"
              ? "border-[#ff6105] text-[#0a0a0a]"
              : "border-transparent text-[#7a7b7b] hover:text-[#0a0a0a]"
          }`}
        >
          <CalendarCheck className={`w-4 h-4 ${subTab === "proximas" ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
          <span>Próximas Sesiones</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ffdfcd] text-[#ff6105]">
            {sesionesProximas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("historial");
            if (desde === hoyStr) {
              setDesde("");
            }
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-medium transition-all relative border-b-2 cursor-pointer whitespace-nowrap ${
            subTab === "historial"
              ? "border-[#ff6105] text-[#0a0a0a]"
              : "border-transparent text-[#7a7b7b] hover:text-[#0a0a0a]"
          }`}
        >
          <History className={`w-4 h-4 ${subTab === "historial" ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
          <span>Historial Pasado</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f3f4f3] text-[#7a7b7b]">
            {sesionesHistorial.length}
          </span>
        </button>
      </div>

      {/* Listado de Sesiones */}
      <div className="space-y-6">
        {/* Filtro Opcional por Fechas */}
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#7a7b7b] font-medium">Filtrar Rango:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#7a7b7b]">Desde:</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="p-1.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#7a7b7b]">Hasta:</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="p-1.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-[#0a0a0a] focus:bg-white focus:outline-none focus:border-[#ff6105]"
              />
            </div>
            {(desde || hasta) && (
              <button
                onClick={() => {
                  setDesde("");
                  setHasta("");
                }}
                className="text-[#ff6105] hover:underline cursor-pointer"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          <span className="text-[#7a7b7b]">
            {sesionesAMostrar.length} sesiones en esta vista
          </span>
        </div>

        {/* Listado de Sesiones */}
        {loading ? (
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
            <span className="text-xs text-[#7a7b7b]">Cargando sesiones asignadas...</span>
          </div>
        ) : sesionesAMostrar.length === 0 ? (
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 text-center space-y-2">
            <p className="text-sm font-medium text-[#0a0a0a]">
              {subTab === "proximas"
                ? "No tienes sesiones programadas desde hoy en adelante."
                : "No hay sesiones en tu historial pasado para los filtros actuales."}
            </p>
            <p className="text-xs text-[#7a7b7b]">
              Puedes actualizar la agenda o revisar con el personal administrativo las asignaciones de sala.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sesionesAMostrar.map((s) => {
              const esHoy = String(s.fecha) === hoyStr;

              return (
                <div
                  key={s.id_sesion}
                  className={`bg-white border transition-all rounded-[5px] p-5 flex flex-col justify-between space-y-4 ${
                    esHoy
                      ? "border-[#ff6105] shadow-sm"
                      : "border-[#e5e5e5] hover:border-[#ff6105]/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                        {s.nombre_sede}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {esHoy && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ff6105] text-white">
                            HOY
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#ffdfcd]/50 text-[#ff6105] border border-[#ff6105]/20">
                          {s.total_inscritos} / {s.cupo_maximo_sesion} alumnos
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-medium text-[#0a0a0a]">
                      {s.nombre_clase}
                    </h3>

                    <div className="space-y-1 text-xs text-[#7a7b7b]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                        <span className={esHoy ? "font-semibold text-[#0a0a0a]" : ""}>
                          {String(s.fecha)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                        <span>{s.hora}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/portal-instructor/asistencia?sesion=${s.id_sesion}`}
                    className="w-full py-2.5 px-3 rounded-[40px] bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Pasar Asistencia ({s.total_inscritos})</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
