"use client";

import React, { useEffect, useState, useMemo } from "react";
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

interface CuentaDemo {
  idSocio: number;
  user: string;
  pass: string;
  rol: string;
  nombre: string;
  sede: string;
}

const INITIAL_CUENTAS_PRUEBA: CuentaDemo[] = [
  {
    idSocio: 1,
    user: "socio1",
    pass: "Clave#socio1",
    rol: "Socio",
    nombre: "Daniel Matus",
    sede: "Sede Antofagasta Sur",
  },
  {
    idSocio: 2,
    user: "socio2",
    pass: "Clave#socio2",
    rol: "Socio",
    nombre: "Emilia Osorio",
    sede: "Sede La Serena Centro",
  },
  {
    idSocio: 3,
    user: "socio3",
    pass: "Clave#socio3",
    rol: "Socio",
    nombre: "Yulissa Ulloa",
    sede: "Sede Antofagasta Sur",
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

  const [sedes, setSedes] = useState<Array<{ id_sede: number; nombre_sede: string }>>([]);
  const [cuentasDemo, setCuentasDemo] = useState<CuentaDemo[]>(INITIAL_CUENTAS_PRUEBA);

  const sedesMap = useMemo(() => {
    const m: Record<number, string> = {};
    sedes.forEach((s) => {
      m[s.id_sede] = s.nombre_sede;
    });
    return m;
  }, [sedes]);

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

  // Cargar catálogo de sedes y sincronizar nombres reales de cuentas rápidas
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [sedesRes, ...sociosDemoRes] = await Promise.allSettled([
          apiClient.socios.getSedesCatalogo(),
          ...INITIAL_CUENTAS_PRUEBA.map((c) => apiClient.socios.getById(c.idSocio)),
        ]);

        if (cancelado) return;

        const mapaLocal: Record<number, string> = {};
        if (sedesRes.status === "fulfilled" && Array.isArray(sedesRes.value)) {
          setSedes(sedesRes.value);
          sedesRes.value.forEach((s: any) => {
            mapaLocal[s.id_sede] = s.nombre_sede;
          });
        }

        setCuentasDemo((prev) =>
          prev.map((c, idx) => {
            const r = sociosDemoRes[idx];
            if (r && r.status === "fulfilled" && r.value) {
              const s = r.value as Socio;
              const idSede = s.id_sede_registro_socio ?? s.id_sede_registro ?? 1;
              return {
                ...c,
                nombre:
                  s.nombre_completo_socio ?? s.nombre_completo ?? c.nombre,
                sede: mapaLocal[idSede] || c.sede,
              };
            }
            return c;
          })
        );
      } catch {
        // Conservar valores por defecto verificados
      }
    })();

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

    return () => {
      cancelado = true;
    };
  }, []);

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

  const idSedeSocio =
    fichaSocio?.id_sede_registro_socio ?? fichaSocio?.id_sede_registro ?? 1;
  const nombreSedeSocio = sedesMap[idSedeSocio] || `Sede #${idSedeSocio}`;

  return (
    <div className="space-y-8">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Portal del Socio · Cuenta Personal</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Acceso y Perfil
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Inicia sesión con tu cuenta de afiliado para consultar tu ficha personal,
            sede base registrada y accesos directos a los servicios del gimnasio.
          </p>
        </div>

        {sesion && (
          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#202120] text-[#292b2a] hover:text-[#ffffff] border border-[#e5e5e5] self-start lg:self-auto shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>

      {!sesion ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Formulario de Inicio de Sesión — DESIGN.md Ghost Card 5px + 50px inputs + Primary Pill CTA */}
          <div className="lg:col-span-6 bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
                Iniciar Sesión
              </h2>
              <p className="text-[14px] text-[#7a7b7b]">
                Ingresa tu usuario o correo electrónico junto con tu contraseña.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-[5px] bg-[#202120] border border-[#3c3e3d] text-[#ffffff] text-[13px] flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#292b2a] font-medium mb-1.5">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7a7b7b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: socio1 o daniel.matus@alumnos.cl"
                    className="input-pill w-full pl-10 pr-4 py-3 text-[15px] placeholder-[#a2a3a2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[#292b2a] font-medium mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a7b7b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-pill w-full pl-10 pr-4 py-3 text-[15px] placeholder-[#a2a3a2]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-pill w-full py-3.5 px-8 text-[15px] font-medium tracking-[-0.01em] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

          {/* Cuentas de Acceso Rápido — DESIGN.md Featured Peach Card (#ffdfcd) */}
          <div className="lg:col-span-6 bg-[#ffdfcd] border border-[#ffa069]/40 rounded-[5px] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#ffffff] border border-[#e5e5e5] text-[#ff6105] flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#0a0a0a]">
                  Cuentas de Acceso Rápido
                </h3>
                <p className="text-[13px] text-[#292b2a]">
                  Selecciona una cuenta activa de demostración para ingresar con un clic
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {cuentasDemo.map((cta) => (
                <button
                  key={cta.user}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setUsername(cta.user);
                    setPassword(cta.pass);
                    ejecutarLogin(cta.user, cta.pass);
                  }}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-[5px] bg-[#ffffff] hover:bg-[#f3f4f3] border border-[#e5e5e5] transition-colors text-left cursor-pointer group disabled:opacity-60"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-medium text-[#0a0a0a]">
                        @{cta.user}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-[8px] bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]">
                        {cta.rol}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#7a7b7b] truncate">
                      {cta.nombre} · {cta.sede}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium text-[#ff6105] inline-flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[#ffa069]/30 flex items-center justify-between text-[13px] text-[#292b2a]">
              <span>¿Necesitas habilitar la clave de otro socio?</span>
              <Link
                href="/socios"
                className="text-[#0a0a0a] font-medium hover:text-[#ff6105] transition-colors"
              >
                Ir al Directorio →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Vista Autenticada: Mi Perfil — DESIGN.md Ghost Card 5px + Primary 50px + Secondary 24px */
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 space-y-6 animate-fade-in-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e5]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[24px] bg-[#ffdfcd] text-[#ff6105] border border-[#ffa069]/40 flex items-center justify-center text-[20px] font-medium shrink-0">
                {nombreMostrar.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-step">
                    Sesión Activa · {sesion.rol || "Socio"}
                  </span>
                  {sesion.username_usuario && (
                    <span className="font-mono text-[13px] text-[#7a7b7b]">
                      @{sesion.username_usuario}
                    </span>
                  )}
                </div>
                <h2 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] mt-1.5">
                  {nombreMostrar}
                </h2>
              </div>
            </div>

            {fichaSocio?.rut_socio && (
              <span className="whitespace-nowrap font-mono text-[12px] px-3.5 py-1.5 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[#292b2a] self-start sm:self-auto">
                RUT {fichaSocio.rut_socio}
              </span>
            )}
          </div>

          {loadingFicha ? (
            <div className="py-8 text-center text-[14px] text-[#7a7b7b] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff6105]" />
              <span>Cargando datos del perfil...</span>
            </div>
          ) : fichaSocio ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[12px] font-normal">Correo Electrónico</span>
                  <Mail className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                </div>
                <p className="text-[14px] font-medium text-[#0a0a0a] break-all">
                  {fichaSocio.correo_socio ?? fichaSocio.correo ?? "—"}
                </p>
              </div>

              <div className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[12px] font-normal">Teléfono</span>
                  <Phone className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                </div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">
                  {fichaSocio.telefono_socio ?? fichaSocio.telefono ?? "No registrado"}
                </p>
              </div>

              <div className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[12px] font-normal">Fecha de Nacimiento</span>
                  <Calendar className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                </div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">
                  {fichaSocio.fecha_nacimiento_socio
                    ? String(fichaSocio.fecha_nacimiento_socio).slice(0, 10)
                    : "No registrada"}
                </p>
              </div>

              <div className="bg-[#f3f4f3] border border-[#e5e5e5] rounded-[5px] p-4">
                <div className="flex items-center justify-between text-[#7a7b7b] mb-1">
                  <span className="text-[12px] font-normal">Sede Asignada</span>
                  <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                </div>
                <p className="text-[14px] font-medium text-[#0a0a0a] leading-snug">
                  {nombreSedeSocio}
                </p>
              </div>
            </div>
          ) : null}

          {/* Acciones desde el perfil — DESIGN.md: 1 Primary 50px Pill + Secondary 24px Pills */}
          <div className="pt-4 border-t border-[#e5e5e5] flex flex-wrap items-center gap-3">
            {fichaSocio?.rut_socio && (
              <Link
                href={`/socios/torniquete?identificador=${encodeURIComponent(
                  fichaSocio.rut_socio
                )}`}
                className="btn-primary-pill inline-flex items-center gap-2 px-7 py-3 text-[14px] font-medium"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Validar Mi Pase en Torniquete</span>
              </Link>
            )}

            <Link
              href="/clases"
              className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5]"
            >
              <span>Ir a Reserva de Clases</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#ff6105]" />
            </Link>

            <Link
              href="/contratos/estado-cuenta"
              className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5]"
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
