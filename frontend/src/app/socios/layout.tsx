"use client";

import React, { useEffect, useState } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9f8] text-[#0a0a0a] flex flex-col font-sans">
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-[#e5e5e5]"
            : "bg-white border-b border-[#e5e5e5]"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group text-sm text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Inicio</span>
            </Link>
            <span className="h-4 w-px bg-[#e5e5e5]" />
            <Link
              href="/"
              className="group flex items-center gap-1.5 text-[#0a0a0a] tracking-[-0.03em] text-[20px] font-medium"
            >
              <span>gimnasio</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#ff6105] transition-transform duration-300 group-hover:scale-125" />
              <span className="font-light text-[#7a7b7b]">db</span>
            </Link>
            <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
              Módulo Socios
            </span>
          </div>

          {/* Acceso rápido en el header con estilo píldora limpio */}
          <div className="flex items-center gap-2">
            <Link
              href="/socios/torniquete"
              className="flex items-center gap-2 bg-[#f3f4f3] hover:bg-[#ebebea] transition-colors px-3.5 py-1.5 rounded-full border border-[#e5e5e5] text-xs text-[#292b2a] font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff6105] shrink-0" />
              <span>Recepción:</span>
              <span className="text-[#0a0a0a] font-semibold">Torniquete</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#7a7b7b]" />
            </Link>
          </div>
        </div>

        {/* Sub-navegación de vistas con indicador activo */}
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex items-center gap-1.5 overflow-x-auto py-2 border-t border-[#f3f4f3]">
          {TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? "bg-white text-[#0a0a0a] font-medium shadow-sm border border-[#e5e5e5]"
                    : "text-[#7a7b7b] font-normal border border-transparent hover:bg-[#f3f4f3] hover:text-[#0a0a0a] hover:-translate-y-0.5"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-[#ff6105]" : "text-[#7a7b7b]"
                  }`}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-2 left-4 right-4 h-[2px] bg-[#ff6105] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div key={pathname} className="animate-fade-in-scale">
          {children}
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="bg-white border-t border-[#e5e5e5] py-6 px-4 sm:px-8 text-center text-xs text-[#7a7b7b]">
        gimnasiodb · Red de Gimnasios &amp; Gestión Deportiva
      </footer>
    </div>
  );
}
