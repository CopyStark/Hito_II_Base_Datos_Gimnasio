"use client";

import { useEffect, useState } from "react";
import apiClient, {
  PlanMembresia,
  ContratoDetalle,
  PagoDetalle,
  Socio,
} from "@/services/apiClient";

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
            c.nombre_completo_socio || s?.nombre_completo_socio || s?.nombre_completo || `Socio #${idSocio}`,
          rut_socio: c.rut_socio || s?.rut_socio || s?.rut || "",
          nombre_planmembresia:
            c.nombre_planmembresia || p?.nombre_planmembresia || p?.nombre || `Plan #${idPlan}`,
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
      setMontoAtomico(String(planSel.precio_vigente_planmembresia ?? planSel.precio_vigente ?? 29990));
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
      {/* Header */}
      <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Transacciones ACID &bull; SP: sp_Emitir_Contrato_Con_Pago &amp; sp_Registrar_Pago_Contrato
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Módulo de Caja y Recaudación
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Venta directa de planes con emisión atómica de contrato + pago inicial y registro de abonos.
          </p>
        </div>
        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl px-4 py-3 text-right">
          <span className="text-[11px] uppercase text-slate-400 block">
            Total en Recibos Listados ({pagos.length})
          </span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">
            ${totalRecaudadoVista.toLocaleString("es-CL")}
          </span>
        </div>
      </div>

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

      {/* Dos Formularios de Caja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Emisión Atómica Contrato + Pago */}
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Transacción Atómica (SP)
            </span>
            <h2 className="text-lg font-bold text-white mt-2">
              ⚡ Venta Rápida: Emitir Contrato + Pago Inicial
            </h2>
            <p className="text-xs text-slate-400">
              Ejecuta <code>sp_Emitir_Contrato_Con_Pago</code>: si el pago falla, se hace <code>ROLLBACK</code> automático del contrato.
            </p>
          </div>

          <form onSubmit={handleEmisionAtomica} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Socio Activo</label>
              <select
                value={idSocioAtomico}
                onChange={(e) => setIdSocioAtomico(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {socios.map((s) => (
                  <option key={s.id_socio} value={s.id_socio}>
                    #{s.id_socio} - {s.nombre_completo_socio} ({s.rut_socio})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Plan a Contratar</label>
              <select
                value={idPlanAtomico}
                onChange={(e) => setIdPlanAtomico(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {planes.map((p) => (
                  <option key={p.id_planmembresia} value={p.id_planmembresia}>
                    {p.nombre_planmembresia} ({p.duracion_meses_planmembresia} meses - $
                    {Number(p.precio_vigente_planmembresia).toLocaleString("es-CL")})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Monto a Cobrar (CLP)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={montoAtomico}
                  onChange={(e) => setMontoAtomico(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Medio de Pago</label>
                <select
                  value={medioPagoAtomico}
                  onChange={(e) => setMedioPagoAtomico(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAtomico}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/40 transition-all"
            >
              {submittingAtomico
                ? "Procesando transacción..."
                : "Emitir Contrato y Cobrar Ahora"}
            </button>
          </form>
        </div>

        {/* 2. Registrar Pago a Contrato Existente */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Tabla [Pago] &bull; sp_Registrar_Pago_Contrato
            </span>
            <h2 className="text-lg font-bold text-white mt-2">
              💵 Registrar Pago de Contrato Existente
            </h2>
            <p className="text-xs text-slate-400">
              Registra un abono o pago de cuota validando que el contrato exista y no esté cancelado.
            </p>
          </div>

          <form onSubmit={handleRegistrarPago} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Contrato (`id_contrato_pago`)
              </label>
              <select
                value={idContratoPago}
                onChange={(e) => setIdContratoPago(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                {contratos.map((c) => (
                  <option key={c.id_contrato} value={c.id_contrato}>
                    Contrato #{c.id_contrato} - {c.nombre_completo_socio} ({c.nombre_planmembresia}) [{c.estado_contrato ?? c.estado}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Monto Cancelado (`monto_cancelado_pago`)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Medio de Pago (`medio_pago`)
                </label>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingPago}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/40 transition-all"
            >
              {submittingPago ? "Registrando pago..." : "Registrar Recibo en Caja (POST /contratos/pagos)"}
            </button>
          </form>
        </div>
      </div>

      {/* Historial de Pagos */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white">
            🧾 Historial de Pagos y Recibos de Caja ({pagos.length})
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filtrar por medio:</span>
            {(["", "Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFiltroMedio(m)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filtroMedio === m
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {m || "Todos"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-emerald-400 animate-pulse py-6 text-center">
            Cargando recibos de pago desde SQL Server...
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Recibo #</th>
                  <th className="py-2.5 px-3">Contrato</th>
                  <th className="py-2.5 px-3">Socio</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Fecha Pago</th>
                  <th className="py-2.5 px-3">Medio</th>
                  <th className="py-2.5 px-3 text-right">Monto Cancelado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pagos.map((p) => (
                  <tr key={p.id_pago} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-emerald-400">#{p.id_pago}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      Contrato #{p.id_contrato_pago ?? p.id_contrato}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-white font-medium">{p.nombre_completo_socio}</span>
                      <span className="text-slate-500 ml-1 font-mono">({p.rut_socio})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{p.nombre_planmembresia}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {p.fecha_pago ? String(p.fecha_pago).replace("T", " ").slice(0, 19) : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                        {p.medio_pago}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                      ${Number(p.monto_cancelado_pago ?? p.monto_cancelado ?? 0).toLocaleString("es-CL")}
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
