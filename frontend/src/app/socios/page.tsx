"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  sociosApi,
  SocioDetail,
  SedeSimpleResponse,
} from "@/services/apiClient";

interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

export default function SociosDirectorioPage() {
  // Data states
  const [socios, setSocios] = useState<SocioDetail[]>([]);
  const [sedes, setSedes] = useState<SedeSimpleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Filters
  const [buscar, setBuscar] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "activos" | "inactivos">("todos");
  const [filtroSede, setFiltroSede] = useState<string>("");

  // Feedback
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSocio, setEditingSocio] = useState<SocioDetail | null>(null);
  const [credencialesSocio, setCredencialesSocio] = useState<SocioDetail | null>(null);

  // Form states: Create
  const [newSocio, setNewSocio] = useState({
    rut_socio: "",
    nombre_completo_socio: "",
    fecha_nacimiento_socio: "",
    correo_socio: "",
    telefono_socio: "+56 9 ",
    id_sede_registro_socio: 1,
    acepta_promociones_socio: true,
  });
  const [creating, setCreating] = useState(false);

  // Form states: Edit
  const [editForm, setEditForm] = useState({
    nombre_completo_socio: "",
    correo_socio: "",
    telefono_socio: "",
    id_sede_registro_socio: 1,
    acepta_promociones_socio: false,
  });
  const [updating, setUpdating] = useState(false);

  // Form states: Credenciales
  const [credForm, setCredForm] = useState({
    username_usuario: "",
    password: "",
  });
  const [savingCred, setSavingCred] = useState(false);

  // Quick lookup state
  const [quickLookupQuery, setQuickLookupQuery] = useState("");
  const [quickLookupResult, setQuickLookupResult] = useState<SocioDetail | null>(null);
  const [quickLookupLoading, setQuickLookupLoading] = useState(false);
  const [quickLookupError, setQuickLookupError] = useState<string | null>(null);

  // Load Sedes
  const loadSedes = useCallback(async () => {
    try {
      const data = await sociosApi.getSedesCatalogo();
      setSedes(data);
      if (data.length > 0) {
        setNewSocio((prev) => ({ ...prev, id_sede_registro_socio: data[0].id_sede }));
      }
    } catch (err: any) {
      console.error("Error al cargar sedes:", err);
    }
  }, []);

  // Load Socios
  const loadSocios = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filtroActivo === "activos") params.activo = true;
      if (filtroActivo === "inactivos") params.activo = false;
      if (filtroSede) params.id_sede = Number(filtroSede);
      if (buscar.trim()) params.buscar = buscar.trim();

      const data = await sociosApi.getAll(params);
      setSocios(data as unknown as SocioDetail[]);
    } catch (err: any) {
      console.error("Error al cargar socios:", err);
      setFeedback({
        type: "error",
        message: err.message || "Error al conectar con el servidor para obtener socios.",
      });
    } finally {
      setLoading(false);
    }
  }, [filtroActivo, filtroSede, buscar]);

  useEffect(() => {
    loadSedes();
  }, [loadSedes]);

  useEffect(() => {
    loadSocios();
  }, [loadSocios]);

  // Quick lookup by ID or RUT
  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickLookupQuery.trim();
    if (!query) return;

    setQuickLookupLoading(true);
    setQuickLookupError(null);
    setQuickLookupResult(null);

    try {
      let res: SocioDetail;
      if (/^\d+$/.test(query)) {
        // Numeric ID lookup
        res = (await sociosApi.getById(Number(query))) as unknown as SocioDetail;
      } else {
        // RUT lookup
        res = (await sociosApi.getByRut(query)) as unknown as SocioDetail;
      }
      setQuickLookupResult(res);
    } catch (err: any) {
      setQuickLookupError(
        err.status === 404
          ? `No se encontró ningún socio con el identificador "${query}".`
          : err.message || "Error al buscar socio."
      );
    } finally {
      setQuickLookupLoading(false);
    }
  };

  // Toggle Estado
  const handleToggleEstado = async (socio: SocioDetail) => {
    const nuevoEstado = !socio.activo_socio;
    setUpdatingId(socio.id_socio);
    try {
      await sociosApi.cambiarEstado(socio.id_socio, nuevoEstado);
      setSocios((prev) =>
        prev.map((s) =>
          s.id_socio === socio.id_socio ? { ...s, activo_socio: nuevoEstado } : s
        )
      );
      if (quickLookupResult && quickLookupResult.id_socio === socio.id_socio) {
        setQuickLookupResult({ ...quickLookupResult, activo_socio: nuevoEstado });
      }
      setFeedback({
        type: "success",
        message: `Estado de ${socio.nombre_completo_socio} cambiado a ${
          nuevoEstado ? "ACTIVO" : "INACTIVO"
        }.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Error al cambiar estado: ${err.message}`,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Create Socio
  const handleCreateSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const created = await sociosApi.create({
        rut_socio: newSocio.rut_socio.trim(),
        nombre_completo_socio: newSocio.nombre_completo_socio.trim(),
        fecha_nacimiento_socio: newSocio.fecha_nacimiento_socio,
        correo_socio: newSocio.correo_socio.trim(),
        telefono_socio: newSocio.telefono_socio.trim(),
        id_sede_registro_socio: Number(newSocio.id_sede_registro_socio),
        acepta_promociones_socio: newSocio.acepta_promociones_socio,
      });

      setShowCreateModal(false);
      setNewSocio({
        rut_socio: "",
        nombre_completo_socio: "",
        fecha_nacimiento_socio: "",
        correo_socio: "",
        telefono_socio: "+56 9 ",
        id_sede_registro_socio: sedes[0]?.id_sede || 1,
        acepta_promociones_socio: true,
      });
      setFeedback({
        type: "success",
        message: `¡Socio ${created.nombre_completo_socio || created.nombre_completo} registrado exitosamente con ID #${created.id_socio}!`,
      });
      loadSocios();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Error al registrar socio: ${err.message}`,
      });
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (s: SocioDetail) => {
    setEditingSocio(s);
    setEditForm({
      nombre_completo_socio: s.nombre_completo_socio || "",
      correo_socio: s.correo_socio || "",
      telefono_socio: s.telefono_socio || "",
      id_sede_registro_socio: s.id_sede_registro_socio || 1,
      acepta_promociones_socio: Boolean(s.acepta_promociones_socio),
    });
  };

  // Submit Edit
  const handleUpdateSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocio) return;
    setUpdating(true);
    try {
      const updated = await sociosApi.update(editingSocio.id_socio, {
        nombre_completo_socio: editForm.nombre_completo_socio.trim(),
        correo_socio: editForm.correo_socio.trim(),
        telefono_socio: editForm.telefono_socio.trim(),
        id_sede_registro_socio: Number(editForm.id_sede_registro_socio),
        acepta_promociones_socio: editForm.acepta_promociones_socio,
      });

      setSocios((prev) =>
        prev.map((s) => (s.id_socio === editingSocio.id_socio ? { ...s, ...updated } : s))
      );
      setEditingSocio(null);
      setFeedback({
        type: "success",
        message: `Datos de ${updated.nombre_completo_socio || "socio"} actualizados con éxito.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Error al actualizar: ${err.message}`,
      });
    } finally {
      setUpdating(false);
    }
  };

  // Open Credenciales Modal
  const handleOpenCredenciales = (s: SocioDetail) => {
    setCredencialesSocio(s);
    // Suggest a default username based on email or rut
    const suggestedUser = s.correo_socio ? s.correo_socio.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") : `socio${s.id_socio}`;
    setCredForm({
      username_usuario: suggestedUser,
      password: "",
    });
  };

  // Submit Credenciales
  const handleSaveCredenciales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credencialesSocio) return;
    setSavingCred(true);
    try {
      const res = await sociosApi.asignarCredenciales(credencialesSocio.id_socio, {
        username_usuario: credForm.username_usuario.trim(),
        password: credForm.password,
      });
      setCredencialesSocio(null);
      setFeedback({
        type: "success",
        message: `Credenciales configuradas con éxito para ${credencialesSocio.nombre_completo_socio}. Usuario: "${res.username_usuario}". Hasheado con SHA2_512.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Error al asignar credenciales: ${err.message}`,
      });
    } finally {
      setSavingCred(false);
    }
  };

  // Map sede id to name
  const getNombreSede = useCallback(
    (idSede: number) => {
      const sede = sedes.find((s) => s.id_sede === idSede);
      return sede ? `${sede.nombre_sede} (${sede.nombre_ciudad})` : `Sede #${idSede}`;
    },
    [sedes]
  );

  // Stats
  const totalSocios = socios.length;
  const sociosActivos = useMemo(() => socios.filter((s) => s.activo_socio).length, [socios]);
  const sociosInactivos = totalSocios - sociosActivos;

  return (
    <div className="space-y-8">
      {/* ===== Hero & Stats Section ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-cyan-950/60 border border-blue-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
              <span>👥</span>
              <span>Persona 1 (Carlos) &bull; Módulo de Socios & Acceso</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Directorio de Socios
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Administración completa de socios, control de estados activo/inactivo, asignación de
              credenciales de acceso con SHA2_512 y enlace directo al torniquete de portería.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 border border-blue-400/40 transition-all active:scale-95"
            >
              <span>➕</span>
              <span>Nuevo Socio</span>
            </button>

            <Link
              href="/socios/torniquete"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all active:scale-95 shadow-md"
            >
              <span>🚪</span>
              <span>Abrir Torniquete</span>
            </Link>

            <button
              onClick={loadSocios}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm border border-slate-800 transition-all active:scale-95"
              title="Recargar listado"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
            </button>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-blue-900/30">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Total Registrados</span>
            <span className="text-2xl font-black text-white">{totalSocios}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-900/30">
            <span className="text-xs text-emerald-400 block">Socios Activos</span>
            <span className="text-2xl font-black text-emerald-300">{sociosActivos}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-900/30">
            <span className="text-xs text-rose-400 block">Socios Inactivos</span>
            <span className="text-2xl font-black text-rose-300">{sociosInactivos}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-900/30">
            <span className="text-xs text-cyan-400 block">Sedes Conectadas</span>
            <span className="text-2xl font-black text-cyan-300">{sedes.length}</span>
          </div>
        </div>
      </div>

      {/* ===== Feedback Notification Toast ===== */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-sm border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-200"
              : "bg-blue-950/80 border-blue-500/40 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">
              {feedback.type === "success" ? "✅" : feedback.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-slate-300"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* ===== Quick Lookup Card (Búsqueda Unitaria por RUT o ID) ===== */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🔍</span>
          <h2 className="text-sm font-bold text-white">Consulta Rápida Unitaria (GET /socios/{`{id}`} o /socios/rut/{`{rut}`})</h2>
        </div>
        <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Ingrese ID (ej: 1) o RUT exacto (ej: 18.765.432-K)..."
            value={quickLookupQuery}
            onChange={(e) => setQuickLookupQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={quickLookupLoading || !quickLookupQuery.trim()}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {quickLookupLoading ? (
              <>
                <span className="animate-spin text-xs">🌀</span>
                <span>Buscando...</span>
              </>
            ) : (
              <span>Consultar en BD</span>
            )}
          </button>
        </form>

        {quickLookupError && (
          <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            {quickLookupError}
          </p>
        )}

        {quickLookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-blue-500/40 text-xs sm:text-sm text-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">
                  {quickLookupResult.nombre_completo_socio}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ID #{quickLookupResult.id_socio}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    quickLookupResult.activo_socio
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {quickLookupResult.activo_socio ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-slate-400">
                RUT: <strong className="text-slate-200">{quickLookupResult.rut_socio}</strong> &bull; Correo: <strong className="text-slate-200">{quickLookupResult.correo_socio}</strong> &bull; Teléfono: {quickLookupResult.telefono_socio}
              </p>
              <p className="text-slate-400">
                Sede de Registro: <span className="text-cyan-300">{getNombreSede(quickLookupResult.id_sede_registro_socio)}</span> &bull; Promociones: {quickLookupResult.acepta_promociones_socio ? "Sí" : "No"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleToggleEstado(quickLookupResult)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
              >
                {quickLookupResult.activo_socio ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => handleOpenEdit(quickLookupResult)}
                className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium"
              >
                Editar
              </button>
              <Link
                href={`/socios/torniquete?rut=${encodeURIComponent(quickLookupResult.rut_socio)}`}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-medium"
              >
                Probar en Torniquete →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ===== Main Filter & Search Bar ===== */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Filtrar por Nombre, RUT o Correo (GET /socios/?buscar=...)"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {buscar && (
            <button
              onClick={() => setBuscar("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {(["todos", "activos", "inactivos"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFiltroActivo(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filtroActivo === tab
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sede selector filter */}
        <div className="w-full md:w-56">
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Todas las Sedes</option>
            {sedes.map((s) => (
              <option key={s.id_sede} value={s.id_sede}>
                {s.nombre_sede} ({s.nombre_ciudad})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== Socios Table / Card Grid ===== */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-medium">Cargando lista de socios desde SQL Server...</p>
          </div>
        ) : socios.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <span className="text-4xl">📭</span>
            <p className="text-base font-semibold text-slate-300">
              No se encontraron socios con los filtros actuales.
            </p>
            <p className="text-xs text-slate-500">
              Pruebe cambiando el término de búsqueda o registre un nuevo socio.
            </p>
            <button
              onClick={() => {
                setBuscar("");
                setFiltroActivo("todos");
                setFiltroSede("");
              }}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-blue-300 hover:bg-slate-700"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Socio</th>
                  <th className="px-4 py-3.5">Contacto</th>
                  <th className="px-4 py-3.5">Sede Registro</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {socios.map((s) => (
                  <tr
                    key={s.id_socio}
                    className="hover:bg-slate-900/40 transition-colors group"
                  >
                    {/* ID */}
                    <td className="px-4 py-3.5 font-mono text-slate-400 text-xs">
                      #{s.id_socio}
                    </td>

                    {/* Socio Name + RUT */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
                        {s.nombre_completo_socio}
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {s.rut_socio}
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="text-slate-300 flex items-center gap-1.5">
                        <span>✉️</span>
                        <span className="truncate max-w-[180px]">{s.correo_socio}</span>
                      </div>
                      <div className="text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>📞</span>
                        <span>{s.telefono_socio}</span>
                      </div>
                    </td>

                    {/* Sede */}
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                        {getNombreSede(s.id_sede_registro_socio)}
                      </span>
                    </td>

                    {/* State Toggle (PATCH /socios/{id}/estado) */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleEstado(s)}
                        disabled={updatingId === s.id_socio}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                          s.activo_socio
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                        }`}
                        title="Clic para cambiar estado del socio"
                      >
                        {updatingId === s.id_socio ? (
                          <span className="animate-spin text-[10px]">🌀</span>
                        ) : (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              s.activo_socio ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          ></span>
                        )}
                        <span>{s.activo_socio ? "Activo" : "Inactivo"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 hover:border-blue-500"
                          title="Editar datos del socio (PUT /socios/{id})"
                        >
                          ✏️ Editar
                        </button>

                        {/* Assign Credentials */}
                        <button
                          onClick={() => handleOpenCredenciales(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 hover:border-amber-500"
                          title="Crear o resetear credenciales de acceso (POST /socios/{id}/credenciales)"
                        >
                          🔑 Credenciales
                        </button>

                        {/* Test Turnstile Access */}
                        <Link
                          href={`/socios/torniquete?rut=${encodeURIComponent(s.rut_socio)}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 hover:border-cyan-500"
                          title="Validar acceso en torniquete (GET /socios/acceso/validar/...)"
                        >
                          🚪 Torniquete
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL: REGISTRAR NUEVO SOCIO (POST /socios/) ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400">POST /socios/</span>
                <h3 className="text-xl font-extrabold text-white">Registrar Nuevo Socio</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSocio} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    RUT del Socio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="18.765.432-K"
                    value={newSocio.rut_socio}
                    onChange={(e) =>
                      setNewSocio({ ...newSocio, rut_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSocio.fecha_nacimiento_socio}
                    onChange={(e) =>
                      setNewSocio({ ...newSocio, fecha_nacimiento_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Carlos Andrés Silva"
                  value={newSocio.nombre_completo_socio}
                  onChange={(e) =>
                    setNewSocio({ ...newSocio, nombre_completo_socio: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="socio@correo.cl"
                    value={newSocio.correo_socio}
                    onChange={(e) =>
                      setNewSocio({ ...newSocio, correo_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono Celular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+56 9 1234 5678"
                    value={newSocio.telefono_socio}
                    onChange={(e) =>
                      setNewSocio({ ...newSocio, telefono_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sede de Registro *
                </label>
                <select
                  value={newSocio.id_sede_registro_socio}
                  onChange={(e) =>
                    setNewSocio({ ...newSocio, id_sede_registro_socio: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} — {s.nombre_ciudad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="promo_check"
                  checked={newSocio.acepta_promociones_socio}
                  onChange={(e) =>
                    setNewSocio({ ...newSocio, acepta_promociones_socio: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promo_check" className="text-xs text-slate-300 cursor-pointer">
                  Acepta recibir promociones y notificaciones del gimnasio
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <span className="animate-spin text-xs">🌀</span>}
                  <span>Guardar Socio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDITAR SOCIO (PUT /socios/{id}) ===== */}
      {editingSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-amber-400">
                  PUT /socios/{editingSocio.id_socio}
                </span>
                <h3 className="text-xl font-extrabold text-white">Editar Datos del Socio</h3>
                <p className="text-xs text-slate-400">RUT: {editingSocio.rut_socio}</p>
              </div>
              <button
                onClick={() => setEditingSocio(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSocio} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nombre_completo_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nombre_completo_socio: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.correo_socio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, correo_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.telefono_socio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, telefono_socio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sede de Registro
                </label>
                <select
                  value={editForm.id_sede_registro_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, id_sede_registro_socio: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} — {s.nombre_ciudad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="promo_edit_check"
                  checked={editForm.acepta_promociones_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, acepta_promociones_socio: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promo_edit_check" className="text-xs text-slate-300 cursor-pointer">
                  Acepta recibir promociones y novedades
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSocio(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {updating && <span className="animate-spin text-xs">🌀</span>}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: ASIGNAR CREDENCIALES (POST /socios/{id}/credenciales) ===== */}
      {credencialesSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-400">
                  POST /socios/{credencialesSocio.id_socio}/credenciales
                </span>
                <h3 className="text-xl font-extrabold text-white">Credenciales de Acceso</h3>
                <p className="text-xs text-slate-400">{credencialesSocio.nombre_completo_socio}</p>
              </div>
              <button
                onClick={() => setCredencialesSocio(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              💡 La contraseña se almacenará protegida mediante el estándar criptográfico nativo de SQL Server:
              <code className="block mt-1 font-mono text-[11px] bg-slate-950/80 p-1.5 rounded">
                HASHBYTES(&apos;SHA2_512&apos;, @password)
              </code>
            </div>

            <form onSubmit={handleSaveCredenciales} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de Usuario (username_usuario) *
                </label>
                <input
                  type="text"
                  required
                  min={3}
                  value={credForm.username_usuario}
                  onChange={(e) =>
                    setCredForm({ ...credForm, username_usuario: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nueva Contraseña (mínimo 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={credForm.password}
                  onChange={(e) =>
                    setCredForm({ ...credForm, password: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCredencialesSocio(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCred}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCred && <span className="animate-spin text-xs">🌀</span>}
                  <span>Guardar Credenciales</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
