"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient, {
  Socio,
  PlanMembresia,
  SesionOcupacion,
  ContratoDetalle,
  EquipamientoItemResponse,
  ReporteSedeItem,
  ReporteIngresosItem,
  clasesApi,
} from "@/services/apiClient";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);

  // Datos reales desde SQL Server
  const [socios, setSocios] = useState<Socio[]>([]);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [sesiones, setSesiones] = useState<SesionOcupacion[]>([]);
  const [contratos, setContratos] = useState<ContratoDetalle[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<EquipamientoItemResponse[]>([]);
  const [reporteSociosSede, setReporteSociosSede] = useState<ReporteSedeItem[]>([]);
  const [reporteIngresosSede, setReporteIngresosSede] = useState<ReporteIngresosItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado interactivo de Sedes y Clases (estilo SmartFit)
  const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
  const [filtroSedeClases, setFiltroSedeClases] = useState<string>("Todas");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Validador de acceso en recepción (Torniquete en vivo)
  const [accesoIdentificador, setAccesoIdentificador] = useState("");
  const [accesoLoading, setAccesoLoading] = useState(false);
  const [accesoResultado, setAccesoResultado] = useState<any>(null);

  const cargarDatosGimnasio = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        sociosRes,
        planesRes,
        sesionesRes,
        contratosRes,
        sedesRes,
        equiposRes,
        repSociosRes,
        repIngresosRes,
      ] = await Promise.allSettled([
        apiClient.socios.getAll({ limite: 100 }),
        apiClient.contratos.getPlanes(),
        apiClient.clases.getSesiones(),
        apiClient.contratos.getAll({ limite: 100 }),
        apiClient.socios.getSedesCatalogo(),
        clasesApi.getEquipos(),
        apiClient.socios.getReportePorSede(),
        apiClient.contratos.getReporteIngresos(),
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
        if (sedesRes.value.length > 0) {
          setSelectedSedeId(sedesRes.value[0].id_sede);
        }
      }
      if (equiposRes.status === "fulfilled" && Array.isArray(equiposRes.value)) {
        setEquipos(equiposRes.value);
      }
      if (repSociosRes.status === "fulfilled" && Array.isArray(repSociosRes.value)) {
        setReporteSociosSede(repSociosRes.value);
      }
      if (repIngresosRes.status === "fulfilled" && Array.isArray(repIngresosRes.value)) {
        setReporteIngresosSede(repIngresosRes.value);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

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
              "El servidor backend está despertando de su modo reposo."
          );
          cargarDatosGimnasio();
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

  // Métricas en vivo desde SQL Server
  const totalSociosActivos = socios.filter(
    (s) => (s.activo_socio ?? s.activo) === true
  ).length;
  const totalContratosVigentes = contratos.filter(
    (c) => (c.estado_contrato ?? c.estado) === "Vigente"
  ).length;
  const totalSesionesProgramadas = sesiones.length;
  const totalSedes = sedes.length || 3;

  // Sede seleccionada para el visor de instalaciones (estilo SmartFit)
  const sedeActual =
    sedes.find((s) => s.id_sede === selectedSedeId) || sedes[0] || null;

  const equiposSedeActual = sedeActual
    ? equipos.filter(
        (eq) =>
          eq.id_sede_equipamiento === sedeActual.id_sede ||
          eq.nombre_sede === sedeActual.nombre_sede
      )
    : equipos.slice(0, 6);

  const sociosEnSedeActual = sedeActual
    ? reporteSociosSede
        .filter((r) => r.nombre_sede === sedeActual.nombre_sede)
        .reduce((acc, r) => acc + Number(r.cantidad_socios || 0), 0)
    : 0;

  const ingresosEnSedeActual = sedeActual
    ? reporteIngresosSede
        .filter((r) => r.nombre_sede === sedeActual.nombre_sede)
        .reduce((acc, r) => acc + Number(r.total_ingresos || 0), 0)
    : 0;

  const nombresSedesUnicas = Array.from(
    new Set(
      sesiones
        .map((s) => s.nombre_sede ?? s.Sede)
        .filter((v): v is string => Boolean(v))
    )
  );

  const sesionesFiltradas =
    filtroSedeClases === "Todas"
      ? sesiones
      : sesiones.filter(
          (s) => (s.nombre_sede ?? s.Sede) === filtroSedeClases
        );

  const formatCLP = (val: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] font-normal">
      {/* ===== Announcement Bar (Linen #f3f4f3, 44px height) ===== */}
      <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] h-11 px-4 sm:px-8 flex items-center justify-center">
        <div className="max-w-[1200px] w-full flex items-center justify-between text-[13px] sm:text-[14px] leading-[1.5] text-[#292b2a]">
          <div className="flex items-center gap-3 truncate">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                healthStatus
                  ? "bg-[#ff6105]"
                  : loading || isWakingUp
                  ? "bg-[#ffa069]"
                  : "bg-[#a2a3a2]"
              }`}
            />
            <span className="truncate">
              {loading || isWakingUp
                ? "Sincronizando sedes, planes y horarios en tiempo real con SQL Server..."
                : `Matrícula abierta en ${totalSedes} sedes · ${totalSociosActivos} socios activos · Sin costo de inscripción`}
            </span>
          </div>
          <Link
            href="/contratos"
            className="font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors whitespace-nowrap ml-4"
          >
            Inscríbete hoy →
          </Link>
        </div>
      </div>

      {/* ===== Top Navigation (#ffffff, 68px height, 1px #e5e5e5 border) ===== */}
      <header className="sticky top-0 z-50 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e5e5e5] h-[68px] px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-6">
          {/* Logo Mark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[#0a0a0a] tracking-[-0.03em] text-[22px] font-medium"
          >
            <span>gimnasio</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#ff6105]" />
            <span className="font-light text-[#7a7b7b] text-[18px]">db</span>
          </Link>

          {/* 5 Center Links (14px weight 400 Carbon #292b2a, 32-40px gap) */}
          <nav className="hidden lg:flex items-center gap-9 text-[14px] font-normal text-[#292b2a]">
            <a
              href="#planes"
              className="hover:text-[#0a0a0a] transition-colors"
            >
              Planes y Tarifas
            </a>
            <a
              href="#sedes"
              className="hover:text-[#0a0a0a] transition-colors"
            >
              Sedes y Equipamiento
            </a>
            <a
              href="#clases"
              className="hover:text-[#0a0a0a] transition-colors"
            >
              Clases y Horarios
            </a>
            <a
              href="#acceso"
              className="hover:text-[#0a0a0a] transition-colors"
            >
              Recepción y Acceso
            </a>
            <a
              href="#operaciones"
              className="hover:text-[#0a0a0a] transition-colors"
            >
              Módulos de Gestión
            </a>
          </nav>

          {/* Right Controls: Login + Nav Primary Pill (#ff6105, 40px radius) */}
          <div className="flex items-center gap-3">
            <Link
              href="/socios/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] font-normal text-[#292b2a] transition-colors"
            >
              Cuenta Socio
            </Link>
            <Link
              href="/contratos"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-[40px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[14px] font-medium tracking-[-0.01em] transition-colors"
            >
              Contratar Plan
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Editorial Hero Section ===== */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-24 px-4 sm:px-8 border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 space-y-6">
              <p className="text-[12px] leading-[1.5] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Red de Entrenamiento e Infraestructura Deportiva
              </p>

              <h1 className="text-[44px] sm:text-[64px] lg:text-[72px] font-light leading-[1.08] tracking-[-0.036em] text-[#0a0a0a]">
                Un espacio diseñado para entrenar sin fricciones.
              </h1>

              {/* Signature 2px #ff6105 accent rule */}
              <div className="w-[120px] h-[2px] bg-[#ff6105]" />

              <p className="text-[16px] sm:text-[18px] leading-[1.56] tracking-[-0.01em] text-[#292b2a] font-normal max-w-[640px] pt-2">
                Equipamiento de alto rendimiento, salas de clases dirigidas, acceso
                automatizado por torniquete y planes flexibles sin permanencia
                forzosa. Todo conectado en tiempo real con nuestra plataforma central.
              </p>

              {/* Primary Pill CTA (50px radius + signature orange glow) & Secondary Pill (24px radius) */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/contratos"
                  style={{
                    boxShadow:
                      "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                  }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[16px] font-medium tracking-[-0.01em] transition-all"
                >
                  <span>Inscríbete y elige tu plan</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 3L11 8L6 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>

                <a
                  href="#sedes"
                  className="inline-flex items-center px-6 py-3.5 rounded-[24px] bg-[#ffffff] hover:bg-[#f3f4f3] border border-[#e5e5e5] text-[#292b2a] text-[16px] font-normal tracking-[-0.01em] transition-colors"
                >
                  Conocer sedes y horarios
                </a>

                <Link
                  href="/clases"
                  className="inline-flex items-center px-6 py-3.5 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] text-[#292b2a] text-[16px] font-normal tracking-[-0.01em] transition-colors"
                >
                  Reservar clase grupal
                </Link>
              </div>
            </div>

            {/* Right Column: Clean Architectural Summary Block (Flat 5px radius, 1px hairline) */}
            <div className="lg:col-span-4">
              <div className="rounded-[5px] border border-[#e5e5e5] bg-[#f3f4f3] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#dfe0df] pb-4">
                  <span className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
                    Horario General de Sedes
                  </span>
                  <span className="text-[12px] font-medium text-[#0a0a0a]">
                    Abierto Hoy
                  </span>
                </div>

                <div className="space-y-2.5 text-[14px] text-[#292b2a]">
                  <div className="flex justify-between">
                    <span className="text-[#7a7b7b]">Lunes a Viernes</span>
                    <span className="font-medium text-[#0a0a0a]">06:00 — 23:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a7b7b]">Sábados</span>
                    <span className="font-medium text-[#0a0a0a]">08:00 — 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7a7b7b]">Domingos y Festivos</span>
                    <span className="font-medium text-[#0a0a0a]">09:00 — 15:00</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#dfe0df] flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-[#7a7b7b]">Planes desde</p>
                    <p className="text-[24px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                      {planes.length > 0
                        ? formatCLP(
                            Math.min(
                              ...planes.map((p) =>
                                Math.round(
                                  Number(
                                    p.precio_vigente_planmembresia ??
                                      p.precio_vigente ??
                                      24990
                                  ) /
                                    Math.max(
                                      1,
                                      Number(
                                        p.duracion_meses_planmembresia ??
                                          p.duracion_meses ??
                                          1
                                      )
                                    )
                                )
                              )
                            )
                          )
                        : "$24.990"}{" "}
                      <span className="text-[14px] font-normal text-[#7a7b7b]">
                        / mes
                      </span>
                    </p>
                  </div>
                  <Link
                    href="/socios/torniquete"
                    className="px-4 py-2 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                  >
                    Validar acceso →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Live SQL Server Telemetry Strip (Hairline grid, no nested cards) */}
          <div className="mt-16 pt-10 border-t border-[#e5e5e5] grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                Socios Activos en Red
              </p>
              <p className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-[#0a0a0a] mt-1">
                {loadingData ? "—" : totalSociosActivos}
              </p>
              <Link
                href="/socios"
                className="text-[13px] text-[#292b2a] hover:text-[#ff6105] transition-colors inline-block mt-1"
              >
                Padrón de socios ({socios.length} registrados) →
              </Link>
            </div>

            <div className="lg:border-l lg:border-[#e5e5e5] lg:pl-8">
              <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                Contratos Vigentes
              </p>
              <p className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-[#0a0a0a] mt-1">
                {loadingData ? "—" : totalContratosVigentes}
              </p>
              <Link
                href="/contratos"
                className="text-[13px] text-[#292b2a] hover:text-[#ff6105] transition-colors inline-block mt-1"
              >
                Gestión de membresías y contratos →
              </Link>
            </div>

            <div className="lg:border-l lg:border-[#e5e5e5] lg:pl-8">
              <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                Sesiones Programadas
              </p>
              <p className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-[#0a0a0a] mt-1">
                {loadingData ? "—" : totalSesionesProgramadas}
              </p>
              <Link
                href="/clases"
                className="text-[13px] text-[#292b2a] hover:text-[#ff6105] transition-colors inline-block mt-1"
              >
                Cartelera y reserva de cupos →
              </Link>
            </div>

            <div className="lg:border-l lg:border-[#e5e5e5] lg:pl-8">
              <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                Sedes y Equipamiento
              </p>
              <p className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-[#0a0a0a] mt-1">
                {loadingData ? "—" : `${totalSedes} sedes`}
              </p>
              <Link
                href="/socios/sedes"
                className="text-[13px] text-[#292b2a] hover:text-[#ff6105] transition-colors inline-block mt-1"
              >
                Ver analítica por sucursal →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 1: PLANES DE MEMBRESÍA (SmartFit Plan Comparison + Rol Daniel) ===== */}
      <section
        id="planes"
        className="py-20 sm:py-24 px-4 sm:px-8 border-b border-[#e5e5e5] bg-[#ffffff]"
      >
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Membresías y Contratos
              </p>
              <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.2] tracking-[-0.030em] text-[#0a0a0a]">
                Elige el plan que se adapta a tu entrenamiento.
              </h2>
              <div className="w-[120px] h-[2px] bg-[#ff6105]" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/contratos"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Generador de Contratos
              </Link>
              <Link
                href="/contratos/caja"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Módulo de Caja y Pagos
              </Link>
              <Link
                href="/contratos/estado-cuenta"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Estado de Cuenta Socio
              </Link>
            </div>
          </div>

          {/* Grid de Planes desde SQL Server ([PlanMembresia]) */}
          {loadingData ? (
            <div className="py-16 text-center text-[16px] text-[#7a7b7b] border border-[#e5e5e5] rounded-[5px]">
              Consultando planes vigentes en SQL Server...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {planes.map((plan, idx) => {
                const id = plan.id_planmembresia ?? plan.id_plan ?? idx;
                const nombre =
                  plan.nombre_planmembresia ?? plan.nombre ?? "Plan Membresía";
                const meses = Number(
                  plan.duracion_meses_planmembresia ?? plan.duracion_meses ?? 1
                );
                const precioTotal = Number(
                  plan.precio_vigente_planmembresia ?? plan.precio_vigente ?? 0
                );
                const precioMensual = Math.round(
                  precioTotal / Math.max(1, meses)
                );

                // De acuerdo con DESIGN.md: el color Peach Wash (#ffdfcd) se reserva para UNA sola tarjeta destacada por sección
                const isFeatured =
                  meses === 12 ||
                  (idx === planes.length - 1 && planes.length > 1);

                return (
                  <div
                    key={id}
                    className={`rounded-[5px] p-6 flex flex-col justify-between transition-colors ${
                      isFeatured
                        ? "bg-[#ffdfcd] border border-[#ffa069]"
                        : "bg-[#ffffff] border border-[#e5e5e5]"
                    }`}
                  >
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
                          {meses} {meses === 1 ? "Mes" : "Meses"} de duración
                        </span>
                        {isFeatured && (
                          <span className="px-2.5 py-0.5 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                            Más elegido
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
                          {nombre}
                        </h3>
                        <p className="text-[14px] text-[#292b2a] mt-1">
                          Acceso completo a zona de musculación, peso libre y clases grupales.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#e5e5e5]">
                        <p className="text-[12px] text-[#7a7b7b]">Valor mensual equivalente</p>
                        <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-0.5">
                          {formatCLP(precioMensual)}
                          <span className="text-[14px] font-normal text-[#7a7b7b]">
                            {" "}
                            / mes
                          </span>
                        </p>
                        <p className="text-[13px] text-[#292b2a] mt-1">
                          Total contrato: <span className="font-medium">{formatCLP(precioTotal)}</span>
                        </p>
                      </div>

                      <ul className="space-y-2.5 pt-2 text-[14px] text-[#292b2a]">
                        <li className="flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                          <span>Ingreso validado en torniquete</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                          <span>Reserva en línea de sesiones grupales</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                          <span>Pago en efectivo, tarjeta o transferencia</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-8">
                      {isFeatured ? (
                        <Link
                          href="/contratos"
                          style={{
                            boxShadow:
                              "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                          }}
                          className="w-full py-3.5 px-6 rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[15px] font-medium text-center block transition-colors"
                        >
                          Contratar este plan
                        </Link>
                      ) : (
                        <Link
                          href="/contratos"
                          className="w-full py-3.5 px-6 rounded-[24px] bg-[#ffffff] hover:bg-[#f3f4f3] border border-[#0a0a0a] text-[#0a0a0a] text-[15px] font-medium text-center block transition-colors"
                        >
                          Seleccionar plan
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== SECCIÓN 2: SEDES, UBICACIÓN Y EQUIPAMIENTO (Estilo SmartFit Puerto Montt + Rol Carlos y Emilia) ===== */}
      <section
        id="sedes"
        className="py-20 sm:py-24 px-4 sm:px-8 border-b border-[#e5e5e5] bg-[#f3f4f3]"
      >
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Ubicaciones e Infraestructura
              </p>
              <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.2] tracking-[-0.030em] text-[#0a0a0a]">
                Conoce nuestras sedes y equipamiento.
              </h2>
              <div className="w-[120px] h-[2px] bg-[#ff6105]" />
            </div>

            {/* Selector de Sede (Secondary Pills 24px radius) */}
            <div className="flex flex-wrap gap-2">
              {sedes.map((s) => {
                const active = sedeActual?.id_sede === s.id_sede;
                return (
                  <button
                    key={s.id_sede}
                    onClick={() => setSelectedSedeId(s.id_sede)}
                    className={`px-5 py-2.5 rounded-[24px] text-[14px] transition-colors border ${
                      active
                        ? "bg-[#0a0a0a] text-[#ffffff] border-[#0a0a0a] font-medium"
                        : "bg-[#ffffff] text-[#292b2a] border-[#e5e5e5] hover:border-[#0a0a0a] font-normal"
                    }`}
                  >
                    {s.nombre_sede}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ficha Arquitectónica de la Sede Seleccionada */}
          <div className="rounded-[5px] border border-[#dfe0df] bg-[#ffffff] p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Columna Izquierda: Información de la Sede y Métricas */}
              <div className="lg:col-span-5 space-y-6 lg:border-r lg:border-[#e5e5e5] lg:pr-8">
                <div>
                  <span className="text-[12px] uppercase tracking-[0.06em] text-[#ff6105] font-medium">
                    Sucursal Activa
                  </span>
                  <h3 className="text-[28px] sm:text-[32px] font-light tracking-[-0.02em] text-[#0a0a0a] mt-1">
                    {sedeActual ? sedeActual.nombre_sede : "Sede Central"}
                  </h3>
                  <p className="text-[16px] text-[#292b2a] mt-2">
                    {sedeActual?.direccion_calle_sede
                      ? `${sedeActual.direccion_calle_sede}${
                          sedeActual.nombre_ciudad
                            ? `, ${sedeActual.nombre_ciudad}`
                            : ""
                        }`
                      : "Infraestructura equipada con zonas de peso libre, cardio y salas grupales."}
                  </p>
                  {sedeActual?.telefono_sede && (
                    <p className="text-[14px] text-[#7a7b7b] mt-1">
                      Teléfono recepción: {sedeActual.telefono_sede}
                    </p>
                  )}
                </div>

                <div className="pt-5 border-t border-[#e5e5e5] grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[12px] text-[#7a7b7b] uppercase tracking-[0.05em]">
                      Socios en Sede
                    </p>
                    <p className="text-[28px] font-light text-[#0a0a0a] mt-1">
                      {sociosEnSedeActual}
                    </p>
                    <p className="text-[12px] text-[#7a7b7b]">
                      Vista vw_Reporte_Socios_Por_Sede
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#7a7b7b] uppercase tracking-[0.05em]">
                      Recaudación Sede
                    </p>
                    <p className="text-[28px] font-light text-[#0a0a0a] mt-1">
                      {formatCLP(ingresosEnSedeActual)}
                    </p>
                    <p className="text-[12px] text-[#7a7b7b]">
                      Vista vw_Reporte_Ingresos_Por_Sede
                    </p>
                  </div>
                </div>

                <div className="pt-5 border-t border-[#e5e5e5] space-y-2">
                  <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
                    Servicios Disponibles en esta Sede
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[14px] text-[#292b2a] pt-1">
                    <span>Zona de Musculación</span>
                    <span>Salas de Clases Grupales</span>
                    <span>Torniquete Electrónico</span>
                    <span>Recepción y Caja</span>
                    <span>Camarines y Lockers</span>
                    <span>Instructores de Planta</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap gap-3">
                  <Link
                    href="/socios/sedes"
                    className="px-5 py-2.5 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] text-[14px] text-[#0a0a0a] font-medium transition-colors"
                  >
                    Reporte de Sedes →
                  </Link>
                  <Link
                    href="/clases/equipos"
                    className="px-5 py-2.5 rounded-[24px] bg-[#ffffff] hover:bg-[#f3f4f3] border border-[#e5e5e5] text-[14px] text-[#292b2a] transition-colors"
                  >
                    Administrar Equipos →
                  </Link>
                </div>
              </div>

              {/* Columna Derecha: Inventario Real de Equipamiento en la Sede ([Equipamiento]) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
                        Inventario Técnico en Base de Datos
                      </p>
                      <h4 className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                        Máquinas y Equipamiento de la Sede
                      </h4>
                    </div>
                    <span className="text-[13px] text-[#7a7b7b]">
                      {equiposSedeActual.length} equipos registrados
                    </span>
                  </div>

                  {equiposSedeActual.length === 0 ? (
                    <p className="text-[14px] text-[#7a7b7b] py-8">
                      No hay equipos registrados para esta sucursal o están cargándose desde SQL Server.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#e5e5e5]">
                      {equiposSedeActual.slice(0, 6).map((eq) => (
                        <div
                          key={eq.id_equipamiento}
                          className="py-3.5 flex items-center justify-between gap-4 text-[14px]"
                        >
                          <div>
                            <p className="font-medium text-[#0a0a0a]">
                              {eq.nombre_descriptivo_equipamiento}
                            </p>
                            <p className="text-[12px] text-[#7a7b7b]">
                              Sede: {eq.nombre_sede} · Adquisición:{" "}
                              {String(eq.fecha_adquisicion_equipamiento).slice(0, 10)}
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[12px] text-[#292b2a] whitespace-nowrap">
                            {eq.antiguedad_anios === 0
                              ? "Nuevo (< 1 año)"
                              : `${eq.antiguedad_anios} ${
                                  eq.antiguedad_anios === 1 ? "año" : "años"
                                } uso`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#7a7b7b]">
                  <span>
                    Datos sincronizados en vivo desde la tabla [Equipamiento] en SQL Server.
                  </span>
                  <Link
                    href="/clases/equipos"
                    className="text-[#0a0a0a] font-medium hover:text-[#ff6105] transition-colors"
                  >
                    Ver inventario completo ({equipos.length} máquinas) →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 3: CLASES GRUPALES Y HORARIOS (Rol Emilia) ===== */}
      <section
        id="clases"
        className="py-20 sm:py-24 px-4 sm:px-8 border-b border-[#e5e5e5] bg-[#ffffff]"
      >
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Entrenamiento Dirigido
              </p>
              <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.2] tracking-[-0.030em] text-[#0a0a0a]">
                Cartelera de clases y cupos en tiempo real.
              </h2>
              <div className="w-[120px] h-[2px] bg-[#ff6105]" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/clases"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Reservar Clase
              </Link>
              <Link
                href="/clases/instructor"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Portal del Instructor
              </Link>
              <Link
                href="/clases/programador"
                className="px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] text-[#292b2a] transition-colors"
              >
                Programar Sesión
              </Link>
            </div>
          </div>

          {/* Filtro por Sede */}
          {nombresSedesUnicas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-[#7a7b7b] mr-2">
                Filtrar cartelera por sede:
              </span>
              {["Todas", ...nombresSedesUnicas].map((sedeName) => (
                <button
                  key={sedeName}
                  onClick={() => setFiltroSedeClases(sedeName)}
                  className={`px-4 py-1.5 rounded-[24px] text-[13px] border transition-colors ${
                    filtroSedeClases === sedeName
                      ? "bg-[#0a0a0a] text-[#ffffff] border-[#0a0a0a] font-medium"
                      : "bg-[#ffffff] text-[#292b2a] border-[#e5e5e5] hover:border-[#0a0a0a]"
                  }`}
                >
                  {sedeName}
                </button>
              ))}
            </div>
          )}

          {/* Lista Arquitectónica de Sesiones (vw_Reporte_Ocupacion_Clases) */}
          <div className="rounded-[5px] border border-[#e5e5e5] bg-[#ffffff] divide-y divide-[#e5e5e5]">
            <div className="hidden md:grid md:grid-cols-12 px-6 py-3.5 bg-[#f3f4f3] text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
              <div className="col-span-4">Disciplina</div>
              <div className="col-span-3">Sede</div>
              <div className="col-span-2">Fecha y Hora</div>
              <div className="col-span-2">Ocupación</div>
              <div className="col-span-1 text-right">Acción</div>
            </div>

            {loadingData ? (
              <div className="p-10 text-center text-[15px] text-[#7a7b7b]">
                Cargando sesiones programadas desde SQL Server...
              </div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="p-10 text-center text-[15px] text-[#7a7b7b]">
                No hay sesiones registradas para el filtro seleccionado.
              </div>
            ) : (
              sesionesFiltradas.slice(0, 6).map((s) => {
                const nombreClase =
                  s.nombre_clase ?? s.Clase ?? "Clase Grupal";
                const sede = s.nombre_sede ?? s.Sede ?? "Sede Central";
                const fecha = (s.fecha_sesion ?? s.fecha ?? "").slice(0, 10);
                const hora = (s.hora_sesion ?? s.hora ?? "").slice(0, 5);
                const cupoMax = Number(
                  s.cupo_maximo_sesion ?? s.cupo_maximo ?? 20
                );
                const inscritos = Number(
                  s.total_inscritos ?? s.Total_Inscritos ?? 0
                );
                const disponibles = Number(
                  s.cupos_disponibles ??
                    s.Cupos_Disponibles ??
                    Math.max(0, cupoMax - inscritos)
                );
                const pct = Math.min(
                  100,
                  Math.round((inscritos / Math.max(1, cupoMax)) * 100)
                );

                return (
                  <div
                    key={s.id_sesion}
                    className="p-5 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-[#f3f4f3]/50 transition-colors"
                  >
                    <div className="md:col-span-4">
                      <p className="text-[16px] font-medium text-[#0a0a0a]">
                        {nombreClase}
                      </p>
                      <p className="text-[12px] text-[#7a7b7b]">
                        Sesión #{s.id_sesion}
                      </p>
                    </div>

                    <div className="md:col-span-3 text-[14px] text-[#292b2a]">
                      {sede}
                    </div>

                    <div className="md:col-span-2 text-[14px] text-[#292b2a]">
                      <p className="font-medium text-[#0a0a0a]">{fecha}</p>
                      <p className="text-[13px] text-[#7a7b7b]">{hora} hrs</p>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[#292b2a]">
                          {disponibles > 0
                            ? `${disponibles} libres`
                            : "Sin cupos"}
                        </span>
                        <span className="text-[#7a7b7b]">
                          {inscritos}/{cupoMax}
                        </span>
                      </div>
                      <div className="w-full h-[2px] bg-[#e5e5e5]">
                        <div
                          className="h-full bg-[#ff6105]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-1 md:text-right">
                      <Link
                        href="/clases"
                        className="inline-block px-4 py-2 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                      >
                        Reservar
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 4: CÓMO FUNCIONA EL ACCESO Y RECEPCIÓN EN VIVO (2-Column 50/50 Step Indicator Row + Torniquete — Rol Carlos) ===== */}
      <section
        id="acceso"
        className="py-20 sm:py-24 px-4 sm:px-8 border-b border-[#e5e5e5] bg-[#ffffff]"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column (50%): Step Indicator Row exacto según DESIGN.md */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                  Experiencia del Socio y Recepción
                </p>
                <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.2] tracking-[-0.030em] text-[#0a0a0a]">
                  Cómo funciona tu ingreso en GimnasioDB.
                </h2>
                <div className="w-[120px] h-[2px] bg-[#ff6105]" />
              </div>

              <div className="space-y-6 pt-2">
                {/* Step 1 */}
                <div
                  onClick={() => setActiveStep(1)}
                  className={`cursor-pointer pb-5 ${
                    activeStep === 1
                      ? "border-b-2 border-[#e5e5e5]"
                      : "border-b border-[#e5e5e5]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {activeStep === 1 ? (
                      <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                        Step 1
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#a2a3a2] font-normal">
                        Step 1
                      </span>
                    )}
                    <Link
                      href="/socios"
                      className="text-[13px] text-[#7a7b7b] hover:text-[#0a0a0a]"
                    >
                      Ir a Padrón de Socios →
                    </Link>
                  </div>
                  <h3
                    className={`text-[18px] leading-[1.5] tracking-[-0.01em] ${
                      activeStep === 1
                        ? "font-medium text-[#0a0a0a]"
                        : "font-normal text-[#292b2a]"
                    }`}
                  >
                    Registro de Socio y Credenciales Seguras
                  </h3>
                  <p className="text-[14px] text-[#7a7b7b] mt-1">
                    Inscripción en tu sede de preferencia y creación de cuenta con
                    cifrado nativo SHA2_512 en SQL Server.
                  </p>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() => setActiveStep(2)}
                  className={`cursor-pointer pb-5 ${
                    activeStep === 2
                      ? "border-b-2 border-[#e5e5e5]"
                      : "border-b border-[#e5e5e5]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {activeStep === 2 ? (
                      <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                        Step 2
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#a2a3a2] font-normal">
                        Step 2
                      </span>
                    )}
                    <Link
                      href="/contratos"
                      className="text-[13px] text-[#7a7b7b] hover:text-[#0a0a0a]"
                    >
                      Ir a Contratos y Caja →
                    </Link>
                  </div>
                  <h3
                    className={`text-[18px] leading-[1.5] tracking-[-0.01em] ${
                      activeStep === 2
                        ? "font-medium text-[#0a0a0a]"
                        : "font-normal text-[#292b2a]"
                    }`}
                  >
                    Activación de Membresía y Pago Transaccional
                  </h3>
                  <p className="text-[14px] text-[#7a7b7b] mt-1">
                    Emisión inmediata del contrato y recibo de caja mediante
                    procedimientos almacenados atómicos.
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() => setActiveStep(3)}
                  className={`cursor-pointer pb-5 ${
                    activeStep === 3
                      ? "border-b-2 border-[#e5e5e5]"
                      : "border-b border-[#e5e5e5]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    {activeStep === 3 ? (
                      <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                        Step 3
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#a2a3a2] font-normal">
                        Step 3
                      </span>
                    )}
                    <Link
                      href="/socios/torniquete"
                      className="text-[13px] text-[#7a7b7b] hover:text-[#0a0a0a]"
                    >
                      Abrir Torniquete →
                    </Link>
                  </div>
                  <h3
                    className={`text-[18px] leading-[1.5] tracking-[-0.01em] ${
                      activeStep === 3
                        ? "font-medium text-[#0a0a0a]"
                        : "font-normal text-[#292b2a]"
                    }`}
                  >
                    Validación en Torniquete y Reserva de Clases
                  </h3>
                  <p className="text-[14px] text-[#7a7b7b] mt-1">
                    Ingresa con tu RUT o ID en recepción; el sistema verifica en
                    tiempo real que tu membresía esté vigente.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column (50%): Terminal de Control de Acceso / Torniquete en Vivo */}
            <div className="lg:col-span-6">
              <div className="rounded-[5px] bg-[#ffdfcd] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[#ffa069]/40 pb-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium mb-2">
                      Recepción en Vivo
                    </span>
                    <h3 className="text-[24px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                      Control de Acceso en Torniquete
                    </h3>
                  </div>
                  <Link
                    href="/socios/torniquete"
                    className="text-[13px] font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors"
                  >
                    Vista completa →
                  </Link>
                </div>

                <p className="text-[15px] text-[#292b2a]">
                  Comprueba en tiempo real si un socio tiene autorización de ingreso
                  consultando su estado y contrato activo en SQL Server.
                </p>

                <form onSubmit={handleValidarAcceso} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Input Pill (50px radius, 1px #e5e5e5 border) */}
                    <input
                      type="text"
                      placeholder="Ingresa RUT (ej. 12.345.678-9) o ID de Socio"
                      value={accesoIdentificador}
                      onChange={(e) => setAccesoIdentificador(e.target.value)}
                      className="flex-1 rounded-[50px] border border-[#e5e5e5] bg-[#ffffff] px-5 py-3.5 text-[16px] text-[#0a0a0a] placeholder:text-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/40 focus:border-[#ff6105]"
                    />
                    <button
                      type="submit"
                      disabled={accesoLoading || !accesoIdentificador.trim()}
                      style={{
                        boxShadow:
                          "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                      }}
                      className="px-7 py-3.5 rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] disabled:opacity-50 text-[#ffffff] text-[15px] font-medium transition-colors whitespace-nowrap"
                    >
                      {accesoLoading ? "Verificando..." : "Validar Ingreso"}
                    </button>
                  </div>

                  {socios.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                      <span className="text-[13px] text-[#292b2a]">
                        O selecciona un socio registrado:
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setAccesoIdentificador(e.target.value);
                        }}
                        className="flex-1 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] px-4 py-2 text-[13px] text-[#292b2a] focus:outline-none focus:border-[#ff6105]"
                      >
                        <option value="">Seleccionar socio de la base de datos...</option>
                        {socios.slice(0, 15).map((s) => (
                          <option
                            key={s.id_socio}
                            value={s.rut_socio ?? s.rut ?? String(s.id_socio)}
                          >
                            {s.nombre_completo_socio ?? s.nombre_completo} —{" "}
                            {s.rut_socio ?? s.rut ?? `ID ${s.id_socio}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </form>

                {accesoResultado && (
                  <div className="pt-4 border-t border-[#ffa069]/50 space-y-1.5 text-[14px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#0a0a0a] uppercase tracking-[0.04em] text-[12px]">
                        {accesoResultado.acceso_permitido
                          ? "Autorizado — Torniquete Abierto"
                          : "Acceso Denegado en Recepción"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-[8px] text-[12px] font-medium ${
                          accesoResultado.acceso_permitido
                            ? "bg-[#0a0a0a] text-[#ffffff]"
                            : "bg-[#ff6105] text-[#ffffff]"
                        }`}
                      >
                        {accesoResultado.acceso_permitido ? "Vigente" : "Bloqueado"}
                      </span>
                    </div>
                    <p className="text-[#292b2a]">{accesoResultado.motivo}</p>
                    {accesoResultado.nombre_completo_socio && (
                      <p className="text-[13px] text-[#7a7b7b]">
                        Socio: {accesoResultado.nombre_completo_socio}
                        {accesoResultado.nombre_plan
                          ? ` · Plan: ${accesoResultado.nombre_plan}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 5: DARK FEATURE BAND (#202120 Charcoal) — DIRECTORIO COMPLETO DE MÓDULOS ===== */}
      <section
        id="operaciones"
        className="bg-[#202120] text-[#ffffff] py-24 sm:py-28 px-4 sm:px-8"
      >
        <div className="max-w-[1200px] mx-auto space-y-16">
          {/* Centered Headline + 60px #ff6105 Accent Rule exacto según DESIGN.md */}
          <div className="text-center max-w-[760px] mx-auto space-y-5">
            <p className="text-[12px] uppercase tracking-[0.1em] text-[#a2a3a2] font-medium">
              Arquitectura Operativa Completa
            </p>
            <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.2] tracking-[-0.030em] text-[#ffffff]">
              Diseñado para gestionar cada área del gimnasio.
            </h2>
            <div className="w-[60px] h-[2px] bg-[#ff6105] mx-auto" />
            <p className="text-[16px] text-[#a2a3a2] font-normal leading-[1.56]">
              Accede directamente a los 12 paneles operativos desarrollados sobre
              FastAPI y SQL Server (consultas parametrizadas con pyodbc, vistas
              analíticas y procedimientos almacenados).
            </p>
          </div>

          {/* 3-Column Architectural Index separated by Smoke #3c3e3d hairlines (Zero nested cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-4 border-t border-[#3c3e3d]">
            {/* Columna 1: Carlos */}
            <div className="space-y-6">
              <div className="space-y-2 border-b border-[#3c3e3d] pb-4">
                <span className="text-[12px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  01 · Socios, Sedes y Acceso
                </span>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] text-[#ffffff]">
                  Recepción y Padrón
                </h3>
                <p className="text-[14px] text-[#a2a3a2]">
                  Autenticación SHA2_512, fichas de socios, control de ingreso por
                  torniquete y analítica por sucursal.
                </p>
              </div>

              <ul className="divide-y divide-[#3c3e3d] text-[15px]">
                <li>
                  <Link
                    href="/socios"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Gestión y Padrón de Socios</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socios/torniquete"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Simulador de Torniquete y Acceso</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socios/sedes"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Sedes y Reporte por Sucursal</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socios/login"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Autenticación y Mi Perfil</span>
                    <span>→</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 2: Emilia */}
            <div className="space-y-6 md:border-l md:border-[#3c3e3d] md:pl-10">
              <div className="space-y-2 border-b border-[#3c3e3d] pb-4">
                <span className="text-[12px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  02 · Clases, Sesiones y Equipos
                </span>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] text-[#ffffff]">
                  Coordinación Deportiva
                </h3>
                <p className="text-[14px] text-[#a2a3a2]">
                  Programación de clases grupales, reserva de cupos, control de
                  asistencia e inventario de máquinas.
                </p>
              </div>

              <ul className="divide-y divide-[#3c3e3d] text-[15px]">
                <li>
                  <Link
                    href="/clases"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Catálogo de Clases y Reservas</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/instructor"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Portal del Instructor y Asistencia</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/programador"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Programador de Sesiones</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/equipos"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Inventario de Equipamiento</span>
                    <span>→</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Daniel */}
            <div className="space-y-6 md:border-l md:border-[#3c3e3d] md:pl-10">
              <div className="space-y-2 border-b border-[#3c3e3d] pb-4">
                <span className="text-[12px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  03 · Planes, Contratos y Finanzas
                </span>
                <h3 className="text-[24px] font-medium tracking-[-0.02em] text-[#ffffff]">
                  Membresías y Caja
                </h3>
                <p className="text-[14px] text-[#a2a3a2]">
                  Suscripción de planes, cobro en caja, estado de cuenta del socio,
                  personal y reporte de ingresos por sede.
                </p>
              </div>

              <ul className="divide-y divide-[#3c3e3d] text-[15px]">
                <li>
                  <Link
                    href="/contratos"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Catálogo de Planes y Contratos</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/caja"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Módulo de Caja y Recaudación</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/estado-cuenta"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Estado de Cuenta del Socio</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/personal"
                    className="py-3.5 flex items-center justify-between text-[#ffffff] hover:text-[#ff6105] transition-colors"
                  >
                    <span>Personal e Ingresos por Sede</span>
                    <span>→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer Minimalista (#ffffff Canvas White, 1px #e5e5e5 border) ===== */}
      <footer className="bg-[#ffffff] border-t border-[#e5e5e5] py-12 px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-[13px] text-[#7a7b7b]">
          <div className="flex items-center gap-3">
            <span className="text-[#0a0a0a] font-medium tracking-[-0.02em] text-[16px]">
              gimnasiodb
            </span>
            <span>·</span>
            <span>Sistema Integral de Gestión de Gimnasios</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>
              API:{" "}
              <span className="text-[#292b2a]">{apiClient.getBaseUrl()}</span>
            </span>
            <span>·</span>
            <span className="text-[#0a0a0a] font-medium">
              {healthStatus
                ? "SQL Server Conectado"
                : loading || isWakingUp
                ? "Conectando con servidor..."
                : "Modo reconexión"}
            </span>
            {errorMsg && !loading && (
              <button
                onClick={() => checkConnection(3)}
                className="px-3 py-1 rounded-[24px] border border-[#e5e5e5] text-[#0a0a0a] hover:border-[#0a0a0a] transition-colors"
              >
                Reintentar conexión
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
