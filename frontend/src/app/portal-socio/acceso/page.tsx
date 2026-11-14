"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient, { ControlAccesoResult, Socio } from "@/services/apiClient";
import {
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Clock,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function MiAccesoPage() {
  const { user } = useAuth();
  const socioId = user?.id_socio || 1;

  const [socioInfo, setSocioInfo] = useState<Socio | null>(null);
  const [testingAcceso, setTestingAcceso] = useState<boolean>(false);
  const [resultadoAcceso, setResultadoAcceso] = useState<ControlAccesoResult | null>(null);
  const [horaValidacion, setHoraValidacion] = useState<string | null>(null);

  useEffect(() => {
    if (!socioId) return;
    apiClient.socios
      .getById(socioId)
      .then((data) => setSocioInfo(data))
      .catch(() => {});
  }, [socioId]);

  const handleValidarAcceso = async () => {
    if (!socioId) return;
    setTestingAcceso(true);
    setResultadoAcceso(null);
    try {
      const res = await apiClient.socios.validarAcceso(socioId);
      setResultadoAcceso(res);
      setHoraValidacion(new Date().toLocaleTimeString("es-CL"));
    } catch (err: any) {
      setResultadoAcceso({
        acceso_permitido: false,
        motivo:
          err.response?.data?.detail ||
          err.message ||
          "Error de comunicación con el torniquete.",
      });
      setHoraValidacion(new Date().toLocaleTimeString("es-CL"));
    } finally {
      setTestingAcceso(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-scale">
      {/* Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
            Control de Acceso
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light text-[#0a0a0a] tracking-[-0.03em]">
          Mi Credencial &amp; Torniquete Virtual
        </h1>
        <p className="text-xs sm:text-sm text-[#7a7b7b]">
          Tu pase digital oficial para ingresar a las sedes de la red GimnasioDB.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta Credencial Digital */}
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#7a7b7b]">
                Credencial de Socio
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                {socioInfo?.activo_socio !== false ? "Socio Activo" : "Inactivo"}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-medium text-[#0a0a0a]">
                {socioInfo?.nombre_completo_socio || user?.nombre_completo || user?.username}
              </h2>
              <p className="text-xs text-[#7a7b7b]">
                RUT: {socioInfo?.rut_socio || "—"} · Correo: {socioInfo?.correo_socio || user?.username}
              </p>
            </div>

            <div className="p-4 rounded-[5px] bg-[#f8f9f8] border border-[#e5e5e5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#7a7b7b]">ID de Membresía:</span>
                <strong className="font-mono text-[#0a0a0a]">#{socioId}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7a7b7b]">Sede de Registro:</span>
                <span className="font-medium text-[#0a0a0a]">
                  {socioInfo?.id_sede_registro_socio
                    ? `Sede #${socioInfo.id_sede_registro_socio}`
                    : "Sede Principal"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7a7b7b]">Acceso Multisede:</span>
                <span className="text-emerald-700 font-medium">Habilitado</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleValidarAcceso}
            disabled={testingAcceso}
            className="w-full py-3 px-4 rounded-[40px] bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-60"
          >
            {testingAcceso ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando en Torniquete...</span>
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4" />
                <span>Simular Pase por Torniquete</span>
              </>
            )}
          </button>
        </div>

        {/* Panel de Respuesta del Torniquete */}
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-5 flex flex-col justify-center">
          <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#7a7b7b]">
              Sensor de Acceso
            </span>
            {horaValidacion && (
              <span className="text-[11px] text-[#7a7b7b]">
                {horaValidacion}
              </span>
            )}
          </div>

          {!resultadoAcceso ? (
            <div className="py-12 text-center space-y-2 text-xs text-[#7a7b7b]">
              <ScanLine className="w-8 h-8 mx-auto text-[#a2a3a2]" />
              <p>
                Haz clic en <strong>&quot;Simular Pase por Torniquete&quot;</strong> para verificar si tu membresía te permite ingresar hoy.
              </p>
            </div>
          ) : (
            <div
              className={`p-6 rounded-[5px] border space-y-3 ${
                resultadoAcceso.acceso_permitido
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                  : "bg-rose-50/70 border-rose-300 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {resultadoAcceso.acceso_permitido ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
                )}
                <div>
                  <h3 className="text-lg font-medium">
                    {resultadoAcceso.acceso_permitido
                      ? "Acceso Autorizado"
                      : "Acceso Denegado"}
                  </h3>
                  <span className="text-xs opacity-80">
                    Torniquete de Entrada GimnasioDB
                  </span>
                </div>
              </div>

              <div className="text-xs leading-relaxed pt-1">
                <strong>Motivo del Sistema:</strong> {resultadoAcceso.motivo}
              </div>

              {resultadoAcceso.sede_registro && (
                <div className="text-[11px] opacity-80 pt-1">
                  Sede: {resultadoAcceso.sede_registro}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

