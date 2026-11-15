"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  User,
  Lock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Dumbbell,
  Briefcase,
  Users,
} from "lucide-react";

interface CuentaDemo {
  rol: "Socio" | "Instructor" | "Personal" | "Administrador";
  user: string;
  pass: string;
  nombre: string;
  desc: string;
}

const CUENTAS_DEMO: CuentaDemo[] = [
  {
    rol: "Socio",
    user: "socio1",
    pass: "Clave#socio1",
    nombre: "Daniel Matus",
    desc: "Portal Socio: Clases, Estado de Cuenta y Acceso",
  },
  {
    rol: "Instructor",
    user: "instructor1",
    pass: "Clave#instructor1",
    nombre: "Instructor #1",
    desc: "Portal Instructor: Sesiones y Pase de Lista",
  },
  {
    rol: "Personal",
    user: "personal1",
    pass: "Clave#personal1",
    nombre: "Personal #1",
    desc: "Portal Administrativo: Caja, Contratos y Torniquetes",
  },
  {
    rol: "Administrador",
    user: "admin",
    pass: "Clave#admin",
    nombre: "Administrador General",
    desc: "Acceso total a todos los módulos y personal",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRedirectForRole = (rol: string) => {
    const r = (rol || "").toLowerCase();
    if (r === "socio") return "/portal-socio";
    if (r === "instructor") return "/portal-instructor";
    return "/portal-personal";
  };

  // Si ya existe sesión activa, redirigir automáticamente al portal correspondiente
  useEffect(() => {
    if (user && !authLoading) {
      router.replace(getRedirectForRole(user.rol));
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Por favor ingrese su usuario y contraseña.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(username.trim(), password);
      router.push(getRedirectForRole(loggedUser.rol));
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail ||
          err.message ||
          "Error al autenticar credenciales. Verifique sus datos."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeleccionarDemo = (c: CuentaDemo) => {
    setUsername(c.user);
    setPassword(c.pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a0a0a] flex flex-col font-sans">
      {/* Cabecera Superior Minimalista */}
      <header className="border-b border-[#e5e5e5] bg-white sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="group text-xs sm:text-[13px] font-normal text-[#7a7b7b] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Inicio</span>
            </Link>
            <span className="h-4 w-px bg-[#e5e5e5]" />
            <BrandLogo size="md" href="/" />
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
            Acceso Seguro
          </span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6 animate-fade-in-scale">
          {/* Tarjeta de Encabezado */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Autenticación Segura
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-[-0.03em] text-[#0a0a0a]">
              Iniciar Sesión
            </h1>
            <div className="w-16 h-[2px] bg-[#ff6105]" />
            <p className="text-xs sm:text-sm text-[#7a7b7b] leading-relaxed pt-1">
              Ingresa con tu usuario o correo para acceder a tu portal según tu rol (Socio, Instructor o Personal).
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-[5px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-medium text-[#292b2a] mb-1.5"
                >
                  Usuario o Correo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7a7b7b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. socio1, instructor1, admin"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs sm:text-sm text-[#0a0a0a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-[#292b2a] mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a7b7b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] text-xs sm:text-sm text-[#0a0a0a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff6105]/30 focus:border-[#ff6105] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-[40px] bg-[#0a0a0a] hover:bg-[#ff6105] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar al Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Cuentas de Demostración para Evaluación Rápida */}
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#7a7b7b]">
                Acceso Rápido por Perfil
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff6105]" />
            </div>
            <p className="text-[11px] text-[#7a7b7b]">
              Haz clic en cualquier rol para auto-completar las credenciales:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {CUENTAS_DEMO.map((c) => (
                <button
                  key={c.user}
                  type="button"
                  onClick={() => handleSeleccionarDemo(c)}
                  className="p-2.5 rounded-[5px] bg-[#f8f9f8] hover:bg-[#ffdfcd]/40 border border-[#e5e5e5] hover:border-[#ff6105]/50 text-left transition-all duration-150 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0a0a0a] group-hover:text-[#ff6105]">
                      {c.rol}
                    </span>
                    <span className="text-[10px] text-[#7a7b7b]">
                      {c.user}
                    </span>
                  </div>
                  <span className="block text-[11px] text-[#7a7b7b] truncate mt-0.5">
                    {c.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] bg-white py-5 px-4 text-center text-xs text-[#7a7b7b]">
        <div className="flex items-center justify-center gap-2">
          <BrandLogo size="sm" href="/" />
          <span className="text-[#a2a3a2]">·</span>
          <span>Autenticación protegida con expiración de 8 horas y roles sincronizados</span>
        </div>
      </footer>
    </div>
  );
}

