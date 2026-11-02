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
    name: "Portal Instructor",
    href: "/clases/instructor",
    icon: UserCheck,
    description: "Agenda de sesiones del instructor y pase de lista",
  },
  {
    name: "Programador",
    href: "/clases/programador",
    icon: Calendar,
    description: "Creación y programación de nuevas sesiones de clase",
  },
  {
    name: "Inventario",
    href: "/clases/equipos",
    icon: Wrench,
    description: "Gestión de máquinas y equipamiento por sede",
  },
  {
    name: "Reportes",
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9f8] text-[#0a0a0a] flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 border-b border-[#e5e5e5] ${
          scrolled
            ? "bg-white/92 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
            : "bg-white"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand & Module Badge */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="group text-xs sm:text-[13px] font-normal text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors duration-200 flex items-center gap-1.5"
                title="Volver al Portal General"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>

              <span className="h-4 w-[1px] bg-[#e5e5e5]" />

              <div className="flex items-center gap-2.5 sm:gap-3">
                <Link
                  href="/"
                  className="group flex items-center gap-2 text-[20px] sm:text-[22px] tracking-[-0.03em] font-medium shrink-0 text-[#0a0a0a]"
                  title="Volver al Portal General"
                >
                  <span>gimnasio</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff6105] transition-transform duration-200 ease-in-out group-hover:scale-125" />
                  <span className="font-light text-[#7a7b7b]">db</span>
                </Link>

                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] whitespace-nowrap">
                  Módulo Clases
                </span>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <nav
            aria-label="Navegación del módulo de clases"
            className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none border-t border-[#e5e5e5]/70"
          >
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
                  title={item.description}
                  className={`group relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-[13px] whitespace-nowrap transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-white text-[#0a0a0a] font-medium shadow-sm border border-[#e5e5e5]"
                      : "text-[#7a7b7b] font-normal border border-transparent hover:bg-[#f3f4f3] hover:text-[#0a0a0a] hover:-translate-y-0.5"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors duration-300 ${
                      isActive
                        ? "text-[#ff6105]"
                        : "text-[#7a7b7b] group-hover:text-[#0a0a0a]"
                    }`}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#ff6105]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area with Smooth Entrance Transition per Route */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div key={pathname} className="animate-fade-in-scale">
          {children}
        </div>
      </main>

      {/* Official Footer */}
      <footer className="border-t border-[#e5e5e5] bg-white py-6 px-4 text-center text-xs sm:text-sm text-[#7a7b7b]">
        <p className="tracking-[-0.01em]">
          <span className="font-medium text-[#0a0a0a]">gimnasiodb</span>
          <span className="mx-1.5 text-[#a2a3a2]">·</span>
          <span>Red de Gimnasios &amp; Gestión Deportiva</span>
        </p>
      </footer>
    </div>
  );
}
