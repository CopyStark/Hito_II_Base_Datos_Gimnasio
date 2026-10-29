/**
 * Instructor "actual" para pruebas y simulación de sesión en el frontend.
 * Como aún no existe módulo de login integrado, se utiliza esta constante.
 * 
 * TODO: Reemplazar por el instructor autenticado extraído del token JWT o sesión global.
 */
export interface InstructorActual {
  id_instructor: number;
  nombre_completo_instructor: string;
  correo_instructor: string;
  rut_instructor: string;
}

export const INSTRUCTOR_ACTUAL: InstructorActual = {
  id_instructor: 1,
  nombre_completo_instructor: "Rodrigo Morales Silva",
  correo_instructor: "rodrigo.morales@gym.cl",
  rut_instructor: "15.432.198-7",
};

export default INSTRUCTOR_ACTUAL;
