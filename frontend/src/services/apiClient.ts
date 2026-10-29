/**
 * Cliente HTTP Base para la API de GimnasioDB (FastAPI)
 * 
 * REGLAS DE ARQUITECTURA:
 * 1. Arquitectura API-First: Este frontend NO tiene ninguna conexión directa a la base de datos SQL Server.
 * 2. Toda comunicación de datos se realiza a través de las rutas REST expuestas por FastAPI.
 * 3. Nomenclatura sincronizada con el nuevo DDL (sufijos por tabla en la BD) con soporte retrocompatible.
 */

// URL oficial del Backend en producción (Render)
export const RENDER_BACKEND_URL = "https://gimnasio-backend-c3mu.onrender.com";

/**
 * Obtiene la URL base del Backend FastAPI de forma dinámica.
 * REGLA ESTRICTA:
 * Cuando la web corre en Vercel (*.vercel.app o cualquier dominio que no sea localhost),
 * está terminantemente prohibido usar localhost:8000; SIEMPRE debe apuntar a Render.
 */
export function getApiBaseUrl(): string {
  // 1. En el navegador: si estamos en Vercel o en cualquier host público, forzar Render
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.");
    if (!isLocalhost) {
      return RENDER_BACKEND_URL;
    }
  }

  // 2. En build de Vercel o producción
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (envUrl && !envUrl.includes("localhost") && envUrl.startsWith("http")) {
      return envUrl.replace(/\/+$/, "");
    }
    return RENDER_BACKEND_URL;
  }

  // 3. Entorno de desarrollo puramente local
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }

  return RENDER_BACKEND_URL;
}

export const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Interfaces Tipadas para GimnasioDB (Nomenclatura con sufijos y retrocompatibilidad)
 */
export interface Socio {
  id_socio: number;
  rut_socio?: string;
  rut?: string;
  nombre_completo_socio?: string;
  nombre_completo?: string;
  fecha_nacimiento_socio?: string;
  fecha_nacimiento?: string;
  correo_socio?: string;
  correo?: string;
  telefono_socio?: string;
  telefono?: string;
  id_sede_registro_socio?: number;
  id_sede_registro?: number;
  acepta_promociones_socio?: boolean;
  acepta_promociones?: boolean;
  activo_socio?: boolean;
  activo?: boolean;
}

export interface Clase {
  id_clase: number;
  nombre_clase?: string;
  nombre?: string;
  duracion_minutos_clase?: number;
  duracion_minutos?: number;
  nivel_exigencia_clase?: "Principiante" | "Intermedio" | "Avanzado";
  nivel_exigencia?: "Principiante" | "Intermedio" | "Avanzado";
}

export interface SesionOcupacion {
  id_sesion: number;
  nombre_clase?: string;
  Clase?: string;
  nombre_sede?: string;
  Sede?: string;
  fecha_sesion?: string;
  fecha?: string;
  hora_sesion?: string;
  hora?: string;
  cupo_maximo_sesion?: number;
  cupo_maximo?: number;
  total_inscritos?: number;
  Total_Inscritos?: number;
  cupos_disponibles?: number;
  Cupos_Disponibles?: number;
}

export interface PlanMembresia {
  id_planmembresia: number;
  id_plan?: number;
  nombre_planmembresia?: string;
  nombre?: string;
  duracion_meses_planmembresia?: number;
  duracion_meses?: number;
  precio_vigente_planmembresia?: number;
  precio_vigente?: number;
}

export interface Contrato {
  id_contrato: number;
  id_socio_contrato?: number;
  id_socio?: number;
  id_planmembresia_contrato?: number;
  id_plan?: number;
  fecha_inicio_contrato?: string;
  fecha_inicio?: string;
  fecha_termino_contrato?: string;
  fecha_termino?: string;
  estado_contrato?: string;
  estado?: string;
  precio_pactado_contrato?: number;
  precio_pactado?: number;
}

export interface Pago {
  id_pago: number;
  id_contrato_pago?: number;
  id_contrato?: number;
  fecha_pago?: string;
  monto_cancelado_pago?: number;
  monto_cancelado?: number;
  medio_pago?: string;
}

/**
 * Función genérica de petición HTTP con manejo unificado de errores y serialización JSON.
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // Asegurar barra final en raíces de routers FastAPI para evitar redirección 307 (CORS redirect issue)
  if (["/socios", "/clases", "/contratos"].includes(cleanEndpoint)) {
    cleanEndpoint += "/";
  }

  const baseUrl = getApiBaseUrl();
  let url = `${baseUrl}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      ...restOptions,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Error en petición: ${response.status} ${response.statusText}`;
      let errorData = null;
      try {
        errorData = await response.json();
        if (errorData?.detail) {
          errorDetail = typeof errorData.detail === "string"
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Si la respuesta no es JSON válido
      }
      throw new ApiError(errorDetail, response.status, errorData);
    }

    // Si no hay contenido (HTTP 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError(
        "El servidor backend en Render tardó más de 40s en responder. Puede estar despertando de su modo reposo (cold-start).",
        504
      );
    }
    if (err.message === "Failed to fetch") {
      throw new ApiError(
        `No se pudo conectar con Render (${getApiBaseUrl()}). Si la instancia gratuita estaba suspendida, tarda ~30s en despertar. Reintente en unos instantes.`,
        503
      );
    }
    throw err;
  }
}

/**
 * Cliente API con métodos tipados para uso del equipo
 */
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    apiRequest<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  put: <T>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),

  getBaseUrl: () => API_BASE_URL,

  // Endpoints del Sistema
  health: () => apiRequest<{ backend: string; database: any }>("/api/health"),

  // Módulo Persona 1: Socios y Control de Acceso
  socios: {
    getAll: (params?: { activo?: boolean; id_sede?: number; buscar?: string; limite?: number; offset?: number }) =>
      apiClient.get<Socio[]>("/socios", params),
    getById: (id: number) => apiClient.get<Socio>(`/socios/${id}`),
    getByRut: (rut: string) => apiClient.get<Socio>(`/socios/rut/${encodeURIComponent(rut)}`),
    create: (data: Partial<Socio>) => apiClient.post<Socio>("/socios", data),
    update: (id: number, data: Partial<Socio>) => apiClient.put<Socio>(`/socios/${id}`, data),
    cambiarEstado: (id: number, activo: boolean) =>
      apiRequest<Socio>(`/socios/${id}/estado`, { method: "PATCH", body: JSON.stringify({ activo_socio: activo }) }),
    asignarCredenciales: (id: number, data: { username_usuario: string; password: string }) =>
      apiClient.post<any>(`/socios/${id}/credenciales`, data),
    login: (data: { username_o_correo: string; password: string }) =>
      apiClient.post<any>("/socios/login", data),
    validarAcceso: (identificador: string | number) =>
      apiClient.get<any>(`/socios/acceso/validar/${encodeURIComponent(identificador)}`),
    getSedesCatalogo: () => apiClient.get<any[]>("/socios/sedes/catalogo"),
    getReportePorSede: () => apiClient.get<any[]>("/socios/reportes/por-sede"),
  },

  // Módulo Persona 2: Clases
  clases: {
    getAll: () => apiClient.get<Clase[]>("/clases"),
    create: (data: Partial<Clase>) => apiClient.post<Clase>("/clases", data),
    getSesiones: () => apiClient.get<SesionOcupacion[]>("/clases/sesiones"),
    inscribir: (data: {
      id_socio_inscripcion?: number;
      id_socio?: number;
      id_sesion_inscripcion?: number;
      id_sesion?: number;
      observaciones_inscripcion?: string;
      observaciones?: string;
    }) => apiClient.post<any>("/clases/inscripciones", data),
  },

  // Módulo Persona 3: Contratos, Pagos, Personal y Finanzas
  contratos: {
    // 1. Planes de Membresía
    getPlanes: (params?: { duracion_meses?: number; buscar?: string }) =>
      apiClient.get<PlanMembresia[]>("/contratos/planes", params),
    getPlanById: (id: number) =>
      apiClient.get<PlanMembresia>(`/contratos/planes/${id}`),
    createPlan: (data: {
      nombre_planmembresia: string;
      duracion_meses_planmembresia: number;
      precio_vigente_planmembresia: number;
    }) => apiClient.post<PlanMembresia>("/contratos/planes", data),
    updatePlan: (
      id: number,
      data: {
        nombre_planmembresia?: string;
        duracion_meses_planmembresia?: number;
        precio_vigente_planmembresia?: number;
      }
    ) => apiClient.put<PlanMembresia>(`/contratos/planes/${id}`, data),

    // 2. Contratos
    getAll: (params?: {
      id_socio?: number;
      id_plan?: number;
      estado?: "Vigente" | "Vencido" | "Cancelado";
      limite?: number;
      offset?: number;
    }) => apiClient.get<ContratoDetalle[]>("/contratos", params),
    getById: (id: number) => apiClient.get<ContratoDetalle>(`/contratos/${id}`),
    create: (data: Partial<Contrato>) => apiClient.post<Contrato>("/contratos", data),
    emitirConPago: (data: {
      id_socio_contrato: number;
      id_planmembresia_contrato: number;
      fecha_inicio_contrato?: string;
      precio_pactado_contrato?: number;
      monto_pago_inicial?: number;
      medio_pago: "Transferencia" | "Tarjeta" | "Efectivo";
    }) => apiClient.post<any>("/contratos/emitir-con-pago", data),
    cambiarEstado: (id: number, estado_contrato: "Vigente" | "Vencido" | "Cancelado") =>
      apiRequest<Contrato>(`/contratos/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado_contrato }),
      }),
    actualizarVencidos: () =>
      apiClient.post<{ mensaje: string; contratos_actualizados: number }>("/contratos/actualizar-vencidos"),

    // 3. Pagos y Caja
    getPagos: (params?: {
      id_contrato?: number;
      id_socio?: number;
      medio_pago?: "Transferencia" | "Tarjeta" | "Efectivo";
      limite?: number;
      offset?: number;
    }) => apiClient.get<PagoDetalle[]>("/contratos/pagos", params),
    getPagosPorContrato: (id_contrato: number) =>
      apiClient.get<Pago[]>(`/contratos/${id_contrato}/pagos`),
    registrarPago: (data: {
      id_contrato_pago?: number;
      id_contrato?: number;
      monto_cancelado_pago?: number;
      monto_cancelado?: number;
      monto?: number;
      medio_pago?: string;
      metodo_pago?: string;
    }) => apiClient.post<Pago>("/contratos/pagos", data),

    // 4. Estado de Cuenta Financiero del Socio
    getEstadoCuentaSocio: (id_socio: number) =>
      apiClient.get<EstadoCuentaSocio>(`/contratos/socio/${id_socio}/estado-cuenta`),

    // 5. Gestión de Personal
    getPersonal: (params?: {
      id_sede?: number;
      cargo?: string;
      buscar?: string;
      limite?: number;
      offset?: number;
    }) => apiClient.get<PersonalItem[]>("/contratos/personal", params),
    getPersonalById: (id: number) =>
      apiClient.get<PersonalItem>(`/contratos/personal/${id}`),
    createPersonal: (data: {
      rut_personal: string;
      nombre_completo_personal: string;
      correo_personal: string;
      telefono_personal: string;
      cargo_personal: string;
      id_sede_personal: number;
    }) => apiClient.post<PersonalItem>("/contratos/personal", data),
    updatePersonal: (
      id: number,
      data: {
        nombre_completo_personal?: string;
        correo_personal?: string;
        telefono_personal?: string;
        cargo_personal?: string;
        id_sede_personal?: number;
      }
    ) => apiClient.put<PersonalItem>(`/contratos/personal/${id}`, data),
    deletePersonal: (id: number) =>
      apiClient.delete<{ mensaje: string; id_personal: number }>(`/contratos/personal/${id}`),

    // 6. Reporte Analítico de Ingresos por Sede (Vista SQL)
    getReporteIngresos: (params?: { nombre_sede?: string; anio?: number; mes?: number }) =>
      apiClient.get<ReporteIngresosItem[]>("/contratos/reportes/ingresos-por-sede", params),
  },
};

/* =========================================================================
 * Módulo Clases (Persona 2)
 * Definiciones de interfaces y cliente de servicios para /clases
 * Utiliza exactamente la nomenclatura de esquemas de backend/schemas/clases.py
 * ========================================================================= */

export interface ClaseResponse {
  id_clase: number;
  nombre_clase: string;
  duracion_minutos_clase: number;
  nivel_exigencia_clase: "Principiante" | "Intermedio" | "Avanzado" | string;
}

export interface SesionDisponibleResponse {
  id_sesion: number;
  nombre_clase: string;
  nivel_exigencia_clase: string;
  duracion_minutos_clase: number;
  nombre_sede: string;
  nombre_completo_instructor: string | null;
  fecha_sesion: string;
  hora_sesion: string;
  cupo_maximo_sesion: number;
  total_inscritos: number;
  cupos_disponibles: number;
}

export interface InscribirSocioRequest {
  id_socio_inscripcion: number;
  id_sesion_inscripcion: number;
}

export interface InscripcionCreadaResponse {
  id_inscripcion: number;
}

export interface CancelarInscripcionRequest {
  id_socio: number;
}

export interface CancelacionResponse {
  id_inscripcion: number;
  estado_inscripcion: string;
}

export interface InscripcionSocioDetalleResponse {
  id_inscripcion: number;
  id_socio_inscripcion: number;
  id_sesion_inscripcion: number;
  id_clase: number;
  nombre_clase: string;
  duracion_minutos_clase: number;
  nivel_exigencia_clase: string;
  id_sede: number;
  nombre_sede: string;
  fecha_sesion: string;
  hora_sesion: string;
  cupo_maximo_sesion: number;
  fecha_inscripcion: string;
  estado_inscripcion: string;
  asistio_inscripcion?: boolean | null;
  observaciones_inscripcion?: string | null;
}

export interface SedeSimpleResponse {
  id_sede: number;
  nombre_sede: string;
  direccion_calle_sede: string;
  telefono_sede: string;
  nombre_ciudad: string;
}

export interface InstructorItemResponse {
  id_instructor: number;
  rut_instructor: string;
  nombre_completo_instructor: string;
  correo_instructor: string;
  telefono_instructor: string;
  id_sede_habitual_instructor: number;
  nombre_sede?: string | null;
}

export interface SesionInstructorResponse {
  id_sesion: number;
  nombre_clase: string;
  nombre_sede: string;
  fecha: string;
  hora: string;
  cupo_maximo_sesion: number;
  total_inscritos: number;
}

export interface ProgramarSesionRequest {
  id_clase_sesion: number;
  id_sede_sesion: number;
  id_instructor_sesion?: number | null;
  fecha_sesion: string;
  hora_sesion: string;
  cupo_maximo_sesion: number;
}

export interface InscritoEnSesionResponse {
  id_inscripcion: number;
  id_socio_inscripcion: number;
  nombre_completo_socio: string;
  correo_socio: string;
  telefono_socio: string;
  fecha_inscripcion: string;
  estado_inscripcion: string;
  asistio_inscripcion?: boolean | null;
  observaciones_inscripcion?: string | null;
}

export interface RegistrarAsistenciaRequest {
  asistio: boolean;
  observaciones?: string | null;
  observaciones_inscripcion?: string | null;
}

export interface AsistenciaResponse {
  id_inscripcion: number;
  asistio_inscripcion: boolean;
}

export interface OcupacionClaseItem {
  id_sesion: number;
  nombre_clase: string;
  nombre_sede: string;
  fecha_sesion: string;
  hora_sesion: string;
  cupo_maximo_sesion: number;
  total_inscritos: number;
  cupos_disponibles: number;
}

export interface RankingClaseItem {
  nombre_clase: string;
  nivel_exigencia_clase: string;
  total_inscripciones: number;
}

export interface EquipamientoItemResponse {
  id_equipamiento: number;
  nombre_descriptivo_equipamiento: string;
  nombre_sede: string;
  id_sede_equipamiento: number;
  fecha_adquisicion_equipamiento: string;
  antiguedad_anios: number;
}

export interface EquipamientoCreateRequest {
  id_sede_equipamiento: number;
  nombre_descriptivo_equipamiento: string;
  fecha_adquisicion_equipamiento: string;
}

export interface EquipamientoCreadoResponse {
  id_equipamiento: number;
}

export interface EquipamientoUpdateRequest {
  nombre_descriptivo_equipamiento: string;
  fecha_adquisicion_equipamiento: string;
}

export interface EquipamientoOperacionResponse {
  id_equipamiento: number;
  mensaje: string;
}

export const clasesApi = {
  // Catálogo de clases
  getClases: () => apiClient.get<ClaseResponse[]>("/clases"),

  // Sesiones con filtros opcionales
  getSesiones: (params?: { fecha?: string; id_sede?: number; id_clase?: number }) =>
    apiClient.get<SesionDisponibleResponse[]>("/clases/sesiones", params),

  // Reserva e inscripciones
  inscribirSocio: (data: InscribirSocioRequest) =>
    apiClient.post<InscripcionCreadaResponse>("/clases/inscripciones", data),

  cancelarInscripcion: (id_inscripcion: number, data: CancelarInscripcionRequest) =>
    apiRequest<CancelacionResponse>(`/clases/inscripciones/${id_inscripcion}/cancelar`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getInscripcionesSocio: (id_socio: number) =>
    apiClient.get<InscripcionSocioDetalleResponse[]>(`/clases/socios/${id_socio}/inscripciones`),

  // Sedes e instructores
  getSedes: () => apiClient.get<SedeSimpleResponse[]>("/clases/sedes"),

  getInstructores: (params?: { id_sede?: number }) =>
    apiClient.get<InstructorItemResponse[]>("/clases/instructores", params),

  getSesionesInstructor: (id_instructor: number, params?: { desde?: string; hasta?: string }) =>
    apiClient.get<SesionInstructorResponse[]>(`/clases/instructores/${id_instructor}/sesiones`, params),

  // Inscritos y Asistencia
  getInscritosSesion: (id_sesion: number) =>
    apiClient.get<InscritoEnSesionResponse[]>(`/clases/sesiones/${id_sesion}/inscritos`),

  registrarAsistencia: (
    id_inscripcion: number,
    data: { asistio: boolean; observaciones?: string | null; observaciones_inscripcion?: string | null }
  ) =>
    apiRequest<AsistenciaResponse>(`/clases/inscripciones/${id_inscripcion}/asistencia`, {
      method: "PATCH",
      body: JSON.stringify({
        asistio: data.asistio,
        observaciones: data.observaciones,
        observaciones_inscripcion: data.observaciones_inscripcion ?? data.observaciones,
      }),
    }),

  // Reportes y Analítica (Vistas SQL)
  getReporteOcupacion: () =>
    apiClient.get<OcupacionClaseItem[]>("/clases/reportes/ocupacion"),

  getReporteRanking: () =>
    apiClient.get<RankingClaseItem[]>("/clases/reportes/ranking"),

  // Programación de sesiones
  programarSesion: (data: ProgramarSesionRequest) =>
    apiClient.post<{ id_sesion: number }>("/clases/sesiones", data),

  // Equipamiento
  getEquipos: (params?: { id_sede?: number }) =>
    apiClient.get<EquipamientoItemResponse[]>("/clases/equipos", params),

  registrarEquipo: (data: EquipamientoCreateRequest) =>
    apiClient.post<EquipamientoCreadoResponse>("/clases/equipos", data),

  actualizarEquipo: (id_equipamiento: number, data: EquipamientoUpdateRequest) =>
    apiClient.put<EquipamientoOperacionResponse>(`/clases/equipos/${id_equipamiento}`, data),

  eliminarEquipo: (id_equipamiento: number) =>
    apiClient.delete<EquipamientoOperacionResponse>(`/clases/equipos/${id_equipamiento}`),
};

// =========================================================================
// Módulo Socios & Acceso (Persona 1)
// =========================================================================

export interface SocioDetail {
  id_socio: number;
  rut_socio: string;
  nombre_completo_socio: string;
  fecha_nacimiento_socio: string;
  correo_socio: string;
  telefono_socio: string;
  id_sede_registro_socio: number;
  acepta_promociones_socio: boolean;
  activo_socio: boolean;
}

export interface ControlAccesoResult {
  acceso_permitido: boolean;
  motivo: string;
  id_socio?: number | null;
  rut_socio?: string | null;
  nombre_completo_socio?: string | null;
  sede_registro?: string | null;
  activo_socio?: boolean | null;
  contrato_vigente?: boolean | null;
  nombre_plan?: string | null;
  fecha_termino_contrato?: string | null;
}

export interface LoginResult {
  autenticado: boolean;
  mensaje: string;
  id_usuario?: number;
  username_usuario?: string;
  rol?: string;
  id_socio?: number;
  nombre_completo_socio?: string;
  activo_socio?: boolean;
}

export interface ReporteSedeItem {
  nombre_sede: string;
  estado_contrato: string;
  cantidad_socios: number;
}

export const sociosApi = apiClient.socios;

// =========================================================================
// Módulo Contratos, Pagos, Personal & Finanzas (Persona 3)
// =========================================================================

export interface ContratoDetalle extends Contrato {
  rut_socio?: string;
  nombre_completo_socio?: string;
  nombre_planmembresia?: string;
  duracion_meses_planmembresia?: number;
  total_pagado?: number;
  saldo_pendiente?: number;
}

export interface PagoDetalle extends Pago {
  id_socio_contrato?: number;
  rut_socio?: string;
  nombre_completo_socio?: string;
  nombre_planmembresia?: string;
}

export interface EstadoCuentaSocio {
  id_socio: number;
  rut_socio: string;
  nombre_completo_socio: string;
  correo_socio: string;
  activo_socio: boolean;
  nombre_sede: string;
  tiene_contrato_vigente: boolean;
  total_contratos: number;
  total_pactado: number;
  total_pagado: number;
  saldo_pendiente: number;
  estado_financiero: string;
  contratos: ContratoDetalle[];
  pagos: PagoDetalle[];
}

export interface PersonalItem {
  id_personal: number;
  rut_personal: string;
  nombre_completo_personal: string;
  correo_personal: string;
  telefono_personal: string;
  cargo_personal: string;
  id_sede_personal: number;
  nombre_sede?: string;
}

export interface ReporteIngresosItem {
  nombre_sede: string;
  anio_pago: number;
  mes_pago: number;
  total_ingresos: number;
}

export const contratosApi = apiClient.contratos;

// Extender el objeto principal apiClient con módulos para retrocompatibilidad
(apiClient as any).clasesModulo = clasesApi;
(apiClient as any).sociosModulo = sociosApi;
(apiClient as any).contratosModulo = contratosApi;

export default apiClient;

