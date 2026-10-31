"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ShieldCheck,
  Building2,
  UserCircle,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

const TABS = [
  {
    href: "/socios",
    label: "Directorio de Socios",
    icon: Users,
    exact: true,
  },
  {
    href: "/socios/torniquete",
    label: "Control de Acceso",
    icon: ShieldCheck,
    exact: false,
  },
  {
    href: "/socios/sedes",
    label: "Sedes y Reportes",
    icon: Building2,
    exact: false,
  },
  {
    href: "/socios/login",
    label: "Acceso y Perfil",
    icon: UserCircle,
    exact: false,
  },
];

export default function SociosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] flex flex-col font-normal">
      {/* Top Navigation — DESIGN.md: #ffffff, 68px height, 1px #e5e5e5 bottom border, zero shadow */}
      <header className="sticky top-0 z-30 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="group text-[14px] text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Inicio</span>
            </Link>
            <span className="h-4 w-px bg-[#e5e5e5] shrink-0" />
            <Link
              href="/"
              className="group flex items-center gap-1.5 text-[#0a0a0a] tracking-[-0.03em] text-[22px] font-medium shrink-0"
            >
              <span>gimnasio</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#ff6105] transition-transform duration-300 group-hover:scale-125" />
              <span className="font-light text-[#7a7b7b]">db</span>
            </Link>
            <span className="hidden sm:inline-block text-[12px] px-2.5 py-0.5 rounded-[8px] bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5] shrink-0">
              Módulo Socios
            </span>
          </div>

          {/* Nav Quick Action — DESIGN.md: --radius-nav: 40px */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/socios/torniquete"
              className="inline-flex items-center gap-2 bg-[#f3f4f3] hover:bg-[#e5e7eb] transition-colors px-4 py-2 rounded-[40px] border border-[#e5e5e5] text-[13px] text-[#292b2a] font-normal"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff6105] shrink-0" />
              <span className="hidden xs:inline text-[#7a7b7b]">Recepción:</span>
              <span className="text-[#0a0a0a] font-medium">Torniquete</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#7a7b7b]" />
            </Link>
          </div>
        </div>

        {/* Sub-navigation Row — DESIGN.md: flat hairline border, 40px nav radius, 2px #ff6105 active rule */}
        <div className="border-t border-[#f3f4f3] bg-[#ffffff]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex items-center gap-2 overflow-x-auto py-2.5">
            {TABS.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative px-4 py-2 rounded-[40px] text-[13px] sm:text-[14px] whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
                    isActive
                      ? "bg-[#f3f4f3] text-[#0a0a0a] font-medium border border-[#e5e5e5]"
                      : "text-[#7a7b7b] font-normal border border-transparent hover:bg-[#f3f4f3]/60 hover:text-[#292b2a]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-[#ff6105]" : "text-[#7a7b7b]"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-[11px] left-4 right-4 h-[2px] bg-[#ff6105]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content — DESIGN.md: max-width 1200px centered */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-10 sm:py-12">
        <div key={pathname} className="animate-fade-in-scale">
          {children}
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="bg-[#f3f4f3] border-t border-[#e5e5e5] py-6 px-4 sm:px-8 text-center text-[12px] text-[#7a7b7b]">
        gimnasiodb · Red de Gimnasios &amp; Gestión Deportiva
      </footer>
    </div>
  );
}
