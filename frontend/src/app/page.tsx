"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import apiClient, {
  Socio,
  PlanMembresia,
  SesionOcupacion,
  Clase,
} from "@/services/apiClient";

const SEDE_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80",
];

const CLASE_IMAGES = [
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
];

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Datos reales desde SQL Server (resumidos para la portada)
  const [socios, setSocios] = useState<Socio[]>([]);
  const [planes, setPlanes] = useState<PlanMembresia[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [sesiones, setSesiones] = useState<SesionOcupacion[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Validador rápido de pase en "Tu Espacio"
  const [accesoIdentificador, setAccesoIdentificador] = useState("");
  const [accesoLoading, setAccesoLoading] = useState(false);
  const [accesoResultado, setAccesoResultado] = useState<any>(null);

  const cargarResumen = useCallback(async () => {
    setLoadingData(true);
    try {
      const [sociosRes, planesRes, clasesRes, sesionesRes, sedesRes] =
        await Promise.allSettled([
          apiClient.socios.getAll({ limite: 100 }),
          apiClient.contratos.getPlanes(),
          apiClient.clases.getAll(),
          apiClient.clases.getSesiones(),
          apiClient.socios.getSedesCatalogo(),
        ]);

      if (sociosRes.status === "fulfilled" && Array.isArray(sociosRes.value)) {
        setSocios(sociosRes.value);
      }
      if (planesRes.status === "fulfilled" && Array.isArray(planesRes.value)) {
        setPlanes(planesRes.value);
      }
      if (clasesRes.status === "fulfilled" && Array.isArray(clasesRes.value)) {
        setClases(clasesRes.value);
      }
      if (sesionesRes.status === "fulfilled" && Array.isArray(sesionesRes.value)) {
        setSesiones(sesionesRes.value);
      }
      if (sedesRes.status === "fulfilled" && Array.isArray(sedesRes.value)) {
        setSedes(sedesRes.value);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  const checkConnection = useCallback(
    async (intentos = 3) => {
      setLoading(true);
      try {
        const data = await apiClient.health();
        setHealthStatus(data);
        setIsWakingUp(false);
        setLoading(false);
        cargarResumen();
      } catch {
        if (intentos > 1) {
          setIsWakingUp(true);
          setTimeout(() => checkConnection(intentos - 1), 4000);
        } else {
          setIsWakingUp(false);
          setLoading(false);
          cargarResumen();
        }
      }
    },
    [cargarResumen]
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
        motivo: err.message || "No se pudo validar el RUT ingresado.",
      });
    } finally {
      setAccesoLoading(false);
    }
  };

  const formatCLP = (val: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const totalSociosActivos = socios.filter(
    (s) => (s.activo_socio ?? s.activo) === true
  ).length;

  // Mostrar máximo 3 planes destacados en el inicio (estilo SmartFit)
  const planesDestacados = planes.slice(0, 3);

  // Mostrar máximo 3 sedes en el inicio
  const sedesDestacadas =
    sedes.length > 0
      ? sedes.slice(0, 3)
      : [
          {
            id_sede: 1,
            nombre_sede: "Sede Central",
            direccion_calle_sede: "Av. Principal 1240",
            nombre_ciudad: "Santiago",
          },
          {
            id_sede: 2,
            nombre_sede: "Sede Oriente",
            direccion_calle_sede: "Av. Providencia 2150",
            nombre_ciudad: "Santiago",
          },
          {
            id_sede: 3,
            nombre_sede: "Sede Sur",
            direccion_calle_sede: "Av. Costanera 890",
            nombre_ciudad: "Puerto Montt",
          },
        ];

  // Mostrar máximo 4 disciplinas visuales en el inicio
  const clasesDestacadas: Clase[] =
    clases.length > 0
      ? clases.slice(0, 4)
      : [
          {
            id_clase: 1,
            nombre_clase: "HIIT Funcional",
            duracion_minutos_clase: 45,
            nivel_exigencia_clase: "Avanzado",
          },
          {
            id_clase: 2,
            nombre_clase: "Indoor Cycling",
            duracion_minutos_clase: 50,
            nivel_exigencia_clase: "Intermedio",
          },
          {
            id_clase: 3,
            nombre_clase: "Power & Fuerza",
            duracion_minutos_clase: 60,
            nivel_exigencia_clase: "Intermedio",
          },
          {
            id_clase: 4,
            nombre_clase: "Mobility & Core",
            duracion_minutos_clase: 45,
            nivel_exigencia_clase: "Principiante",
          },
        ];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] font-normal">
      {/* ===== Announcement Bar (#f3f4f3 Linen, 40px) ===== */}
      <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] h-10 px-4 sm:px-8 flex items-center">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between text-[13px] text-[#292b2a]">
          <span className="truncate">
            Matrícula costo $0 en todas nuestras sedes · Entrena desde hoy
          </span>
          <Link
            href="/contratos"
            className="font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors whitespace-nowrap shrink-0 ml-4"
          >
            Ver planes →
          </Link>
        </div>
      </div>

      {/* ===== Top Navigation (Bien alineado, sin saltos de línea + Menú Hamburguesa) ===== */}
      <header className="sticky top-0 z-40 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e5e5e5] h-[72px] px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-[#0a0a0a] tracking-[-0.03em] text-[24px] font-medium whitespace-nowrap shrink-0"
          >
            <span>gimnasio</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff6105]" />
            <span className="font-light text-[#7a7b7b]">db</span>
          </Link>

          {/* Links Centrales Concisos (Nunca hacen salto de línea) */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-normal text-[#292b2a]">
            <Link
              href="/socios/sedes"
              className="hover:text-[#ff6105] transition-colors whitespace-nowrap"
            >
              Gimnasios
            </Link>
            <Link
              href="/contratos"
              className="hover:text-[#ff6105] transition-colors whitespace-nowrap"
            >
              Planes
            </Link>
            <Link
              href="/clases"
              className="hover:text-[#ff6105] transition-colors whitespace-nowrap"
            >
              Clases
            </Link>
            <Link
              href="/contratos/estado-cuenta"
              className="hover:text-[#ff6105] transition-colors whitespace-nowrap"
            >
              Tu Espacio
            </Link>
            <Link
              href="/socios/torniquete"
              className="hover:text-[#ff6105] transition-colors whitespace-nowrap"
            >
              Recepción
            </Link>
          </nav>

          {/* Controles Derecha: CTA Pill + Botón Menú Hamburguesa */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/socios/login"
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[14px] font-normal text-[#292b2a] whitespace-nowrap transition-colors"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/contratos"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-[40px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[14px] font-medium whitespace-nowrap transition-colors"
            >
              Inscríbete ya
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="inline-flex items-center justify-center w-10 h-10 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] text-[#0a0a0a] transition-colors shrink-0"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 5H15.5M2.5 9H15.5M2.5 13H15.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ===== Drawer Menú Lateral (Estilo SmartFit para navegar a todos los módulos sin saturar el inicio) ===== */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0a0a0a]/40 backdrop-blur-xs">
          <div className="w-full max-w-[380px] bg-[#ffffff] h-full border-l border-[#e5e5e5] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
                <span className="text-[20px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                  Menú GimnasioDB
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-[24px] border border-[#e5e5e5] flex items-center justify-center text-[#292b2a] hover:text-[#0a0a0a]"
                >
                  ✕
                </button>
              </div>

              {/* Grupo 1: Planes y Finanzas (Daniel) */}
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  Planes, Contratos y Caja
                </p>
                <div className="flex flex-col space-y-1 text-[15px]">
                  <Link
                    href="/contratos"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#0a0a0a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Planes y Suscripción</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/contratos/caja"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Caja y Recepción de Pagos</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/contratos/estado-cuenta"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Estado de Cuenta del Socio</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/contratos/personal"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Personal e Ingresos por Sede</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Grupo 2: Sedes y Socios (Carlos) */}
              <div className="space-y-2.5 pt-4 border-t border-[#e5e5e5]">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  Gimnasios, Socios y Acceso
                </p>
                <div className="flex flex-col space-y-1 text-[15px]">
                  <Link
                    href="/socios/sedes"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#0a0a0a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Nuestras Sedes y Reportes</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/socios/torniquete"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Control de Acceso (Torniquete)</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/socios"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Directorio de Socios</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/socios/login"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Acceso y Perfil de Usuario</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Grupo 3: Clases y Equipos (Emilia) */}
              <div className="space-y-2.5 pt-4 border-t border-[#e5e5e5]">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                  Clases Grupales y Equipamiento
                </p>
                <div className="flex flex-col space-y-1 text-[15px]">
                  <Link
                    href="/clases"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#0a0a0a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Catálogo y Reserva de Clases</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/clases/instructor"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Portal del Instructor</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/clases/programador"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Programador de Sesiones</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/clases/equipos"
                    onClick={() => setMenuOpen(false)}
                    className="py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between"
                  >
                    <span>Inventario de Máquinas</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#e5e5e5]">
              <Link
                href="/contratos"
                onClick={() => setMenuOpen(false)}
                style={{
                  boxShadow:
                    "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                }}
                className="w-full py-3.5 px-6 rounded-[50px] bg-[#ff6105] text-[#ffffff] text-[15px] font-medium text-center block"
              >
                Inscríbete ya
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ===== BANNER PRINCIPAL HERO CON FOTOGRAFÍA ===== */}
      <section className="px-4 sm:px-8 pt-6 pb-16">
        <div className="max-w-[1200px] mx-auto space-y-8">
          <div className="relative rounded-[8px] overflow-hidden bg-[#202120] min-h-[480px] sm:min-h-[540px] flex items-end">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85"
              alt="Instalaciones de GimnasioDB"
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/45 to-transparent" />

            <div className="relative z-10 p-6 sm:p-12 lg:p-16 max-w-[760px] space-y-5">
              <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium tracking-[0.04em] uppercase">
                Temporada 2026 · Matrícula Gratis
              </span>

              <h1 className="text-[40px] sm:text-[56px] lg:text-[68px] font-light leading-[1.06] tracking-[-0.036em] text-[#ffffff]">
                Entrena a tu ritmo en espacios de alto nivel.
              </h1>

              <div className="w-[100px] h-[2px] bg-[#ff6105]" />

              <p className="text-[16px] sm:text-[18px] text-[#e5e5e5] font-normal max-w-[540px] leading-[1.5]">
                Zonas de musculación, peso libre y clases grupales con reserva en
                línea. Planes desde{" "}
                <span className="text-[#ffffff] font-medium">$24.990 / mes</span>.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/contratos"
                  style={{
                    boxShadow:
                      "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                  }}
                  className="px-8 py-4 rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[16px] font-medium tracking-[-0.01em] transition-all whitespace-nowrap"
                >
                  Inscríbete ya →
                </Link>

                <Link
                  href="/socios/sedes"
                  className="px-6 py-4 rounded-[24px] bg-[#ffffff] hover:bg-[#f3f4f3] text-[#0a0a0a] text-[15px] font-medium transition-colors whitespace-nowrap"
                >
                  Buscar gimnasio
                </Link>
              </div>
            </div>
          </div>

          {/* Barra Compacta de Datos Reales y Horario (Alineada en 4 bloques limpios) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#e5e5e5] rounded-[5px] bg-[#ffffff] divide-y lg:divide-y-0 lg:divide-x divide-[#e5e5e5]">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                  Horario Lunes a Viernes
                </p>
                <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                  06:00 — 23:00 hrs
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            </div>

            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                  Sábados y Domingos
                </p>
                <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                  08:00 — 18:00 hrs
                </p>
              </div>
            </div>

            <Link
              href="/socios"
              className="p-5 flex items-center justify-between hover:bg-[#f3f4f3] transition-colors"
            >
              <div>
                <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                  Comunidad Activa
                </p>
                <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                  {loadingData ? "..." : `${totalSociosActivos} socios activos`}
                </p>
              </div>
              <span className="text-[14px] text-[#7a7b7b]">→</span>
            </Link>

            <Link
              href="/clases"
              className="p-5 flex items-center justify-between hover:bg-[#f3f4f3] transition-colors"
            >
              <div>
                <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                  Clases Programadas
                </p>
                <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                  {loadingData ? "..." : `${sesiones.length} sesiones`}
                </p>
              </div>
              <span className="text-[14px] text-[#7a7b7b]">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 1: ENCUENTRA TU SEDE MÁS CERCANA (Tarjetas con Foto -> /socios/sedes) ===== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-[#f3f4f3] border-t border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Nuestras Ubicaciones
              </p>
              <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                Encuentra tu sede más cercana
              </h2>
              <div className="w-[80px] h-[2px] bg-[#ff6105]" />
            </div>

            <Link
              href="/socios/sedes"
              className="inline-flex items-center px-6 py-3 rounded-[24px] bg-[#ffffff] hover:bg-[#0a0a0a] text-[#0a0a0a] hover:text-[#ffffff] border border-[#e5e5e5] text-[14px] font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Ver todas las sedes →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sedesDestacadas.map((sede, index) => (
              <div
                key={sede.id_sede ?? index}
                className="rounded-[5px] border border-[#e5e5e5] bg-[#ffffff] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-52 overflow-hidden bg-[#202120]">
                    <img
                      src={SEDE_IMAGES[index % SEDE_IMAGES.length]}
                      alt={sede.nombre_sede}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-[8px] bg-[#0a0a0a]/80 text-[#ffffff] text-[11px] font-medium">
                      Abierto · 06:00 a 23:00
                    </span>
                  </div>

                  <div className="p-6 space-y-2">
                    <h3 className="text-[22px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                      {sede.nombre_sede}
                    </h3>
                    <p className="text-[14px] text-[#7a7b7b] truncate">
                      {sede.direccion_calle_sede || "Zona de musculación, cardio y clases"}
                      {sede.nombre_ciudad ? ` · ${sede.nombre_ciudad}` : ""}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-[#e5e5e5] flex items-center justify-between gap-2">
                  <Link
                    href="/socios/sedes"
                    className="text-[14px] font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors"
                  >
                    Ver sede y métricas →
                  </Link>
                  <Link
                    href="/contratos"
                    className="px-4 py-2 rounded-[24px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[13px] font-medium transition-colors whitespace-nowrap"
                  >
                    Inscríbete
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 2: ELIGE TU MEJOR PLAN (Solo 3 Planes, conciso -> /contratos) ===== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-[#ffffff]">
        <div className="max-w-[1200px] mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Membresías Sin Permanencia Forzosa
              </p>
              <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                Elige tu mejor plan
              </h2>
              <div className="w-[80px] h-[2px] bg-[#ff6105]" />
            </div>

            <Link
              href="/contratos"
              className="inline-flex items-center px-6 py-3 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] text-[#0a0a0a] text-[14px] font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Ver todos los planes y contratos →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planesDestacados.map((plan, idx) => {
              const id = plan.id_planmembresia ?? plan.id_plan ?? idx;
              const nombre =
                plan.nombre_planmembresia ?? plan.nombre ?? "Plan Fitness";
              const meses = Number(
                plan.duracion_meses_planmembresia ?? plan.duracion_meses ?? 1
              );
              const precioTotal = Number(
                plan.precio_vigente_planmembresia ?? plan.precio_vigente ?? 29990
              );
              const precioMensual = Math.round(precioTotal / Math.max(1, meses));
              const isFeatured = idx === 1 || (planesDestacados.length === 1 && idx === 0);

              return (
                <div
                  key={id}
                  className={`rounded-[5px] p-7 flex flex-col justify-between ${
                    isFeatured
                      ? "bg-[#ffdfcd] border border-[#ffa069]"
                      : "bg-[#ffffff] border border-[#e5e5e5]"
                  }`}
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b] font-medium">
                        {meses} {meses === 1 ? "Mes" : "Meses"}
                      </span>
                      {isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                          Más conveniente
                        </span>
                      )}
                    </div>

                    <h3 className="text-[26px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                      {nombre}
                    </h3>

                    <div className="pt-2">
                      <p className="text-[12px] text-[#7a7b7b]">Desde</p>
                      <p className="text-[36px] font-light tracking-[-0.03em] text-[#0a0a0a] leading-none mt-1">
                        {formatCLP(precioMensual)}
                        <span className="text-[14px] font-normal text-[#7a7b7b]">
                          {" "}
                          / mes
                        </span>
                      </p>
                      <p className="text-[13px] text-[#292b2a] mt-2">
                        Valor total plan: {formatCLP(precioTotal)}
                      </p>
                    </div>

                    <ul className="space-y-2.5 pt-4 border-t border-[#e5e5e5] text-[14px] text-[#292b2a]">
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                        <span>Acceso a todas las zonas de peso y cardio</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                        <span>Clases grupales ilimitadas con reserva</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
                        <span>Sin cobro de matrícula ni mantención</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-8">
                    <Link
                      href="/contratos"
                      style={
                        isFeatured
                          ? {
                              boxShadow:
                                "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
                            }
                          : undefined
                      }
                      className={`w-full py-3.5 px-6 text-[15px] font-medium text-center block transition-colors ${
                        isFeatured
                          ? "rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff]"
                          : "rounded-[24px] bg-[#0a0a0a] hover:bg-[#292b2a] text-[#ffffff]"
                      }`}
                    >
                      ¡Inscríbete ya!
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 3: CLASES EXCLUSIVAS (Tarjetas Visuales con Fotografía -> /clases) ===== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 bg-[#f3f4f3] border-t border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                Salas Dirigidas e Instructores
              </p>
              <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                Conoce nuestras clases exclusivas
              </h2>
              <div className="w-[80px] h-[2px] bg-[#ff6105]" />
            </div>

            <Link
              href="/clases"
              className="inline-flex items-center px-6 py-3 rounded-[24px] bg-[#ffffff] hover:bg-[#0a0a0a] text-[#0a0a0a] hover:text-[#ffffff] border border-[#e5e5e5] text-[14px] font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Ver cartelera y reservar cupo →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {clasesDestacadas.map((clase, idx) => {
              const nombre =
                clase.nombre_clase ?? clase.nombre ?? "Entrenamiento Funcional";
              const duracion =
                clase.duracion_minutos_clase ?? clase.duracion_minutos ?? 45;
              const nivel =
                clase.nivel_exigencia_clase ??
                clase.nivel_exigencia ??
                "Intermedio";

              return (
                <Link
                  key={clase.id_clase ?? idx}
                  href="/clases"
                  className="group rounded-[5px] border border-[#e5e5e5] bg-[#ffffff] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 overflow-hidden bg-[#202120]">
                      <img
                        src={CLASE_IMAGES[idx % CLASE_IMAGES.length]}
                        alt={nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[11px] font-medium">
                        {duracion} min · {nivel}
                      </span>
                    </div>

                    <div className="p-5 space-y-1.5">
                      <h3 className="text-[20px] font-medium tracking-[-0.01em] text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors">
                        {nombre}
                      </h3>
                      <p className="text-[13px] text-[#7a7b7b]">
                        Sesiones guiadas con control de cupos y asistencia.
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-4 text-[13px] font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors">
                    Ver horarios →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 4: EXPERIENCIA E INFRAESTRUCTURA (Dark Feature Band #202120 con Foto) ===== */}
      <section className="relative bg-[#202120] text-[#ffffff] py-24 px-4 sm:px-8 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=80"
          alt="Equipamiento de alto rendimiento"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          loading="lazy"
        />
        <div className="relative z-10 max-w-[1200px] mx-auto text-center space-y-6">
          <p className="text-[12px] uppercase tracking-[0.1em] text-[#ffa069] font-medium">
            Tecnología de Primer Nivel
          </p>
          <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.030em] text-[#ffffff] max-w-[700px] mx-auto">
            Equipamiento de última generación en cada sede.
          </h2>
          <div className="w-[60px] h-[2px] bg-[#ff6105] mx-auto" />
          <p className="text-[16px] text-[#e5e5e5] max-w-[560px] mx-auto font-normal">
            Máquinas seleccionadas para entrenamiento de fuerza, resistencia y
            rehabilitación con registro de mantención al día.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              href="/contratos"
              style={{
                boxShadow:
                  "rgba(255, 97, 5, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px",
              }}
              className="px-8 py-3.5 rounded-[50px] bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[15px] font-medium transition-colors"
            >
              Inscríbete ya
            </Link>
            <Link
              href="/clases/equipos"
              className="px-6 py-3.5 rounded-[24px] border border-[#e5e5e5]/40 hover:border-[#ffffff] text-[#ffffff] text-[15px] font-normal transition-colors"
            >
              Ver inventario de máquinas →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 5: TU ESPACIO DIGITAL & ACCESO RÁPIDO (Banner #ffdfcd Peach Wash + Imagen) ===== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 bg-[#ffffff]">
        <div className="max-w-[1200px] mx-auto">
          <div className="rounded-[5px] bg-[#ffdfcd] p-6 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                Tu Espacio GimnasioDB
              </span>

              <h2 className="text-[32px] sm:text-[42px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
                Gestiona tu membresía y valida tu acceso en segundos.
              </h2>

              <p className="text-[16px] text-[#292b2a] max-w-[540px]">
                Ingresa tu RUT para verificar tu pase de torniquete en recepción o
                accede directamente a tu estado de cuenta, recibos de caja y
                reservas.
              </p>

              {/* Validador rápido de RUT (50px Input Pill) */}
              <form
                onSubmit={handleValidarAcceso}
                className="flex flex-col sm:flex-row gap-3 max-w-[520px] pt-1"
              >
                <input
                  type="text"
                  placeholder="Ingresa tu RUT (ej. 12.345.678-9) o ID..."
                  value={accesoIdentificador}
                  onChange={(e) => setAccesoIdentificador(e.target.value)}
                  className="flex-1 rounded-[50px] border border-[#e5e5e5] bg-[#ffffff] px-5 py-3.5 text-[15px] text-[#0a0a0a] placeholder:text-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/40"
                />
                <button
                  type="submit"
                  disabled={accesoLoading || !accesoIdentificador.trim()}
                  className="px-7 py-3.5 rounded-[50px] bg-[#0a0a0a] hover:bg-[#292b2a] disabled:opacity-50 text-[#ffffff] text-[14px] font-medium whitespace-nowrap transition-colors"
                >
                  {accesoLoading ? "Consultando..." : "Validar pase"}
                </button>
              </form>

              {accesoResultado && (
                <div className="text-[14px] text-[#0a0a0a] pt-1">
                  <span className="font-medium">
                    {accesoResultado.acceso_permitido
                      ? "Pase Autorizado: "
                      : "Acceso Denegado: "}
                  </span>
                  <span className="text-[#292b2a]">{accesoResultado.motivo}</span>
                </div>
              )}

              {/* Botones rápidos a los módulos de autogestión */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <Link
                  href="/contratos/estado-cuenta"
                  className="px-4 py-2 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                >
                  Estado de Cuenta →
                </Link>
                <Link
                  href="/contratos/caja"
                  className="px-4 py-2 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                >
                  Módulo de Caja →
                </Link>
                <Link
                  href="/socios/torniquete"
                  className="px-4 py-2 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                >
                  Torniquete Recepción →
                </Link>
                <Link
                  href="/contratos/personal"
                  className="px-4 py-2 rounded-[24px] bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a] transition-colors"
                >
                  Personal y Finanzas →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-[8px] overflow-hidden border border-[#ffa069]/40 bg-[#202120] h-72 sm:h-80 relative">
                <img
                  src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80"
                  alt="Experiencia Digital GimnasioDB"
                  className="w-full h-full object-cover opacity-90"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer Minimalista (#ffffff Canvas White) ===== */}
      <footer className="bg-[#ffffff] border-t border-[#e5e5e5] py-12 px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-[14px]">
            <div className="space-y-2.5">
              <p className="font-medium text-[#0a0a0a]">GimnasioDB</p>
              <ul className="space-y-1.5 text-[#7a7b7b]">
                <li>
                  <Link href="/socios/sedes" className="hover:text-[#0a0a0a]">
                    Nuestras Sedes
                  </Link>
                </li>
                <li>
                  <Link href="/clases/equipos" className="hover:text-[#0a0a0a]">
                    Equipamiento
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-medium text-[#0a0a0a]">Planes y Finanzas</p>
              <ul className="space-y-1.5 text-[#7a7b7b]">
                <li>
                  <Link href="/contratos" className="hover:text-[#0a0a0a]">
                    Planes y Contratos
                  </Link>
                </li>
                <li>
                  <Link href="/contratos/caja" className="hover:text-[#0a0a0a]">
                    Caja y Pagos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/estado-cuenta"
                    className="hover:text-[#0a0a0a]"
                  >
                    Estado de Cuenta
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/personal"
                    className="hover:text-[#0a0a0a]"
                  >
                    Personal y Reportes
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-medium text-[#0a0a0a]">Entrenamiento</p>
              <ul className="space-y-1.5 text-[#7a7b7b]">
                <li>
                  <Link href="/clases" className="hover:text-[#0a0a0a]">
                    Reserva de Clases
                  </Link>
                </li>
                <li>
                  <Link href="/clases/instructor" className="hover:text-[#0a0a0a]">
                    Portal Instructor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/programador"
                    className="hover:text-[#0a0a0a]"
                  >
                    Programar Sesiones
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-medium text-[#0a0a0a]">Socios y Recepción</p>
              <ul className="space-y-1.5 text-[#7a7b7b]">
                <li>
                  <Link href="/socios/login" className="hover:text-[#0a0a0a]">
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link href="/socios/torniquete" className="hover:text-[#0a0a0a]">
                    Torniquete Recepción
                  </Link>
                </li>
                <li>
                  <Link href="/socios" className="hover:text-[#0a0a0a]">
                    Padrón de Socios
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e5e5e5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-[#7a7b7b]">
            <div className="flex items-center gap-2">
              <span className="text-[#0a0a0a] font-medium">gimnasiodb</span>
              <span>·</span>
              <span>Red de Gimnasios & Gestión Deportiva</span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  healthStatus
                    ? "bg-[#ff6105]"
                    : loading || isWakingUp
                    ? "bg-[#ffa069]"
                    : "bg-[#a2a3a2]"
                }`}
              />
              <span>
                {healthStatus
                  ? "Conectado en vivo a SQL Server"
                  : "Sincronizando con servidor..."}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
