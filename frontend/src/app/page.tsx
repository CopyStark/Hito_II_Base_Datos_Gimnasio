"use client";

import { useEffect, useState } from "react";
import TeamCard from "@/components/TeamCard";
import apiClient from "@/services/apiClient";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Panel de Persona 1: Socios & Control de Acceso ---
  const [showClientes, setShowClientes] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activos" | "inactivos">("todos");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Validador de acceso (Torniquete / Recepción)
  const [accesoIdentificador, setAccesoIdentificador] = useState("");
  const [accesoLoading, setAccesoLoading] = useState(false);
  const [accesoResultado, setAccesoResultado] = useState<any>(null);

  const fetchClientes = async () => {
    setClientesLoading(true);
    setClientesError(null);
    try {
      const params: any = {};
      if (filtroActivo === "activos") params.activo = true;
      if (filtroActivo === "inactivos") params.activo = false;
      if (searchTerm.trim()) params.buscar = searchTerm.trim();

      const data = await apiClient.socios.getAll(params);
      setClientes(data);
    } catch (err: any) {
      setClientesError(err.message || "No se pudo obtener la lista de socios.");
    } finally {
      setClientesLoading(false);
    }
  };

  const handleToggleEstado = async (id_socio: number, estadoActual: boolean) => {
    setUpdatingId(id_socio);
    try {
      const nuevoEstado = !estadoActual;
      await apiClient.socios.cambiarEstado(id_socio, nuevoEstado);
      setClientes((prev) =>
        prev.map((c) =>
          c.id_socio === id_socio
            ? { ...c, activo_socio: nuevoEstado, activo: nuevoEstado }
            : c
        )
      );
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleValidarAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accesoIdentificador.trim()) return;
    setAccesoLoading(true);
    setAccesoResultado(null);
    try {
      const res = await apiClient.socios.validarAcceso(accesoIdentificador.trim());
      setAccesoResultado(res);
    } catch (err: any) {
      setAccesoResultado({
        acceso_permitido: false,
        motivo: `Error al conectar: ${err.message}`,
      });
    } finally {
      setAccesoLoading(false);
    }
  };

  const handleToggleClientes = () => {
    if (!showClientes) {
      fetchClientes();
    }
    setShowClientes(!showClientes);
  };
  // --- FIN PANEL PERSONA 1 ---

  // Comprobar la conexión automáticamente al cargar la página
  useEffect(() => {
    const checkConnection = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient.health();
        setHealthStatus(data);
      } catch (err: any) {
        setErrorMsg(err.message || "No se pudo conectar con el backend.");
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 py-12 px-4 sm:px-6 lg:px-8">

      {/* ===== Panel Interactivo Persona 1: Socios & Acceso ===== */}
      <div className="fixed top-4 left-4 z-50">
        <button
          id="btn-mostrar-clientes"
          onClick={handleToggleClientes}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all duration-150 text-white text-sm font-semibold shadow-lg shadow-blue-900/50 border border-blue-400/30"
        >
          <span>{showClientes ? "🙈" : "👥"}</span>
          {showClientes ? "Ocultar Panel Socios" : "Panel Persona 1 (Socios & Acceso)"}
        </button>

        {showClientes && (
          <div className="mt-2 w-96 max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900/95 border border-blue-500/30 shadow-2xl backdrop-blur-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛡️</span> Persona 1: Socios & Acceso
                </h3>
                <p className="text-[10px] text-slate-400">Consultas nativas pyodbc sin ORM</p>
              </div>
              <button
                onClick={fetchClientes}
                disabled={clientesLoading}
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                title="Recargar"
              >
                {clientesLoading ? "⏳" : "🔄 Recargar"}
              </button>
            </div>

            {/* Validador de Acceso Rápido (Torniquete) */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                🚪 Simular Control de Acceso (Torniquete)
              </label>
              <form onSubmit={handleValidarAcceso} className="flex gap-2">
                <input
                  type="text"
                  placeholder="RUT o ID de Socio..."
                  value={accesoIdentificador}
                  onChange={(e) => setAccesoIdentificador(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={accesoLoading || !accesoIdentificador.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {accesoLoading ? "..." : "Validar"}
                </button>
              </form>

              {accesoResultado && (
                <div
                  className={`p-2 rounded-lg text-xs border ${
                    accesoResultado.acceso_permitido
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <p className="font-bold">
                    {accesoResultado.acceso_permitido ? "✅ ACCESO PERMITIDO" : "⛔ ACCESO DENEGADO"}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">{accesoResultado.motivo}</p>
                  {accesoResultado.nombre_completo_socio && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Socio: {accesoResultado.nombre_completo_socio} ({accesoResultado.sede_registro})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Filtros de Socios */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar por Nombre, RUT, Correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchClientes()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={fetchClientes}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg"
                >
                  🔍
                </button>
              </div>

              <div className="flex gap-1.5 text-[11px]">
                {(["todos", "activos", "inactivos"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFiltroActivo(f);
                    }}
                    className={`flex-1 py-1 rounded-md capitalize font-medium transition-colors ${
                      filtroActivo === f
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Socios */}
            {clientesLoading && (
              <p className="text-xs text-amber-400 animate-pulse text-center py-4">
                Consultando tabla [Socio] en SQL Server...
              </p>
            )}

            {clientesError && !clientesLoading && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                ⚠️ {clientesError}
              </p>
            )}

            {!clientesLoading && !clientesError && clientes.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No se encontraron socios que coincidan con los filtros.
              </p>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {!clientesLoading &&
                clientes.map((c, i) => {
                  const id = c.id_socio ?? i;
                  const nombre = c.nombre_completo_socio ?? c.nombre_completo ?? "Sin nombre";
                  const activo = c.activo_socio ?? c.activo ?? true;
                  const correo = c.correo_socio ?? c.correo ?? "Sin correo";
                  const rut = c.rut_socio ?? c.rut ?? "Sin RUT";
                  const isUpdating = updatingId === id;

                  return (
                    <div
                      key={id}
                      className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs space-y-1 hover:border-blue-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[180px]">{nombre}</span>
                        <button
                          onClick={() => handleToggleEstado(id, activo)}
                          disabled={isUpdating}
                          title="Haga clic para cambiar estado en SQL Server"
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            activo
                              ? "bg-emerald-500/20 text-emerald-400 hover:bg-rose-500/20 hover:text-rose-400"
                              : "bg-rose-500/20 text-rose-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                          } ${isUpdating ? "opacity-50 animate-pulse" : ""}`}
                        >
                          {isUpdating ? "..." : activo ? "✓ Activo" : "✕ Inactivo"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{correo}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>RUT: {rut}</span>
                        <span>ID: {id}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!clientesLoading && clientes.length > 0 && (
              <p className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-800">
                {clientes.length} socio(s) desplegado(s)
              </p>
            )}
          </div>
        )}
      </div>
      {/* ===== FIN PANEL PERSONA 1 ===== */}

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Hero */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span>⚡ Arquitectura API-First</span>
            <span>•</span>
            <span>Sin ORM (pyodbc)</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            GimnasioDB Platform
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
            Repositorio base inicializado para el sistema de gestión de gimnasios.
            Estructurado de forma modular para desarrollo colaborativo entre 3 desarrolladores.
          </p>
        </header>

        {/* Estado Automático del Sistema */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${loading ? "bg-amber-400 animate-pulse" : healthStatus ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                <h2 className="text-lg font-bold text-white">
                  Estado de la Plataforma
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Backend: <span className="text-cyan-400">{apiClient.getBaseUrl()}</span>
              </p>
            </div>

            <div className="text-sm">
              {loading && (
                <span className="text-amber-400 font-medium text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                  ⏳ Verificando conexión con Render...
                </span>
              )}
              {!loading && healthStatus && (
                <span className="text-emerald-400 font-medium text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  ✅ Backend & Base de Datos En Línea
                </span>
              )}
              {!loading && errorMsg && (
                <span className="text-rose-400 font-medium text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                  ⚠️ Error al conectar con Render
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Team Modules Distribution */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">División de Trabajo del Equipo</h2>
            <p className="text-sm text-slate-400">
              Cada integrante tiene un router dedicado en FastAPI y su cliente listo en Next.js.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TeamCard
              personNumber="Persona 1"
              roleTitle="Acceso & Socios"
              moduleRoute="/socios"
              backendFile="backend/routers/auth_socios.py"
              colorBorder="border-blue-500/30"
              badgeBg="bg-blue-600"
              responsibilities={[
                "Registro y credenciales de socios",
                "Consultas SQL a tabla Socio con pyodbc",
                "Control de acceso y estado activo/inactivo",
                "Schemas Pydantic para validación de datos"
              ]}
            />

            <TeamCard
              personNumber="Persona 2"
              roleTitle="Clases & Sesiones"
              moduleRoute="/clases"
              backendFile="backend/routers/clases.py"
              colorBorder="border-purple-500/30"
              badgeBg="bg-purple-600"
              responsibilities={[
                "Catálogo de disciplinas y entrenadores",
                "Gestión de cupos y horarios",
                "Inscripción de socios a sesiones",
                "Consultas SQL con JOINs y agregaciones"
              ]}
            />

            <TeamCard
              personNumber="Persona 3"
              roleTitle="Membresías & Pagos"
              moduleRoute="/contratos"
              backendFile="backend/routers/contratos.py"
              colorBorder="border-emerald-500/30"
              badgeBg="bg-emerald-600"
              responsibilities={[
                "Planes de suscripción y contratos",
                "Transacciones atómicas de pagos",
                "Vencimiento y estado de cuentas",
                "Consultas SQL con transacciones (commit/rollback)"
              ]}
            />
          </div>
        </section>

        {/* Development Guidelines */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            <span>🛡️</span> Reglas Críticas del Proyecto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <strong className="text-white block mb-1">1. PROHIBIDO EL USO DE ORM</strong>
              No utilizar SQLAlchemy ORM, Prisma ni Django ORM. Todas las consultas a SQL Server deben ser sentencias SQL nativas y parametrizadas con <code>pyodbc</code> (usando <code>?</code> como marcador de posición) para evitar SQL Injection.
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <strong className="text-white block mb-1">2. Arquitectura API-First Desacoplada</strong>
              El frontend Next.js jamás se conecta directamente a la base de datos ni utiliza drivers de base de datos en el cliente o server components de Next.js. Todo se canaliza a través de la API REST de FastAPI.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-900">
          GimnasioDB • Arquitectura Modular para Trabajo en Equipo • Next.js & FastAPI
        </footer>
      </div>
    </main>
  );
}
