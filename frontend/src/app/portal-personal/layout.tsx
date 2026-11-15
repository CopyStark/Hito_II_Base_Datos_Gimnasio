"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  ShieldCheck,
  CreditCard,
  Users,
  Calendar,
  Wrench,
  Briefcase,
  BarChart3,
  History,
  LogOut,
  User,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface NavTab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// Orden por prioridad operativa real
const TABS: NavTab[] = [
  {
    name: "Recepción y Torniquete",
    href: "/portal-personal",
    icon: ShieldCheck,
    exact: true,
  },
  {
    name: "Caja y Contratos",
    href: "/portal-personal/caja",
    icon: CreditCard,
    exact: false,
  },
  {
    name: "Padrón de Socios",
    href: "/portal-personal/socios",
    icon: Users,
    exact: false,
  },
  {
    name: "Programador de Sesiones",
    href: "/portal-personal/programador",
    icon: Calendar,
    exact: false,
  },
  {
    name: "Inventario de Máquinas",
    href: "/portal-personal/inventario",
    icon: Wrench,
    exact: false,
  },
  {
    name: "Sedes y Personal",
    href: "/portal-personal/personal",
    icon: Briefcase,
    exact: false,
  },
  {
    name: "Reportes y Estadísticas",
    href: "/portal-personal/reportes",
    icon: BarChart3,
    exact: false,
  },
  {
    name: "Auditoría & Fidelidad",
    href: "/portal-personal/auditoria",
    icon: History,
    exact: false,
  },
];

const ROLES_PERMITIDOS = [
  "personal",
  "administrador",
  "gerente de sede",
  "recepcionista",
  "contador",
  "marketing",
  "mantenimiento",
  "soporte",
  "auditor",
];

export default function PortalPersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTab = TABS.find((tab) =>
    tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  ) || TABS[0];

  return (
    <RoleGuard allowedRoles={ROLES_PERMITIDOS}>
      <div className="min-h-screen bg-[#f8f9f8] text-[#0a0a0a] flex flex-col md:flex-row font-sans">
        {/* =========================================================================
            HEADER MÓVIL (Visible solo en pantallas < md)
        ========================================================================= */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-[#e5e5e5] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="w-9 h-9 rounded-[5px] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] hover:bg-[#f3f4f3] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <BrandLogo size="sm" href="/" />
            <span className="h-4 w-px bg-[#e5e5e5]" />
            <span className="text-xs text-[#7a7b7b] truncate max-w-[140px]">
              {currentTab.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
              {user?.rol || "Staff"}
            </span>
          </div>
        </header>

        {/* =========================================================================
            DRAWER MÓVIL (Slide-over colapsable)
        ========================================================================= */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
            mobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Panel Lateral Móvil */}
          <aside
            className={`absolute top-0 left-0 w-full max-w-[300px] bg-white h-full border-r border-[#e5e5e5] p-5 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5]">
                <BrandLogo
                  size="md"
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full border border-[#e5e5e5] flex items-center justify-center text-[#7a7b7b] hover:text-[#0a0a0a]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b] px-3 block mb-2">
                  Menú Operativo
                </span>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.exact
                    ? pathname === tab.href
                    : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-[5px] text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#0a0a0a] text-white shadow-xs"
                          : "text-[#292b2a] hover:bg-[#f3f4f3] hover:text-[#0a0a0a]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-[#ff6105]" : "text-[#7a7b7b]"
                          }`}
                        />
                        <span>{tab.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#e5e5e5] space-y-3">
              <div className="bg-[#f8f9f8] p-3 rounded-[5px] border border-[#e5e5e5] text-xs space-y-0.5">
                <p className="font-medium text-[#0a0a0a] truncate">
                  {user?.nombre_completo || user?.username}
                </p>
                <p className="text-[11px] text-[#7a7b7b] truncate">
                  @{user?.username} · {user?.rol}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 px-3 rounded-[5px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>

              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[11px] text-[#7a7b7b] hover:text-[#0a0a0a] flex items-center justify-center gap-1 py-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Volver a Portada</span>
              </Link>
            </div>
          </aside>
        </div>

        {/* =========================================================================
            SIDEBAR DESKTOP (Fijo a la izquierda, arquitectura Dashboard limpia)
        ========================================================================= */}
        <aside className="hidden md:flex md:w-64 lg:w-72 h-screen sticky top-0 shrink-0 flex-col justify-between bg-white border-r border-[#e5e5e5] p-5 lg:p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Cabecera del Sidebar (Centrado Horizontal) */}
            <div className="flex flex-col items-center justify-center text-center space-y-2 pb-4 border-b border-[#e5e5e5]">
              <BrandLogo size="md" href="/" className="justify-center" />
              <span className="inline-block text-[11px] font-medium uppercase tracking-[0.06em] text-[#ff6105] bg-[#ffdfcd]/50 px-3 py-0.5 rounded-full border border-[#ff6105]/20">
                Portal Administrativo
              </span>
            </div>

            {/* Lista Vertical de Navegación por Prioridad */}
            <nav className="space-y-1" aria-label="Navegación del Dashboard">
              <span className="text-[10px] uppercase tracking-wider text-[#7a7b7b] font-medium px-3 block mb-2">
                Operaciones del Gimnasio
              </span>
              {TABS.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-[5px] text-xs lg:text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-[#0a0a0a] text-white shadow-xs"
                        : "text-[#292b2a] hover:bg-[#f3f4f3] hover:text-[#0a0a0a]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-[#ff6105]" : "text-[#7a7b7b] group-hover:text-[#0a0a0a]"
                        }`}
                      />
                      <span className="truncate">{tab.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Pie del Sidebar: Info de Usuario y Cerrar Sesión */}
          <div className="pt-4 border-t border-[#e5e5e5] space-y-3">
            <div className="bg-[#f8f9f8] p-3 rounded-[5px] border border-[#e5e5e5] flex items-center gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center text-[11px] font-medium shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#0a0a0a] truncate leading-tight">
                  {user?.nombre_completo || user?.username}
                </p>
                <p className="text-[11px] text-[#7a7b7b] truncate mt-0.5">
                  {user?.rol}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex-1 py-2 px-3 rounded-[5px] border border-[#e5e5e5] hover:border-[#0a0a0a] bg-white text-center text-xs font-medium text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center justify-center gap-1.5"
                title="Volver a la portada pública"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Inicio</span>
              </Link>

              <button
                type="button"
                onClick={logout}
                title="Cerrar sesión"
                className="py-2 px-3 rounded-[5px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Salir</span>
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            ÁREA PRINCIPAL AMPLIA A LA DERECHA
        ========================================================================= */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 xl:p-10">
            <div key={pathname} className="animate-fade-in-scale">
              {children}
            </div>
          </div>

          <footer className="border-t border-[#e5e5e5] bg-white py-4 px-6 text-center text-xs text-[#7a7b7b]">
            <p>
              <span className="font-medium text-[#0a0a0a]">gimnasiodb</span>
              <span className="mx-1.5 text-[#a2a3a2]">·</span>
              <span>Portal Personal &amp; Administración — Sistema operativo en línea</span>
            </p>
          </footer>
        </main>
      </div>
    </RoleGuard>
  );
}
