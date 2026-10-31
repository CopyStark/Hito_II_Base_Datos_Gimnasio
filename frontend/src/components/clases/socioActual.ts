import apiClient, { clasesApi } from "@/services/apiClient";

/**
 * Socio en sesión compartida entre el Portal de Socios (/socios/login)
 * y el Módulo de Clases (/clases).
 */
export interface SocioActual {
  id_socio: number;
  nombre_completo_socio: string;
  correo_socio: string;
  rut_socio: string;
  id_sede_registro_socio?: number;
  nombre_sede_registro?: string;
}

export const SOCIOS_PRUEBA: SocioActual[] = [
  {
    id_socio: 1,
    nombre_completo_socio: "Daniel Matus",
    correo_socio: "daniel.matus@alumnos.cl",
    rut_socio: "18.765.432-K",
    id_sede_registro_socio: 1,
    nombre_sede_registro: "Sede Antofagasta Sur",
  },
  {
    id_socio: 2,
    nombre_completo_socio: "Emilia Osorio",
    correo_socio: "emilia.osorio@alumnos.cl",
    rut_socio: "19.123.456-7",
    id_sede_registro_socio: 2,
    nombre_sede_registro: "Sede La Serena Centro",
  },
  {
    id_socio: 3,
    nombre_completo_socio: "Yulissa Ulloa",
    correo_socio: "yulissa.ulloa@alumnos.cl",
    rut_socio: "19.987.654-3",
    id_sede_registro_socio: 1,
    nombre_sede_registro: "Sede Antofagasta Sur",
  },
  {
    id_socio: 4,
    nombre_completo_socio: "Mateo Sepúlveda Figueroa",
    correo_socio: "socio41@alumnos.cl",
    rut_socio: "12.450.949-1",
    id_sede_registro_socio: 6,
    nombre_sede_registro: "Sede Providencia Norte",
  },
  {
    id_socio: 5,
    nombre_completo_socio: "Camila Araya Miranda",
    correo_socio: "socio42@alumnos.cl",
    rut_socio: "12.510.728-2",
    id_sede_registro_socio: 7,
    nombre_sede_registro: "Sede Las Condes Apoquindo",
  },
];

export const SOCIO_ACTUAL: SocioActual = SOCIOS_PRUEBA[0];

const STORAGE_KEY = "gimnasiodb_socio_actual_id";
const STORAGE_OBJ_KEY = "gimnasiodb_socio_actual_obj";
const SESION_USUARIO_KEY = "gimnasio_sesion_usuario";
const EVENT_NAME = "gimnasiodb_socio_cambiado";

/**
 * Devuelve la lista de socios para poblar selectores (<select>), asegurando
 * que el socio actualmente en sesión siempre esté incluido aunque no sea #1..#5.
 */
export function getOpcionesSociosSelector(
  actual?: SocioActual | null
): SocioActual[] {
  if (!actual || !actual.id_socio) return SOCIOS_PRUEBA;
  const existe = SOCIOS_PRUEBA.some((s) => s.id_socio === actual.id_socio);
  if (existe) {
    return SOCIOS_PRUEBA.map((s) =>
      s.id_socio === actual.id_socio ? { ...s, ...actual } : s
    );
  }
  return [actual, ...SOCIOS_PRUEBA];
}

export function getStoredSocioActual(): SocioActual {
  if (typeof window !== "undefined") {
    try {
      // 1. Objeto completo sincronizado (soporta cualquier socio de la BD #1..#N)
      const storedObjRaw = localStorage.getItem(STORAGE_OBJ_KEY);
      if (storedObjRaw) {
        const parsed = JSON.parse(storedObjRaw) as Partial<SocioActual>;
        if (parsed && typeof parsed.id_socio === "number" && parsed.id_socio > 0) {
          const base = SOCIOS_PRUEBA.find((s) => s.id_socio === parsed.id_socio);
          return {
            id_socio: parsed.id_socio,
            nombre_completo_socio:
              parsed.nombre_completo_socio ||
              base?.nombre_completo_socio ||
              `Socio #${parsed.id_socio}`,
            correo_socio: parsed.correo_socio || base?.correo_socio || "—",
            rut_socio: parsed.rut_socio || base?.rut_socio || "—",
            id_sede_registro_socio:
              parsed.id_sede_registro_socio ?? base?.id_sede_registro_socio,
            nombre_sede_registro:
              parsed.nombre_sede_registro || base?.nombre_sede_registro,
          };
        }
      }

      // 2. Fallback directo a la sesión autenticada en /socios/login si existe
      const sesionRaw = localStorage.getItem(SESION_USUARIO_KEY);
      if (sesionRaw) {
        const sesion = JSON.parse(sesionRaw);
        const idSesion = Number(sesion?.id_socio);
        if (idSesion > 0) {
          const matchSesion = SOCIOS_PRUEBA.find((s) => s.id_socio === idSesion);
          if (matchSesion) return matchSesion;
          return {
            id_socio: idSesion,
            nombre_completo_socio:
              sesion.nombre_completo_socio ||
              sesion.username_usuario ||
              `Socio #${idSesion}`,
            correo_socio: sesion.correo_socio || "—",
            rut_socio: sesion.rut_socio || "—",
            id_sede_registro_socio: sesion.id_sede_registro_socio,
            nombre_sede_registro: sesion.nombre_sede_registro,
          };
        }
      }

      // 3. Fallback por ID simple legado
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const idNum = Number(storedId);
        const match = SOCIOS_PRUEBA.find((s) => s.id_socio === idNum);
        if (match) return match;
      }
    } catch {}
  }
  return SOCIOS_PRUEBA[0];
}

export function setStoredSocioActual(socio: SocioActual) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, String(socio.id_socio));
      localStorage.setItem(STORAGE_OBJ_KEY, JSON.stringify(socio));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: socio }));
    } catch {}
  }
}

/**
 * Sincroniza el socio activo a partir de un `id_socio` (ej. recibido por query `?id_socio=`).
 * Aplica actualización inmediata si ya se conoce localmente y refresca sus datos reales desde FastAPI.
 */
export async function sincronizarSocioDesdeId(
  idSocio: number
): Promise<SocioActual | null> {
  if (!idSocio || isNaN(idSocio) || idSocio <= 0) return null;

  // Actualización instantánea (0ms) si coincide con memoria local o catálogo base
  const actualGuardado = getStoredSocioActual();
  if (actualGuardado.id_socio === idSocio && actualGuardado.rut_socio !== "—") {
    setStoredSocioActual(actualGuardado);
  } else {
    const enPrueba = SOCIOS_PRUEBA.find((s) => s.id_socio === idSocio);
    if (enPrueba) {
      setStoredSocioActual(enPrueba);
    }
  }

  // Consulta autoritativa a SQL Server vía FastAPI para garantizar datos vigentes
  try {
    const [ficha, listaSedes] = await Promise.all([
      apiClient.socios.getById(idSocio),
      clasesApi.getSedes().catch(() => []),
    ]);

    const idSede = ficha.id_sede_registro_socio ?? ficha.id_sede_registro;
    const sedeMatch = Array.isArray(listaSedes)
      ? listaSedes.find((s) => s.id_sede === idSede)
      : undefined;

    const socioVivo: SocioActual = {
      id_socio: ficha.id_socio ?? idSocio,
      nombre_completo_socio:
        ficha.nombre_completo_socio ??
        ficha.nombre_completo ??
        `Socio #${idSocio}`,
      correo_socio: ficha.correo_socio ?? ficha.correo ?? "—",
      rut_socio: ficha.rut_socio ?? ficha.rut ?? "—",
      id_sede_registro_socio: idSede,
      nombre_sede_registro:
        sedeMatch?.nombre_sede || (idSede ? `Sede #${idSede}` : undefined),
    };

    setStoredSocioActual(socioVivo);
    return socioVivo;
  } catch {
    const fallback = getStoredSocioActual();
    return fallback.id_socio === idSocio ? fallback : null;
  }
}

export function subscribeSocioActual(callback: (socio: SocioActual) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<SocioActual>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export default SOCIO_ACTUAL;
