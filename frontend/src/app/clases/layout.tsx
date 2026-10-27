"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Catálogo y Reserva",
    href: "/clases",
    icon: "🏋️",
    description: "Catálogo de disciplinas, sesiones disponibles y reserva",
  },
  {
    name: "Portal del Instructor",
    href: "/clases/instructor",
    icon: "🧑‍🏫",
    description: "Agenda de sesiones del instructor y pase de lista",
  },
  {
    name: "Programador de Sesiones",
    href: "/clases/programador",
    icon: "🗓️",
    description: "Creación y programación de nuevas sesiones de clase",
  },
  {
    name: "Inventario de Equipos",
    href: "/clases/equipos",
    icon: "⚙️",
    description: "Gestión de máquinas y equipamiento por sede",
  },
  {
    name: "Reportes de Clases",
    href: "/clases/reportes",
    icon: "📊",
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
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand & Module Badge */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                title="Volver al Portal General"
              >
                <span>←</span>
                <span className="hidden sm:inline">Inicio</span>
              </Link>

              <span className="text-slate-700">/</span>

              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 bg-clip-text text-transparent">
                  GimnasioDB
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Módulo Clases
                </span>
              </div>
            </div>

            {/* Selector Dinámico de Socio en Sesión */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="hidden md:inline text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Socio en sesión:
                </span>
                <select
                  aria-label="Seleccionar Socio de prueba"
                  value={socioActual.id_socio}
                  onChange={handleCambiarSocio}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs pr-1"
                >
                  {SOCIOS_PRUEBA.map((s) => (
                    <option
                      key={s.id_socio}
                      value={s.id_socio}
                      className="bg-slate-900 text-white"
                    >
                      {s.nombre_completo_socio} (#{s.id_socio})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-slate-800/40">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/clases"
                  ? pathname === "/clases"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25 border border-purple-400/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>
          GimnasioDB – Módulo Clases, Sesiones e Inscripciones (Persona 2) &bull; API First con FastAPI &amp; SQL Server
        </p>
      </footer>
    </div>
  );
}
