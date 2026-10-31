"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
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
  nombre_region?: string;
}

export default function SociosGestionPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [sedes, setSedes] = useState<SedeCatalogoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [buscar, setBuscar] = useState<string>("");
  const [filtroSede, setFiltroSede] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");

  // Modal Crear / Editar Socio
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedSocioId, setSelectedSocioId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
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
    setFormData({
      rut_socio: "",
      nombre_completo_socio: "",
      correo_socio: "",
      telefono_socio: "+569",
      fecha_nacimiento_socio: "1998-05-15",
      id_sede_registro_socio: sedes[0]?.id_sede || 1,
      acepta_promociones_socio: true,
      activo_socio: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para Editar Socio
  const handleOpenEditar = (socio: Socio) => {
    setEditMode(true);
    setSelectedSocioId(socio.id_socio);
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
    setFeedback(null);
    try {
      if (editMode && selectedSocioId) {
        const res = await apiClient.socios.update(selectedSocioId, {
          nombre_completo_socio: formData.nombre_completo_socio.trim(),
          correo_socio: formData.correo_socio.trim(),
          telefono_socio: formData.telefono_socio.trim(),
          id_sede_registro_socio: Number(formData.id_sede_registro_socio),
          acepta_promociones_socio: formData.acepta_promociones_socio,
          activo_socio: formData.activo_socio,
        });
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
      setFeedback({
        type: "error",
        text: err.message || "Error al guardar los datos del socio.",
      });
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
    setCredModalOpen(true);
  };

  const handleSubmitCredenciales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credSocio?.id_socio) return;
    setCredSubmitting(true);
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
      setFeedback({
        type: "error",
        text: err.message || "Error al asignar credenciales al socio.",
      });
    } finally {
      setCredSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Padrón de Socios · Administración</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#0a0a0a]">
            Directorio de Socios
          </h1>
          <div className="w-20 h-[2px] bg-[#ff6105]" />
          <p className="text-sm text-[#7a7b7b] max-w-xl pt-1">
            Gestiona la inscripción de nuevos afiliados, actualiza sus datos de contacto,
            administra el estado de sus cuentas y habilita sus credenciales de acceso.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff6105]" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCrear}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Socio</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-[5px] border flex items-center justify-between text-xs sm:text-sm animate-fade-in-scale ${
            feedback.type === "ok"
              ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]"
              : "bg-[#fef2f2] border-[#fecaca] text-[#dc2626]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Ghost Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-[#ff6105]/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Socios Listados
            </p>
            <Users className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-3xl font-light text-[#0a0a0a] mt-2">{stats.total}</p>
          <p className="text-xs text-[#7a7b7b] mt-1">Registros según filtros activos</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Socios Activos
            </p>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-light text-emerald-600 mt-2">{stats.activos}</p>
          <p className="text-xs text-[#7a7b7b] mt-1">Habilitados en el sistema</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-rose-500/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Socios Inactivos
            </p>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-light text-rose-600 mt-2">{stats.inactivos}</p>
          <p className="text-xs text-[#7a7b7b] mt-1">Cuentas suspendidas o de baja</p>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 transition-all hover:border-[#ff6105]/30">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium">
              Sedes Operativas
            </p>
            <Building2 className="w-4 h-4 text-[#ff6105]" />
          </div>
          <p className="text-3xl font-light text-[#0a0a0a] mt-2">{sedes.length || "—"}</p>
          <p className="text-xs text-[#7a7b7b] mt-1">Sucursales disponibles</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-5 flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {/* Buscador por texto, RUT o correo */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium mb-1.5">
              Buscar por nombre, RUT o correo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#7a7b7b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Ej: 18.900.013-K, Fernanda o correo..."
                className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-full pl-10 pr-4 py-2 text-sm text-[#0a0a0a] placeholder-[#7a7b7b] focus:outline-none focus:border-[#ff6105] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Selector de Sede */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium mb-1.5">
              Filtrar por Sede
            </label>
            <div className="relative">
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="w-full appearance-none bg-[#f8f9f8] border border-[#e5e5e5] rounded-full pl-4 pr-9 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede} {s.nombre_ciudad ? `(${s.nombre_ciudad})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Estado (Pills) */}
        <div className="flex items-center gap-1.5 bg-[#f8f9f8] p-1 rounded-full border border-[#e5e5e5] self-start lg:self-auto">
          {(["todos", "activos", "inactivos"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                filtroEstado === est
                  ? "bg-white text-[#0a0a0a] shadow-xs border border-[#e5e5e5]"
                  : "text-[#7a7b7b] hover:text-[#0a0a0a]"
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Socios */}
      <div className="bg-white border border-[#e5e5e5] rounded-[5px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#ff6105] animate-spin mx-auto" />
            <p className="text-sm text-[#7a7b7b]">Cargando directorio de socios...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[#dc2626] font-medium">{errorMsg}</p>
            <button
              type="button"
              onClick={cargarDatos}
              className="px-4 py-2 rounded-full bg-[#ff6105] text-white text-xs font-medium cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : socios.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#7a7b7b] mx-auto stroke-[1.5]" />
            <p className="text-base font-medium text-[#0a0a0a]">
              No se encontraron socios con los filtros seleccionados
            </p>
            <p className="text-xs text-[#7a7b7b]">
              Intenta limpiar la búsqueda o registra un nuevo socio.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9f8] border-b border-[#e5e5e5] text-[11px] uppercase tracking-wider text-[#7a7b7b]">
                  <th className="py-3.5 px-5 font-medium">Socio</th>
                  <th className="py-3.5 px-4 font-medium">RUT</th>
                  <th className="py-3.5 px-4 font-medium">Contacto</th>
                  <th className="py-3.5 px-4 font-medium">Sede</th>
                  <th className="py-3.5 px-4 font-medium">Estado</th>
                  <th className="py-3.5 px-5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] text-sm">
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
                      className="hover:bg-[#f8f9f8]/80 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#ffdfcd] text-[#ff6105] flex items-center justify-center text-xs font-semibold shrink-0">
                            {nombreCompleto.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#0a0a0a]">
                              {nombreCompleto}
                            </p>
                            <p className="text-[11px] text-[#7a7b7b]">ID #{id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]">
                          {rut}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#292b2a] space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#7a7b7b] shrink-0" />
                          <span className="truncate max-w-[200px]">{correo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#7a7b7b]">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{telefono}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#f8f9f8] text-[#292b2a] border border-[#e5e5e5]">
                          <MapPin className="w-3 h-3 text-[#ff6105]" />
                          <span>{nombreSede}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(s)}
                          title="Clic para cambiar estado"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                            activo
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activo ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                          <span>{activo ? "Activo" : "Inactivo"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditar(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-colors cursor-pointer"
                            title="Editar datos del socio"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCredenciales(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-[#ffdfcd]/60 hover:bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/30 transition-colors cursor-pointer"
                            title="Asignar usuario y contraseña"
                          >
                            <KeyRound className="w-3 h-3 text-[#ff6105]" />
                            <span>Clave</span>
                          </button>

                          <Link
                            href={`/socios/torniquete?identificador=${encodeURIComponent(rut)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-[#0a0a0a] hover:bg-[#292b2a] text-white transition-colors"
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

      {/* Modal Crear / Editar Socio */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl animate-fade-in-scale">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#ff6105] font-medium">
                  {editMode ? "Actualización de Ficha" : "Inscripción de Socio"}
                </p>
                <h3 className="text-xl font-medium text-[#0a0a0a] mt-0.5">
                  {editMode ? `Editar Socio #${selectedSocioId}` : "Registrar Nuevo Socio"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] flex items-center justify-center text-[#292b2a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSocio} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#292b2a] mb-1">
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
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] disabled:opacity-60 focus:outline-none focus:border-[#ff6105] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292b2a] mb-1">
                    Sede Asignada *
                  </label>
                  <select
                    required
                    value={formData.id_sede_registro_socio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        id_sede_registro_socio: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                  >
                    {sedes.map((s) => (
                      <option key={s.id_sede} value={s.id_sede}>
                        {s.nombre_sede} {s.nombre_ciudad ? `(${s.nombre_ciudad})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#292b2a] mb-1">
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
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#292b2a] mb-1">
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
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292b2a] mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefono_socio}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono_socio: e.target.value })
                    }
                    placeholder="+56987654321"
                    className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                  />
                </div>

                {!editMode ? (
                  <div>
                    <label className="block text-xs font-medium text-[#292b2a] mb-1">
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
                      className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#292b2a] mb-1">
                      Estado del Socio
                    </label>
                    <select
                      value={formData.activo_socio ? "true" : "false"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          activo_socio: e.target.value === "true",
                        })
                      }
                      className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
        </div>
      )}

      {/* Modal Asignar Credenciales */}
      {credModalOpen && credSocio && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e5] rounded-[5px] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-xl animate-fade-in-scale">
            <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#ff6105] font-medium">
                  Credenciales de Acceso
                </p>
                <h3 className="text-xl font-medium text-[#0a0a0a] mt-0.5">
                  Configurar Cuenta de Socio
                </h3>
                <p className="text-xs text-[#7a7b7b] mt-0.5">
                  {credSocio.nombre_completo_socio ?? credSocio.nombre_completo} (
                  {credSocio.rut_socio ?? credSocio.rut})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCredModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] flex items-center justify-center text-[#292b2a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCredenciales} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#292b2a] mb-1">
                  Nombre de Usuario (Login) *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  placeholder="Ej: socio1"
                  className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292b2a] mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={credPassword}
                  onChange={(e) => setCredPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#f8f9f8] border border-[#e5e5e5] rounded-[5px] px-3.5 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#ff6105] focus:bg-white"
                />
                <p className="text-[11px] text-[#7a7b7b] mt-1.5">
                  La contraseña se almacena cifrada de forma segura en la base de datos.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setCredModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={credSubmitting}
                  className="px-5 py-2 rounded-full text-xs font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {credSubmitting ? "Guardando..." : "Guardar Credenciales"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
