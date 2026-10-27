/**
 * Empleado / Personal responsable para el inventario de equipamiento.
 * Permite simular al encargado de sede y sincronizar la sede por defecto.
 * Mapeado con los IDs reales de la tabla Sede en la base de datos SQL Server:
 * 1: Sede Antofagasta Sur
 * 2: Sede La Serena Centro
 * 3: Sede Valparaíso Puerto
 * 4: Sede Viña Centro
 * 5: Sede Central Moneda
 * 6: Sede Providencia Norte
 * 7: Sede Las Condes Apoquindo
 */
export interface PersonalResponsable {
  id_personal: number;
  nombre_completo_personal: string;
  cargo_personal: string;
  correo_personal: string;
  telefono_personal: string;
  id_sede_personal: number;
  nombre_sede_personal: string;
}

export const PERSONAL_RESPONSABLE_MOCK: PersonalResponsable[] = [
  {
    id_personal: 1,
    nombre_completo_personal: "Rodrigo San Martín",
    cargo_personal: "Jefe de Mantención y Equipamiento",
    correo_personal: "rodrigo.sanmartin@gimnasiodb.cl",
    telefono_personal: "+56 9 6101 2001",
    id_sede_personal: 5,
    nombre_sede_personal: "Sede Central Moneda",
  },
  {
    id_personal: 2,
    nombre_completo_personal: "Mariana Silva Contreras",
    cargo_personal: "Supervisora de Operaciones",
    correo_personal: "mariana.silva@gimnasiodb.cl",
    telefono_personal: "+56 9 6102 2002",
    id_sede_personal: 6,
    nombre_sede_personal: "Sede Providencia Norte",
  },
  {
    id_personal: 3,
    nombre_completo_personal: "Cristian Morales Soto",
    cargo_personal: "Técnico en Maquinaria Deportiva",
    correo_personal: "cristian.morales@gimnasiodb.cl",
    telefono_personal: "+56 9 6103 2003",
    id_sede_personal: 7,
    nombre_sede_personal: "Sede Las Condes Apoquindo",
  },
  {
    id_personal: 4,
    nombre_completo_personal: "Camila Rojas Valenzuela",
    cargo_personal: "Encargada de Inventario Sede",
    correo_personal: "camila.rojas@gimnasiodb.cl",
    telefono_personal: "+56 9 6104 2004",
    id_sede_personal: 4,
    nombre_sede_personal: "Sede Viña Centro",
  },
  {
    id_personal: 5,
    nombre_completo_personal: "Felipe Herrera Araya",
    cargo_personal: "Coordinador de Infraestructura",
    correo_personal: "felipe.herrera@gimnasiodb.cl",
    telefono_personal: "+56 9 6105 2005",
    id_sede_personal: 3,
    nombre_sede_personal: "Sede Valparaíso Puerto",
  },
  {
    id_personal: 6,
    nombre_completo_personal: "Francisca Fuentes Vidal",
    cargo_personal: "Administradora de Sede",
    correo_personal: "francisca.fuentes@gimnasiodb.cl",
    telefono_personal: "+56 9 6106 2006",
    id_sede_personal: 1,
    nombre_sede_personal: "Sede Antofagasta Sur",
  },
];

export const EMPLEADO_ACTUAL: PersonalResponsable = PERSONAL_RESPONSABLE_MOCK[0];

export default EMPLEADO_ACTUAL;
