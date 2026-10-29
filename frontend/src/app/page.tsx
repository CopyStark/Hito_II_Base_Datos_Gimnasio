"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import TeamCard from "@/components/TeamCard";
import apiClient, {
  Socio,
  PlanMembresia,
  SesionOcupacion,
  ContratoDetalle,
} from "@/services/apiClient";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);

  // Datos en vivo desde SQL Server para el Dashboard del Gimnasio
  const [socios, setSocios] = useState<Socio[]>([]);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [sesiones, setSesiones] = useState<SesionOcupacion[]>([]);
  const [contratos, setContratos] = useState<ContratoDetalle[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Validador de acceso rápido en Recepción (Torniquete)
  const [accesoIdentificador, setAccesoIdentificador] = useState("");
  const [accesoLoading, setAccesoLoading] = useState(false);
  const [accesoResultado, setAccesoResultado] = useState<any>(null);

  const cargarDatosGimnasio = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const [sociosRes, planesRes, sesionesRes, contratosRes, sedesRes] =
        await Promise.allSettled([
          apiClient.socios.getAll({ limite: 100 }),
          apiClient.contratos.getPlanes(),
          apiClient.clases.getSesiones(),
          apiClient.contratos.getAll({ limite: 100 }),
          apiClient.socios.getSedesCatalogo(),
        ]);

      if (sociosRes.status === "fulfilled" && Array.isArray(sociosRes.value)) {
        setSocios(sociosRes.value);
      }
      if (planesRes.status === "fulfilled" && Array.isArray(planesRes.value)) {
        setPlanes(planesRes.value);
      }
      if (sesionesRes.status === "fulfilled" && Array.isArray(sesionesRes.value)) {
        setSesiones(sesionesRes.value);
      }
      if (contratosRes.status === "fulfilled" && Array.isArray(contratosRes.value)) {
        setContratos(contratosRes.value);
      }
      if (sedesRes.status === "fulfilled" && Array.isArray(sedesRes.value)) {
        setSedes(sedesRes.value);
      }
    } catch {
      // Manejado individualmente por allSettled
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Comprobar la conexión con auto-reintento para cold-starts de Render
  const checkConnection = useCallback(
    async (intentosRestantes = 3) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient.health();
        setHealthStatus(data);
        setIsWakingUp(false);
        setLoading(false);
        cargarDatosGimnasio();
      } catch (err: any) {
        if (intentosRestantes > 1) {
          setIsWakingUp(true);
          setTimeout(() => {
            checkConnection(intentosRestantes - 1);
          }, 4000);
        } else {
          setIsWakingUp(false);
          setLoading(false);
          setErrorMsg(
            err.message ||
              "El servidor de Render está suspendido o tardó demasiado en responder."
          );
        }
      }
    },
    [cargarDatosGimnasio]
  );

  useEffect(() => {
    checkConnection(3);
  }, [checkConnection]);

  const handleValidarAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accesoIdentificador.trim()) return;
    setAccesoLoading(true);
    setAccesoResultado(null);
    try {
      const res = await apiClient.socios.validarAcceso(accesoIdentificador.trim());
      setAccesoResultado(res);
    } catch (err: any) {
      setAccesoResultado({
        acceso_permitido: false,
        motivo: `No se pudo verificar el acceso: ${err.message}`,
      });
    } finally {
      setAccesoLoading(false);
    }
  };

  // KPIs calculados desde SQL Server
  const totalSociosActivos = socios.filter(
    (s) => (s.activo_socio ?? s.activo) === true
  ).length;
  const totalContratosVigentes = contratos.filter(
    (c) => (c.estado_contrato ?? c.estado) === "Vigente"
  ).length;
  const totalSesionesProgramadas = sesiones.length;
  const totalSedes = sedes.length || 3;

  const formatCLP = (val: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* ===== Barra de Navegación Superior del Gimnasio ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/40 font-black text-white text-lg">
              🏋️
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent block leading-none">
                GIMNASIO<span className="text-emerald-400">DB</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mt-0.5">
                Red de Sedes & Fitness Center
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <Link
              href="/socios"
              id="btn-modulo-socios"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition-all text-xs sm:text-sm font-semibold border border-blue-500/40 shadow-sm"
            >
              <span>👥</span>
              <span>Socios & Recepción</span>
            </Link>

            <Link
              href="/clases"
              id="btn-modulo-clases"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all text-xs sm:text-sm font-semibold border border-purple-500/40 shadow-sm"
            >
              <span>🧘‍♀️</span>
              <span>Clases & Reservas</span>
            </Link>

            <Link
              href="/contratos"
              id="btn-modulo-contratos"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-all text-xs sm:text-sm font-semibold border border-emerald-500/40 shadow-sm"
            >
              <span>💳</span>
              <span>Planes, Contratos & Caja</span>
            </Link>

            <Link
              href="/socios/login"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-xs font-semibold border border-slate-700"
            >
              <span>🔐</span>
              <span>Acceso Usuario</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* ===== HERO BANNER DEL GIMNASIO ===== */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 p-6 sm:p-10 lg:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Sistema Operativo Conectado a SQL Server</span>
                <span>•</span>
                <span>Multi-Sede en Tiempo Real</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Entrena sin límites.{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  Gestión integral de socios, clases y membresías.
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Bienvenido al portal central de <strong>GimnasioDB</strong>. Controla el ingreso en
                torniquete, administra inscripciones a clases dirigidas, suscribe planes de membresía,
                registra pagos en caja y monitorea indicadores financieros por sede en tiempo real.
              </p>

              {/* Botones de Acción Rápida del Gimnasio */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/contratos"
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>📋</span>
                  <span>Suscribir Plan / Nuevo Contrato</span>
                </Link>
                <Link
                  href="/clases"
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>🗓️</span>
                  <span>Reservar Clase Grupal</span>
                </Link>
                <Link
                  href="/socios/torniquete"
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>🚪</span>
                  <span>Torniquete Recepción</span>
                </Link>
                <Link
                  href="/contratos/estado-cuenta"
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
                >
                  <span>💳</span>
                  <span>Estado de Cuenta Socio</span>
                </Link>
              </div>
            </div>

            {/* Tarjeta de Control de Acceso Rápido (Torniquete en Vivo) */}
            <div className="lg:col-span-5 bg-slate-950/85 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
                    Recepción en Vivo
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>🚪</span> Validador Rápido de Torniquete
                  </h2>
                </div>
                <Link
                  href="/socios/torniquete"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Pantalla completa →
                </Link>
              </div>

              <form onSubmit={handleValidarAcceso} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Seleccione un socio o ingrese su RUT / ID para validar membresía:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: 12.345.678-9 o ID Socio..."
                      value={accesoIdentificador}
                      onChange={(e) => setAccesoIdentificador(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={accesoLoading || !accesoIdentificador.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all"
                    >
                      {accesoLoading ? "Verificando..." : "Validar Ingreso"}
                    </button>
                  </div>
                </div>

                {socios.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Prueba rápida con socio real:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setAccesoIdentificador(e.target.value);
                      }}
                      value=""
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">-- Elegir socio de la BD --</option>
                      {socios.slice(0, 12).map((s) => (
                        <option
                          key={s.id_socio}
                          value={s.rut_socio ?? s.rut ?? String(s.id_socio)}
                        >
                          {s.nombre_completo_socio ?? s.nombre_completo} (
                          {s.rut_socio ?? s.rut ?? `ID ${s.id_socio}`})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form>

              {accesoResultado ? (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    accesoResultado.acceso_permitido
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-500/10 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">
                      {accesoResultado.acceso_permitido
                        ? "✅ PASE AUTORIZADO — TORNIQUETE ABIERTO"
                        : "⛔ ACCESO DENEGADO EN RECEPCIÓN"}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">{accesoResultado.motivo}</p>
                  {accesoResultado.nombre_completo_socio && (
                    <div className="pt-1.5 mt-1.5 border-t border-white/10 flex flex-wrap justify-between gap-2 text-[11px] text-slate-300 font-mono">
                      <span>Socio: {accesoResultado.nombre_completo_socio}</span>
                      {accesoResultado.nombre_plan && (
                        <span>Plan: {accesoResultado.nombre_plan}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
                  💡 El torniquete verifica en SQL Server que el socio esté <strong>Activo</strong> y
                  posea un <strong>Contrato Vigente</strong> dentro del rango de fechas actual.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== KPIs EN VIVO DESDE SQL SERVER ===== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/socios"
            className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Socios Activos
              </span>
              <span className="text-xl group-hover:scale-110 transition-transform">👥</span>
            </div>
            <p className="text-3xl font-extrabold text-white mt-2">
              {loadingDashboard ? "..." : totalSociosActivos}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              de {socios.length} registrados en SQL Server →
            </p>
          </Link>

          <Link
            href="/contratos"
            className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contratos Vigentes
              </span>
              <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">
              {loadingDashboard ? "..." : totalContratosVigentes}
            </p>
            <p className="text-xs text-emerald-300/80 mt-1">
              {planes.length} planes de membresía activos →
            </p>
          </Link>

          <Link
            href="/clases"
            className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sesiones & Clases
              </span>
              <span className="text-xl group-hover:scale-110 transition-transform">🏋️‍♀️</span>
            </div>
            <p className="text-3xl font-extrabold text-purple-400 mt-2">
              {loadingDashboard ? "..." : totalSesionesProgramadas}
            </p>
            <p className="text-xs text-purple-300/80 mt-1">
              Reservas y control de cupos en vivo →
            </p>
          </Link>

          <Link
            href="/socios/sedes"
            className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sedes Operativas
              </span>
              <span className="text-xl group-hover:scale-110 transition-transform">🏢</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-400 mt-2">
              {loadingDashboard ? "..." : totalSedes}
            </p>
            <p className="text-xs text-amber-300/80 mt-1">
              Ver reportes e ingresos por sede →
            </p>
          </Link>
        </section>

        {/* ===== VITRINA DEL GIMNASIO: PLANES DE MEMBRESÍA + CARTELERA DE CLASES ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Planes de Membresía en Vivo */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Membresías Oficiales
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    Planes Disponibles en GimnasioDB
                  </h2>
                </div>
                <Link
                  href="/contratos"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Ir a Contratos →
                </Link>
              </div>

              {loadingDashboard ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Cargando planes desde [PlanMembresia] en SQL Server...
                </div>
              ) : planes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay planes cargados actualmente.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {planes.slice(0, 4).map((p) => {
                    const id = p.id_planmembresia ?? p.id_plan;
                    const nombre = p.nombre_planmembresia ?? p.nombre ?? "Plan";
                    const meses =
                      p.duracion_meses_planmembresia ?? p.duracion_meses ?? 1;
                    const precio =
                      p.precio_vigente_planmembresia ?? p.precio_vigente ?? 0;

                    return (
                      <div
                        key={id}
                        className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-sm">
                              {nombre}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                              {meses} {meses === 1 ? "mes" : "meses"}
                            </span>
                          </div>
                          <p className="text-xl font-extrabold text-emerald-400 mt-2">
                            {formatCLP(Number(precio))}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Equivalente a {formatCLP(Math.round(Number(precio) / Math.max(1, meses)))} / mes
                          </p>
                        </div>
                        <Link
                          href="/contratos"
                          className="mt-3 w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold text-center border border-emerald-500/30 transition-all block"
                        >
                          Contratar Plan
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>¿Necesitas pagar una cuota o revisar recibos?</span>
              <div className="flex gap-3">
                <Link
                  href="/contratos/caja"
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Ir a Caja & Pagos →
                </Link>
                <Link
                  href="/contratos/personal"
                  className="text-teal-400 hover:underline font-semibold"
                >
                  Finanzas por Sede →
                </Link>
              </div>
            </div>
          </div>

          {/* Próximas Clases y Cupos en Vivo */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Entrenamiento Grupal
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    Cartelera de Clases y Cupos Disponibles
                  </h2>
                </div>
                <Link
                  href="/clases"
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                >
                  Reservar Cupo →
                </Link>
              </div>

              {loadingDashboard ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Consultando vista [vw_Reporte_Ocupacion_Clases] en SQL Server...
                </div>
              ) : sesiones.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay sesiones programadas actualmente.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sesiones.slice(0, 4).map((s) => {
                    const nombreClase = s.nombre_clase ?? s.Clase ?? "Clase Dirigida";
                    const sede = s.nombre_sede ?? s.Sede ?? "Sede Central";
                    const fecha = (s.fecha_sesion ?? s.fecha ?? "").slice(0, 10);
                    const hora = (s.hora_sesion ?? s.hora ?? "").slice(0, 5);
                    const cupoMax = s.cupo_maximo_sesion ?? s.cupo_maximo ?? 20;
                    const inscritos = s.total_inscritos ?? s.Total_Inscritos ?? 0;
                    const disponibles =
                      s.cupos_disponibles ??
                      s.Cupos_Disponibles ??
                      Math.max(0, cupoMax - inscritos);

                    return (
                      <div
                        key={s.id_sesion}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-all flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {nombreClase}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {sede}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            📅 {fecha} • ⏰ {hora} hrs
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border inline-block ${
                              disponibles > 0
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {disponibles > 0
                              ? `${disponibles} cupos libres`
                              : "Agotado"}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {inscritos}/{cupoMax} inscritos
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>Gestión para Instructores y Coordinadores:</span>
              <div className="flex gap-3">
                <Link
                  href="/clases/instructor"
                  className="text-purple-400 hover:underline font-semibold"
                >
                  Pasar Asistencia →
                </Link>
                <Link
                  href="/clases/programador"
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Programar Sesión →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ACCESOS DIRECTOS A TODOS LOS MÓDULOS DEL SISTEMA ===== */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Arquitectura Modular Completa
              </span>
              <h2 className="text-2xl font-bold text-white">
                Módulos de Gestión del Gimnasio
              </h2>
              <p className="text-sm text-slate-400">
                Accede a cada subsistema operativo conectado directamente a SQL Server mediante procedimientos almacenados, vistas y consultas parametrizadas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TeamCard
              personNumber="Módulo 1 • Carlos"
              roleTitle="Acceso, Socios & Sedes"
              moduleRoute="/socios"
              backendFile="backend/routers/auth_socios.py"
              colorBorder="border-blue-500/50"
              badgeBg="bg-blue-600"
              isLive={true}
              actionButtonText="Abrir Recepción y Socios"
              viewRoutes={{
                "Gestión de Socios": "/socios",
                "Torniquete & Acceso": "/socios/torniquete",
                "Sedes & Reportes": "/socios/sedes",
                "Login & Mi Perfil": "/socios/login",
              }}
              databaseEntities={[
                "Socio",
                "Usuario",
                "Rol",
                "Sede",
                "vw_Reporte_Socios_Por_Sede",
              ]}
              responsibilities={[
                "Autenticación multi-rol (Socio, Instructor, Admin) con HASHBYTES SHA2_512",
                "Alta, edición, baja/estado y búsqueda avanzada de socios (RUT, nombre, correo)",
                "Portal del Socio: consulta y edición de sus propios datos personales",
                "Control de acceso y simulación de torniquete en recepción en tiempo real",
                "Gestión de infraestructura de Sedes y reporte analítico de socios por sede",
              ]}
              frontendViews={[
                "Gestión de Socios",
                "Torniquete & Acceso",
                "Sedes & Reportes",
                "Login & Mi Perfil",
              ]}
            />

            <TeamCard
              personNumber="Módulo 2 • Emilia"
              roleTitle="Clases, Sesiones & Asistencia"
              moduleRoute="/clases"
              backendFile="backend/routers/clases.py"
              colorBorder="border-purple-500/50"
              badgeBg="bg-purple-600"
              isLive={true}
              actionButtonText="Abrir Clases y Reservas"
              viewRoutes={{
                "Catálogo y Reserva": "/clases",
                "Portal del Instructor": "/clases/instructor",
                "Programador de Sesiones": "/clases/programador",
                "Inventario Equipos": "/clases/equipos",
              }}
              databaseEntities={[
                "Clase",
                "Sesion",
                "Inscripcion",
                "Instructor",
                "Equipamiento",
                "vw_Reporte_Ocupacion_Clases",
                "vw_Ranking_Clases_Demandadas",
              ]}
              responsibilities={[
                "Catálogo de disciplinas y programación de sesiones (sede, horario, cupo)",
                "Portal del Socio: reserva de clases con validación de contrato vigente y cupos",
                "Cancelación de inscripciones de socios antes de la realización de la sesión",
                "Portal del Instructor: agenda de sesiones, lista de inscritos y pase de asistencia",
                "Gestión de instructores, equipamiento y reportes de ocupación y ranking de clases",
              ]}
              frontendViews={[
                "Catálogo y Reserva",
                "Portal del Instructor",
                "Programador de Sesiones",
                "Inventario Equipos",
              ]}
            />

            <TeamCard
              personNumber="Módulo 3 • Daniel"
              roleTitle="Membresías, Contratos & Finanzas"
              moduleRoute="/contratos"
              backendFile="backend/routers/contratos.py"
              colorBorder="border-emerald-500/50"
              badgeBg="bg-emerald-600"
              isLive={true}
              actionButtonText="Abrir Contratos y Caja"
              viewRoutes={{
                "Generador de Contratos": "/contratos",
                "Módulo de Caja": "/contratos/caja",
                "Estado de Cuenta": "/contratos/estado-cuenta",
                "Personal y Finanzas": "/contratos/personal",
              }}
              databaseEntities={[
                "PlanMembresia",
                "Contrato",
                "Pago",
                "Personal",
                "vw_Reporte_Ingresos_Por_Sede",
              ]}
              responsibilities={[
                "Catálogo de planes de membresía y generador de contratos con fechas y precios",
                "Control de estados de contrato (Vigente, Vencido, Cancelado) y plazos",
                "Caja y registro de pagos atómicos (Efectivo, Tarjeta, Transferencia)",
                "Portal Financiero del Socio: consulta de contratos, recibos y saldo pendiente",
                "Gestión de Personal del gimnasio y reporte de ingresos por sede y período",
              ]}
              frontendViews={[
                "Generador de Contratos",
                "Módulo de Caja",
                "Estado de Cuenta",
                "Personal y Finanzas",
              ]}
            />
          </div>
        </section>

        {/* ===== ESTADO DE CONEXIÓN CON EL MOTOR SQL SERVER & RENDER ===== */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  loading
                    ? "bg-amber-400 animate-pulse"
                    : healthStatus
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              ></span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Estado de Conexión Base de Datos SQL Server (API-First sin ORM)
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Servidor API: <span className="text-cyan-400">{apiClient.getBaseUrl()}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {loading && !isWakingUp && (
                <span className="text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Sincronizando datos con SQL Server...</span>
                </span>
              )}

              {isWakingUp && (
                <span className="text-purple-300 font-medium bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
                  <span>☕</span>
                  <span>Despertando servidor en Render (~30s)...</span>
                </span>
              )}

              {!loading && healthStatus && (
                <span className="text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>SQL Server & FastAPI En Línea</span>
                </span>
              )}

              {!loading && errorMsg && (
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                    ⚠️ Servidor despertando
                  </span>
                  <button
                    onClick={() => checkConnection(3)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                  >
                    🔄 Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-900">
          GimnasioDB • Sistema Integral de Gestión de Gimnasios • Conectado a Microsoft SQL Server via FastAPI (pyodbc) & Next.js
        </footer>
      </div>
    </main>
  );
}
