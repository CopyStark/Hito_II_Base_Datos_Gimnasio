"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  Calendar,
  UserCheck,
  LogOut,
  User,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";

interface NavTab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const TABS: NavTab[] = [
  {
    name: "Mis Sesiones Asignadas",
    href: "/portal-instructor",
    icon: Calendar,
    exact: true,
  },
  {
    name: "Pase de Asistencia",
    href: "/portal-instructor/asistencia",
    icon: ClipboardCheck,
    exact: false,
  },
];

export default function PortalInstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <RoleGuard allowedRoles={["instructor"]}>
      <div className="min-h-screen bg-[#f8f9f8] text-[#0a0a0a] flex flex-col font-sans">
        {/* Header Superior */}
        <header
          className={`sticky top-0 z-40 transition-all duration-300 border-b border-[#e5e5e5] ${scrolled
              ? "bg-white/92 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
              : "bg-white"
            }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between h-16 gap-3">
              {/* Brand & Badge */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="/"
                  className="group text-xs sm:text-[13px] font-normal text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5"
                  title="Volver al Portal General"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span className="hidden sm:inline">Inicio</span>
                </Link>

                <span className="h-4 w-px bg-[#e5e5e5]" />

                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Link
                    href="/"
                    className="group flex items-center gap-2 text-[20px] sm:text-[22px] tracking-[-0.03em] font-medium shrink-0 text-[#0a0a0a]"
                    title="Ir a la página de inicio"
                  >
                    <span>gimnasio</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff6105] transition-transform duration-200 group-hover:scale-125" />
                    <span className="font-light text-[#7a7b7b]">db</span>
                  </Link>

                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#ffdfcd]/60 text-[#ff6105] border border-[#ff6105]/20 whitespace-nowrap">
                    Portal del Instructor
                  </span>
                </div>
              </div>

              {/* Usuario en Sesión y Botón Logout */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3f4f3] border border-[#e5e5e5] text-xs">
                  <div className="w-5 h-5 rounded-full bg-[#ff6105] text-white flex items-center justify-center text-[10px] font-medium">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="font-medium text-[#0a0a0a]">
                    {user?.nombre_completo || user?.username}
                  </span>
                  <span className="text-[#7a7b7b]">
                    (Instructor #{user?.id_instructor ?? "—"})
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e5e5e5] hover:border-rose-300 bg-white hover:bg-rose-50 text-xs text-[#7a7b7b] hover:text-rose-700 transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>

            {/* Pestañas de Navegación del Portal Instructor (Centradas) */}
            <nav
              aria-label="Navegación del portal instructor"
              className="flex items-center justify-center gap-2 overflow-x-auto py-2.5 scrollbar-none border-t border-[#e5e5e5]/70"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-[13px] whitespace-nowrap transition-all duration-200 ${isActive
                        ? "bg-white text-[#0a0a0a] font-medium shadow-sm border border-[#e5e5e5]"
                        : "text-[#7a7b7b] font-normal border border-transparent hover:bg-[#f3f4f3] hover:text-[#0a0a0a]"
                      }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${isActive
                          ? "text-[#ff6105]"
                          : "text-[#7a7b7b] group-hover:text-[#0a0a0a]"
                        }`}
                    />
                    <span>{tab.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[#ff6105]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Contenido Dinámico */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <div key={pathname} className="animate-fade-in-scale">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#e5e5e5] bg-white py-6 px-4 text-center text-xs text-[#7a7b7b]">
          <p>
            <span className="font-medium text-[#0a0a0a]">gimnasiodb</span>
            <span className="mx-1.5 text-[#a2a3a2]">·</span>
            <span>Portal del Instructor — Agenda y Control de Asistencia</span>
          </p>
        </footer>
      </div>
    </RoleGuard>
  );
}

