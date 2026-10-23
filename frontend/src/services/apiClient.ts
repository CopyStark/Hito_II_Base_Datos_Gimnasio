/**
 * Cliente HTTP Base para la API de GimnasioDB (FastAPI)
 * 
 * REGLAS DE ARQUITECTURA:
 * 1. Arquitectura API-First: Este frontend NO tiene ninguna conexión directa a la base de datos SQL Server.
 * 2. Toda comunicación de datos se realiza a través de las rutas REST expuestas por FastAPI.
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

  // Módulo Persona 1: Socios
  socios: {
    getAll: () => apiClient.get<any[]>("/socios"),
    getById: (id: number) => apiClient.get<any>(`/socios/${id}`),
    create: (data: any) => apiClient.post<any>("/socios", data),
  },

  // Módulo Persona 2: Clases
  clases: {
    getAll: () => apiClient.get<any[]>("/clases"),
    create: (data: any) => apiClient.post<any>("/clases", data),
    inscribir: (data: { id_socio: number; id_clase: number }) => 
      apiClient.post<any>("/clases/inscripciones", data),
  },

  // Módulo Persona 3: Contratos y Pagos
  contratos: {
    getAll: () => apiClient.get<any[]>("/contratos"),
    create: (data: any) => apiClient.post<any>("/contratos", data),
    registrarPago: (data: { id_contrato: number; monto: number; metodo_pago: string }) => 
      apiClient.post<any>("/contratos/pagos", data),
  },
};

export default apiClient;
