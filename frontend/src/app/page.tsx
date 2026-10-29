"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import apiClient, {
  Socio,
  PlanMembresia,
  SesionOcupacion,
  Clase,
} from "@/services/apiClient";

const HERO_SLIDES = [
  {
    badge: "Temporada 2026 · Matrícula Gratis",
    title: "Entrena a tu ritmo en espacios de alto nivel.",
    subtitle:
      "Zonas de musculación, peso libre y cardio de última generación. Planes flexibles sin permanencia forzosa.",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85",
    primaryCta: { label: "Inscríbete ya", href: "/contratos" },
    secondaryCta: { label: "Buscar gimnasio", href: "/socios/sedes" },
    labelShort: "01 · Infraestructura",
  },
  {
    badge: "Entrenamiento Grupal · Reserva en Línea",
    title: "Clases dirigidas que impulsan tu energía.",
    subtitle:
      "HIIT Funcional, Indoor Cycling, Power & Fuerza y Mobility guiados por instructores certificados en cada sede.",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=85",
    primaryCta: { label: "Reservar clase", href: "/clases" },
    secondaryCta: { label: "Ver planes", href: "/contratos" },
    labelShort: "02 · Clases Exclusivas",
  },
  {
    badge: "Experiencia Digital · Control en Vivo",
    title: "Ingreso ágil y gestión total desde tu cuenta.",
    subtitle:
      "Valida tu acceso en torniquete con tu RUT, consulta tu estado de cuenta y gestiona tus pagos sin filas.",
    image:
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=85",
    primaryCta: { label: "Validar acceso", href: "/socios/torniquete" },
    secondaryCta: { label: "Estado de cuenta", href: "/contratos/estado-cuenta" },
    labelShort: "03 · Tu Espacio Digital",
  },
];

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

const MARQUEE_ITEMS = [
  "Matrícula Costo $0",
  "Musculación y Peso Libre",
  "Clases Grupales con Reserva en Línea",
  "Acceso Automatizado por Torniquete",
  "Planes Sin Permanencia Forzosa",
  "Conectado en Tiempo Real a SQL Server",
];

/**
 * Componente de aparición suave al hacer scroll (IntersectionObserver + cubic-bezier)
 */
function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delayMs}ms`,
        transitionDuration: "850ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all will-change-transform ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-7 scale-[0.99]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Línea de acento #ff6105 que se expande suavemente al entrar en pantalla
 */
function AccentRule({ centered = false }: { centered?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: "900ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: "150ms",
      }}
      className={`h-[2px] bg-[#ff6105] transition-transform ${
        centered ? "w-[64px] mx-auto origin-center" : "w-[88px] origin-left"
      } ${visible ? "scale-x-100" : "scale-x-0"}`}
    />
  );
}

/**
 * Hook para animar contadores numéricos suavemente
 */
function useCountUp(target: number, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let startTime: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, durationMs]);

  return value;
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

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

  // Detectar scroll para efecto glassmorphism en el header
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rotación automática de slides del Hero cada 6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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

  const animatedSocios = useCountUp(totalSociosActivos);
  const animatedSesiones = useCountUp(sesiones.length);

  // Mostrar máximo 3 planes destacados en el inicio
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

  const currentHero = HERO_SLIDES[activeSlide];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] font-normal">
      {/* ===== Announcement Bar (#f3f4f3 Linen, 40px) ===== */}
      <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] h-10 px-4 sm:px-8 flex items-center">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between text-[13px] text-[#292b2a]">
          <div className="flex items-center gap-2.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#ff6105] animate-pulse shrink-0" />
            <span className="truncate">
              Matrícula costo $0 en todas nuestras sedes · Entrena desde hoy
            </span>
          </div>
          <Link
            href="/contratos"
            className="group font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors whitespace-nowrap shrink-0 ml-4 inline-flex items-center gap-1"
          >
            <span>Ver planes</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* ===== Top Navigation (Con micro-interacciones y transición de scroll) ===== */}
      <header
        className={`sticky top-0 z-40 transition-all duration-500 px-4 sm:px-8 ${
          scrolled
            ? "bg-[#ffffff]/92 backdrop-blur-xl border-b border-[#e5e5e5] h-[66px]"
            : "bg-[#ffffff] border-b border-[#e5e5e5] h-[74px]"
        }`}
      >
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-4">
          {/* Logo con pulso sutil en el punto naranja */}
          <Link
            href="/"
            className="group flex items-center gap-2 text-[#0a0a0a] tracking-[-0.03em] text-[24px] font-medium whitespace-nowrap shrink-0"
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              gimnasio
            </span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff6105] transition-transform duration-300 group-hover:scale-125" />
            <span className="font-light text-[#7a7b7b]">db</span>
          </Link>

          {/* Links Centrales con subrayado animado desde la izquierda */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-normal text-[#292b2a]">
            <Link
              href="/socios/sedes"
              className="nav-link-premium hover:text-[#0a0a0a] whitespace-nowrap"
            >
              Gimnasios
            </Link>
            <Link
              href="/contratos"
              className="nav-link-premium hover:text-[#0a0a0a] whitespace-nowrap"
            >
              Planes
            </Link>
            <Link
              href="/clases"
              className="nav-link-premium hover:text-[#0a0a0a] whitespace-nowrap"
            >
              Clases
            </Link>
            <Link
              href="/contratos/estado-cuenta"
              className="nav-link-premium hover:text-[#0a0a0a] whitespace-nowrap"
            >
              Tu Espacio
            </Link>
            <Link
              href="/socios/torniquete"
              className="nav-link-premium hover:text-[#0a0a0a] whitespace-nowrap"
            >
              Recepción
            </Link>
          </nav>

          {/* Controles Derecha: CTA Pill + Botón Menú Hamburguesa */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/socios/login"
              className="btn-secondary-pill hidden sm:inline-flex items-center justify-center px-5 py-2.5 border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] hover:border-[#0a0a0a] text-[14px] font-normal text-[#292b2a] whitespace-nowrap"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/contratos"
              className="btn-primary-pill inline-flex items-center justify-center px-6 py-2.5 text-[14px] font-medium whitespace-nowrap"
            >
              Inscríbete ya
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="btn-secondary-pill inline-flex items-center justify-center w-10 h-10 border border-[#e5e5e5] bg-[#ffffff] hover:bg-[#f3f4f3] hover:border-[#0a0a0a] text-[#0a0a0a] shrink-0"
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

      {/* ===== Drawer Menú Lateral con Transición Suave (Slide-over) ===== */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 bg-[#0a0a0a]/45 backdrop-blur-xs transition-opacity duration-500"
        />

        {/* Panel Lateral */}
        <aside
          style={{
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className={`absolute top-0 right-0 w-full max-w-[390px] bg-[#ffffff] h-full border-l border-[#e5e5e5] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto transition-transform duration-500 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e5]">
              <span className="text-[20px] font-medium tracking-[-0.02em] text-[#0a0a0a]">
                Navegación GimnasioDB
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 rounded-[24px] border border-[#e5e5e5] hover:border-[#0a0a0a] flex items-center justify-center text-[#292b2a] hover:text-[#0a0a0a] transition-all hover:rotate-90 duration-300"
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
                {[
                  { label: "Planes y Suscripción", href: "/contratos" },
                  { label: "Caja y Recepción de Pagos", href: "/contratos/caja" },
                  {
                    label: "Estado de Cuenta del Socio",
                    href: "/contratos/estado-cuenta",
                  },
                  {
                    label: "Personal e Ingresos por Sede",
                    href: "/contratos/personal",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between items-center transition-all duration-300 hover:translate-x-1.5"
                  >
                    <span>{item.label}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Grupo 2: Sedes y Socios (Carlos) */}
            <div className="space-y-2.5 pt-4 border-t border-[#e5e5e5]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                Gimnasios, Socios y Acceso
              </p>
              <div className="flex flex-col space-y-1 text-[15px]">
                {[
                  { label: "Nuestras Sedes y Reportes", href: "/socios/sedes" },
                  {
                    label: "Control de Acceso (Torniquete)",
                    href: "/socios/torniquete",
                  },
                  { label: "Directorio de Socios", href: "/socios" },
                  { label: "Acceso y Perfil de Usuario", href: "/socios/login" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between items-center transition-all duration-300 hover:translate-x-1.5"
                  >
                    <span>{item.label}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Grupo 3: Clases y Equipos (Emilia) */}
            <div className="space-y-2.5 pt-4 border-t border-[#e5e5e5]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#ff6105] font-medium">
                Clases Grupales y Equipamiento
              </p>
              <div className="flex flex-col space-y-1 text-[15px]">
                {[
                  { label: "Catálogo y Reserva de Clases", href: "/clases" },
                  { label: "Portal del Instructor", href: "/clases/instructor" },
                  {
                    label: "Programador de Sesiones",
                    href: "/clases/programador",
                  },
                  { label: "Inventario de Máquinas", href: "/clases/equipos" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group py-2 text-[#292b2a] hover:text-[#ff6105] flex justify-between items-center transition-all duration-300 hover:translate-x-1.5"
                  >
                    <span>{item.label}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#e5e5e5]">
            <Link
              href="/contratos"
              onClick={() => setMenuOpen(false)}
              className="btn-primary-pill w-full py-3.5 px-6 text-[15px] font-medium text-center block"
            >
              Inscríbete ya
            </Link>
          </div>
        </aside>
      </div>

      {/* ===== BANNER PRINCIPAL HERO INTERACTIVO CON KEN BURNS ZOOM & SLIDES ===== */}
      <section className="px-4 sm:px-8 pt-6 pb-14">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="relative rounded-[8px] overflow-hidden bg-[#202120] min-h-[500px] sm:min-h-[560px] flex flex-col justify-end">
            {/* Imágenes de fondo con efecto Ken Burns y Crossfade */}
            {HERO_SLIDES.map((slide, index) => {
              const isActive = index === activeSlide;
              return (
                <div
                  key={slide.labelShort}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    isActive ? "opacity-100 z-0" : "opacity-0 -z-10"
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className={`w-full h-full object-cover opacity-55 ${
                      isActive ? "animate-ken-burns" : ""
                    }`}
                  />
                </div>
              );
            })}

            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/45 to-transparent z-0" />

            {/* Contenido del Slide Activo */}
            <div className="relative z-10 p-6 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div
                key={activeSlide}
                className="lg:col-span-8 space-y-5 animate-fade-in-scale"
              >
                <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium tracking-[0.04em] uppercase">
                  {currentHero.badge}
                </span>

                <h1 className="text-[38px] sm:text-[56px] lg:text-[68px] font-light leading-[1.06] tracking-[-0.036em] text-[#ffffff]">
                  {currentHero.title}
                </h1>

                <div className="w-[100px] h-[2px] bg-[#ff6105]" />

                <p className="text-[16px] sm:text-[18px] text-[#e5e5e5] font-normal max-w-[560px] leading-[1.5]">
                  {currentHero.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    href={currentHero.primaryCta.href}
                    className="btn-primary-pill group inline-flex items-center gap-2.5 px-8 py-4 text-[16px] font-medium tracking-[-0.01em] whitespace-nowrap"
                  >
                    <span>{currentHero.primaryCta.label}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                      →
                    </span>
                  </Link>

                  <Link
                    href={currentHero.secondaryCta.href}
                    className="btn-secondary-pill px-6 py-4 bg-[#ffffff] hover:bg-[#f3f4f3] text-[#0a0a0a] text-[15px] font-medium whitespace-nowrap"
                  >
                    {currentHero.secondaryCta.label}
                  </Link>
                </div>
              </div>

              {/* Selector de Slides con Barra de Progreso Animada */}
              <div className="lg:col-span-4 flex flex-col gap-2.5 lg:items-end">
                <div className="w-full sm:w-[280px] space-y-2 bg-[#0a0a0a]/65 backdrop-blur-md border border-[#ffffff]/15 rounded-[5px] p-4">
                  {HERO_SLIDES.map((s, idx) => {
                    const active = idx === activeSlide;
                    return (
                      <button
                        key={s.labelShort}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className="w-full text-left py-1.5 group"
                      >
                        <div className="flex items-center justify-between text-[12px] mb-1.5">
                          <span
                            className={`transition-colors ${
                              active
                                ? "text-[#ffffff] font-medium"
                                : "text-[#a2a3a2] group-hover:text-[#ffffff]"
                            }`}
                          >
                            {s.labelShort}
                          </span>
                          {active && (
                            <span className="text-[11px] text-[#ff6105] font-medium">
                              Activo
                            </span>
                          )}
                        </div>
                        <div className="w-full h-[2px] bg-[#3c3e3d] overflow-hidden">
                          {active && (
                            <div
                              key={`prog-${activeSlide}`}
                              className="h-full bg-[#ff6105] animate-slide-progress"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Barra Compacta de Datos Reales con Contadores Animados */}
          <Reveal delayMs={100}>
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
                <span className="w-2 h-2 rounded-full bg-[#ff6105] animate-pulse" />
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
                className="group p-5 flex items-center justify-between hover:bg-[#f3f4f3] transition-colors"
              >
                <div>
                  <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                    Comunidad Activa
                  </p>
                  <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                    {loadingData ? "..." : `${animatedSocios} socios activos`}
                  </p>
                </div>
                <span className="text-[14px] text-[#7a7b7b] group-hover:text-[#ff6105] transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/clases"
                className="group p-5 flex items-center justify-between hover:bg-[#f3f4f3] transition-colors"
              >
                <div>
                  <p className="text-[12px] uppercase tracking-[0.06em] text-[#7a7b7b]">
                    Clases Programadas
                  </p>
                  <p className="text-[20px] font-medium text-[#0a0a0a] mt-0.5">
                    {loadingData ? "..." : `${animatedSesiones} sesiones`}
                  </p>
                </div>
                <span className="text-[14px] text-[#7a7b7b] group-hover:text-[#ff6105] transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CINTA INFINITA DE MOVIMIENTO SUAVE (Marquee) ===== */}
      <div className="bg-[#0a0a0a] text-[#ffffff] py-3.5 border-y border-[#202120] overflow-hidden">
        <div className="animate-marquee flex items-center gap-10 text-[12px] uppercase tracking-[0.12em] font-medium">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-10 whitespace-nowrap">
              <span>{item}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105]" />
            </div>
          ))}
        </div>
      </div>

      {/* ===== SECCIÓN 1: ENCUENTRA TU SEDE MÁS CERCANA (Tarjetas con Lift y Zoom Suave) ===== */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 bg-[#f3f4f3] border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                  Nuestras Ubicaciones
                </p>
                <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                  Encuentra tu sede más cercana
                </h2>
                <AccentRule />
              </div>

              <Link
                href="/socios/sedes"
                className="btn-secondary-pill group inline-flex items-center gap-2 px-6 py-3 bg-[#ffffff] hover:bg-[#0a0a0a] text-[#0a0a0a] hover:text-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[14px] font-medium whitespace-nowrap self-start sm:self-auto"
              >
                <span>Ver todas las sedes</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sedesDestacadas.map((sede, index) => (
              <Reveal key={sede.id_sede ?? index} delayMs={index * 120}>
                <div className="card-premium-lift group rounded-[5px] border border-[#e5e5e5] hover:border-[#0a0a0a] bg-[#ffffff] overflow-hidden flex flex-col justify-between h-full">
                  <div>
                    <div className="relative h-56 overflow-hidden bg-[#202120]">
                      <img
                        src={SEDE_IMAGES[index % SEDE_IMAGES.length]}
                        alt={sede.nombre_sede}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-[8px] bg-[#0a0a0a]/80 backdrop-blur-xs text-[#ffffff] text-[11px] font-medium">
                        Abierto · 06:00 a 23:00
                      </span>
                    </div>

                    <div className="p-6 space-y-2">
                      <h3 className="text-[22px] font-medium tracking-[-0.02em] text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors">
                        {sede.nombre_sede}
                      </h3>
                      <p className="text-[14px] text-[#7a7b7b] truncate">
                        {sede.direccion_calle_sede ||
                          "Zona de musculación, cardio y clases"}
                        {sede.nombre_ciudad ? ` · ${sede.nombre_ciudad}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-[#e5e5e5] flex items-center justify-between gap-2">
                    <Link
                      href="/socios/sedes"
                      className="group/link inline-flex items-center gap-1 text-[14px] font-medium text-[#0a0a0a] hover:text-[#ff6105] transition-colors"
                    >
                      <span>Ver sede y métricas</span>
                      <span className="transition-transform duration-300 group-hover/link:translate-x-1">
                        →
                      </span>
                    </Link>
                    <Link
                      href="/contratos"
                      className="btn-secondary-pill px-4 py-2 bg-[#ff6105] hover:bg-[#e55600] text-[#ffffff] text-[13px] font-medium whitespace-nowrap"
                    >
                      Inscríbete
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 2: ELIGE TU MEJOR PLAN (Staggered Reveal + Hover Lift) ===== */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 bg-[#ffffff]">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                  Membresías Sin Permanencia Forzosa
                </p>
                <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                  Elige tu mejor plan
                </h2>
                <AccentRule />
              </div>

              <Link
                href="/contratos"
                className="btn-secondary-pill group inline-flex items-center gap-2 px-6 py-3 bg-[#f3f4f3] hover:bg-[#0a0a0a] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[#0a0a0a] hover:text-[#ffffff] text-[14px] font-medium whitespace-nowrap self-start sm:self-auto"
              >
                <span>Ver todos los planes y contratos</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </Reveal>

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
              const isFeatured =
                idx === 1 || (planesDestacados.length === 1 && idx === 0);

              return (
                <Reveal key={id} delayMs={idx * 120}>
                  <div
                    className={`card-premium-lift rounded-[5px] p-7 flex flex-col justify-between h-full ${
                      isFeatured
                        ? "bg-[#ffdfcd] border border-[#ffa069] hover:border-[#ff6105]"
                        : "bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a]"
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
                        <p className="text-[38px] font-light tracking-[-0.03em] text-[#0a0a0a] leading-none mt-1">
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
                        className={`w-full py-3.5 px-6 text-[15px] font-medium text-center block ${
                          isFeatured
                            ? "btn-primary-pill"
                            : "btn-secondary-pill bg-[#0a0a0a] hover:bg-[#ff6105] text-[#ffffff]"
                        }`}
                      >
                        ¡Inscríbete ya!
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 3: CLASES EXCLUSIVAS (Tarjetas Visuales con Fotografía -> /clases) ===== */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 bg-[#f3f4f3] border-t border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.08em] text-[#7a7b7b] font-medium">
                  Salas Dirigidas e Instructores
                </p>
                <h2 className="text-[32px] sm:text-[44px] font-light leading-[1.15] tracking-[-0.030em] text-[#0a0a0a]">
                  Conoce nuestras clases exclusivas
                </h2>
                <AccentRule />
              </div>

              <Link
                href="/clases"
                className="btn-secondary-pill group inline-flex items-center gap-2 px-6 py-3 bg-[#ffffff] hover:bg-[#0a0a0a] text-[#0a0a0a] hover:text-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[14px] font-medium whitespace-nowrap self-start sm:self-auto"
              >
                <span>Ver cartelera y reservar cupo</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </Reveal>

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
                <Reveal key={clase.id_clase ?? idx} delayMs={idx * 100}>
                  <Link
                    href="/clases"
                    className="card-premium-lift group rounded-[5px] border border-[#e5e5e5] hover:border-[#0a0a0a] bg-[#ffffff] overflow-hidden flex flex-col justify-between h-full"
                  >
                    <div>
                      <div className="relative h-52 overflow-hidden bg-[#202120]">
                        <img
                          src={CLASE_IMAGES[idx % CLASE_IMAGES.length]}
                          alt={nombre}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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

                    <div className="px-5 pb-5 text-[13px] font-medium text-[#0a0a0a] group-hover:text-[#ff6105] transition-colors inline-flex items-center gap-1">
                      <span>Ver horarios</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SECCIÓN 4: EXPERIENCIA E INFRAESTRUCTURA (Dark Feature Band #202120) ===== */}
      <section className="relative bg-[#202120] text-[#ffffff] py-28 px-4 sm:px-8 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=80"
          alt="Equipamiento de alto rendimiento"
          className="absolute inset-0 w-full h-full object-cover opacity-25 transition-transform duration-1000 hover:scale-105"
          loading="lazy"
        />
        <Reveal className="relative z-10 max-w-[1200px] mx-auto text-center space-y-6">
          <p className="text-[12px] uppercase tracking-[0.1em] text-[#ffa069] font-medium">
            Tecnología de Primer Nivel
          </p>
          <h2 className="text-[36px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.030em] text-[#ffffff] max-w-[700px] mx-auto">
            Equipamiento de última generación en cada sede.
          </h2>
          <AccentRule centered />
          <p className="text-[16px] text-[#e5e5e5] max-w-[560px] mx-auto font-normal">
            Máquinas seleccionadas para entrenamiento de fuerza, resistencia y
            rehabilitación con registro de mantención al día.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              href="/contratos"
              className="btn-primary-pill px-8 py-3.5 text-[15px] font-medium"
            >
              Inscríbete ya
            </Link>
            <Link
              href="/clases/equipos"
              className="btn-secondary-pill group inline-flex items-center gap-2 px-6 py-3.5 border border-[#e5e5e5]/40 hover:border-[#ffffff] hover:bg-[#ffffff]/10 text-[#ffffff] text-[15px] font-normal"
            >
              <span>Ver inventario de máquinas</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== SECCIÓN 5: TU ESPACIO DIGITAL & ACCESO RÁPIDO (Banner #ffdfcd Peach Wash + Imagen) ===== */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 bg-[#ffffff]">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div className="rounded-[5px] bg-[#ffdfcd] p-6 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <span className="inline-block px-3 py-1 rounded-[8px] bg-[#ff6105] text-[#ffffff] text-[12px] font-medium">
                  Tu Espacio GimnasioDB
                </span>

                <h2 className="text-[32px] sm:text-[42px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
                  Gestiona tu membresía y valida tu acceso en segundos.
                </h2>

                <AccentRule />

                <p className="text-[16px] text-[#292b2a] max-w-[540px]">
                  Ingresa tu RUT para verificar tu pase de torniquete en recepción
                  o accede directamente a tu estado de cuenta, recibos de caja y
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
                    className="flex-1 rounded-[50px] border border-[#e5e5e5] bg-[#ffffff] px-5 py-3.5 text-[15px] text-[#0a0a0a] placeholder:text-[#a2a3a2] focus:outline-none focus:ring-2 focus:ring-[#ff6105]/40 transition-shadow"
                  />
                  <button
                    type="submit"
                    disabled={accesoLoading || !accesoIdentificador.trim()}
                    className="btn-secondary-pill px-7 py-3.5 rounded-[50px] bg-[#0a0a0a] hover:bg-[#ff6105] disabled:opacity-50 text-[#ffffff] text-[14px] font-medium whitespace-nowrap"
                  >
                    {accesoLoading ? "Consultando..." : "Validar pase"}
                  </button>
                </form>

                {accesoResultado && (
                  <div className="text-[14px] text-[#0a0a0a] pt-1 animate-fade-in-scale">
                    <span className="font-medium">
                      {accesoResultado.acceso_permitido
                        ? "Pase Autorizado: "
                        : "Acceso Denegado: "}
                    </span>
                    <span className="text-[#292b2a]">
                      {accesoResultado.motivo}
                    </span>
                  </div>
                )}

                {/* Botones rápidos a los módulos de autogestión */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {[
                    { label: "Estado de Cuenta", href: "/contratos/estado-cuenta" },
                    { label: "Módulo de Caja", href: "/contratos/caja" },
                    { label: "Torniquete Recepción", href: "/socios/torniquete" },
                    { label: "Personal y Finanzas", href: "/contratos/personal" },
                  ].map((btn) => (
                    <Link
                      key={btn.href}
                      href={btn.href}
                      className="btn-secondary-pill group inline-flex items-center gap-1.5 px-4 py-2 bg-[#ffffff] border border-[#e5e5e5] hover:border-[#0a0a0a] text-[13px] font-medium text-[#0a0a0a]"
                    >
                      <span>{btn.label}</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="group rounded-[8px] overflow-hidden border border-[#ffa069]/40 bg-[#202120] h-72 sm:h-80 relative">
                  <img
                    src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80"
                    alt="Experiencia Digital GimnasioDB"
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </Reveal>
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
                  <Link
                    href="/socios/sedes"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Nuestras Sedes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/equipos"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Equipamiento
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="font-medium text-[#0a0a0a]">Planes y Finanzas</p>
              <ul className="space-y-1.5 text-[#7a7b7b]">
                <li>
                  <Link
                    href="/contratos"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Planes y Contratos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/caja"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Caja y Pagos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/estado-cuenta"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Estado de Cuenta
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contratos/personal"
                    className="hover:text-[#ff6105] transition-colors"
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
                  <Link
                    href="/clases"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Reserva de Clases
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/instructor"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Portal Instructor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/clases/programador"
                    className="hover:text-[#ff6105] transition-colors"
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
                  <Link
                    href="/socios/login"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socios/torniquete"
                    className="hover:text-[#ff6105] transition-colors"
                  >
                    Torniquete Recepción
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socios"
                    className="hover:text-[#ff6105] transition-colors"
                  >
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
