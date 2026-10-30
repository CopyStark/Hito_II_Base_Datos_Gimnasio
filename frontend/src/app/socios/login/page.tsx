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
  const [loadingProfile, setLoadingProfile] = useState(false);

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
        setLoadingProfile(true);
        try {
          const detail = await sociosApi.getById(res.id_socio);
          setSocioData(detail as unknown as SocioDetail);
        } catch {
          // If detailed fetch fails, basic info in res is still available
        } finally {
          setLoadingProfile(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err.status === 401
          ? "Credenciales inválidas. Verifique su usuario/correo y contraseña."
          : err.status === 403
          ? "Acceso bloqueado: La cuenta del socio se encuentra inactiva."
          : err.message || "Error al intentar iniciar sesión en la base de datos."
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

  // Preset demo accounts for quick testing (synchronized with GimnasioDB_Seed.sql)
  const demoAccounts = [
    { label: "Socio #1 · Daniel Matus (Activo)", user: "daniel.matus@alumnos.cl", pass: "Clave#socio1", rol: "Socio" },
    { label: "Socia #2 · Emilia Osorio (Activa)", user: "socio2", pass: "Clave#socio2", rol: "Socio" },
    { label: "Socia #3 · Yulissa Ulloa (Activa)", user: "socio3", pass: "Clave#socio3", rol: "Socio" },
    { label: "Socia #13 · Catalina López (Inactiva / 403)", user: "socio13", pass: "Clave#socio13", rol: "Inactivo" },
  ];

  return (
    <div className="space-y-12">
      {/* Editorial Section Heading (amp: weight 300, negative tracking, orange accent rule) */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-step">
                Step 4 &bull; Autenticación
              </span>
              <span className="badge-neutral">
                HASHBYTES SHA2_512
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-amp-ink tracking-[-0.030em] leading-[1.15]">
              Autenticación & Mi Perfil
            </h1>
            <div className="h-[2.5px] w-24 bg-amp-orange mt-3"></div>

            <p className="text-sm text-amp-carbon mt-3 max-w-2xl font-normal leading-relaxed">
              Inicio de sesión multi-rol contra SQL Server. Compara la contraseña cifrada mediante la función criptográfica
              nativa de base de datos <code className="text-amp-orange font-mono">HASHBYTES(&apos;SHA2_512&apos;, @password)</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/socios"
              className="btn-secondary-pill px-4 py-2.5 bg-amp-white hover:bg-amp-linen text-amp-carbon text-xs font-normal border border-amp-hairline flex items-center gap-2"
            >
              <span>← Volver al Directorio</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto">
        {!sessionUser ? (
          /* ===== LOGIN FORM VIEW ===== */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="md:col-span-7 card-ghost p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs text-amp-orange font-medium uppercase tracking-wider">Acceso Seguro</span>
                <h2 className="text-xl font-light text-amp-ink tracking-tight mt-0.5">
                  Iniciar Sesión
                </h2>
                <p className="text-xs text-amp-slate mt-1 font-normal">
                  Ingrese su nombre de usuario o correo electrónico y su contraseña registrada.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-[5px] bg-[#fff2f0] border border-[#ffccc7] text-xs text-amp-ink font-normal flex items-center gap-2">
                  <span className="text-amp-orange">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1.5">
                    Usuario o Correo Electrónico *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amp-slate text-sm">
                      👤
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="admin o socio@correo.cl"
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                      className="input-pill w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-normal placeholder-amp-ash"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1.5">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amp-slate text-sm">
                      🔒
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-pill w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-normal placeholder-amp-ash"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !identificador.trim() || !password}
                  className="btn-primary-pill w-full py-3 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Verificando HASH en SQL Server...</span>
                  ) : (
                    <>
                      <span>Ingresar a la Plataforma</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Test Credentials & Architecture Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="card-ghost p-6 space-y-4">
                <h3 className="text-sm font-medium text-amp-ink flex items-center gap-2">
                  <span>⚡</span>
                  <span>Cuentas de Demostración</span>
                </h3>
                <p className="text-xs text-amp-slate font-normal">
                  Haga clic en cualquiera de las siguientes cuentas para autocompletar las credenciales:
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
                      className="w-full p-3 rounded-[5px] bg-amp-linen hover:bg-amp-bone border border-amp-hairline hover:border-amp-orange text-left transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amp-ink">
                          {acc.label}
                        </span>
                        <span className="badge-step text-[10px] py-0.5 px-2">
                          {acc.rol}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-amp-slate mt-1">
                        Usuario: <strong className="text-amp-carbon font-medium">{acc.user}</strong> &bull; Clave: <span className="text-amp-slate">{acc.pass}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security info card */}
              <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline text-xs text-amp-carbon space-y-2 font-normal">
                <strong className="text-amp-ink font-medium block">Seguridad Criptográfica Nativa</strong>
                <p className="text-amp-slate">
                  El backend nunca almacena contraseñas en texto plano. La comparación se resuelve en el motor SQL Server
                  con la siguiente cláusula parametrizada:
                </p>
                <code className="block font-mono text-[11px] bg-amp-white border border-amp-hairline p-2 rounded-[5px] text-amp-orange">
                  WHERE password_hash_usuario = HASHBYTES(&apos;SHA2_512&apos;, ?)
                </code>
              </div>
            </div>
          </div>
        ) : (
          /* ===== AUTHENTICATED: MI PERFIL ===== */
          <div className="card-ghost p-6 sm:p-10 space-y-8 animate-fade-in-scale">
            {/* User Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-amp-hairline">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[8px] bg-amp-ink text-amp-white flex items-center justify-center text-2xl font-light">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-light text-amp-ink tracking-tight">
                      {sessionUser.nombre_completo_socio || sessionUser.username_usuario}
                    </h2>
                    <span className="badge-step text-xs py-0.5 px-2.5">
                      Rol: {sessionUser.rol || "Usuario"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-amp-slate mt-1 font-normal">
                    Usuario: @{sessionUser.username_usuario} &bull; ID Usuario #{sessionUser.id_usuario}
                    {sessionUser.id_socio && ` • Socio #${sessionUser.id_socio}`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn-secondary-pill px-4 py-2 bg-amp-linen hover:bg-amp-bone text-amp-carbon text-xs font-normal border border-amp-hairline self-start sm:self-center"
              >
                Cerrar Sesión ✕
              </button>
            </div>

            {/* Profile Data Grid (amp: 5px radius cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline space-y-2">
                <span className="text-[11px] text-amp-slate font-medium uppercase tracking-wider block">
                  Información de la Cuenta
                </span>
                <div className="text-xs space-y-1.5 text-amp-carbon font-normal">
                  <div>
                    <span className="text-amp-slate">Nombre de Usuario:</span>{" "}
                    <strong className="text-amp-ink font-medium">{sessionUser.username_usuario}</strong>
                  </div>
                  <div>
                    <span className="text-amp-slate">Nivel de Acceso / Rol:</span>{" "}
                    <strong className="text-amp-ink font-medium">{sessionUser.rol}</strong>
                  </div>
                  <div>
                    <span className="text-amp-slate">Estado de Cuenta:</span>{" "}
                    <span className="text-amp-orange font-medium">Activo</span>
                  </div>
                </div>
              </div>

              {socioData ? (
                <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline space-y-2">
                  <span className="text-[11px] text-amp-slate font-medium uppercase tracking-wider block">
                    Ficha del Socio (SQL Server)
                  </span>
                  <div className="text-xs space-y-1.5 text-amp-carbon font-normal">
                    <div>
                      <span className="text-amp-slate">RUT:</span>{" "}
                      <strong className="text-amp-ink font-mono font-medium">{socioData.rut_socio}</strong>
                    </div>
                    <div>
                      <span className="text-amp-slate">Correo Registrado:</span>{" "}
                      <strong className="text-amp-ink font-medium">{socioData.correo_socio}</strong>
                    </div>
                    <div>
                      <span className="text-amp-slate">Teléfono:</span>{" "}
                      <span>{socioData.telefono_socio}</span>
                    </div>
                    <div>
                      <span className="text-amp-slate">Fecha Nacimiento:</span>{" "}
                      <span>{socioData.fecha_nacimiento_socio}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline flex items-center justify-center text-xs text-amp-slate font-normal">
                  {loadingProfile
                    ? "Cargando datos adicionales del socio..."
                    : "Usuario administrativo del sistema (sin ficha de socio asociada)."}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-amp-hairline flex flex-wrap items-center gap-3">
              {socioData && (
                <Link
                  href={`/socios/torniquete?rut=${encodeURIComponent(socioData.rut_socio)}`}
                  className="btn-primary-pill px-4 py-2 text-xs font-medium"
                >
                  Probar Mi Acceso en Torniquete →
                </Link>
              )}
              <Link
                href="/clases"
                className="btn-secondary-pill px-4 py-2 bg-amp-white hover:bg-amp-linen text-amp-carbon text-xs font-normal border border-amp-hairline"
              >
                Ver Catálogo de Clases
              </Link>
              <Link
                href="/socios"
                className="btn-secondary-pill px-4 py-2 bg-amp-linen hover:bg-amp-bone text-amp-carbon text-xs font-normal border border-amp-hairline"
              >
                Directorio General de Socios
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
