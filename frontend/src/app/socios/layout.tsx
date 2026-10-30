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
    <div className="min-h-screen bg-amp-white text-amp-ink flex flex-col font-sans selection:bg-amp-peach selection:text-amp-ink">
      {/* Announcement Bar (DESIGN.md: 40-48px Linen background with Carbon text) */}
      <div className="bg-amp-linen border-b border-amp-hairline py-2 px-4 text-center text-xs text-amp-carbon">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amp-orange"></span>
            <span className="text-amp-slate font-normal">Módulo de Socios & Acceso</span>
            <span className="text-amp-ash hidden sm:inline">&bull;</span>
            <span className="text-amp-carbon hidden sm:inline font-normal">FastAPI + pyodbc en SQL Server</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amp-slate font-normal text-[11px]">Responsable:</span>
            <span className="badge-step text-[11px] py-0.5 px-2.5">
              Persona 1 &bull; Carlos
            </span>
          </div>
        </div>
      </div>

      {/* Top Navigation Header (DESIGN.md: Canvas white, 64-72px, hairline border) */}
      <header className="sticky top-0 z-50 bg-amp-white/95 backdrop-blur-md border-b border-amp-hairline">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Back to Home */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-xs text-amp-slate hover:text-amp-ink transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-[24px] hover:bg-amp-linen border border-transparent hover:border-amp-hairline"
                title="Volver a la portada general"
              >
                <span>←</span>
                <span>Portada</span>
              </Link>

              <span className="text-amp-hairline">|</span>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-amp-ink text-amp-white flex items-center justify-center text-sm font-medium">
                  G
                </div>
                <div>
                  <span className="font-medium text-base tracking-tight text-amp-ink">
                    GimnasioDB
                  </span>
                  <span className="text-amp-orange ml-0.5 text-base font-medium">.</span>
                </div>
              </div>
            </div>

            {/* Quick action button top right (mirrors Nav CTA in amp guide) */}
            <div className="flex items-center gap-3">
              <Link
                href="/socios/torniquete"
                className="btn-primary-pill text-xs font-medium px-4 py-2 flex items-center gap-1.5"
              >
                <span>Torniquete</span>
                <span className="text-amp-peach">→</span>
              </Link>
            </div>
          </div>

          {/* Sub-navigation Tabs (Secondary pill button style, 24px radius) */}
          <nav className="flex items-center gap-2 overflow-x-auto py-2.5 -mb-px scrollbar-none border-t border-amp-hairline">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/socios"
                  ? pathname === "/socios"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[24px] text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-amp-orange text-amp-white shadow-sm"
                      : "text-amp-carbon hover:text-amp-ink bg-amp-linen hover:bg-amp-bone border border-amp-hairline"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area: Max width 1200px as strictly specified in DESIGN.md */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10">
        {children}
      </main>

      {/* Footer (DESIGN.md: Linen alt surface, hairline border, Slate text) */}
      <footer className="border-t border-amp-hairline bg-amp-linen py-8 text-center text-xs text-amp-slate">
        <div className="max-w-[1200px] mx-auto px-4 space-y-2">
          <p className="font-normal text-amp-carbon">
            GimnasioDB &bull; Sistema de Gestión de Gimnasio
          </p>
          <p className="text-[11px] text-amp-slate font-normal">
            Módulo de Socios, Torniquete y Sedes &bull; Realizado por <strong>Persona 1 (Carlos)</strong> &bull; FastAPI + pyodbc en SQL Server
          </p>
        </div>
      </footer>
    </div>
  );
}
