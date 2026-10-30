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
        res = (await sociosApi.getById(Number(query))) as unknown as SocioDetail;
      } else {
        res = (await sociosApi.getByRut(query)) as unknown as SocioDetail;
      }
      setQuickLookupResult(res);
    } catch (err: any) {
      setQuickLookupError(
        err.status === 404
          ? `No se encontró ningún socio con el identificador "${query}".`
          : err.message || "Error al buscar socio en la base de datos."
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
        message: `¡Socio ${created.nombre_completo_socio || created.nombre_completo} registrado con éxito con ID #${created.id_socio}!`,
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
    const suggestedUser = s.correo_socio
      ? s.correo_socio.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "")
      : `socio${s.id_socio}`;
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
    <div className="space-y-12">
      {/* ===== Editorial Section Heading (amp: weight 300, negative tracking, 2px orange accent rule) ===== */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-step">
                Step 1 &bull; Gestión
              </span>
              <span className="badge-neutral">
                Persona 1 (Carlos)
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-amp-ink tracking-[-0.030em] leading-[1.15]">
              Directorio de Socios
            </h1>
            <div className="h-[2.5px] w-24 bg-amp-orange mt-3"></div>

            <p className="text-sm text-amp-carbon mt-3 max-w-2xl font-normal leading-relaxed">
              Administración integral de socios del gimnasio, control de estado activo/inactivo, asignación
              de credenciales con HASHBYTES SHA2_512 y enlace directo al torniquete de acceso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary-pill text-xs font-medium px-5 py-2.5 flex items-center gap-2"
            >
              <span>+</span>
              <span>Registrar Nuevo Socio</span>
            </button>

            <Link
              href="/socios/torniquete"
              className="btn-secondary-pill bg-amp-white hover:bg-amp-linen border border-amp-hairline text-amp-carbon text-xs font-normal px-4 py-2.5 flex items-center gap-2"
            >
              <span>Abrir Torniquete</span>
              <span>→</span>
            </Link>

            <button
              onClick={loadSocios}
              disabled={loading}
              className="btn-secondary-pill bg-amp-linen hover:bg-amp-bone border border-amp-hairline text-amp-carbon text-xs font-normal px-3 py-2.5 flex items-center justify-center"
              title="Recargar datos"
            >
              <span className={loading ? "animate-spin" : ""}>↻</span>
            </button>
          </div>
        </div>

        {/* Counter cards (amp: 5px radius, 1px hairline border, single Peach Wash featured card) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="card-ghost p-4">
            <span className="text-xs text-amp-slate font-normal block">Total Registrados</span>
            <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
              {totalSocios}
            </span>
          </div>

          {/* Featured Card (Peach Wash) — as designated in DESIGN.md: reserved for a single card per section */}
          <div className="card-peach p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amp-carbon font-medium">Socios Activos</span>
              <span className="w-2 h-2 rounded-full bg-amp-orange"></span>
            </div>
            <span className="text-2xl sm:text-3xl font-medium text-amp-ink tracking-tight mt-1 block">
              {sociosActivos}
            </span>
          </div>

          <div className="card-ghost p-4">
            <span className="text-xs text-amp-slate font-normal block">Socios Inactivos</span>
            <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
              {sociosInactivos}
            </span>
          </div>

          <div className="card-ghost p-4">
            <span className="text-xs text-amp-slate font-normal block">Sedes Conectadas</span>
            <span className="text-2xl sm:text-3xl font-light text-amp-ink tracking-tight mt-1 block">
              {sedes.length}
            </span>
          </div>
        </div>
      </section>

      {/* ===== Feedback Notification Toast ===== */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-[5px] text-xs font-normal border transition-all ${
            feedback.type === "success"
              ? "bg-amp-linen border-amp-orange text-amp-ink"
              : feedback.type === "error"
              ? "bg-[#fff2f0] border-[#ffccc7] text-amp-ink"
              : "bg-amp-linen border-amp-hairline text-amp-carbon"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amp-orange"></span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-amp-slate hover:text-amp-ink px-2 py-0.5 rounded-[24px] border border-amp-hairline bg-amp-white"
          >
            ✕ Cerrar
          </button>
        </div>
      )}

      {/* ===== Quick Lookup Card (Búsqueda Unitaria por RUT o ID) ===== */}
      <section className="card-ghost p-5 sm:p-6 space-y-4">
        <div>
          <span className="text-xs text-amp-orange font-medium uppercase tracking-wider">Consulta Unitaria</span>
          <h2 className="text-base font-medium text-amp-ink mt-0.5">
            Búsqueda Rápida en SQL Server (GET /socios/{`{id}`} o /socios/rut/{`{rut}`})
          </h2>
          <p className="text-xs text-amp-slate mt-1 font-normal">
            Consulte directamente los datos relacionales de un socio ingresando su identificador numérico o RUT completo.
          </p>
        </div>

        <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Ingrese ID (ej: 1) o RUT con o sin puntos (ej: 18.765.432-K)..."
            value={quickLookupQuery}
            onChange={(e) => setQuickLookupQuery(e.target.value)}
            className="input-pill flex-1 px-4 py-2.5 text-xs sm:text-sm font-normal placeholder-amp-ash"
          />
          <button
            type="submit"
            disabled={quickLookupLoading || !quickLookupQuery.trim()}
            className="btn-primary-pill text-xs font-medium px-6 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {quickLookupLoading ? (
              <span>Consultando...</span>
            ) : (
              <>
                <span>Consultar</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {quickLookupError && (
          <div className="p-3 rounded-[5px] bg-[#fff2f0] border border-[#ffccc7] text-xs text-amp-ink">
            {quickLookupError}
          </div>
        )}

        {quickLookupResult && (
          <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline text-xs text-amp-carbon flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-amp-ink">
                  {quickLookupResult.nombre_completo_socio}
                </span>
                <span className="badge-step text-[10px] py-0.5 px-2">
                  ID #{quickLookupResult.id_socio}
                </span>
                <span className="badge-neutral text-[10px] py-0.5 px-2">
                  {quickLookupResult.activo_socio ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-amp-slate font-normal">
                RUT: <strong className="text-amp-carbon font-medium">{quickLookupResult.rut_socio}</strong> &bull; Correo: <strong className="text-amp-carbon font-medium">{quickLookupResult.correo_socio}</strong> &bull; Teléfono: {quickLookupResult.telefono_socio}
              </p>
              <p className="text-amp-slate font-normal">
                Sede: <span className="text-amp-carbon font-medium">{getNombreSede(quickLookupResult.id_sede_registro_socio)}</span> &bull; Promociones: {quickLookupResult.acepta_promociones_socio ? "Sí" : "No"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleToggleEstado(quickLookupResult)}
                className="btn-secondary-pill px-3 py-1.5 bg-amp-white hover:bg-amp-bone border border-amp-hairline text-amp-carbon text-xs font-normal"
              >
                {quickLookupResult.activo_socio ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => handleOpenEdit(quickLookupResult)}
                className="btn-secondary-pill px-3 py-1.5 bg-amp-white hover:bg-amp-bone border border-amp-hairline text-amp-carbon text-xs font-normal"
              >
                Editar
              </button>
              <Link
                href={`/socios/torniquete?rut=${encodeURIComponent(quickLookupResult.rut_socio)}`}
                className="btn-primary-pill px-3 py-1.5 text-xs font-medium"
              >
                Probar en Torniquete →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ===== Main Filter & Search Bar ===== */}
      <section className="space-y-4">
        <div className="p-4 rounded-[5px] bg-amp-linen border border-amp-hairline flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search input (Pill 50px radius) */}
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amp-slate text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Filtrar por Nombre, RUT o Correo (GET /socios/?buscar=...)"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="input-pill w-full pl-10 pr-8 py-2 text-xs sm:text-sm font-normal placeholder-amp-ash"
            />
            {buscar && (
              <button
                onClick={() => setBuscar("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-amp-slate hover:text-amp-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tab buttons (24px secondary pills) */}
          <div className="flex items-center gap-1 bg-amp-white p-1 rounded-[24px] border border-amp-hairline">
            {(["todos", "activos", "inactivos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFiltroActivo(tab)}
                className={`px-3 py-1 rounded-[24px] text-xs capitalize transition-all ${
                  filtroActivo === tab
                    ? "bg-amp-orange text-amp-white font-medium"
                    : "text-amp-slate hover:text-amp-ink font-normal"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sede selector filter (24px pill) */}
          <div className="w-full md:w-56">
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="w-full px-3 py-2 rounded-[24px] bg-amp-white border border-amp-hairline text-xs font-normal text-amp-carbon focus:outline-none focus:border-amp-orange cursor-pointer"
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

        {/* ===== Socios Table (amp: 5px radius, 1px border #e5e5e5, white surface, Linen headers) ===== */}
        <div className="card-ghost overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-amp-slate space-y-3">
              <div className="w-6 h-6 border-2 border-amp-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-normal">Cargando directorio de socios desde SQL Server...</p>
            </div>
          ) : socios.length === 0 ? (
            <div className="p-16 text-center text-amp-slate space-y-2">
              <p className="text-sm font-medium text-amp-ink">
                No se encontraron socios con los filtros actuales.
              </p>
              <p className="text-xs font-normal text-amp-slate">
                Intente modificando el término de búsqueda o registre un nuevo socio.
              </p>
              <button
                onClick={() => {
                  setBuscar("");
                  setFiltroActivo("todos");
                  setFiltroSede("");
                }}
                className="btn-secondary-pill mt-3 text-xs px-3 py-1.5 bg-amp-linen border border-amp-hairline text-amp-carbon"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-amp-linen text-amp-slate uppercase text-[11px] tracking-wider border-b border-amp-hairline font-medium">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Socio</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Sede Registro</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amp-hairline">
                  {socios.map((s) => (
                    <tr
                      key={s.id_socio}
                      className="hover:bg-amp-linen/50 transition-colors"
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5 font-mono text-amp-slate text-xs">
                        #{s.id_socio}
                      </td>

                      {/* Socio Name + RUT */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-amp-ink">
                          {s.nombre_completo_socio}
                        </div>
                        <div className="text-xs font-mono text-amp-slate mt-0.5">
                          {s.rut_socio}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 text-xs font-normal">
                        <div className="text-amp-carbon flex items-center gap-1.5">
                          <span>✉</span>
                          <span className="truncate max-w-[180px]">{s.correo_socio}</span>
                        </div>
                        <div className="text-amp-slate mt-1 flex items-center gap-1.5">
                          <span>📞</span>
                          <span>{s.telefono_socio}</span>
                        </div>
                      </td>

                      {/* Sede */}
                      <td className="px-4 py-3.5 text-xs text-amp-carbon font-normal">
                        <span className="px-2.5 py-1 rounded-[8px] bg-amp-linen border border-amp-hairline">
                          {getNombreSede(s.id_sede_registro_socio)}
                        </span>
                      </td>

                      {/* State Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleEstado(s)}
                          disabled={updatingId === s.id_socio}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-medium border transition-all ${
                            s.activo_socio
                              ? "bg-amp-linen text-amp-ink border-amp-orange"
                              : "bg-amp-bone text-amp-slate border-amp-hairline"
                          }`}
                          title="Clic para alternar estado"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.activo_socio ? "bg-amp-orange" : "bg-amp-slate"
                            }`}
                          ></span>
                          <span>{s.activo_socio ? "Activo" : "Inactivo"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="btn-secondary-pill px-3 py-1 bg-amp-white hover:bg-amp-linen text-amp-carbon text-xs font-normal border border-amp-hairline"
                            title="Editar datos del socio"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleOpenCredenciales(s)}
                            className="btn-secondary-pill px-3 py-1 bg-amp-linen hover:bg-amp-bone text-amp-carbon text-xs font-normal border border-amp-hairline"
                            title="Asignar credenciales de acceso"
                          >
                            Credenciales
                          </button>

                          <Link
                            href={`/socios/torniquete?rut=${encodeURIComponent(s.rut_socio)}`}
                            className="btn-secondary-pill px-3 py-1 bg-amp-white hover:bg-amp-linen text-amp-orange hover:text-amp-orange text-xs font-medium border border-amp-orange"
                            title="Validar acceso en torniquete"
                          >
                            Torniquete →
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
      </section>

      {/* ===== MODAL: REGISTRAR NUEVO SOCIO (POST /socios/) ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amp-ink/50 backdrop-blur-sm animate-fade-in-scale">
          <div className="card-ghost bg-amp-white p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-amp-hairline pb-4">
              <div>
                <span className="badge-step text-[10px] py-0.5 px-2">POST /socios/</span>
                <h3 className="text-xl font-light text-amp-ink tracking-tight mt-1">Registrar Nuevo Socio</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-amp-slate hover:text-amp-ink text-sm p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSocio} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
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
                    className="input-pill w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSocio.fecha_nacimiento_socio}
                    onChange={(e) =>
                      setNewSocio({ ...newSocio, fecha_nacimiento_socio: e.target.value })
                    }
                    className="input-pill w-full px-3 py-2 text-xs text-amp-carbon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
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
                  className="input-pill w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
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
                    className="input-pill w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
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
                    className="input-pill w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
                  Sede de Registro *
                </label>
                <select
                  value={newSocio.id_sede_registro_socio}
                  onChange={(e) =>
                    setNewSocio({ ...newSocio, id_sede_registro_socio: Number(e.target.value) })
                  }
                  className="input-pill w-full px-3 py-2 text-xs"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} — {s.nombre_ciudad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo_check"
                  checked={newSocio.acepta_promociones_socio}
                  onChange={(e) =>
                    setNewSocio({ ...newSocio, acepta_promociones_socio: e.target.checked })
                  }
                  className="rounded border-amp-hairline text-amp-orange focus:ring-amp-orange w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promo_check" className="text-xs text-amp-slate cursor-pointer font-normal">
                  Acepta recibir promociones y notificaciones del gimnasio
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-amp-hairline">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary-pill px-4 py-2 bg-amp-linen border border-amp-hairline text-amp-carbon text-xs font-normal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary-pill px-5 py-2 text-xs font-medium flex items-center gap-2"
                >
                  {creating && <span>↻</span>}
                  <span>Guardar Socio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDITAR SOCIO (PUT /socios/{id}) ===== */}
      {editingSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amp-ink/50 backdrop-blur-sm animate-fade-in-scale">
          <div className="card-ghost bg-amp-white p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-amp-hairline pb-4">
              <div>
                <span className="badge-step text-[10px] py-0.5 px-2">
                  PUT /socios/{editingSocio.id_socio}
                </span>
                <h3 className="text-xl font-light text-amp-ink tracking-tight mt-1">Editar Datos del Socio</h3>
                <p className="text-xs text-amp-slate font-mono">RUT: {editingSocio.rut_socio}</p>
              </div>
              <button
                onClick={() => setEditingSocio(null)}
                className="text-amp-slate hover:text-amp-ink text-sm p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSocio} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nombre_completo_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nombre_completo_socio: e.target.value })
                  }
                  className="input-pill w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.correo_socio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, correo_socio: e.target.value })
                    }
                    className="input-pill w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amp-carbon mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.telefono_socio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, telefono_socio: e.target.value })
                    }
                    className="input-pill w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
                  Sede de Registro
                </label>
                <select
                  value={editForm.id_sede_registro_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, id_sede_registro_socio: Number(e.target.value) })
                  }
                  className="input-pill w-full px-3 py-2 text-xs"
                >
                  {sedes.map((s) => (
                    <option key={s.id_sede} value={s.id_sede}>
                      {s.nombre_sede} — {s.nombre_ciudad}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo_edit_check"
                  checked={editForm.acepta_promociones_socio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, acepta_promociones_socio: e.target.checked })
                  }
                  className="rounded border-amp-hairline text-amp-orange focus:ring-amp-orange w-4 h-4 cursor-pointer"
                />
                <label htmlFor="promo_edit_check" className="text-xs text-amp-slate cursor-pointer font-normal">
                  Acepta recibir promociones y novedades
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-amp-hairline">
                <button
                  type="button"
                  onClick={() => setEditingSocio(null)}
                  className="btn-secondary-pill px-4 py-2 bg-amp-linen border border-amp-hairline text-amp-carbon text-xs font-normal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary-pill px-5 py-2 text-xs font-medium flex items-center gap-2"
                >
                  {updating && <span>↻</span>}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: ASIGNAR CREDENCIALES (POST /socios/{id}/credenciales) ===== */}
      {credencialesSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amp-ink/50 backdrop-blur-sm animate-fade-in-scale">
          <div className="card-ghost bg-amp-white p-6 sm:p-8 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between border-b border-amp-hairline pb-4">
              <div>
                <span className="badge-step text-[10px] py-0.5 px-2">
                  POST /socios/{credencialesSocio.id_socio}/credenciales
                </span>
                <h3 className="text-xl font-light text-amp-ink tracking-tight mt-1">Credenciales de Acceso</h3>
                <p className="text-xs text-amp-slate font-medium">{credencialesSocio.nombre_completo_socio}</p>
              </div>
              <button
                onClick={() => setCredencialesSocio(null)}
                className="text-amp-slate hover:text-amp-ink text-sm p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-[5px] bg-amp-linen border border-amp-hairline text-xs text-amp-carbon font-normal">
              💡 La contraseña se almacenará protegida mediante el estándar criptográfico nativo de SQL Server:
              <code className="block mt-1 font-mono text-[11px] bg-amp-white border border-amp-hairline p-1.5 rounded-[5px] text-amp-orange">
                HASHBYTES(&apos;SHA2_512&apos;, @password)
              </code>
            </div>

            <form onSubmit={handleSaveCredenciales} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
                  Nombre de Usuario (username_usuario) *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={credForm.username_usuario}
                  onChange={(e) =>
                    setCredForm({ ...credForm, username_usuario: e.target.value })
                  }
                  className="input-pill w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amp-carbon mb-1">
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
                  className="input-pill w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-amp-hairline">
                <button
                  type="button"
                  onClick={() => setCredencialesSocio(null)}
                  className="btn-secondary-pill px-4 py-2 bg-amp-linen border border-amp-hairline text-amp-carbon text-xs font-normal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCred}
                  className="btn-primary-pill px-5 py-2 text-xs font-medium flex items-center gap-2"
                >
                  {savingCred && <span>↻</span>}
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
