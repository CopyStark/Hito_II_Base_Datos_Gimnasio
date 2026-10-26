/**
 * Socio "actual" para pruebas y simulación de sesión en el frontend.
 * Como aún no existe módulo de login integrado, se utiliza esta constante.
 * 
 * TODO: Reemplazar por el socio autenticado extraído del token JWT o sesión global.
 */
export interface SocioActual {
  id_socio: number;
  nombre_completo_socio: string;
  correo_socio: string;
  rut_socio: string;
}

export const SOCIO_ACTUAL: SocioActual = {
  id_socio: 1,
  nombre_completo_socio: "Daniel Matus",
  correo_socio: "daniel.matus@alumnos.cl",
  rut_socio: "18.765.432-K",
};

export default SOCIO_ACTUAL;
