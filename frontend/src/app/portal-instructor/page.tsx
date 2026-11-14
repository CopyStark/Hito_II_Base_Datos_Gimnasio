"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  clasesApi,
  SesionInstructorResponse,
} from "@/services/apiClient";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  RefreshCw,
  Loader2,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";

export default function MisSesionesInstructorPage() {
  const { user } = useAuth();
  const instructorId = user?.id_instructor || 1;

  const [sesiones, setSesiones] = useState<SesionInstructorResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [desde, setDesde] = useState<string>("");
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
      setSesiones(Array.isArray(data) ? data : []);
    } catch {
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  }, [instructorId, desde, hasta]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

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

      {/* Filtro por Fechas */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#7a7b7b] font-medium">Filtrar por Fecha:</span>
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
          {sesiones.length} sesiones encontradas
        </span>
      </div>

      {/* Listado de Sesiones */}
      {loading ? (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
          <span className="text-xs text-[#7a7b7b]">Cargando sesiones asignadas...</span>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-10 text-center space-y-2">
          <p className="text-sm text-[#7a7b7b]">
            No tienes sesiones programadas en el periodo consultado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map((s) => (
            <div
              key={s.id_sesion}
              className="bg-white border border-[#e5e5e5] hover:border-[#ff6105]/40 transition-all rounded-[5px] p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                    {s.nombre_sede}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#ffdfcd]/50 text-[#ff6105] border border-[#ff6105]/20">
                    {s.total_inscritos} / {s.cupo_maximo_sesion} alumnos
                  </span>
                </div>

                <h3 className="text-base font-medium text-[#0a0a0a]">
                  {s.nombre_clase}
                </h3>

                <div className="space-y-1 text-xs text-[#7a7b7b]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                    <span>{String(s.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#ff6105]" />
                    <span>{s.hora}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/portal-instructor/asistencia?sesion=${s.id_sesion}`}
                className="w-full py-2 px-3 rounded-[40px] bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Pasar Asistencia ({s.total_inscritos})</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

