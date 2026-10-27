"use client";

import { useState } from "react";
import Link from "next/link";
import { sociosApi, LoginResult, SocioDetail } from "@/services/apiClient";

export default function SociosLoginPage() {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticated user state
  const [sessionUser, setSessionUser] = useState<LoginResult | null>(null);
  const [socioData, setSocioData] = useState<SocioDetail | null>(null);
  const [loadingProfile, setLoadingProfileProfile] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await sociosApi.login({
        username_o_correo: identificador.trim(),
        password: password,
      });

      setSessionUser(res);

      // If user has associated socio, load extra profile info
      if (res.id_socio) {
        setLoadingProfileProfile(true);
        try {
          const detail = await sociosApi.getById(res.id_socio);
          setSocioData(detail as unknown as SocioDetail);
        } catch {
          // If detailed fetch fails, basic info in res is still available
        } finally {
          setLoadingProfileProfile(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err.status === 401
          ? "Credenciales inválidas. Verifique su usuario/correo y contraseña."
          : err.status === 403
          ? "Acceso bloqueado: La cuenta del socio se encuentra inactiva."
          : err.message || "Error al intentar iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSessionUser(null);
    setSocioData(null);
    setPassword("");
    setErrorMsg(null);
  };

  // Preset demo accounts for quick testing
  const demoAccounts = [
    { label: "Administrador General", user: "admin", pass: "Clave#admin", rol: "Admin" },
    { label: "Instructor Juan Pérez", user: "juan.instructor", pass: "Clave#juan123", rol: "Instructor" },
    { label: "Socio Registrado", user: "daniel.matus@alumnos.cl", pass: "Clave#socio1", rol: "Socio" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-purple-950/60 border border-blue-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
            <span>🔐</span>
            <span>POST /socios/login &bull; Autenticación SHA2_512</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autenticación & Mi Perfil
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Inicio de sesión multi-rol contra SQL Server. Compara la contraseña cifrada con la función criptográfica
            <code className="text-blue-300 ml-1">HASHBYTES(&apos;SHA2_512&apos;, @password)</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/socios"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition-all"
          >
            ← Volver a Directorio
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {!sessionUser ? (
          /* ===== LOGIN FORM ===== */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Iniciar Sesión</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingrese su nombre de usuario o su correo electrónico registrado.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Usuario o Correo Electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      👤
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="admin o socio@correo.cl"
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      🔒
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !identificador.trim() || !password}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 border border-blue-400/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin text-sm">🌀</span>
                      <span>Verificando HASH en SQL Server...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar a la Plataforma</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Test Credentials & Architecture Info */}
            <div className="md:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡</span>
                  <span>Cuentas de Demostración</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Haga clic en cualquiera de las siguientes cuentas preconfiguradas para probar la autenticación:
                </p>

                <div className="space-y-2.5">
                  {demoAccounts.map((acc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setIdentificador(acc.user);
                        setPassword(acc.pass);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300">
                          {acc.label}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {acc.rol}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Usuario: <strong className="text-slate-300">{acc.user}</strong> &bull; Clave: <span className="text-slate-500">{acc.pass}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/30 text-xs text-slate-400 space-y-1.5">
                <strong className="text-blue-300 block">Seguridad Criptográfica Nativa</strong>
                <p>
                  El backend nunca almacena contraseñas en texto plano. La validación se ejecuta en el motor SQL Server
                  mediante la instrucción SQL:
                </p>
                <code className="block font-mono text-[10px] bg-slate-950 p-2 rounded text-cyan-300">
                  WHERE password_hash_usuario = HASHBYTES(&apos;SHA2_512&apos;, ?)
                </code>
              </div>
            </div>
          </div>
        ) : (
          /* ===== AUTHENTICATED: MI PERFIL ===== */
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/90 border border-blue-500/40 shadow-2xl space-y-8 animate-fade-in">
            {/* User Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-blue-600/30">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white">
                      {sessionUser.nombre_completo_socio || sessionUser.username_usuario}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Rol: {sessionUser.rol || "Usuario"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Usuario: @{sessionUser.username_usuario} &bull; ID Usuario #{sessionUser.id_usuario}
                    {sessionUser.id_socio && ` • Socio #${sessionUser.id_socio}`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-slate-700 hover:border-rose-800 transition-all self-start sm:self-center"
              >
                Cerrar Sesión ✕
              </button>
            </div>

            {/* Profile Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-500 font-semibold uppercase block">
                  Información de la Cuenta
                </span>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <div>
                    <span className="text-slate-500">Nombre de Usuario:</span>{" "}
                    <strong className="text-white">{sessionUser.username_usuario}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Nivel de Acceso / Rol:</span>{" "}
                    <strong className="text-cyan-300">{sessionUser.rol}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Estado de Cuenta:</span>{" "}
                    <span className="text-emerald-400 font-bold">Activo</span>
                  </div>
                </div>
              </div>

              {socioData ? (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-500 font-semibold uppercase block">
                    Ficha del Socio (SQL Server)
                  </span>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <div>
                      <span className="text-slate-500">RUT:</span>{" "}
                      <strong className="text-white font-mono">{socioData.rut_socio}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Correo Registrado:</span>{" "}
                      <strong className="text-white">{socioData.correo_socio}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Teléfono:</span>{" "}
                      <span className="text-slate-300">{socioData.telefono_socio}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fecha Nacimiento:</span>{" "}
                      <span className="text-slate-300">{socioData.fecha_nacimiento_socio}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                  {loadingProfile
                    ? "Cargando datos adicionales del socio..."
                    : "Usuario administrativo del sistema (sin ficha de socio asociada)."}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
              {socioData && (
                <Link
                  href={`/socios/torniquete?rut=${encodeURIComponent(socioData.rut_socio)}`}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-all"
                >
                  🚪 Probar Mi Acceso en Torniquete →
                </Link>
              )}
              <Link
                href="/clases"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                🏋️ Ver Catálogo de Clases & Reservas →
              </Link>
              <Link
                href="/socios"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
              >
                👥 Directorio General de Socios
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
