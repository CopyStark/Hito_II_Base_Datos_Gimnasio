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

const envUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE_URL = (envUrl && envUrl.trim() !== "" && !envUrl.includes("localhost:8000"))
  ? envUrl.replace(/\/+$/, "")
  : RENDER_BACKEND_URL;

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

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

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

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

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    ...restOptions,
  });

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

  // Módulo Persona 3: Contratos y Pagos
  contratos: {
    getPlanes: () => apiClient.get<PlanMembresia[]>("/contratos/planes"),
    getAll: () => apiClient.get<Contrato[]>("/contratos"),
    create: (data: Partial<Contrato>) => apiClient.post<Contrato>("/contratos", data),
    registrarPago: (data: { 
      id_contrato_pago?: number; 
      id_contrato?: number; 
      monto_cancelado_pago?: number; 
      monto_cancelado?: number; 
      monto?: number;
      medio_pago?: string; 
      metodo_pago?: string;
    }) => apiClient.post<Pago>("/contratos/pagos", data),
  },
};

export default apiClient;
