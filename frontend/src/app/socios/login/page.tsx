"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import apiClient, { LoginResult, Socio } from "@/services/apiClient";
import {
  User,
  Lock,
  LogOut,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  Loader2,
} from "lucide-react";

const STORAGE_KEY = "gimnasio_sesion_usuario";

const CUENTAS_PRUEBA = [
  {
    user: "socio1",
    pass: "Clave#socio1",
    rol: "Socio",
    detalle: "Fernanda Díaz Morales · Sede Santiago Centro",
  },
  {
    user: "socio2",
    pass: "Clave#socio2",
    rol: "Socio",
    detalle: "Yulissa Ulloa · Sede Providencia",
  },
  {
    user: "socio13",
    pass: "Clave#socio13",
    rol: "Socio",
    detalle: "Valentina Rojas · Contrato Vigente",
  },
];

export default function LoginPerfilPage() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sesion, setSesion] = useState<LoginResult | null>(null);
  const [fichaSocio, setFichaSocio] = useState<Socio | null>(null);
  const [loadingFicha, setLoadingFicha] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LoginResult;
        setSesion(parsed);
        if (parsed.id_socio) {
          cargarFichaSocio(parsed.id_socio);
        }
      }
    } catch {
      // Ignorar errores de lectura de localStorage
    }
  }, []);

  const cargarFichaSocio = async (idSocio: number) => {
    setLoadingFicha(true);
    try {
      const data = await apiClient.socios.getById(idSocio);
      setFichaSocio(data);
    } catch {
      setFichaSocio(null);
    } finally {
      setLoadingFicha(false);
    }
  };

  const ejecutarLogin = async (u: string, p: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: LoginResult = await apiClient.socios.login({
        username_o_correo: u.trim(),
        password: p,
      });
      setSesion(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (data.id_socio) {
        await cargarFichaSocio(data.id_socio);
      } else {
        setFichaSocio(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Credenciales inválidas o cuenta inactiva.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await ejecutarLogin(username, password);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSesion(null);
    setFichaSocio(null);
    setUsername("");
    setPassword("");
    setErrorMsg(null);
  };

  const nombreMostrar =
    fichaSocio?.nombre_completo_socio ??
    fichaSocio?.nombre_completo ??
    sesion?.nombre_completo_socio ??
    sesion?.username_usuario ??
    "Socio";

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Portal del Socio · Cuenta Personal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#0a0a0a]">
            Acceso y Perfil de Socio
          </h1>
          <div className="w-20 h-[2px] bg-[#ff6105]" />
          <p className="text-sm text-[#7a7b7b] max-w-xl pt-1">
            Inicia sesión con tu cuenta de afiliado para consultar tu ficha personal,
            sede base registrada y accesos directos a los servicios del gimnasio.
          </p>
        </div>

        {sesion && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-[#f3f4f3] hover:bg-[#fee2e2] text-[#292b2a] hover:text-[#dc2626] border border-[#e5e5e5] transition-all self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>

      {!sesion ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulario de Inicio de Sesión */}
          <div className="lg:col-span-6 bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-medium text-[#0a0a0a]">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-[#7a7b7b]">
                Ingresa tu usuario o correo electrónico junto con tu contraseña.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-[5px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium mb-1.5">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7a7b7b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: socio1 o correo@gimnasiodb.cl"
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-full pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder-[#7a7b7b] focus:outline-none focus:border-[#ff6105] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a7b7b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-full pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder-[#7a7b7b] focus:outline-none focus:border-[#ff6105] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a Mi Perfil</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Cuentas de Prueba Rápida */}
          <div className="lg:col-span-6 bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#ffdfcd] text-[#ff6105] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[#0a0a0a]">
                  Cuentas de Acceso Rápido
                </h3>
                <p className="text-xs text-[#7a7b7b]">
                  Selecciona una cuenta de demostración para iniciar sesión con un clic
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {CUENTAS_PRUEBA.map((cta) => (
                <button
                  key={cta.user}
                  type="button"
                  onClick={() => {
                    setUsername(cta.user);
                    setPassword(cta.pass);
                    ejecutarLogin(cta.user, cta.pass);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-[5px] bg-[#f8f9f8] hover:bg-[#f3f4f3] border border-[#e5e5e5] hover:border-[#ff6105]/40 transition-all text-left cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0a0a0a]">
                        @{cta.user}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#7a7b7b] border border-[#e5e5e5]">
                        {cta.rol}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a7b7b]">{cta.detalle}</p>
                  </div>
                  <span className="text-xs font-medium text-[#ff6105] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs text-[#7a7b7b]">
              <span>¿Necesitas habilitar la clave de otro socio?</span>
              <Link
                href="/socios"
                className="text-[#ff6105] font-medium hover:underline"
              >
                Ir al Directorio →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Vista Autenticada: Mi Perfil */
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#ffdfcd] text-[#ff6105] border border-[#ff6105]/20 flex items-center justify-center text-xl font-semibold shrink-0">
                {nombreMostrar.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    Sesión Activa · {sesion.rol || "Socio"}
                  </span>
                  {sesion.username_usuario && (
                    <span className="font-mono text-xs text-[#7a7b7b]">
                      @{sesion.username_usuario}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-medium text-[#0a0a0a] mt-1">
                  {nombreMostrar}
                </h2>
              </div>
            </div>

            {fichaSocio?.rut_socio && (
              <span className="font-mono text-xs px-3.5 py-1.5 rounded-full bg-[#f8f9f8] border border-[#e5e5e5] text-[#292b2a] self-start sm:self-auto">
                RUT {fichaSocio.rut_socio}
              </span>
            )}
          </div>

          {loadingFicha ? (
            <div className="py-8 text-center text-xs text-[#7a7b7b] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff6105]" />
              <span>Cargando datos del perfil...</span>
            </div>
          ) : fichaSocio ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Correo Electrónico
                  </span>
                  <Mail className="w-3.5 h-3.5 text-[#ff6105]" />
                </div>
                <p className="text-xs font-medium text-[#0a0a0a] truncate">
                  {fichaSocio.correo_socio ?? fichaSocio.correo ?? "—"}
                </p>
              </div>

              <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Teléfono
                  </span>
                  <Phone className="w-3.5 h-3.5 text-[#ff6105]" />
                </div>
                <p className="text-xs font-medium text-[#0a0a0a]">
                  {fichaSocio.telefono_socio ?? fichaSocio.telefono ?? "No registrado"}
                </p>
              </div>

              <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Fecha de Nacimiento
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-[#ff6105]" />
                </div>
                <p className="text-xs font-medium text-[#0a0a0a]">
                  {fichaSocio.fecha_nacimiento_socio
                    ? String(fichaSocio.fecha_nacimiento_socio).slice(0, 10)
                    : "No registrada"}
                </p>
              </div>

              <div className="bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-medium">
                    Sede Asignada
                  </span>
                  <MapPin className="w-3.5 h-3.5 text-[#ff6105]" />
                </div>
                <p className="text-xs font-medium text-[#0a0a0a] truncate">
                  Sede #{fichaSocio.id_sede_registro_socio ?? fichaSocio.id_sede_registro ?? 1}
                </p>
              </div>
            </div>
          ) : null}

          {/* Acciones rápidas desde el perfil */}
          <div className="pt-4 border-t border-[#e5e5e5] flex flex-wrap items-center gap-3">
            {fichaSocio?.rut_socio && (
              <Link
                href={`/socios/torniquete?identificador=${encodeURIComponent(
                  fichaSocio.rut_socio
                )}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-xs transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Validar Mi Pase en Torniquete</span>
              </Link>
            )}

            <Link
              href="/clases"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-all"
            >
              <span>Ir a Reserva de Clases</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#ff6105]" />
            </Link>

            <Link
              href="/contratos/estado-cuenta"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-all"
            >
              <span>Ver Estado de Cuenta</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#ff6105]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
