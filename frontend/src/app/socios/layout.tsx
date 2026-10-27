"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Gestión de Socios",
    href: "/socios",
    icon: "👥",
    description: "Listado, registro, edición y credenciales de socios",
  },
  {
    name: "Torniquete & Acceso",
    href: "/socios/torniquete",
    icon: "🚪",
    description: "Control de acceso en tiempo real y simulación de torniquete",
  },
  {
    name: "Sedes & Reportes",
    href: "/socios/sedes",
    icon: "🏢",
    description: "Catálogo de sedes e informe analítico de socios por sucursal",
  },
  {
    name: "Login & Mi Perfil",
    href: "/socios/login",
    icon: "🔐",
    description: "Autenticación multi-rol SHA2_512 y consulta de perfil",
  },
];

export default function SociosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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

              <span className="text-slate-800">/</span>

              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  GimnasioDB
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Módulo Socios & Acceso
                </span>
              </div>
            </div>

            {/* Persona Badge */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-900/90 border border-blue-900/40 rounded-xl px-3 py-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="hidden sm:inline text-slate-400">Responsable:</span>
                <strong className="text-blue-300 font-semibold">Persona 1 (Carlos)</strong>
              </div>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-slate-800/40">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/socios"
                  ? pathname === "/socios"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80 border border-transparent"
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
      <footer className="border-t border-slate-800/80 bg-slate-950/70 py-6 text-center text-xs text-slate-500">
        <p>
          GimnasioDB – Módulo de Acceso, Socios y Sedes (Persona 1) &bull; API REST con FastAPI &amp; pyodbc en SQL Server
        </p>
      </footer>
    </div>
  );
}
