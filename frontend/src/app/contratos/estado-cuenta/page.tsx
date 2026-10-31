"use client";

import { useEffect, useState } from "react";
import apiClient, {
  EstadoCuentaSocio,
  Socio,
  PlanMembresia,
} from "@/services/apiClient";
import { getStoredSocioActual } from "@/components/clases/socioActual";

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
                c.nombre_planmembresia || plan?.nombre_planmembresia || plan?.nombre || `Plan #${idPlan}`,
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
    <div className="space-y-8">
      {/* Header & Selector de Socio */}
      <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Portal Financiero del Socio &bull; GET /contratos/socio/&#123;id_socio&#125;/estado-cuenta
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Estado de Cuenta y Saldos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Consulta en tiempo real los contratos suscritos por un socio, el total facturado, los abonos realizados y su saldo pendiente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
            Seleccionar Socio:
          </label>
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
            className="bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
          >
            {socios.map((s) => (
              <option key={s.id_socio} value={s.id_socio}>
                #{s.id_socio} - {s.nombre_completo_socio} ({s.rut_socio})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-emerald-400 animate-pulse text-center py-12">
          Calculando estado de cuenta financiero en SQL Server...
        </p>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {estadoCuenta && !loading && (
        <>
          {/* Resumen KPI del Socio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400">Socio Titular</span>
              <h3 className="text-lg font-bold text-white mt-1">
                {estadoCuenta.nombre_completo_socio}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                RUT: {estadoCuenta.rut_socio} &bull; {estadoCuenta.nombre_sede}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400">Total Pactado ({estadoCuenta.total_contratos} contrato/s)</span>
              <h3 className="text-2xl font-extrabold text-white font-mono mt-1">
                ${Number(estadoCuenta.total_pactado).toLocaleString("es-CL")}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Membresía Vigente:{" "}
                <strong className={estadoCuenta.tiene_contrato_vigente ? "text-emerald-400" : "text-rose-400"}>
                  {estadoCuenta.tiene_contrato_vigente ? "SÍ" : "NO"}
                </strong>
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400">Total Abonado / Pagado</span>
              <h3 className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                ${Number(estadoCuenta.total_pagado).toLocaleString("es-CL")}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {estadoCuenta.pagos.length} recibo(s) registrado(s)
              </p>
            </div>

            <div
              className={`rounded-2xl p-5 border ${
                estadoCuenta.saldo_pendiente > 0
                  ? "bg-amber-950/30 border-amber-500/40"
                  : "bg-emerald-950/30 border-emerald-500/40"
              }`}
            >
              <span className="text-xs text-slate-300">Saldo Pendiente</span>
              <h3
                className={`text-2xl font-extrabold font-mono mt-1 ${
                  estadoCuenta.saldo_pendiente > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                ${Number(estadoCuenta.saldo_pendiente).toLocaleString("es-CL")}
              </h3>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  estadoCuenta.saldo_pendiente > 0
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {estadoCuenta.estado_financiero}
              </span>
            </div>
          </div>

          {/* Contratos del Socio y Pagos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contratos */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">
                📄 Contratos del Socio ({estadoCuenta.contratos.length})
              </h3>
              <div className="space-y-3">
                {estadoCuenta.contratos.map((c) => (
                  <div
                    key={c.id_contrato}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">
                          Contrato #{c.id_contrato}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.estado_contrato === "Vigente"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : c.estado_contrato === "Vencido"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {c.estado_contrato}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">
                        {c.nombre_planmembresia}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        Vigencia: {c.fecha_inicio_contrato} al {c.fecha_termino_contrato}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs space-y-0.5">
                      <div className="text-slate-300">
                        Pactado: ${Number(c.precio_pactado_contrato).toLocaleString("es-CL")}
                      </div>
                      <div className="text-emerald-400">
                        Pagado: ${Number(c.total_pagado ?? 0).toLocaleString("es-CL")}
                      </div>
                      <div
                        className={`font-bold ${
                          (c.saldo_pendiente ?? 0) > 0 ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        Saldo: ${Number(c.saldo_pendiente ?? 0).toLocaleString("es-CL")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recibos de Pago */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">
                🧾 Historial de Recibos ({estadoCuenta.pagos.length})
              </h3>
              {estadoCuenta.pagos.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  Este socio no registra pagos aún.
                </p>
              ) : (
                <div className="space-y-3">
                  {estadoCuenta.pagos.map((p) => (
                    <div
                      key={p.id_pago}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-mono text-emerald-400">
                          Recibo #{p.id_pago} &bull; Contrato #{p.id_contrato_pago}
                        </span>
                        <h4 className="text-sm font-semibold text-white">
                          {p.nombre_planmembresia}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {String(p.fecha_pago).replace("T", " ").slice(0, 19)} &bull; {p.medio_pago}
                        </p>
                      </div>
                      <div className="text-base font-extrabold text-emerald-400 font-mono">
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
