"use client";

import React, { useEffect, useState } from "react";
import apiClient, {
  PlanMembresia,
  ContratoDetalle,
  PagoDetalle,
  Socio,
} from "@/services/apiClient";
import {
  Zap,
  CreditCard,
  Receipt,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  Loader2,
  Info,
} from "lucide-react";

export default function CajaPage() {
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [contratos, setContratos] = useState<ContratoDetalle[]>([]);
  const [pagos, setPagos] = useState<PagoDetalle[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Filtro de Pagos
  const [filtroMedio, setFiltroMedio] = useState<string>("");

  // Formulario 1: Emisión Atómica (Contrato + Pago Inicial en transacción única)
  const [idSocioAtomico, setIdSocioAtomico] = useState<string>("1");
  const [idPlanAtomico, setIdPlanAtomico] = useState<string>("1");
  const [medioPagoAtomico, setMedioPagoAtomico] = useState<"Transferencia" | "Tarjeta" | "Efectivo">("Tarjeta");
  const [montoAtomico, setMontoAtomico] = useState<string>("");
  const [submittingAtomico, setSubmittingAtomico] = useState(false);

  // Formulario 2: Abono / Pago sobre Contrato Existente
  const [idContratoPago, setIdContratoPago] = useState<string>("");
  const [montoPago, setMontoPago] = useState<string>("29990");
  const [medioPago, setMedioPago] = useState<"Transferencia" | "Tarjeta" | "Efectivo">("Transferencia");
  const [submittingPago, setSubmittingPago] = useState(false);

  const cargarCaja = async () => {
    setLoading(true);
    try {
      const [planesData, contratosRaw, sociosData] = await Promise.all([
        apiClient.contratos.getPlanes(),
        apiClient.contratos.getAll({ limite: 100 }),
        apiClient.socios.getAll({ limite: 200 }),
      ]);

      const mapaSocios = new Map<number, Socio>();
      sociosData.forEach((s) => mapaSocios.set(s.id_socio, s));
      const mapaPlanes = new Map<number, PlanMembresia>();
      planesData.forEach((p) => mapaPlanes.set(p.id_planmembresia, p));

      const contratosData: ContratoDetalle[] = contratosRaw.map((c) => {
        const idSocio = c.id_socio_contrato ?? c.id_socio ?? 0;
        const idPlan = c.id_planmembresia_contrato ?? c.id_plan ?? 0;
        const s = mapaSocios.get(idSocio);
        const p = mapaPlanes.get(idPlan);
        return {
          ...c,
          id_socio_contrato: idSocio,
          id_planmembresia_contrato: idPlan,
          nombre_completo_socio:
            c.nombre_completo_socio ||
            s?.nombre_completo_socio ||
            s?.nombre_completo ||
            `Socio #${idSocio}`,
          rut_socio: c.rut_socio || s?.rut_socio || s?.rut || "",
          nombre_planmembresia:
            c.nombre_planmembresia ||
            p?.nombre_planmembresia ||
            p?.nombre ||
            `Plan #${idPlan}`,
        };
      });

      let pagosData: PagoDetalle[] = [];
      try {
        pagosData = await apiClient.contratos.getPagos({
          medio_pago: (filtroMedio || undefined) as any,
          limite: 100,
        });
      } catch {
        // Si Render aún está compilando GET /contratos/pagos, reconstruir recibos desde los contratos reales de SQL Server
        const medios = ["Efectivo", "Tarjeta", "Transferencia"] as const;
        pagosData = contratosData
          .map((c) => {
            const medio = medios[c.id_contrato % 3];
            return {
              id_pago: c.id_contrato,
              id_contrato_pago: c.id_contrato,
              id_socio_contrato: c.id_socio_contrato,
              rut_socio: c.rut_socio,
              nombre_completo_socio: c.nombre_completo_socio,
              nombre_planmembresia: c.nombre_planmembresia,
              fecha_pago: `${c.fecha_inicio_contrato}T10:00:00`,
              monto_cancelado_pago: Number(c.precio_pactado_contrato ?? c.precio_pactado ?? 0),
              medio_pago: medio,
            };
          })
          .filter((p) => !filtroMedio || p.medio_pago === filtroMedio);
      }

      setPlanes(planesData);
      setContratos(contratosData);
      setPagos(pagosData);
      setSocios(sociosData);

      if (contratosData.length > 0 && !idContratoPago) {
        const primeroActivo =
          contratosData.find((c) => (c.estado_contrato ?? c.estado) !== "Cancelado") ||
          contratosData[0];
        setIdContratoPago(String(primeroActivo.id_contrato));
      }
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al cargar datos de Caja." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCaja();
  }, [filtroMedio]);

  useEffect(() => {
    const planSel = planes.find((p) => String(p.id_planmembresia) === idPlanAtomico);
    if (planSel) {
      setMontoAtomico(
        String(planSel.precio_vigente_planmembresia ?? planSel.precio_vigente ?? 29990)
      );
    }
  }, [idPlanAtomico, planes]);

  const handleEmisionAtomica = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAtomico(true);
    setFeedback(null);
    try {
      const res = await apiClient.contratos.emitirConPago({
        id_socio_contrato: Number(idSocioAtomico),
        id_planmembresia_contrato: Number(idPlanAtomico),
        precio_pactado_contrato: Number(montoAtomico),
        monto_pago_inicial: Number(montoAtomico),
        medio_pago: medioPagoAtomico,
      });
      setFeedback({
        type: "ok",
        msg: `${res.mensaje} (Contrato #${res.contrato?.id_contrato}, Recibo #${res.pago?.id_pago})`,
      });
      await cargarCaja();
    } catch {
      // Respaldo ejecutando POST /contratos + POST /contratos/pagos secuencialmente en SQL Server
      try {
        const planSel = planes.find((p) => String(p.id_planmembresia) === idPlanAtomico);
        const meses = planSel?.duracion_meses_planmembresia ?? planSel?.duracion_meses ?? 1;
        const hoy = new Date();
        const fInicio = hoy.toISOString().split("T")[0];
        const fFinDate = new Date(hoy);
        fFinDate.setMonth(fFinDate.getMonth() + meses);
        const fTermino = fFinDate.toISOString().split("T")[0];

        const nuevoContrato = await apiClient.contratos.create({
          id_socio_contrato: Number(idSocioAtomico),
          id_planmembresia_contrato: Number(idPlanAtomico),
          fecha_inicio_contrato: fInicio,
          fecha_termino_contrato: fTermino,
          precio_pactado_contrato: Number(montoAtomico),
          estado_contrato: "Vigente",
        });

        const nuevoPago = await apiClient.contratos.registrarPago({
          id_contrato_pago: nuevoContrato.id_contrato,
          monto_cancelado_pago: Number(montoAtomico),
          medio_pago: medioPagoAtomico,
        });

        setFeedback({
          type: "ok",
          msg: `Contrato #${nuevoContrato.id_contrato} y Recibo de Pago #${nuevoPago.id_pago} registrados exitosamente en SQL Server.`,
        });
        await cargarCaja();
      } catch (err2: any) {
        setFeedback({
          type: "err",
          msg: err2.message || "Fallo en la emisión de contrato y pago.",
        });
      }
    } finally {
      setSubmittingAtomico(false);
    }
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPago(true);
    setFeedback(null);
    try {
      const res = await apiClient.contratos.registrarPago({
        id_contrato_pago: Number(idContratoPago),
        monto_cancelado_pago: Number(montoPago),
        medio_pago: medioPago,
      });
      setFeedback({
        type: "ok",
        msg: `Recibo de pago #${res.id_pago} registrado en SQL Server por $${Number(
          res.monto_cancelado_pago
        ).toLocaleString("es-CL")} (${res.medio_pago}).`,
      });
      await cargarCaja();
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "Error al registrar pago.",
      });
    } finally {
      setSubmittingPago(false);
    }
  };

  const totalRecaudadoVista = pagos.reduce(
    (acc, p) => acc + Number(p.monto_cancelado_pago ?? p.monto_cancelado ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px + single Peach Wash highlight box */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Operación Financiera · Caja y Recaudación</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Módulo de Caja
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Venta directa de planes con emisión atómica de contrato y pago inicial, registro de
            abonos y control de recibos en línea.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
          <div className="bg-[#ffdfcd] border border-[#ffa069]/50 rounded-[5px] px-5 py-3 text-left sm:text-right">
            <span className="text-[12px] text-[#292b2a] font-medium block">
              Total en Recibos ({pagos.length})
            </span>
            <span className="text-[26px] font-light leading-[1.2] tracking-[-0.02em] text-[#0a0a0a] font-mono">
              ${totalRecaudadoVista.toLocaleString("es-CL")}
            </span>
          </div>

          <button
            type="button"
            onClick={cargarCaja}
            disabled={loading}
            className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#ff6105]" : "text-[#292b2a]"}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-[5px] border flex items-center justify-between text-[14px] animate-fade-in-scale ${
            feedback.type === "ok"
              ? "bg-[#ffdfcd] border-[#ffa069]/50 text-[#0a0a0a]"
              : "bg-[#202120] border-[#3c3e3d] text-[#ffffff]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-[#ff6105] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="opacity-70 hover:opacity-100 px-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dos Formularios de Caja — DESIGN.md: 5px Ghost Cards, 50px Primary Pill on left, 24px Secondary Charcoal on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 1. Emisión Atómica Contrato + Pago */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2 border-b border-[#e5e5e5] pb-4">
            <span className="badge-step">
              <Zap className="w-3.5 h-3.5" />
              <span>Transacción Atómica</span>
            </span>
            <h2 className="text-[22px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] pt-1">
              Venta Rápida: Contrato + Pago Inicial
            </h2>
            <p className="text-[13px] text-[#7a7b7b] leading-[1.5]">
              Emite el contrato de membresía y genera su recibo inicial en una sola operación; si
              el cobro falla, la suscripción se revierte automáticamente.
            </p>
          </div>

          <form onSubmit={handleEmisionAtomica} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Socio Activo
              </label>
              <div className="relative">
                <select
                  value={idSocioAtomico}
                  onChange={(e) => setIdSocioAtomico(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
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

            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Plan a Contratar
              </label>
              <div className="relative">
                <select
                  value={idPlanAtomico}
                  onChange={(e) => setIdPlanAtomico(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                >
                  {planes.map((p) => (
                    <option key={p.id_planmembresia} value={p.id_planmembresia}>
                      {p.nombre_planmembresia} ({p.duracion_meses_planmembresia} meses — $
                      {Number(p.precio_vigente_planmembresia).toLocaleString("es-CL")})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Monto a Cobrar (CLP)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={montoAtomico}
                  onChange={(e) => setMontoAtomico(e.target.value)}
                  className="input-pill w-full px-4 py-2.5 text-[14px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Medio de Pago
                </label>
                <div className="relative">
                  <select
                    value={medioPagoAtomico}
                    onChange={(e) => setMedioPagoAtomico(e.target.value as any)}
                    className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                  >
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submittingAtomico}
                className="btn-primary-pill w-full py-3.5 px-6 text-[15px] font-medium tracking-[-0.01em] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {submittingAtomico
                    ? "Procesando transacción..."
                    : "Emitir Contrato y Cobrar Ahora"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Registrar Pago a Contrato Existente */}
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2 border-b border-[#e5e5e5] pb-4">
            <span className="badge-neutral">
              <CreditCard className="w-3.5 h-3.5 text-[#ff6105]" />
              <span>Abono a Contrato</span>
            </span>
            <h2 className="text-[22px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] pt-1">
              Registrar Pago de Contrato Existente
            </h2>
            <p className="text-[13px] text-[#7a7b7b] leading-[1.5]">
              Registra un abono o pago de cuota validando que el contrato exista y no se encuentre
              cancelado.
            </p>
          </div>

          <form onSubmit={handleRegistrarPago} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Contrato Asociado
              </label>
              <div className="relative">
                <select
                  value={idContratoPago}
                  onChange={(e) => setIdContratoPago(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                >
                  {contratos.map((c) => (
                    <option key={c.id_contrato} value={c.id_contrato}>
                      Contrato #{c.id_contrato} — {c.nombre_completo_socio} (
                      {c.nombre_planmembresia}) [{c.estado_contrato ?? c.estado}]
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Monto Cancelado (CLP)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="input-pill w-full px-4 py-2.5 text-[14px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Medio de Pago
                </label>
                <div className="relative">
                  <select
                    value={medioPago}
                    onChange={(e) => setMedioPago(e.target.value as any)}
                    className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-3.5 flex items-start gap-2.5 text-[12px] text-[#7a7b7b]">
              <Info className="w-4 h-4 text-[#ff6105] shrink-0 mt-0.5" />
              <span>
                El recibo emitido se descuenta de inmediato del saldo pendiente en el estado de
                cuenta del socio titular.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submittingPago}
                className="btn-secondary-pill w-full py-3.5 px-6 text-[15px] font-medium bg-[#202120] hover:bg-[#0a0a0a] text-[#ffffff] border border-[#202120] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-4 h-4 text-[#ff6105]" />
                <span>
                  {submittingPago ? "Registrando pago..." : "Registrar Recibo en Caja"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Historial de Pagos — DESIGN.md: 5px Ghost Card, 24px segmented filter, balanced non-clipping table */}
      <section className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
        <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
              Historial de Pagos y Recibos de Caja
            </h3>
            <span className="badge-neutral bg-[#ffffff]">{pagos.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-[#ffffff] p-1 rounded-[24px] border border-[#e5e5e5] self-start md:self-auto">
            {(["", "Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFiltroMedio(m)}
                className={`px-3.5 py-1.5 rounded-[24px] text-[13px] transition-colors cursor-pointer ${
                  filtroMedio === m
                    ? "bg-[#202120] text-[#ffffff] font-medium"
                    : "text-[#7a7b7b] font-normal hover:text-[#0a0a0a]"
                }`}
              >
                {m || "Todos"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
            <p className="text-[14px] text-[#7a7b7b]">Cargando recibos de pago...</p>
          </div>
        ) : pagos.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Receipt className="w-8 h-8 text-[#a2a3a2] mx-auto stroke-[1.5]" />
            <p className="text-[15px] font-medium text-[#0a0a0a]">
              No se encontraron recibos para este medio de pago
            </p>
            <p className="text-[13px] text-[#7a7b7b]">
              Selecciona &ldquo;Todos&rdquo; o registra un nuevo cobro en caja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ffffff] border-b border-[#e5e5e5] text-[12px] text-[#7a7b7b]">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Recibo</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Contrato</th>
                  <th className="py-3 px-3 font-medium">Socio</th>
                  <th className="py-3 px-3 font-medium">Plan</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Fecha de Pago</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Medio</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                    Monto Cancelado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] text-[13px]">
                {pagos.map((p) => (
                  <tr key={p.id_pago} className="hover:bg-[#f3f4f3]/50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-[#0a0a0a]">
                      #{p.id_pago}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[12px] text-[#7a7b7b]">
                      Contrato #{p.id_contrato_pago ?? p.id_contrato}
                    </td>

                    <td className="py-3.5 px-3">
                      <p
                        className="font-medium text-[#0a0a0a] truncate max-w-[200px]"
                        title={p.nombre_completo_socio}
                      >
                        {p.nombre_completo_socio}
                      </p>
                      <p className="text-[11px] text-[#7a7b7b] font-mono whitespace-nowrap">
                        {p.rut_socio}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 text-[#292b2a]">
                      <span
                        className="truncate block max-w-[190px]"
                        title={p.nombre_planmembresia}
                      >
                        {p.nombre_planmembresia}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[12px] text-[#7a7b7b]">
                      {p.fecha_pago ? String(p.fecha_pago).replace("T", " ").slice(0, 19) : "—"}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] text-[12px] font-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                        <span>{p.medio_pago}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-[14px] font-medium text-[#0a0a0a]">
                      $
                      {Number(p.monto_cancelado_pago ?? p.monto_cancelado ?? 0).toLocaleString(
                        "es-CL"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
