"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  UserCheck,
  Calendar,
  Wrench,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import {
  SOCIOS_PRUEBA,
  SocioActual,
  getStoredSocioActual,
  setStoredSocioActual,
  subscribeSocioActual,
} from "@/components/clases/socioActual";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Catálogo y Reserva",
    href: "/clases",
    icon: Dumbbell,
    description: "Catálogo de disciplinas, sesiones disponibles y reserva",
  },
  {
    name: "Portal del Instructor",
    href: "/clases/instructor",
    icon: UserCheck,
    description: "Agenda de sesiones del instructor y pase de lista",
  },
  {
    name: "Programador de Sesiones",
    href: "/clases/programador",
    icon: Calendar,
    description: "Creación y programación de nuevas sesiones de clase",
  },
  {
    name: "Inventario de Equipos",
    href: "/clases/equipos",
    icon: Wrench,
    description: "Gestión de máquinas y equipamiento por sede",
  },
  {
    name: "Reportes de Clases",
    href: "/clases/reportes",
    icon: BarChart3,
    description: "Ocupación y ranking de clases más demandadas",
  },
];

export default function ClasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [socioActual, setSocioActual] = useState<SocioActual>(SOCIOS_PRUEBA[0]);

  useEffect(() => {
    setSocioActual(getStoredSocioActual());
    const unsubscribe = subscribeSocioActual((s) => {
      setSocioActual(s);
    });
    return unsubscribe;
  }, []);

  const handleCambiarSocio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const encontrado = SOCIOS_PRUEBA.find((s) => s.id_socio === id);
    if (encontrado) {
      setSocioActual(encontrado);
      setStoredSocioActual(encontrado);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f3] text-[#0a0a0a] flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e5e5e5] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand & Module Badge */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs sm:text-sm font-medium text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5"
                title="Volver al Portal General"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>

              <span className="text-[#e5e5e5]">/</span>

              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6105]" />
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#0a0a0a]">
                  GimnasioDB
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20">
                  Módulo Clases
                </span>
              </div>
            </div>

            {/* Selector Dinámico de Socio en Sesión */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-2 bg-[#f3f4f3] border border-[#e5e5e5] rounded-full px-3 py-1.5 text-[#292b2a] shadow-sm hover:border-[#ff6105]/40 transition-colors">
                <span className="w-2 h-2 rounded-full bg-[#ff6105] shrink-0"></span>
                <span className="hidden md:inline text-[#7a7b7b] text-[11px] font-medium uppercase tracking-wider">
                  Socio en sesión:
                </span>
                <select
                  aria-label="Seleccionar Socio de prueba"
                  value={socioActual.id_socio}
                  onChange={handleCambiarSocio}
                  className="bg-transparent text-[#0a0a0a] font-medium focus:outline-none cursor-pointer text-xs pr-1"
                >
                  {SOCIOS_PRUEBA.map((s) => (
                    <option
                      key={s.id_socio}
                      value={s.id_socio}
                      className="bg-white text-[#0a0a0a]"
                    >
                      {s.nombre_completo_socio} (#{s.id_socio})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-[#e5e5e5]/80">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/clases"
                  ? pathname === "/clases"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#0a0a0a] shadow-sm border border-[#e5e5e5] rounded-full relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-[#ff6105]"
                      : "text-[#7a7b7b] hover:text-[#0a0a0a] hover:bg-white/60 border border-transparent rounded-full"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#ff6105]" : "text-[#7a7b7b]"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-scale">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] bg-white py-6 text-center text-xs text-[#7a7b7b]">
        <p>
          GimnasioDB – Módulo Clases, Sesiones e Inscripciones &bull; Sistema de Diseño Amp Minimalista
        </p>
      </footer>
    </div>
  );
}
