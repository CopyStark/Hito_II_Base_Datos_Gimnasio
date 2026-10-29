"use client";

import { useEffect, useState } from "react";
import apiClient, {
  PlanMembresia,
  ContratoDetalle,
  Socio,
} from "@/services/apiClient";

export default function ContratosPage() {
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

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [planesData, contratosData, sociosData] = await Promise.all([
        apiClient.contratos.getPlanes(),
        apiClient.contratos.getAll({
          estado: (filtroEstado || undefined) as any,
          id_plan: filtroPlan ? Number(filtroPlan) : undefined,
          id_socio: filtroSocio ? Number(filtroSocio) : undefined,
          limite: 100,
        }),
        apiClient.socios.getAll({ limite: 200 }),
      ]);
      setPlanes(planesData);
      setContratos(contratosData);
      setSocios(sociosData);

      if (planesData.length > 0 && !precioPactado) {
        const primerPlan = planesData[0];
        setIdPlanContrato(String(primerPlan.id_planmembresia));
        setPrecioPactado(String(primerPlan.precio_vigente_planmembresia ?? primerPlan.precio_vigente ?? 29990));
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

  // Calcular fecha de término automáticamente cuando cambia el plan o la fecha de inicio
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
        msg: "Contrato emitido exitosamente en la tabla [Contrato].",
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
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "Error al cambiar estado del contrato.",
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
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "Error al ejecutar control de contratos vencidos.",
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
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Tablas: [PlanMembresia] &bull; [Contrato] &bull; SP: sp_Actualizar_Contratos_Vencidos
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Planes de Membresía y Generador de Contratos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra el catálogo comercial de planes, emite contratos con cálculo automático de vigencia y controla sus estados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={abrirCrearPlan}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all"
          >
            + Nuevo Plan Comercial
          </button>
          <button
            onClick={handleActualizarVencidos}
            className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold transition-all"
            title="Ejecutar sp_Actualizar_Contratos_Vencidos"
          >
            ⏱️ Verificar Vencidos (SP)
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedback.type === "ok"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/60 border-rose-500/40 text-rose-200"
          }`}
        >
          <span>
            {feedback.type === "ok" ? "✅ " : "⚠️ "}
            {feedback.msg}
          </span>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Catálogo de Planes de Membresía */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🏷️</span> Catálogo de Planes de Membresía ({planes.length})
          </h2>
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
                className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  seleccionado
                    ? "bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/50"
                    : "bg-slate-900/70 border-slate-800 hover:border-emerald-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">ID #{plan.id_planmembresia}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      {meses} {meses === 1 ? "mes" : "meses"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{nombre}</h3>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-lg font-extrabold text-emerald-400">
                    ${Number(precio).toLocaleString("es-CL")}
                  </span>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      abrirEditarPlan(plan);
                    }}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal para Crear/Editar Plan */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingPlanId ? `Editar Plan #${editingPlanId}` : "Crear Nuevo Plan de Membresía"}
              </h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Plan
                </label>
                <input
                  type="text"
                  required
                  value={nombrePlan}
                  onChange={(e) => setNombrePlan(e.target.value)}
                  placeholder="Ej: Plan Trimestral Pro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duración (Meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={duracionPlan}
                    onChange={(e) => setDuracionPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Precio Vigente (CLP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="10"
                    required
                    value={precioPlan}
                    onChange={(e) => setPrecioPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  {submittingPlan ? "Guardando..." : "Guardar Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generador de Contratos + Listado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Emisión de Contrato */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <span>📝</span> Emitir Nuevo Contrato
          </h3>
          <form onSubmit={handleCrearContrato} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Socio Titular (`id_socio_contrato`)
              </label>
              <select
                value={idSocioContrato}
                onChange={(e) => setIdSocioContrato(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {socios.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    #{s.id_socio} - {s.nombre_completo_socio ?? s.nombre_completo} ({s.rut_socio ?? s.rut})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Plan de Membresía (`id_planmembresia_contrato`)
              </label>
              <select
                value={idPlanContrato}
                onChange={(e) => setIdPlanContrato(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {planes.map((p) => (
                  <option key={p.id_planmembresia} value={p.id_planmembresia}>
                    {p.nombre_planmembresia} ({p.duracion_meses_planmembresia}m - $
                    {Number(p.precio_vigente_planmembresia).toLocaleString("es-CL")})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Fecha Término
                </label>
                <input
                  type="date"
                  required
                  value={fechaTermino}
                  onChange={(e) => setFechaTermino(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Precio Pactado CLP (`precio_pactado_contrato`)
              </label>
              <input
                type="number"
                min={0}
                required
                value={precioPactado}
                onChange={(e) => setPrecioPactado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submittingContrato}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50"
            >
              {submittingContrato ? "Registrando en SQL Server..." : "Emitir Contrato (POST /contratos)"}
            </button>
          </form>
        </div>

        {/* Tabla de Contratos con Filtros */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">
              📋 Contratos Registrados ({contratos.length})
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
              >
                <option value="">Todos los estados</option>
                <option value="Vigente">Vigente</option>
                <option value="Vencido">Vencido</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              <select
                value={filtroPlan}
                onChange={(e) => setFiltroPlan(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
              >
                <option value="">Todos los planes</option>
                {planes.map((p) => (
                  <option key={p.id_planmembresia} value={p.id_planmembresia}>
                    {p.nombre_planmembresia}
                  </option>
                ))}
              </select>

              <select
                value={filtroSocio}
                onChange={(e) => setFiltroSocio(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 max-w-[180px]"
              >
                <option value="">Todos los socios</option>
                {socios.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    #{s.id_socio} - {s.nombre_completo_socio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-emerald-400 animate-pulse py-8 text-center">
              Consultando contratos y saldos en SQL Server...
            </p>
          ) : error ? (
            <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-xl p-4">
              ⚠️ {error}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-2.5 px-2">ID</th>
                    <th className="py-2.5 px-2">Socio</th>
                    <th className="py-2.5 px-2">Plan</th>
                    <th className="py-2.5 px-2">Vigencia</th>
                    <th className="py-2.5 px-2">Pactado / Saldo</th>
                    <th className="py-2.5 px-2">Estado</th>
                    <th className="py-2.5 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contratos.map((c) => {
                    const estado = c.estado_contrato ?? c.estado ?? "Vigente";
                    const pactado = c.precio_pactado_contrato ?? c.precio_pactado ?? 0;
                    const saldo = c.saldo_pendiente ?? 0;

                    return (
                      <tr key={c.id_contrato} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono text-slate-400">#{c.id_contrato}</td>
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-white">
                            {c.nombre_completo_socio || `Socio #${c.id_socio_contrato}`}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.rut_socio}</div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-300">
                          {c.nombre_planmembresia || `Plan #${c.id_planmembresia_contrato}`}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-slate-300">
                          {c.fecha_inicio_contrato} → {c.fecha_termino_contrato}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          <div className="text-white">${Number(pactado).toLocaleString("es-CL")}</div>
                          <div
                            className={`text-[10px] ${
                              saldo > 0 ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {saldo > 0
                              ? `Pendiente: $${Number(saldo).toLocaleString("es-CL")}`
                              : "Pagado 100%"}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              estado === "Vigente"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : estado === "Vencido"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <select
                            value={estado}
                            onChange={(e) =>
                              handleCambiarEstado(
                                c.id_contrato,
                                e.target.value as "Vigente" | "Vencido" | "Cancelado"
                              )
                            }
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                          >
                            <option value="Vigente">Vigente</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
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
    </div>
  );
}
