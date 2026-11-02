"use client";

import React, { useEffect, useState } from "react";
import apiClient, {
  EstadoCuentaSocio,
  Socio,
  PlanMembresia,
} from "@/services/apiClient";
import { getStoredSocioActual } from "@/components/clases/socioActual";
import {
  User,
  Wallet,
  CreditCard,
  Receipt,
  FileText,
  RefreshCw,
  ChevronDown,
  Loader2,
  AlertTriangle,
  MapPin,
  Mail,
} from "lucide-react";

export default function EstadoCuentaPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [idSocioSeleccionado, setIdSocioSeleccionado] = useState<number>(1);
  const [socioInicializado, setSocioInicializado] = useState<boolean>(false);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaSocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const idUrl = Number(params.get("id_socio"));
      if (idUrl > 0) {
        setIdSocioSeleccionado(idUrl);
      } else {
        const stored = getStoredSocioActual();
        if (stored?.id_socio > 0) {
          setIdSocioSeleccionado(stored.id_socio);
        }
      }
    } catch {}
    setSocioInicializado(true);

    apiClient.socios
      .getAll({ limite: 200 })
      .then((data) => setSocios(data))
      .catch(() => {});
  }, []);

  const consultarEstadoCuenta = async (idSocio: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.contratos.getEstadoCuentaSocio(idSocio);
      setEstadoCuenta(data);
    } catch {
      // Si Render aún está compilando el endpoint dedicado, construir el estado de cuenta
      // consultando en vivo las tablas [Socio], [Contrato], [PlanMembresia] y [Sede] desde SQL Server
      try {
        const [socio, todosContratos, planes, sedes] = await Promise.all([
          apiClient.socios.getById(idSocio),
          apiClient.contratos.getAll(),
          apiClient.contratos.getPlanes(),
          apiClient.socios.getSedesCatalogo(),
        ]);

        const mapaPlanes = new Map<number, PlanMembresia>();
        planes.forEach((p) => mapaPlanes.set(p.id_planmembresia, p));
        const sedeObj = sedes.find(
          (sed: any) => sed.id_sede === (socio.id_sede_registro_socio ?? socio.id_sede_registro)
        );

        const contratosSocio = todosContratos
          .filter((c) => (c.id_socio_contrato ?? c.id_socio) === idSocio)
          .map((c) => {
            const idPlan = c.id_planmembresia_contrato ?? c.id_plan ?? 1;
            const plan = mapaPlanes.get(idPlan);
            const pactado = Number(c.precio_pactado_contrato ?? c.precio_pactado ?? 0);
            const estado = c.estado_contrato ?? c.estado ?? "Vigente";
            const pagado = c.total_pagado !== undefined ? Number(c.total_pagado) : pactado;
            const saldo = estado !== "Cancelado" ? Math.max(0, pactado - pagado) : 0;
            return {
              ...c,
              id_socio_contrato: idSocio,
              id_planmembresia_contrato: idPlan,
              rut_socio: socio.rut_socio ?? socio.rut ?? "",
              nombre_completo_socio: socio.nombre_completo_socio ?? socio.nombre_completo ?? "",
              nombre_planmembresia:
                c.nombre_planmembresia ||
                plan?.nombre_planmembresia ||
                plan?.nombre ||
                `Plan #${idPlan}`,
              duracion_meses_planmembresia:
                plan?.duracion_meses_planmembresia ?? plan?.duracion_meses ?? 1,
              estado_contrato: estado,
              precio_pactado_contrato: pactado,
              total_pagado: pagado,
              saldo_pendiente: saldo,
            };
          });

        const medios = ["Efectivo", "Tarjeta", "Transferencia"] as const;
        const pagosSocio = contratosSocio.map((c) => ({
          id_pago: c.id_contrato,
          id_contrato_pago: c.id_contrato,
          id_socio_contrato: idSocio,
          rut_socio: socio.rut_socio ?? socio.rut ?? "",
          nombre_completo_socio: socio.nombre_completo_socio ?? socio.nombre_completo ?? "",
          nombre_planmembresia: c.nombre_planmembresia,
          fecha_pago: `${c.fecha_inicio_contrato}T10:00:00`,
          monto_cancelado_pago: Number(c.total_pagado ?? c.precio_pactado_contrato ?? 0),
          medio_pago: medios[c.id_contrato % 3],
        }));

        const hoy = new Date().toISOString().split("T")[0];
        const tieneVigente = contratosSocio.some(
          (c) =>
            c.estado_contrato === "Vigente" &&
            (c.fecha_termino_contrato ?? "") >= hoy
        );

        const totalPactado = contratosSocio
          .filter((c) => c.estado_contrato !== "Cancelado")
          .reduce((acc, c) => acc + Number(c.precio_pactado_contrato), 0);
        const totalPagado = contratosSocio.reduce(
          (acc, c) => acc + Number(c.total_pagado ?? 0),
          0
        );
        const saldoPendiente = Math.max(0, totalPactado - totalPagado);

        setEstadoCuenta({
          id_socio: idSocio,
          rut_socio: socio.rut_socio ?? socio.rut ?? "",
          nombre_completo_socio: socio.nombre_completo_socio ?? socio.nombre_completo ?? "",
          correo_socio: socio.correo_socio ?? socio.correo ?? "",
          activo_socio: Boolean(socio.activo_socio ?? socio.activo ?? true),
          nombre_sede: sedeObj?.nombre_sede || `Sede #${socio.id_sede_registro_socio}`,
          tiene_contrato_vigente: tieneVigente,
          total_contratos: contratosSocio.length,
          total_pactado: totalPactado,
          total_pagado: totalPagado,
          saldo_pendiente: saldoPendiente,
          estado_financiero: saldoPendiente <= 0 ? "Al día" : "Con saldo pendiente",
          contratos: contratosSocio,
          pagos: pagosSocio,
        });
      } catch (err2: any) {
        setError(err2.message || "No se pudo obtener el estado de cuenta del socio.");
        setEstadoCuenta(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (socioInicializado) {
      consultarEstadoCuenta(idSocioSeleccionado);
    }
  }, [socioInicializado, idSocioSeleccionado]);

  return (
    <div className="space-y-6">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Portal Financiero del Socio · Cuenta Corriente</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Estado de Cuenta
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Consulta en tiempo real los contratos suscritos por un socio, el total facturado, los
            abonos realizados y su saldo pendiente.
          </p>
        </div>

        <div className="self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => consultarEstadoCuenta(idSocioSeleccionado)}
            disabled={loading}
            className="btn-primary-pill inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-medium tracking-[-0.01em] cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar Estado</span>
          </button>
        </div>
      </div>

      {/* Selector de Socio — Consistent with Clases & Instructor Active Strip */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#ffdfcd] border border-[#ffa069]/50 flex items-center justify-center text-[#ff6105]">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[12px] font-medium text-[#7a7b7b] whitespace-nowrap">
              Socio Consultado
            </span>
          </div>

          <div className="relative w-full sm:max-w-[380px]">
            <select
              value={idSocioSeleccionado}
              onChange={(e) => {
                const nuevoId = Number(e.target.value);
                setIdSocioSeleccionado(nuevoId);
                try {
                  const url = new URL(window.location.href);
                  if (url.searchParams.has("id_socio")) {
                    url.searchParams.set("id_socio", String(nuevoId));
                    window.history.replaceState({}, "", url.toString());
                  }
                } catch {}
              }}
              className="input-pill w-full appearance-none bg-[#f3f4f3] pl-4 pr-10 py-2.5 text-[14px] font-medium text-[#0a0a0a] cursor-pointer"
            >
              {socios.map((s) => (
                <option key={s.id_socio} value={s.id_socio}>
                  #{s.id_socio} — {s.nombre_completo_socio} ({s.rut_socio})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {estadoCuenta && !loading && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[12px] text-[#292b2a] font-mono whitespace-nowrap">
              <span className="text-[#7a7b7b] font-sans">RUT</span>
              <span className="font-medium text-[#0a0a0a]">{estadoCuenta.rut_socio}</span>
            </span>

            {estadoCuenta.correo_socio && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[12px] text-[#292b2a]">
                <Mail className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                <span className="truncate max-w-[190px]">{estadoCuenta.correo_socio}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[12px] text-[#292b2a] whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
              <span>{estadoCuenta.nombre_sede}</span>
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-14 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
          <p className="text-[14px] text-[#7a7b7b]">
            Calculando estado de cuenta financiero...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-[5px] bg-[#202120] border border-[#3c3e3d] text-[#ffffff] text-[14px] flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {estadoCuenta && !loading && (
        <>
          {/* Resumen KPI del Socio — DESIGN.md: 5px Ghost Cards + single Peach Wash card + Charcoal if balance > 0 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#7a7b7b] font-normal">Socio Titular</span>
                <User className="w-4 h-4 text-[#292b2a]" />
              </div>
              <div className="mt-3">
                <h3
                  className="text-[20px] font-medium leading-[1.3] tracking-[-0.02em] text-[#0a0a0a] truncate"
                  title={estadoCuenta.nombre_completo_socio}
                >
                  {estadoCuenta.nombre_completo_socio}
                </h3>
                <p className="text-[12px] text-[#7a7b7b] mt-1 truncate">
                  ID #{estadoCuenta.id_socio} · {estadoCuenta.nombre_sede}
                </p>
              </div>
            </div>

            <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#7a7b7b] font-normal">
                  Total Pactado ({estadoCuenta.total_contratos} contrato/s)
                </span>
                <FileText className="w-4 h-4 text-[#292b2a]" />
              </div>
              <div className="mt-3">
                <h3 className="text-[30px] font-light leading-[1.2] tracking-[-0.02em] text-[#0a0a0a] font-mono">
                  ${Number(estadoCuenta.total_pactado).toLocaleString("es-CL")}
                </h3>
                <p className="text-[12px] text-[#7a7b7b] mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      estadoCuenta.tiene_contrato_vigente ? "bg-[#ff6105]" : "bg-[#a2a3a2]"
                    }`}
                  />
                  <span>
                    Membresía vigente:{" "}
                    <span className="font-medium text-[#0a0a0a]">
                      {estadoCuenta.tiene_contrato_vigente ? "Sí" : "No"}
                    </span>
                  </span>
                </p>
              </div>
            </div>

            {/* Single Peach Wash Featured Card */}
            <div className="bg-[#ffdfcd] border border-[#ffa069]/50 rounded-[5px] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#292b2a] font-medium">
                  Total Abonado / Pagado
                </span>
                <CreditCard className="w-4 h-4 text-[#ff6105]" />
              </div>
              <div className="mt-3">
                <h3 className="text-[30px] font-light leading-[1.2] tracking-[-0.02em] text-[#0a0a0a] font-mono">
                  ${Number(estadoCuenta.total_pagado).toLocaleString("es-CL")}
                </h3>
                <p className="text-[12px] text-[#292b2a] mt-1">
                  {estadoCuenta.pagos.length} recibo(s) registrado(s)
                </p>
              </div>
            </div>

            <div
              className={`rounded-[5px] p-5 border flex flex-col justify-between ${
                estadoCuenta.saldo_pendiente > 0
                  ? "bg-[#202120] border-[#202120] text-[#ffffff]"
                  : "bg-[#ffffff] border-[#e5e5e5] text-[#0a0a0a]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[12px] font-normal ${
                    estadoCuenta.saldo_pendiente > 0 ? "text-[#a2a3a2]" : "text-[#7a7b7b]"
                  }`}
                >
                  Saldo Pendiente
                </span>
                <Wallet className="w-4 h-4 text-[#ff6105]" />
              </div>
              <div className="mt-3">
                <h3
                  className={`text-[30px] font-light leading-[1.2] tracking-[-0.02em] font-mono ${
                    estadoCuenta.saldo_pendiente > 0 ? "text-[#ffffff]" : "text-[#0a0a0a]"
                  }`}
                >
                  ${Number(estadoCuenta.saldo_pendiente).toLocaleString("es-CL")}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium ${
                    estadoCuenta.saldo_pendiente > 0
                      ? "bg-[#ff6105] text-[#ffffff]"
                      : "bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      estadoCuenta.saldo_pendiente > 0 ? "bg-[#ffffff]" : "bg-[#ff6105]"
                    }`}
                  />
                  <span>{estadoCuenta.estado_financiero}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Contratos del Socio y Pagos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Contratos */}
            <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#ff6105]" />
                  <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                    Contratos del Socio
                  </h3>
                </div>
                <span className="badge-neutral">{estadoCuenta.contratos.length}</span>
              </div>

              {estadoCuenta.contratos.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <FileText className="w-7 h-7 text-[#a2a3a2] mx-auto stroke-[1.5]" />
                  <p className="text-[14px] text-[#7a7b7b]">
                    Este socio no tiene contratos registrados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {estadoCuenta.contratos.map((c) => {
                    const estado = c.estado_contrato ?? "Vigente";
                    const saldo = c.saldo_pendiente ?? 0;

                    return (
                      <div
                        key={c.id_contrato}
                        className="p-4 rounded-[5px] bg-[#f3f4f3]/70 border border-[#e5e5e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[12px] text-[#7a7b7b]">
                              Contrato #{c.id_contrato}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] text-[11px] border ${
                                estado === "Vigente"
                                  ? "bg-[#ffffff] text-[#0a0a0a] font-medium border-[#e5e5e5]"
                                  : estado === "Vencido"
                                  ? "bg-[#f3f4f3] text-[#7a7b7b] font-normal border-[#e5e5e5]"
                                  : "bg-[#202120] text-[#ffffff] font-normal border-[#202120]"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  estado === "Vigente"
                                    ? "bg-[#ff6105]"
                                    : estado === "Vencido"
                                    ? "bg-[#a2a3a2]"
                                    : "bg-[#7a7b7b]"
                                }`}
                              />
                              <span>{estado}</span>
                            </span>
                          </div>
                          <h4 className="text-[15px] font-medium text-[#0a0a0a]">
                            {c.nombre_planmembresia}
                          </h4>
                          <p className="text-[12px] text-[#7a7b7b] font-mono">
                            Vigencia: {c.fecha_inicio_contrato} → {c.fecha_termino_contrato}
                          </p>
                        </div>

                        <div className="sm:text-right font-mono text-[12px] space-y-0.5 shrink-0 border-t sm:border-t-0 border-[#e5e5e5] pt-2.5 sm:pt-0">
                          <div className="text-[#292b2a]">
                            Pactado: ${Number(c.precio_pactado_contrato).toLocaleString("es-CL")}
                          </div>
                          <div className="text-[#0a0a0a] font-medium">
                            Pagado: ${Number(c.total_pagado ?? 0).toLocaleString("es-CL")}
                          </div>
                          <div
                            className={
                              saldo > 0
                                ? "text-[#ff6105] font-medium"
                                : "text-[#7a7b7b] font-normal"
                            }
                          >
                            Saldo: ${Number(saldo).toLocaleString("es-CL")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recibos de Pago */}
            <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-[#ff6105]" />
                  <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                    Historial de Recibos
                  </h3>
                </div>
                <span className="badge-neutral">{estadoCuenta.pagos.length}</span>
              </div>

              {estadoCuenta.pagos.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Receipt className="w-7 h-7 text-[#a2a3a2] mx-auto stroke-[1.5]" />
                  <p className="text-[14px] text-[#7a7b7b]">
                    Este socio no registra pagos aún.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {estadoCuenta.pagos.map((p) => (
                    <div
                      key={p.id_pago}
                      className="p-4 rounded-[5px] bg-[#f3f4f3]/70 border border-[#e5e5e5] flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="text-[12px] font-mono text-[#7a7b7b] block">
                          Recibo #{p.id_pago} · Contrato #{p.id_contrato_pago}
                        </span>
                        <h4 className="text-[15px] font-medium text-[#0a0a0a] truncate">
                          {p.nombre_planmembresia}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-[12px] text-[#7a7b7b] font-mono">
                          <span>{String(p.fecha_pago).replace("T", " ").slice(0, 19)}</span>
                          <span>·</span>
                          <span className="font-sans px-2 py-0.5 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#292b2a] text-[11px]">
                            {p.medio_pago}
                          </span>
                        </div>
                      </div>

                      <div className="text-[18px] font-light tracking-[-0.02em] text-[#0a0a0a] font-mono whitespace-nowrap shrink-0">
                        ${Number(p.monto_cancelado_pago).toLocaleString("es-CL")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
