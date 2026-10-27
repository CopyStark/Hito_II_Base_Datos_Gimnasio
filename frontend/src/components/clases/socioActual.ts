/**
 * Socio "actual" para pruebas y simulación de sesión en el frontend.
 * Proporciona socios de prueba y utilidades para alternar entre ellos dinámicamente.
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
    nombre_sede_registro: "Sede Central Moneda",
  },
  {
    id_socio: 2,
    nombre_completo_socio: "Emilia Osorio",
    correo_socio: "emilia.osorio@alumnos.cl",
    rut_socio: "19.123.456-7",
    id_sede_registro_socio: 2,
    nombre_sede_registro: "Sede Providencia Norte",
  },
  {
    id_socio: 3,
    nombre_completo_socio: "Yulissa Ulloa",
    correo_socio: "yulissa.ulloa@alumnos.cl",
    rut_socio: "19.987.654-3",
    id_sede_registro_socio: 1,
    nombre_sede_registro: "Sede Central Moneda",
  },
  {
    id_socio: 4,
    nombre_completo_socio: "Benjamín Rojas",
    correo_socio: "benjamin.rojas@alumnos.cl",
    rut_socio: "19.456.789-0",
    id_sede_registro_socio: 3,
    nombre_sede_registro: "Sede Las Condes Apoquindo",
  },
  {
    id_socio: 5,
    nombre_completo_socio: "Camila Soto",
    correo_socio: "camila.soto@alumnos.cl",
    rut_socio: "19.789.012-4",
    id_sede_registro_socio: 4,
    nombre_sede_registro: "Sede Viña Centro",
  },
];

export const SOCIO_ACTUAL: SocioActual = SOCIOS_PRUEBA[0];

const STORAGE_KEY = "gimnasiodb_socio_actual_id";
const EVENT_NAME = "gimnasiodb_socio_cambiado";

export function getStoredSocioActual(): SocioActual {
  if (typeof window !== "undefined") {
    try {
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
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: socio }));
    } catch {}
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
