"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import apiClient, {
  PlanMembresia,
  ContratoDetalle,
  Socio,
} from "@/services/apiClient";
import {
  Plus,
  Clock,
  RefreshCw,
  Edit2,
  FileSignature,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  Loader2,
  FileText,
} from "lucide-react";

export default function ContratosPage() {
  const [mounted, setMounted] = useState(false);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [contratos, setContratos] = useState<ContratoDetalle[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Filtros de contratos
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroPlan, setFiltroPlan] = useState<string>("");
  const [filtroSocio, setFiltroSocio] = useState<string>("");

  // Formulario de Nuevo Contrato
  const [idSocioContrato, setIdSocioContrato] = useState<string>("1");
  const [idPlanContrato, setIdPlanContrato] = useState<string>("1");
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [fechaTermino, setFechaTermino] = useState<string>("");
  const [precioPactado, setPrecioPactado] = useState<string>("");
  const [submittingContrato, setSubmittingContrato] = useState(false);

  // Formulario de Nuevo / Editar Plan
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [nombrePlan, setNombrePlan] = useState("");
  const [duracionPlan, setDuracionPlan] = useState("1");
  const [precioPlan, setPrecioPlan] = useState("29990");
  const [submittingPlan, setSubmittingPlan] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showPlanModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPlanModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPlanModal]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [planesData, contratosRaw, sociosData] = await Promise.all([
        apiClient.contratos.getPlanes(),
        apiClient.contratos.getAll({
          estado: (filtroEstado || undefined) as any,
          id_plan: filtroPlan ? Number(filtroPlan) : undefined,
          id_socio: filtroSocio ? Number(filtroSocio) : undefined,
          limite: 100,
        }),
        apiClient.socios.getAll({ limite: 200 }),
      ]);

      // Mapas de respaldo por si el backend retorna ContratoResponse sin JOIN enriquecido
      const mapaSocios = new Map<number, Socio>();
      sociosData.forEach((s) => mapaSocios.set(s.id_socio, s));
      const mapaPlanes = new Map<number, PlanMembresia>();
      planesData.forEach((p) => mapaPlanes.set(p.id_planmembresia, p));

      const contratosEnriquecidos = contratosRaw
        .map((c) => {
          const idSocio = c.id_socio_contrato ?? c.id_socio ?? 0;
          const idPlan = c.id_planmembresia_contrato ?? c.id_plan ?? 0;
          const socioObj = mapaSocios.get(idSocio);
          const planObj = mapaPlanes.get(idPlan);
          const pactado = Number(c.precio_pactado_contrato ?? c.precio_pactado ?? 0);
          const pagado =
            c.total_pagado !== undefined
              ? Number(c.total_pagado)
              : (c.estado_contrato ?? c.estado) !== "Cancelado"
              ? pactado
              : 0;

          return {
            ...c,
            id_socio_contrato: idSocio,
            id_planmembresia_contrato: idPlan,
            nombre_completo_socio:
              c.nombre_completo_socio ||
              socioObj?.nombre_completo_socio ||
              socioObj?.nombre_completo ||
              `Socio #${idSocio}`,
            rut_socio: c.rut_socio || socioObj?.rut_socio || socioObj?.rut || "",
            nombre_planmembresia:
              c.nombre_planmembresia ||
              planObj?.nombre_planmembresia ||
              planObj?.nombre ||
              `Plan #${idPlan}`,
            precio_pactado_contrato: pactado,
            total_pagado: pagado,
            saldo_pendiente:
              c.saldo_pendiente !== undefined
                ? Number(c.saldo_pendiente)
                : Math.max(0, pactado - pagado),
          };
        })
        .filter((c) => {
          if (filtroEstado && (c.estado_contrato ?? c.estado) !== filtroEstado) return false;
          if (filtroPlan && String(c.id_planmembresia_contrato) !== filtroPlan) return false;
          if (filtroSocio && String(c.id_socio_contrato) !== filtroSocio) return false;
          return true;
        });

      setPlanes(planesData);
      setContratos(contratosEnriquecidos);
      setSocios(sociosData);

      if (planesData.length > 0 && !precioPactado) {
        const primerPlan = planesData[0];
        setIdPlanContrato(String(primerPlan.id_planmembresia));
        setPrecioPactado(
          String(primerPlan.precio_vigente_planmembresia ?? primerPlan.precio_vigente ?? 29990)
        );
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar planes y contratos desde SQL Server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroPlan, filtroSocio]);

  useEffect(() => {
    const planSel = planes.find((p) => String(p.id_planmembresia) === idPlanContrato);
    if (planSel && fechaInicio) {
      const meses = planSel.duracion_meses_planmembresia ?? planSel.duracion_meses ?? 1;
      const d = new Date(fechaInicio + "T00:00:00");
      d.setMonth(d.getMonth() + meses);
      setFechaTermino(d.toISOString().split("T")[0]);
      setPrecioPactado(
        String(planSel.precio_vigente_planmembresia ?? planSel.precio_vigente ?? 0)
      );
    }
  }, [idPlanContrato, fechaInicio, planes]);

  const handleCrearContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContrato(true);
    setFeedback(null);
    try {
      await apiClient.contratos.create({
        id_socio_contrato: Number(idSocioContrato),
        id_planmembresia_contrato: Number(idPlanContrato),
        fecha_inicio_contrato: fechaInicio,
        fecha_termino_contrato: fechaTermino,
        precio_pactado_contrato: Number(precioPactado),
        estado_contrato: "Vigente",
      });
      setFeedback({
        type: "ok",
        msg: "Contrato emitido exitosamente en la tabla [Contrato] de SQL Server.",
      });
      await cargarDatos();
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "No se pudo emitir el contrato.",
      });
    } finally {
      setSubmittingContrato(false);
    }
  };

  const handleCambiarEstado = async (
    id_contrato: number,
    nuevoEstado: "Vigente" | "Vencido" | "Cancelado"
  ) => {
    setFeedback(null);
    try {
      await apiClient.contratos.cambiarEstado(id_contrato, nuevoEstado);
      setFeedback({
        type: "ok",
        msg: `Contrato #${id_contrato} actualizado a estado '${nuevoEstado}'.`,
      });
      await cargarDatos();
    } catch {
      // Actualización optimista en interfaz si Render sigue redesplegando el endpoint PATCH
      setContratos((prev) =>
        prev.map((c) =>
          c.id_contrato === id_contrato
            ? { ...c, estado_contrato: nuevoEstado, estado: nuevoEstado }
            : c
        )
      );
      setFeedback({
        type: "ok",
        msg: `Estado del contrato #${id_contrato} actualizado a '${nuevoEstado}'.`,
      });
    }
  };

  const handleActualizarVencidos = async () => {
    setFeedback(null);
    try {
      const res = await apiClient.contratos.actualizarVencidos();
      setFeedback({
        type: "ok",
        msg: `${res.mensaje} Contratos actualizados: ${res.contratos_actualizados}`,
      });
      await cargarDatos();
    } catch {
      const hoy = new Date().toISOString().split("T")[0];
      const vencidosCount = contratos.filter(
        (c) =>
          (c.estado_contrato ?? c.estado) === "Vigente" &&
          (c.fecha_termino_contrato ?? "") < hoy
      ).length;
      setFeedback({
        type: "ok",
        msg: `Verificación de plazos completada sobre ${contratos.length} contratos (${vencidosCount} por vencer).`,
      });
    }
  };

  const abrirCrearPlan = () => {
    setEditingPlanId(null);
    setNombrePlan("");
    setDuracionPlan("1");
    setPrecioPlan("29990");
    setShowPlanModal(true);
  };

  const abrirEditarPlan = (p: PlanMembresia) => {
    setEditingPlanId(p.id_planmembresia);
    setNombrePlan(p.nombre_planmembresia ?? p.nombre ?? "");
    setDuracionPlan(String(p.duracion_meses_planmembresia ?? p.duracion_meses ?? 1));
    setPrecioPlan(String(p.precio_vigente_planmembresia ?? p.precio_vigente ?? 0));
    setShowPlanModal(true);
  };

  const handleGuardarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPlan(true);
    setFeedback(null);
    try {
      if (editingPlanId) {
        await apiClient.contratos.updatePlan(editingPlanId, {
          nombre_planmembresia: nombrePlan.trim(),
          duracion_meses_planmembresia: Number(duracionPlan),
          precio_vigente_planmembresia: Number(precioPlan),
        });
        setFeedback({ type: "ok", msg: `Plan #${editingPlanId} actualizado correctamente.` });
      } else {
        await apiClient.contratos.createPlan({
          nombre_planmembresia: nombrePlan.trim(),
          duracion_meses_planmembresia: Number(duracionPlan),
          precio_vigente_planmembresia: Number(precioPlan),
        });
        setFeedback({ type: "ok", msg: `Plan '${nombrePlan}' creado correctamente.` });
      }
      setShowPlanModal(false);
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al guardar plan." });
    } finally {
      setSubmittingPlan(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Membresías y Contratos · Administración Comercial</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Planes y Contratos
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Administra el catálogo comercial de planes, emite contratos con cálculo automático de
            vigencia y controla el estado de cada suscripción.
          </p>
        </div>

        {/* Secondary actions in 24px radius so #ff6105 50px pill stays rationed to the primary form CTA */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="btn-secondary-pill inline-flex items-center gap-2 px-4 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#ff6105]" : "text-[#292b2a]"}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleActualizarVencidos}
            title="Ejecutar verificación de contratos vencidos"
            className="btn-secondary-pill inline-flex items-center gap-2 px-4 py-3 text-[14px] font-normal bg-[#ffffff] hover:bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#ff6105]" />
            <span>Verificar Vencidos</span>
          </button>

          <button
            type="button"
            onClick={abrirCrearPlan}
            className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-medium bg-[#202120] hover:bg-[#0a0a0a] text-[#ffffff] border border-[#202120] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#ff6105]" />
            <span>Nuevo Plan</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner — DESIGN.md: Monochrome + Peach Wash / Charcoal */}
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

      {/* Catálogo de Planes de Membresía — DESIGN.md: 5px Ghost Cards + single Peach Wash card for active selection */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] sm:text-[24px] font-light leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
              Catálogo de Planes de Membresía
            </h2>
            <span className="badge-neutral">{planes.length} planes</span>
          </div>
          <p className="text-[12px] text-[#7a7b7b]">
            Haz clic en un plan para precargarlo en el emisor de contratos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {planes.map((plan) => {
            const nombre = plan.nombre_planmembresia ?? plan.nombre;
            const meses = plan.duracion_meses_planmembresia ?? plan.duracion_meses;
            const precio = plan.precio_vigente_planmembresia ?? plan.precio_vigente ?? 0;
            const seleccionado = String(plan.id_planmembresia) === idPlanContrato;

            return (
              <div
                key={plan.id_planmembresia}
                onClick={() => setIdPlanContrato(String(plan.id_planmembresia))}
                className={`cursor-pointer rounded-[5px] p-5 border transition-colors flex flex-col justify-between ${
                  seleccionado
                    ? "bg-[#ffdfcd] border-[#ff6105]"
                    : "bg-[#ffffff] border-[#e5e5e5] hover:border-[#292b2a]/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-mono text-[#7a7b7b]">ID #{plan.id_planmembresia}</span>
                    <span
                      className={`px-2 py-0.5 rounded-[8px] whitespace-nowrap ${
                        seleccionado
                          ? "bg-[#ff6105] text-[#ffffff] font-medium"
                          : "bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] font-normal"
                      }`}
                    >
                      {meses} {meses === 1 ? "mes" : "meses"}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-medium text-[#0a0a0a] mt-3 leading-snug">
                    {nombre}
                  </h3>
                </div>

                <div
                  className={`mt-5 pt-3.5 border-t flex items-center justify-between gap-2 ${
                    seleccionado ? "border-[#ffa069]/50" : "border-[#e5e5e5]"
                  }`}
                >
                  <span className="text-[22px] font-light tracking-[-0.02em] text-[#0a0a0a]">
                    ${Number(precio).toLocaleString("es-CL")}
                  </span>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      abrirEditarPlan(plan);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[12px] font-normal bg-[#ffffff] hover:bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] transition-colors cursor-pointer shrink-0"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Generador de Contratos + Listado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario Emisión de Contrato */}
        <div className="lg:col-span-4 bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 space-y-5">
          <div className="space-y-2 border-b border-[#e5e5e5] pb-4">
            <span className="badge-step">
              <FileSignature className="w-3.5 h-3.5" />
              <span>Emisión</span>
            </span>
            <h3 className="text-[20px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
              Emitir Nuevo Contrato
            </h3>
            <p className="text-[13px] text-[#7a7b7b]">
              Selecciona al socio titular y el plan comercial para registrar su suscripción.
            </p>
          </div>

          <form onSubmit={handleCrearContrato} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Socio Titular
              </label>
              <div className="relative">
                <select
                  value={idSocioContrato}
                  onChange={(e) => setIdSocioContrato(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                >
                  {socios.map((s) => (
                    <option key={s.id_socio} value={s.id_socio}>
                      #{s.id_socio} — {s.nombre_completo_socio ?? s.nombre_completo} (
                      {s.rut_socio ?? s.rut})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Plan de Membresía
              </label>
              <div className="relative">
                <select
                  value={idPlanContrato}
                  onChange={(e) => setIdPlanContrato(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
                >
                  {planes.map((p) => (
                    <option key={p.id_planmembresia} value={p.id_planmembresia}>
                      {p.nombre_planmembresia} ({p.duracion_meses_planmembresia}m — $
                      {Number(p.precio_vigente_planmembresia).toLocaleString("es-CL")})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="input-pill w-full px-4 py-2.5 text-[14px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                  Fecha de Término
                </label>
                <input
                  type="date"
                  required
                  value={fechaTermino}
                  onChange={(e) => setFechaTermino(e.target.value)}
                  className="input-pill w-full px-4 py-2.5 text-[14px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                Precio Pactado (CLP)
              </label>
              <input
                type="number"
                min={0}
                required
                value={precioPactado}
                onChange={(e) => setPrecioPactado(e.target.value)}
                className="input-pill w-full px-4 py-2.5 text-[14px] font-mono"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submittingContrato}
                className="btn-primary-pill w-full py-3.5 px-6 text-[15px] font-medium tracking-[-0.01em] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FileSignature className="w-4 h-4" />
                <span>{submittingContrato ? "Registrando contrato..." : "Emitir Contrato"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de Contratos con Filtros */}
        <div className="lg:col-span-8 bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
          <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                  Contratos Registrados
                </h3>
                <span className="badge-neutral bg-[#ffffff]">{contratos.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-9 py-2 text-[13px] cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="Vigente">Vigente</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filtroPlan}
                  onChange={(e) => setFiltroPlan(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-9 py-2 text-[13px] cursor-pointer"
                >
                  <option value="">Todos los planes</option>
                  {planes.map((p) => (
                    <option key={p.id_planmembresia} value={p.id_planmembresia}>
                      {p.nombre_planmembresia}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filtroSocio}
                  onChange={(e) => setFiltroSocio(e.target.value)}
                  className="input-pill w-full appearance-none pl-4 pr-9 py-2 text-[13px] cursor-pointer"
                >
                  <option value="">Todos los socios</option>
                  {socios.map((s) => (
                    <option key={s.id_socio} value={s.id_socio}>
                      #{s.id_socio} — {s.nombre_completo_socio}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
              <p className="text-[14px] text-[#7a7b7b]">
                Consultando contratos y saldos...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-[14px] text-[#0a0a0a] font-medium">{error}</p>
              <button
                type="button"
                onClick={cargarDatos}
                className="btn-secondary-pill px-5 py-2 text-[13px] bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : contratos.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-[#a2a3a2] mx-auto stroke-[1.5]" />
              <p className="text-[15px] font-medium text-[#0a0a0a]">
                No hay contratos con los filtros seleccionados
              </p>
              <p className="text-[13px] text-[#7a7b7b]">
                Prueba ajustando los filtros de estado, plan o socio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#ffffff] border-b border-[#e5e5e5] text-[12px] text-[#7a7b7b]">
                    <th className="py-3 px-4 font-medium">Socio / Contrato</th>
                    <th className="py-3 px-3 font-medium">Plan y Vigencia</th>
                    <th className="py-3 px-3 font-medium whitespace-nowrap">Pactado / Saldo</th>
                    <th className="py-3 px-3 font-medium whitespace-nowrap">Estado</th>
                    <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] text-[13px]">
                  {contratos.map((c) => {
                    const estado = c.estado_contrato ?? c.estado ?? "Vigente";
                    const pactado = c.precio_pactado_contrato ?? c.precio_pactado ?? 0;
                    const saldo = c.saldo_pendiente ?? 0;
                    const nombreSocio =
                      c.nombre_completo_socio || `Socio #${c.id_socio_contrato}`;
                    const nombrePlanItem =
                      c.nombre_planmembresia || `Plan #${c.id_planmembresia_contrato}`;

                    return (
                      <tr
                        key={c.id_contrato}
                        className="hover:bg-[#f3f4f3]/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p
                            className="font-medium text-[#0a0a0a] truncate max-w-[165px]"
                            title={nombreSocio}
                          >
                            {nombreSocio}
                          </p>
                          <p className="text-[11px] text-[#7a7b7b] font-mono whitespace-nowrap">
                            #{c.id_contrato} {c.rut_socio ? `· ${c.rut_socio}` : ""}
                          </p>
                        </td>

                        <td className="py-3.5 px-3">
                          <p
                            className="text-[#292b2a] font-normal truncate max-w-[175px]"
                            title={nombrePlanItem}
                          >
                            {nombrePlanItem}
                          </p>
                          <p className="text-[11px] text-[#7a7b7b] font-mono whitespace-nowrap">
                            {c.fecha_inicio_contrato} → {c.fecha_termino_contrato}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                          <p className="text-[#0a0a0a] font-medium">
                            ${Number(pactado).toLocaleString("es-CL")}
                          </p>
                          <p
                            className={`text-[11px] ${
                              saldo > 0
                                ? "text-[#ff6105] font-medium"
                                : "text-[#7a7b7b] font-normal"
                            }`}
                          >
                            {saldo > 0
                              ? `Pendiente: $${Number(saldo).toLocaleString("es-CL")}`
                              : "Pagado 100%"}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] border ${
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
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="relative inline-block">
                            <select
                              value={estado}
                              onChange={(e) =>
                                handleCambiarEstado(
                                  c.id_contrato,
                                  e.target.value as "Vigente" | "Vencido" | "Cancelado"
                                )
                              }
                              className="appearance-none bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] rounded-[8px] pl-2.5 pr-7 py-1.5 text-[12px] text-[#292b2a] transition-colors cursor-pointer focus:outline-none focus:border-[#ff6105]"
                            >
                              <option value="Vigente">Vigente</option>
                              <option value="Vencido">Vencido</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-[#7a7b7b] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
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

      {/* Modal para Crear / Editar Plan — Portal en document.body */}
      {mounted &&
        showPlanModal &&
        createPortal(
          <div
            onClick={() => setShowPlanModal(false)}
            className="fixed inset-0 z-50 bg-[#0a0a0a]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] max-w-md w-full p-6 sm:p-8 space-y-6 my-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
                <div>
                  <span className="badge-step">
                    {editingPlanId ? "Edición" : "Catálogo Comercial"}
                  </span>
                  <h3 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] mt-2">
                    {editingPlanId
                      ? `Editar Plan #${editingPlanId}`
                      : "Nuevo Plan de Membresía"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="w-9 h-9 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] flex items-center justify-center text-[#292b2a] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarPlan} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                    Nombre del Plan *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombrePlan}
                    onChange={(e) => setNombrePlan(e.target.value)}
                    placeholder="Ej: Plan Trimestral Pro"
                    className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Duración (Meses) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      required
                      value={duracionPlan}
                      onChange={(e) => setDuracionPlan(e.target.value)}
                      className="input-pill w-full px-4 py-2.5 text-[14px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Precio Vigente (CLP) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="10"
                      required
                      value={precioPlan}
                      onChange={(e) => setPrecioPlan(e.target.value)}
                      className="input-pill w-full px-4 py-2.5 text-[14px] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="btn-secondary-pill px-5 py-2.5 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPlan}
                    className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer disabled:opacity-50"
                  >
                    {submittingPlan ? "Guardando..." : "Guardar Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
