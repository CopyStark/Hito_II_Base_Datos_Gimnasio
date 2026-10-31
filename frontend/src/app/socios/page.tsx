"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient, { Socio } from "@/services/apiClient";
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Search,
  RefreshCw,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Edit2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface SedeCatalogoItem {
  id_sede: number;
  nombre_sede: string;
  direccion_calle_sede?: string;
  telefono_sede?: string;
  nombre_ciudad?: string;
}

function SociosGestionContent() {
  const searchParams = useSearchParams();
  const initialSede = searchParams.get("id_sede") || "";

  const [mounted, setMounted] = useState(false);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [sedes, setSedes] = useState<SedeCatalogoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [buscar, setBuscar] = useState<string>("");
  const [filtroSede, setFiltroSede] = useState<string>(initialSede);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");

  // Modal Crear / Editar Socio
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedSocioId, setSelectedSocioId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    rut_socio: "",
    nombre_completo_socio: "",
    correo_socio: "",
    telefono_socio: "",
    fecha_nacimiento_socio: "1998-05-15",
    id_sede_registro_socio: 1,
    acepta_promociones_socio: true,
    activo_socio: true,
  });

  // Modal Asignar Credenciales
  const [credModalOpen, setCredModalOpen] = useState<boolean>(false);
  const [credSocio, setCredSocio] = useState<Socio | null>(null);
  const [credUsername, setCredUsername] = useState<string>("");
  const [credPassword, setCredPassword] = useState<string>("");
  const [credSubmitting, setCredSubmitting] = useState<boolean>(false);
  const [credError, setCredError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialSede) {
      setFiltroSede(initialSede);
    }
  }, [initialSede]);

  // Bloquear scroll del body y permitir cerrar con Escape cuando hay modal abierto
  useEffect(() => {
    const anyModalOpen = modalOpen || credModalOpen;
    if (!anyModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setCredModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, credModalOpen]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sociosData, sedesData] = await Promise.all([
        apiClient.socios.getAll({
          buscar: buscar.trim() || undefined,
          id_sede: filtroSede ? Number(filtroSede) : undefined,
          activo:
            filtroEstado === "activos"
              ? true
              : filtroEstado === "inactivos"
              ? false
              : undefined,
          limite: 200,
        }),
        apiClient.socios.getSedesCatalogo().catch(() => []),
      ]);
      setSocios(Array.isArray(sociosData) ? sociosData : []);
      if (Array.isArray(sedesData) && sedesData.length > 0) {
        setSedes(sedesData);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [buscar, filtroSede, filtroEstado]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Mapa rápido de sedes por ID
  const sedesMap = useMemo(() => {
    const map: Record<number, string> = {};
    sedes.forEach((s) => {
      map[s.id_sede] = s.nombre_sede;
    });
    return map;
  }, [sedes]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = socios.length;
    const activos = socios.filter((s) => (s.activo_socio ?? s.activo) !== false).length;
    const inactivos = total - activos;
    return { total, activos, inactivos };
  }, [socios]);

  // Abrir modal para Nuevo Socio
  const handleOpenCrear = () => {
    setEditMode(false);
    setSelectedSocioId(null);
    setModalError(null);
    setFormData({
      rut_socio: "",
      nombre_completo_socio: "",
      correo_socio: "",
      telefono_socio: "+56 9 ",
      fecha_nacimiento_socio: "1998-05-15",
      id_sede_registro_socio: filtroSede ? Number(filtroSede) : sedes[0]?.id_sede || 1,
      acepta_promociones_socio: true,
      activo_socio: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para Editar Socio
  const handleOpenEditar = (socio: Socio) => {
    setEditMode(true);
    setSelectedSocioId(socio.id_socio);
    setModalError(null);
    setFormData({
      rut_socio: socio.rut_socio ?? socio.rut ?? "",
      nombre_completo_socio: socio.nombre_completo_socio ?? socio.nombre_completo ?? "",
      correo_socio: socio.correo_socio ?? socio.correo ?? "",
      telefono_socio: socio.telefono_socio ?? socio.telefono ?? "",
      fecha_nacimiento_socio: socio.fecha_nacimiento_socio
        ? String(socio.fecha_nacimiento_socio).slice(0, 10)
        : "1998-05-15",
      id_sede_registro_socio:
        socio.id_sede_registro_socio ?? socio.id_sede_registro ?? sedes[0]?.id_sede ?? 1,
      acepta_promociones_socio:
        (socio.acepta_promociones_socio ?? socio.acepta_promociones) !== false,
      activo_socio: (socio.activo_socio ?? socio.activo) !== false,
    });
    setModalOpen(true);
  };

  // Guardar Crear / Actualizar Socio
  const handleSubmitSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setFeedback(null);
    try {
      if (editMode && selectedSocioId) {
        const res = await apiClient.socios.update(selectedSocioId, {
          nombre_completo_socio: formData.nombre_completo_socio.trim(),
          correo_socio: formData.correo_socio.trim(),
          telefono_socio: formData.telefono_socio.trim(),
          id_sede_registro_socio: Number(formData.id_sede_registro_socio),
          acepta_promociones_socio: formData.acepta_promociones_socio,
        });
        const socioOriginal = socios.find((s) => s.id_socio === selectedSocioId);
        const activoOriginal = (socioOriginal?.activo_socio ?? socioOriginal?.activo) !== false;
        if (socioOriginal && activoOriginal !== formData.activo_socio) {
          await apiClient.socios.cambiarEstado(selectedSocioId, formData.activo_socio);
        }
        setFeedback({
          type: "ok",
          text: `Socio #${res.id_socio || selectedSocioId} actualizado correctamente.`,
        });
      } else {
        const res = await apiClient.socios.create({
          rut_socio: formData.rut_socio.trim(),
          nombre_completo_socio: formData.nombre_completo_socio.trim(),
          fecha_nacimiento_socio: formData.fecha_nacimiento_socio,
          correo_socio: formData.correo_socio.trim(),
          telefono_socio: formData.telefono_socio.trim(),
          id_sede_registro_socio: Number(formData.id_sede_registro_socio),
          acepta_promociones_socio: formData.acepta_promociones_socio,
          activo_socio: true,
        });
        setFeedback({
          type: "ok",
          text: `Socio registrado exitosamente (ID #${res.id_socio}).`,
        });
      }
      setModalOpen(false);
      await cargarDatos();
    } catch (err: any) {
      setModalError(err.message || "Error al guardar los datos del socio.");
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar estado activo/inactivo directamente
  const handleToggleEstado = async (socio: Socio) => {
    const id = socio.id_socio;
    if (!id) return;
    const estadoActual = (socio.activo_socio ?? socio.activo) !== false;
    try {
      await apiClient.socios.cambiarEstado(id, !estadoActual);
      setFeedback({
        type: "ok",
        text: `Socio #${id} marcado como ${!estadoActual ? "Activo" : "Inactivo"}.`,
      });
      await cargarDatos();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "No se pudo cambiar el estado del socio.",
      });
    }
  };

  // Abrir modal para Asignar Credenciales
  const handleOpenCredenciales = (socio: Socio) => {
    setCredSocio(socio);
    setCredUsername(`socio${socio.id_socio}`);
    setCredPassword("");
    setCredError(null);
    setCredModalOpen(true);
  };

  const handleSubmitCredenciales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credSocio?.id_socio) return;
    setCredSubmitting(true);
    setCredError(null);
    setFeedback(null);
    try {
      const res = await apiClient.socios.asignarCredenciales(credSocio.id_socio, {
        username_usuario: credUsername.trim(),
        password: credPassword,
      });
      setFeedback({
        type: "ok",
        text:
          res.mensaje ||
          `Credenciales configuradas para @${res.username_usuario || credUsername}.`,
      });
      setCredModalOpen(false);
    } catch (err: any) {
      setCredError(err.message || "Error al asignar credenciales al socio.");
    } finally {
      setCredSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Padrón de Socios · Administración</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Directorio de Socios
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Gestiona la inscripción de nuevos afiliados, actualiza sus datos de contacto,
            administra el estado de sus cuentas y habilita sus credenciales de acceso.
          </p>
        </div>

        {/* Actions — DESIGN.md: Secondary 24px radius (no shadow) + Primary 50px pill with orange glow */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#ff6105]" : "text-[#292b2a]"}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCrear}
            className="btn-primary-pill inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-medium tracking-[-0.01em] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Socio</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner — DESIGN.md: Monochrome + Peach Wash / Charcoal (no secondary hues) */}
      {feedback && (
        <div
          className={`p-4 rounded-[5px] border flex items-center justify-between text-[14px] animate-fade-in-scale ${
            feedback.type === "ok"
              ? "bg-[#ffdfcd] border-[#ffa069]/50 text-[#0a0a0a]"
              : "bg-[#202120] border-[#3c3e3d] text-[#ffffff]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-[#ff6105] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="opacity-70 hover:opacity-100 px-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Ghost Cards — DESIGN.md: #ffffff, 1px #e5e5e5, 5px radius, no shadow, monochrome + orange */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Socios Listados</p>
            <Users className="w-4 h-4 text-[#292b2a]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {stats.total}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Registros según filtros</p>
        </div>

        <div className="bg-[#ffdfcd] border border-[#ffa069]/40 rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#292b2a] font-medium">Socios Activos</p>
            <UserCheck className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {stats.activos}
          </p>
          <p className="text-[12px] text-[#292b2a] mt-1">Habilitados en el sistema</p>
        </div>

        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Socios Inactivos</p>
            <UserX className="w-4 h-4 text-[#7a7b7b]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {stats.inactivos}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Cuentas en pausa o baja</p>
        </div>

        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#7a7b7b] font-normal">Sedes Operativas</p>
            <Building2 className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-[32px] font-light leading-[1.22] tracking-[-0.02em] text-[#0a0a0a] mt-2">
            {sedes.length || "—"}
          </p>
          <p className="text-[12px] text-[#7a7b7b] mt-1">Sucursales disponibles</p>
        </div>
      </div>

      {/* Filter Bar — DESIGN.md: Linen #f3f4f3 surface, 50px pill inputs, 24px secondary filter toggles */}
      <div className="bg-[#f3f4f3] border border-[#dfe0df] rounded-[5px] p-5 flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <div>
            <label className="block text-[12px] text-[#292b2a] font-medium mb-1.5">
              Buscar por nombre, RUT o correo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#7a7b7b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Ej: 18.765.432-K, Daniel Matus o correo..."
                className="input-pill w-full pl-10 pr-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-[#292b2a] font-medium mb-1.5">
              Filtrar por sede
            </label>
            <div className="relative">
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede} {s.nombre_ciudad ? `(${s.nombre_ciudad})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Estado (24px Secondary Radius) */}
        <div className="flex items-center gap-1 bg-[#ffffff] p-1 rounded-[24px] border border-[#e5e5e5] self-start lg:self-auto shrink-0">
          {(["todos", "activos", "inactivos"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3.5 py-1.5 rounded-[24px] text-[13px] capitalize transition-colors cursor-pointer ${
                filtroEstado === est
                  ? "bg-[#202120] text-[#ffffff] font-medium"
                  : "text-[#7a7b7b] font-normal hover:text-[#0a0a0a]"
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Socios Table — Compact balanced columns so 100% fits within 1200px without right-side clipping */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
            <p className="text-[14px] text-[#7a7b7b]">Cargando directorio de socios...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-10 text-center space-y-4">
            <p className="text-[14px] text-[#0a0a0a] font-medium">{errorMsg}</p>
            <button
              type="button"
              onClick={cargarDatos}
              className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : socios.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#a2a3a2] mx-auto stroke-[1.5]" />
            <p className="text-[16px] font-medium text-[#0a0a0a]">
              No se encontraron socios con los filtros seleccionados
            </p>
            <p className="text-[14px] text-[#7a7b7b]">
              Intenta limpiar la búsqueda o registra un nuevo socio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f3f4f3] border-b border-[#e5e5e5] text-[12px] text-[#7a7b7b]">
                  <th className="py-3 px-4 font-medium">Socio</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">RUT</th>
                  <th className="py-3 px-3 font-medium">Contacto</th>
                  <th className="py-3 px-3 font-medium">Sede</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] text-[14px]">
                {socios.map((s) => {
                  const id = s.id_socio;
                  const rut = s.rut_socio ?? s.rut ?? "—";
                  const nombreCompleto =
                    s.nombre_completo_socio ?? s.nombre_completo ?? `Socio #${id}`;
                  const correo = s.correo_socio ?? s.correo ?? "—";
                  const telefono = s.telefono_socio ?? s.telefono ?? "—";
                  const idSede = s.id_sede_registro_socio ?? s.id_sede_registro ?? 1;
                  const nombreSede = sedesMap[idSede] || `Sede #${idSede}`;
                  const activo = (s.activo_socio ?? s.activo) !== false;

                  return (
                    <tr
                      key={id}
                      className="hover:bg-[#f3f4f3]/50 transition-colors"
                    >
                      {/* Socio */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center text-[12px] font-medium shrink-0">
                            {nombreCompleto.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#0a0a0a] leading-snug truncate max-w-[180px]" title={nombreCompleto}>
                              {nombreCompleto}
                            </p>
                            <p className="text-[12px] text-[#7a7b7b]">ID #{id}</p>
                          </div>
                        </div>
                      </td>

                      {/* RUT — una sola línea garantizada, sin desborde */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block whitespace-nowrap font-mono text-[12px] px-2 py-0.5 rounded-[8px] bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]">
                          {rut}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-3 text-[12px] text-[#292b2a] space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#7a7b7b] shrink-0" />
                          <span className="truncate max-w-[175px]" title={correo}>
                            {correo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#7a7b7b] whitespace-nowrap">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{telefono}</span>
                        </div>
                      </td>

                      {/* Sede */}
                      <td className="py-3.5 px-3">
                        <div
                          className="inline-flex items-center gap-1.5 text-[12px] text-[#292b2a] max-w-[165px]"
                          title={nombreSede}
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                          <span className="truncate">{nombreSede}</span>
                        </div>
                      </td>

                      {/* Estado — DESIGN.md: Monochrome + Orange dot (8px small-button radius) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(s)}
                          title="Clic para cambiar estado"
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-[8px] text-[12px] border transition-colors cursor-pointer ${
                            activo
                              ? "bg-[#ffffff] text-[#0a0a0a] font-medium border-[#e5e5e5] hover:border-[#ff6105]"
                              : "bg-[#f3f4f3] text-[#7a7b7b] font-normal border-[#e5e5e5] hover:border-[#292b2a]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activo ? "bg-[#ff6105]" : "bg-[#a2a3a2]"
                            }`}
                          />
                          <span>{activo ? "Activo" : "Inactivo"}</span>
                        </button>
                      </td>

                      {/* Acciones — DESIGN.md: buttons-small 8px radius, compact fit */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditar(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-colors cursor-pointer"
                            title="Editar datos del socio"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCredenciales(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-normal bg-[#ffffff] hover:bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5] transition-colors cursor-pointer"
                            title="Asignar usuario y contraseña"
                          >
                            <KeyRound className="w-3 h-3 text-[#ff6105]" />
                            <span>Clave</span>
                          </button>

                          <Link
                            href={`/socios/torniquete?identificador=${encodeURIComponent(rut)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium bg-[#202120] hover:bg-[#0a0a0a] text-[#ffffff] transition-colors"
                            title="Validar acceso en torniquete"
                          >
                            <ShieldCheck className="w-3 h-3 text-[#ff6105]" />
                            <span>Acceso</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Socio — Portal en document.body, DESIGN.md 5px card + 50px inputs + 24px/50px buttons */}
      {mounted &&
        modalOpen &&
        createPortal(
          <div
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#0a0a0a]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] max-w-lg w-full p-6 sm:p-8 space-y-6 my-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
                <div>
                  <span className="badge-step">
                    {editMode ? "Edición" : "Registro"}
                  </span>
                  <h3 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] mt-2">
                    {editMode ? `Editar Socio #${selectedSocioId}` : "Registrar Nuevo Socio"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] flex items-center justify-center text-[#292b2a] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3.5 rounded-[5px] bg-[#202120] text-[#ffffff] text-[13px] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSocio} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      RUT del Socio *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={editMode}
                      value={formData.rut_socio}
                      onChange={(e) =>
                        setFormData({ ...formData, rut_socio: e.target.value })
                      }
                      placeholder="Ej: 19.456.789-0"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2] disabled:bg-[#f3f4f3] disabled:text-[#7a7b7b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Sede Asignada *
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={formData.id_sede_registro_socio}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            id_sede_registro_socio: Number(e.target.value),
                          })
                        }
                        className="input-pill w-full appearance-none pl-4 pr-9 py-2.5 text-[14px]"
                      >
                        {sedes.map((s) => (
                          <option key={s.id_sede} value={s.id_sede}>
                            {s.nombre_sede}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre_completo_socio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nombre_completo_socio: e.target.value,
                        })
                      }
                      placeholder="Ej: Valentina Soto Muñoz"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.correo_socio}
                      onChange={(e) =>
                        setFormData({ ...formData, correo_socio: e.target.value })
                      }
                      placeholder="socio@gimnasiodb.cl"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Teléfono *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.telefono_socio}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono_socio: e.target.value })
                      }
                      placeholder="+56 9 8765 4321"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                    />
                  </div>

                  {!editMode ? (
                    <div>
                      <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                        Fecha de Nacimiento *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.fecha_nacimiento_socio}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fecha_nacimiento_socio: e.target.value,
                          })
                        }
                        className="input-pill w-full px-4 py-2.5 text-[14px]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                        Estado del Socio
                      </label>
                      <div className="relative">
                        <select
                          value={formData.activo_socio ? "true" : "false"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              activo_socio: e.target.value === "true",
                            })
                          }
                          className="input-pill w-full appearance-none pl-4 pr-9 py-2.5 text-[14px]"
                        >
                          <option value="true">Activo</option>
                          <option value="false">Inactivo</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary-pill px-5 py-2.5 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer disabled:opacity-50"
                  >
                    {submitting
                      ? "Guardando..."
                      : editMode
                      ? "Guardar Cambios"
                      : "Registrar Socio"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Asignar Credenciales — Portal en document.body, DESIGN.md compliant */}
      {mounted &&
        credModalOpen &&
        credSocio &&
        createPortal(
          <div
            onClick={() => setCredModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#0a0a0a]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] max-w-md w-full p-6 sm:p-8 space-y-5 my-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
                <div>
                  <span className="badge-step">Credenciales</span>
                  <h3 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] mt-2">
                    Configurar Cuenta
                  </h3>
                  <p className="text-[13px] text-[#7a7b7b] mt-0.5">
                    {credSocio.nombre_completo_socio ?? credSocio.nombre_completo} (
                    {credSocio.rut_socio ?? credSocio.rut})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCredModalOpen(false)}
                  className="w-9 h-9 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] flex items-center justify-center text-[#292b2a] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {credError && (
                <div className="p-3.5 rounded-[5px] bg-[#202120] text-[#ffffff] text-[13px] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#ff6105] shrink-0" />
                  <span>{credError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCredenciales} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                    Nombre de Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={credUsername}
                    onChange={(e) => setCredUsername(e.target.value)}
                    placeholder="Ej: socio1"
                    className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={credPassword}
                    onChange={(e) => setCredPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                  />
                  <p className="text-[12px] text-[#7a7b7b] mt-1.5">
                    La contraseña se almacena cifrada de forma segura en la base de datos.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => setCredModalOpen(false)}
                    className="btn-secondary-pill px-5 py-2.5 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={credSubmitting}
                    className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer disabled:opacity-50"
                  >
                    {credSubmitting ? "Guardando..." : "Guardar Credenciales"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function SociosGestionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[14px] text-[#7a7b7b]">
          Cargando directorio de socios...
        </div>
      }
    >
      <SociosGestionContent />
    </Suspense>
  );
}
