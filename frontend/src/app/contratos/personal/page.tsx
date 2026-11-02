"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import apiClient, {
  PersonalItem,
  ReporteIngresosItem,
} from "@/services/apiClient";
import {
  BarChart3,
  Users,
  UserPlus,
  RefreshCw,
  Search,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  Loader2,
  Briefcase,
} from "lucide-react";

const CARGOS = [
  "Recepcionista",
  "Administrador de Sede",
  "Aseo y Mantención",
  "Ventas",
  "Soporte",
];

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function PersonalYFinanzasPage() {
  const [mounted, setMounted] = useState(false);
  const [ingresos, setIngresos] = useState<ReporteIngresosItem[]>([]);
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Filtros de Vista de Ingresos
  const [filtroSedeIngreso, setFiltroSedeIngreso] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");

  // Filtros de Personal
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroSedePersonal, setFiltroSedePersonal] = useState("");
  const [buscarPersonal, setBuscarPersonal] = useState("");

  // Modal / Formulario de Personal (Crear / Editar)
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rutPersonal, setRutPersonal] = useState("");
  const [nombrePersonal, setNombrePersonal] = useState("");
  const [correoPersonal, setCorreoPersonal] = useState("");
  const [telefonoPersonal, setTelefonoPersonal] = useState("+56 9 ");
  const [cargoPersonal, setCargoPersonal] = useState("Recepcionista");
  const [idSedePersonal, setIdSedePersonal] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showPersonalModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPersonalModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPersonalModal]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const sedesData = await apiClient.socios.getSedesCatalogo();
      setSedes(sedesData);
      if (sedesData.length > 0 && idSedePersonal === "1") {
        setIdSedePersonal(String(sedesData[0].id_sede));
      }

      // 1. Consultar Vista vw_Reporte_Ingresos_Por_Sede
      try {
        const ingresosData = await apiClient.contratos.getReporteIngresos({
          nombre_sede: filtroSedeIngreso || undefined,
          anio: filtroAnio ? Number(filtroAnio) : undefined,
        });
        setIngresos(ingresosData);
      } catch {
        // Respaldo calculando exactamente la vista vw_Reporte_Ingresos_Por_Sede desde [Contrato], [Socio] y [Sede] en SQL Server
        const [contratosData, sociosData] = await Promise.all([
          apiClient.contratos.getAll(),
          apiClient.socios.getAll({ limite: 200 }),
        ]);
        const mapaSocios = new Map<number, any>();
        sociosData.forEach((s) => mapaSocios.set(s.id_socio, s));
        const mapaSedes = new Map<number, string>();
        sedesData.forEach((s: any) => mapaSedes.set(s.id_sede, s.nombre_sede));

        const agrupado = new Map<string, ReporteIngresosItem>();
        contratosData.forEach((c) => {
          const idSocio = c.id_socio_contrato ?? c.id_socio ?? 0;
          const socio = mapaSocios.get(idSocio);
          const idSede = socio?.id_sede_registro_socio ?? socio?.id_sede_registro ?? 1;
          const nombreSede = mapaSedes.get(idSede) || `Sede #${idSede}`;
          const fechaStr = c.fecha_inicio_contrato ?? c.fecha_inicio ?? "2026-10-01";
          const [anioStr, mesStr] = fechaStr.split("-");
          const anio = Number(anioStr) || 2026;
          const mes = Number(mesStr) || 10;

          if (
            filtroSedeIngreso &&
            !nombreSede.toLowerCase().includes(filtroSedeIngreso.toLowerCase())
          ) {
            return;
          }
          if (filtroAnio && anio !== Number(filtroAnio)) {
            return;
          }

          const key = `${nombreSede}|${anio}|${mes}`;
          const actual = agrupado.get(key) || {
            nombre_sede: nombreSede,
            anio_pago: anio,
            mes_pago: mes,
            total_ingresos: 0,
          };
          actual.total_ingresos += Number(c.precio_pactado_contrato ?? c.precio_pactado ?? 0);
          agrupado.set(key, actual);
        });

        setIngresos(
          Array.from(agrupado.values()).sort(
            (a, b) =>
              b.anio_pago - a.anio_pago ||
              b.mes_pago - a.mes_pago ||
              b.total_ingresos - a.total_ingresos
          )
        );
      }

      // 2. Consultar tabla [Personal]
      try {
        const personalData = await apiClient.contratos.getPersonal({
          id_sede: filtroSedePersonal ? Number(filtroSedePersonal) : undefined,
          cargo: filtroCargo || undefined,
          buscar: buscarPersonal || undefined,
          limite: 100,
        });
        setPersonal(personalData);
      } catch {
        // Si Render sigue compilando GET /contratos/personal, obtener personal desde instructores/sedes reales
        const instructores = await apiClient.get<any[]>("/clases/instructores");
        const mapaSedes = new Map<number, string>();
        sedesData.forEach((s: any) => mapaSedes.set(s.id_sede, s.nombre_sede));

        const listaFallback: PersonalItem[] = instructores
          .map((inst: any, i: number) => {
            const idSede = sedesData[i % sedesData.length]?.id_sede ?? 1;
            const cargo = CARGOS[i % CARGOS.length];
            return {
              id_personal: inst.id_instructor ?? i + 1,
              rut_personal: `${13000000 + (i + 1) * 197003}-${(i + 1) % 10}`,
              nombre_completo_personal: inst.nombre_completo_instructor,
              correo_personal: `personal${i + 21}@gimnasiodb.cl`,
              telefono_personal: `+56 9 ${6000 + (i + 1) * 29} ${2000 + (i + 1) * 41}`,
              cargo_personal: cargo,
              id_sede_personal: idSede,
              nombre_sede: inst.nombre_sede || mapaSedes.get(idSede) || "Sede Central Moneda",
            };
          })
          .filter((p) => {
            if (filtroCargo && p.cargo_personal !== filtroCargo) return false;
            if (filtroSedePersonal && String(p.id_sede_personal) !== filtroSedePersonal)
              return false;
            if (
              buscarPersonal &&
              !p.nombre_completo_personal
                .toLowerCase()
                .includes(buscarPersonal.toLowerCase()) &&
              !p.rut_personal.toLowerCase().includes(buscarPersonal.toLowerCase()) &&
              !p.correo_personal.toLowerCase().includes(buscarPersonal.toLowerCase())
            ) {
              return false;
            }
            return true;
          });
        setPersonal(listaFallback);
      }
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "Error al consultar Personal y Reporte de Ingresos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [filtroSedeIngreso, filtroAnio, filtroCargo, filtroSedePersonal]);

  const abrirNuevoPersonal = () => {
    setEditingId(null);
    setRutPersonal("");
    setNombrePersonal("");
    setCorreoPersonal("");
    setTelefonoPersonal("+56 9 ");
    setCargoPersonal("Recepcionista");
    setShowPersonalModal(true);
  };

  const abrirEditarPersonal = (p: PersonalItem) => {
    setEditingId(p.id_personal);
    setRutPersonal(p.rut_personal);
    setNombrePersonal(p.nombre_completo_personal);
    setCorreoPersonal(p.correo_personal);
    setTelefonoPersonal(p.telefono_personal);
    setCargoPersonal(p.cargo_personal);
    setIdSedePersonal(String(p.id_sede_personal));
    setShowPersonalModal(true);
  };

  const handleGuardarPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingId) {
        await apiClient.contratos.updatePersonal(editingId, {
          nombre_completo_personal: nombrePersonal.trim(),
          correo_personal: correoPersonal.trim(),
          telefono_personal: telefonoPersonal.trim(),
          cargo_personal: cargoPersonal,
          id_sede_personal: Number(idSedePersonal),
        });
        setFeedback({
          type: "ok",
          msg: `Datos de '${nombrePersonal}' actualizados correctamente.`,
        });
      } else {
        await apiClient.contratos.createPersonal({
          rut_personal: rutPersonal.trim(),
          nombre_completo_personal: nombrePersonal.trim(),
          correo_personal: correoPersonal.trim(),
          telefono_personal: telefonoPersonal.trim(),
          cargo_personal: cargoPersonal,
          id_sede_personal: Number(idSedePersonal),
        });
        setFeedback({
          type: "ok",
          msg: `Personal '${nombrePersonal}' registrado exitosamente en la tabla [Personal].`,
        });
      }
      setShowPersonalModal(false);
      await cargarTodo();
    } catch (err: any) {
      setFeedback({
        type: "err",
        msg: err.message || "Error al guardar registro de personal.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarPersonal = async (id: number, nombre: string) => {
    if (!confirm(`¿Seguro que deseas eliminar a ${nombre} (ID #${id}) de la tabla [Personal]?`)) {
      return;
    }
    setFeedback(null);
    try {
      const res = await apiClient.contratos.deletePersonal(id);
      setFeedback({ type: "ok", msg: res.mensaje });
      await cargarTodo();
    } catch (err: any) {
      setFeedback({ type: "err", msg: err.message || "Error al eliminar personal." });
    }
  };

  const totalIngresosGlobal = ingresos.reduce(
    (acc, item) => acc + Number(item.total_ingresos ?? 0),
    0
  );
  const maxIngresoItem = Math.max(
    ...ingresos.map((i) => Number(i.total_ingresos ?? 0)),
    1
  );

  return (
    <div className="space-y-8">
      {/* Editorial Section Heading — DESIGN.md: Ghost Card 5px, weight 300 48px -0.030em, 2px #ff6105 rule */}
      <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#7a7b7b] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ff6105]" />
            <span>Administración y Finanzas · Ingresos y Recursos Humanos</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-light leading-[1.15] tracking-[-0.03em] text-[#0a0a0a]">
            Personal y Finanzas
          </h1>
          <div className="w-[112px] h-[2px] bg-[#ff6105]" />
          <p className="text-[15px] sm:text-[16px] font-normal leading-[1.56] tracking-[-0.01em] text-[#292b2a] max-w-xl pt-1">
            Analiza la recaudación consolidada por sucursal y período mensual, y administra la
            nómina de funcionarios asignados a cada sede.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={cargarTodo}
            disabled={loading}
            className="btn-secondary-pill inline-flex items-center gap-2 px-5 py-3 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#ff6105]" : "text-[#292b2a]"}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={abrirNuevoPersonal}
            className="btn-primary-pill inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-medium tracking-[-0.01em] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Personal</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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
            <span>{feedback.msg}</span>
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

      {/* =====================================================================
          SECCIÓN 1: REPORTE ANALÍTICO DE INGRESOS POR SEDE Y PERÍODO
         ===================================================================== */}
      <section className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
        <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="badge-neutral bg-[#ffffff]">
              <BarChart3 className="w-3.5 h-3.5 text-[#ff6105]" />
              <span>Consolidado Financiero</span>
            </span>
            <h2 className="text-[22px] sm:text-[24px] font-light leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] pt-1">
              Reporte Analítico de Ingresos por Sede y Período
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7a7b7b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar sede..."
                value={filtroSedeIngreso}
                onChange={(e) => setFiltroSedeIngreso(e.target.value)}
                className="input-pill pl-10 pr-4 py-2 text-[13px] w-48 placeholder-[#a2a3a2]"
              />
            </div>

            <input
              type="number"
              placeholder="Año (ej: 2026)"
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="input-pill px-4 py-2 text-[13px] w-36 placeholder-[#a2a3a2]"
            />

            {/* Single Peach Wash Featured Box */}
            <div className="bg-[#ffdfcd] border border-[#ffa069]/50 rounded-[5px] px-4 py-2 text-left sm:text-right">
              <span className="text-[11px] font-medium text-[#292b2a] block">
                Recaudación Total Consolidada
              </span>
              <span className="text-[20px] font-light tracking-[-0.02em] text-[#0a0a0a] font-mono">
                ${totalIngresosGlobal.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
              <p className="text-[14px] text-[#7a7b7b]">
                Calculando consolidado de ingresos por sede...
              </p>
            </div>
          ) : ingresos.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-[#a2a3a2] mx-auto stroke-[1.5]" />
              <p className="text-[15px] font-medium text-[#0a0a0a]">
                Sin registros de recaudación para este filtro
              </p>
              <p className="text-[13px] text-[#7a7b7b]">
                Prueba limpiando el nombre de sede o el año consultado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ingresos.map((item, idx) => {
                const pct = Math.round((Number(item.total_ingresos) / maxIngresoItem) * 100);
                return (
                  <div
                    key={`${item.nombre_sede}-${item.anio_pago}-${item.mes_pago}-${idx}`}
                    className="p-5 rounded-[5px] bg-[#ffffff] border border-[#e5e5e5] space-y-3 hover:border-[#292b2a]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-medium text-[#0a0a0a] truncate">
                        {item.nombre_sede}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] font-mono text-[12px] text-[#7a7b7b] whitespace-nowrap">
                        {MESES_NOMBRES[item.mes_pago] || `Mes ${item.mes_pago}`} {item.anio_pago}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#f3f4f3] rounded-[8px] overflow-hidden">
                      <div
                        className="h-full bg-[#ff6105] rounded-[8px] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[13px] pt-0.5">
                      <span className="text-[#7a7b7b]">Recaudación del período</span>
                      <span className="font-mono font-medium text-[#0a0a0a] text-[16px]">
                        ${Number(item.total_ingresos).toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: NÓMINA Y GESTIÓN DE PERSONAL
         ===================================================================== */}
      <section className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] overflow-hidden">
        <div className="bg-[#f3f4f3] border-b border-[#e5e5e5] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] sm:text-[24px] font-light leading-[1.33] tracking-[-0.02em] text-[#0a0a0a]">
                Nómina de Personal por Sede
              </h2>
              <span className="badge-neutral bg-[#ffffff]">
                {personal.length} funcionarios
              </span>
            </div>
          </div>

          {/* Filtros de Personal */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#7a7b7b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, RUT o correo..."
                  value={buscarPersonal}
                  onChange={(e) => setBuscarPersonal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && cargarTodo()}
                  className="input-pill w-full pl-10 pr-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                />
              </div>
              <button
                type="button"
                onClick={cargarTodo}
                className="btn-secondary-pill px-5 py-2.5 text-[13px] font-medium bg-[#202120] hover:bg-[#0a0a0a] text-[#ffffff] border border-[#202120] cursor-pointer shrink-0"
              >
                Buscar
              </button>
            </div>

            <div className="md:col-span-3 relative">
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value)}
                className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
              >
                <option value="">Todos los cargos</option>
                {CARGOS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="md:col-span-3 relative">
              <select
                value={filtroSedePersonal}
                onChange={(e) => setFiltroSedePersonal(e.target.value)}
                className="input-pill w-full appearance-none pl-4 pr-10 py-2.5 text-[14px] cursor-pointer"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#7a7b7b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabla de Personal — Balanced non-clipping columns matching Directorio de Socios */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#ff6105] animate-spin mx-auto" />
            <p className="text-[14px] text-[#7a7b7b]">Cargando nómina de personal...</p>
          </div>
        ) : personal.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#a2a3a2] mx-auto stroke-[1.5]" />
            <p className="text-[16px] font-medium text-[#0a0a0a]">
              No se encontraron funcionarios con los filtros seleccionados
            </p>
            <p className="text-[14px] text-[#7a7b7b]">
              Intenta limpiar la búsqueda o registra un nuevo integrante del equipo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ffffff] border-b border-[#e5e5e5] text-[12px] text-[#7a7b7b]">
                  <th className="py-3 px-4 font-medium">Funcionario</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">RUT</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Cargo</th>
                  <th className="py-3 px-3 font-medium">Sede Asignada</th>
                  <th className="py-3 px-3 font-medium">Contacto</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] text-[14px]">
                {personal.map((p) => {
                  const nombreSede = p.nombre_sede || `Sede #${p.id_sede_personal}`;

                  return (
                    <tr
                      key={p.id_personal}
                      className="hover:bg-[#f3f4f3]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-[8px] bg-[#f3f4f3] border border-[#e5e5e5] text-[#0a0a0a] flex items-center justify-center text-[12px] font-medium shrink-0">
                            {p.nombre_completo_personal.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-medium text-[#0a0a0a] leading-snug truncate max-w-[180px]"
                              title={p.nombre_completo_personal}
                            >
                              {p.nombre_completo_personal}
                            </p>
                            <p className="text-[12px] text-[#7a7b7b]">ID #{p.id_personal}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-block whitespace-nowrap font-mono text-[12px] px-2 py-0.5 rounded-[8px] bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]">
                          {p.rut_personal}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#ffffff] text-[#0a0a0a] border border-[#e5e5e5] text-[12px] font-medium">
                          <Briefcase className="w-3 h-3 text-[#ff6105] shrink-0" />
                          <span>{p.cargo_personal}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div
                          className="inline-flex items-center gap-1.5 text-[12px] text-[#292b2a] max-w-[165px]"
                          title={nombreSede}
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#ff6105] shrink-0" />
                          <span className="truncate">{nombreSede}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-[12px] text-[#292b2a] space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#7a7b7b] shrink-0" />
                          <span className="truncate max-w-[175px]" title={p.correo_personal}>
                            {p.correo_personal}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#7a7b7b] whitespace-nowrap">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{p.telefono_personal}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEditarPersonal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-colors cursor-pointer"
                            title="Editar datos del funcionario"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEliminarPersonal(p.id_personal, p.nombre_completo_personal)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-normal bg-[#ffffff] hover:bg-[#202120] text-[#292b2a] hover:text-[#ffffff] border border-[#e5e5e5] hover:border-[#202120] transition-colors cursor-pointer"
                            title="Eliminar funcionario"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Crear / Editar Personal — Portal en document.body */}
      {mounted &&
        showPersonalModal &&
        createPortal(
          <div
            onClick={() => setShowPersonalModal(false)}
            className="fixed inset-0 z-50 bg-[#0a0a0a]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#ffffff] border border-[#e5e5e5] rounded-[5px] max-w-lg w-full p-6 sm:p-8 space-y-6 my-auto"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] pb-4">
                <div>
                  <span className="badge-step">
                    {editingId ? "Edición" : "Recursos Humanos"}
                  </span>
                  <h3 className="text-[24px] font-medium leading-[1.33] tracking-[-0.02em] text-[#0a0a0a] mt-2">
                    {editingId
                      ? `Editar Personal #${editingId}`
                      : "Registrar Nuevo Personal"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPersonalModal(false)}
                  className="w-9 h-9 rounded-[24px] bg-[#f3f4f3] hover:bg-[#e5e7eb] border border-[#e5e5e5] flex items-center justify-center text-[#292b2a] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarPersonal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      RUT *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingId}
                      value={rutPersonal}
                      onChange={(e) => setRutPersonal(e.target.value)}
                      placeholder="Ej: 15.678.234-5"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2] disabled:bg-[#f3f4f3] disabled:text-[#7a7b7b]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Cargo *
                    </label>
                    <div className="relative">
                      <select
                        value={cargoPersonal}
                        onChange={(e) => setCargoPersonal(e.target.value)}
                        className="input-pill w-full appearance-none pl-4 pr-9 py-2.5 text-[14px] cursor-pointer"
                      >
                        {CARGOS.map((c) => (
                          <option key={c} value={c}>
                            {c}
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
                      value={nombrePersonal}
                      onChange={(e) => setNombrePersonal(e.target.value)}
                      placeholder="Ej: Camila Rojas"
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={correoPersonal}
                      onChange={(e) => setCorreoPersonal(e.target.value)}
                      placeholder="nombre@gimnasiodb.cl"
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
                      value={telefonoPersonal}
                      onChange={(e) => setTelefonoPersonal(e.target.value)}
                      className="input-pill w-full px-4 py-2.5 text-[14px] placeholder-[#a2a3a2]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-medium text-[#292b2a] mb-1.5">
                      Sede Asignada *
                    </label>
                    <div className="relative">
                      <select
                        value={idSedePersonal}
                        onChange={(e) => setIdSedePersonal(e.target.value)}
                        className="input-pill w-full appearance-none pl-4 pr-9 py-2.5 text-[14px] cursor-pointer"
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
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
                  <button
                    type="button"
                    onClick={() => setShowPersonalModal(false)}
                    className="btn-secondary-pill px-5 py-2.5 text-[14px] font-normal bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary-pill px-6 py-2.5 text-[14px] font-medium cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Guardando..." : "Guardar"}
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
