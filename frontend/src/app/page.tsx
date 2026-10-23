"use client";

import { useState } from "react";
import TeamCard from "@/components/TeamCard";
import apiClient from "@/services/apiClient";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [apiUrl, setApiUrl] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState("");

  // Inicializar apiUrl en cliente
  useState(() => {
    if (typeof window !== "undefined") {
      const current = apiClient.getBaseUrl();
      setApiUrl(current);
      setInputUrl(current);
    }
  });

  const handleSaveApiUrl = () => {
    if (inputUrl.trim()) {
      apiClient.setCustomBaseUrl(inputUrl.trim());
      setApiUrl(inputUrl.trim());
      setShowConfig(false);
      setHealthStatus(null);
      setErrorMsg(null);
    }
  };

  const handleResetApiUrl = () => {
    apiClient.resetBaseUrl();
    const current = apiClient.getBaseUrl();
    setApiUrl(current);
    setInputUrl(current);
    setShowConfig(false);
    setHealthStatus(null);
    setErrorMsg(null);
  };

  const testApiHealth = async () => {
    setLoadingHealth(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.health();
      setHealthStatus(data);
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo conectar con el backend.");
      setHealthStatus(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
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

        {/* Live Status Diagnostic Card */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Diagnóstico de Conectividad Frontend ↔ Backend
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-400">Target Backend:</span>
                <code className="text-xs font-mono text-cyan-400 bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                  {apiUrl || "Cargando..."}
                </code>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  {showConfig ? "Ocultar ajustes" : "⚙️ Cambiar URL Backend"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testApiHealth}
                disabled={loadingHealth}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loadingHealth ? "Probando conexión..." : "Probar Conexión con FastAPI"}
              </button>
            </div>
          </div>

          {/* Configuración dinámica de Backend para Integrantes */}
          {showConfig && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-blue-500/30 space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                🔄 <strong>Configuración para Integrantes del Equipo:</strong> Puedes apuntar este frontend en Vercel a tu propio backend (ej. tu servicio en Render o tu túnel de desarrollo local con Ngrok/Cloudflare):
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://tu-backend.onrender.com o https://xxxx.ngrok-free.app"
                  className="flex-1 text-sm bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={handleSaveApiUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Guardar en este navegador
                </button>
                <button
                  onClick={handleResetApiUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Restablecer
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            {healthStatus && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
                <p className="text-sm font-semibold flex items-center gap-2">
                  ✅ Backend FastAPI conectado exitosamente:
                </p>
                <pre className="mt-2 text-xs bg-black/50 p-3 rounded-lg overflow-x-auto font-mono text-emerald-300">
                  {JSON.stringify(healthStatus, null, 2)}
                </pre>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200">
                <p className="text-sm font-semibold">⚠️ Estado de conexión:</p>
                <p className="text-xs mt-1 text-rose-300">{errorMsg}</p>
                <p className="text-xs mt-2 text-slate-400">
                  Tip: Asegúrate de que el servidor FastAPI esté corriendo en <code>http://localhost:8000</code>.
                </p>
              </div>
            )}

            {!healthStatus && !errorMsg && (
              <p className="text-sm text-slate-500 italic">
                Presiona el botón superior para realizar una petición al endpoint de salud del backend.
              </p>
            )}
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
                "Consultas SQL a tabla Socios con pyodbc",
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
