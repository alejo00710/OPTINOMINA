export const FESTIVOS_COLOMBIA = [
  // 2026
  "2026-01-01", // Año Nuevo
  "2026-01-12", // Día de los Reyes Magos
  "2026-03-23", // Día de San José
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo
  "2026-05-18", // Día de la Ascensión
  "2026-06-08", // Corpus Christi
  "2026-06-15", // Sagrado Corazón
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-20", // Día de la Independencia
  "2026-08-07", // Batalla de Boyacá
  "2026-08-17", // La Asunción de la Virgen
  "2026-10-12", // Día de la Raza
  "2026-11-02", // Todos los Santos
  "2026-11-16", // Independencia de Cartagena
  "2026-12-08", // Día de la Inmaculada Concepción
  "2026-12-25", // Navidad

  // 2027
  "2027-01-01", // Año Nuevo
  "2027-01-11", // Día de los Reyes Magos
  "2027-03-22", // Día de San José
  "2027-03-25", // Jueves Santo
  "2027-03-26", // Viernes Santo
  "2027-05-01", // Día del Trabajo
  "2027-05-10", // Día de la Ascensión
  "2027-05-31", // Corpus Christi
  "2027-06-07", // Sagrado Corazón
  "2027-07-05", // San Pedro y San Pablo
  "2027-07-20", // Día de la Independencia
  "2027-08-07", // Batalla de Boyacá
  "2027-08-16", // La Asunción de la Virgen
  "2027-10-18", // Día de la Raza
  "2027-11-01", // Todos los Santos
  "2027-11-15", // Independencia de Cartagena
  "2027-12-08", // Día de la Inmaculada Concepción
  "2027-12-25"  // Navidad
];

export const isFestivoColombia = (fechaString) => {
  if (!fechaString) return false;
  return FESTIVOS_COLOMBIA.includes(fechaString);
};
