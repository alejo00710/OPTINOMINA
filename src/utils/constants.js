import { timeStrToDecimal, getDecimalHours } from "./mathNomina";

export const SMLV = 1750905;
export const AUX_TRANSPORTE = 249095;
export const MINIMO_DIARIO_INCAPACIDAD = 58363.5;
export const DIVISOR_HORAS_EXTRAS = 240;
export const DIVISOR_RECARGOS_NOCTURNOS = 240;
export const HORA_INICIO_DIURNA = "04:00";
export const HORA_FIN_DIURNA = "18:00";
export const FACTOR_EXTRA_DIURNA = 1.25;
export const FACTOR_EXTRA_NOCTURNA = 1.75;
export const FACTOR_EXTRA_FESTIVA = 2.0;
export const FACTOR_EXTRA_FESTIVA_NOCTURNA = 2.5;
export const FACTOR_RECARGO_NOCTURNO = 0.35;

// --- Config Parameters ---
export const PERFILES_TURNOS = {
  INYECCION_MONITORES_MONTADORES: {
    id: "INYECCION",
    descripcion: "Operarios de Inyección, Monitores y Montadores",
    turnosValidos: [
      { id: "M8", nombre: "Mañana (06:00 - 14:00)", inicio: "06:00", fin: "14:00", descansos: 1 },
      { id: "T8", nombre: "Tarde (14:00 - 22:00)", inicio: "14:00", fin: "22:00", descansos: 1 },
      { id: "N8", nombre: "Noche (22:00 - 06:00)", inicio: "22:00", fin: "06:00", descansos: 1 },
      { id: "M12", nombre: "12H Mañana (06:00 - 18:00)", inicio: "06:00", fin: "18:00", descansos: 2 },
      { id: "N12", nombre: "12H Noche (18:00 - 06:00)", inicio: "18:00", fin: "06:00", descansos: 2 }
    ]
  },
  TALLER_Y_OTROS: {
    id: "TALLER",
    descripcion: "Personal de Taller, Administrativos Técnicos y Otros",
    turnosValidos: [
      { id: "TAL_NORM", nombre: "Taller Normal (07:30 - 17:00)", inicio: "07:30", fin: "17:00", descansos: 2 },
      { id: "TAL_CORT", nombre: "Taller Corto (07:30 - 16:00)", inicio: "07:30", fin: "16:00", descansos: 2 },
      { id: "TAL_FLEX1", nombre: "Taller Flex A (06:00 - 17:00)", inicio: "06:00", fin: "17:00", descansos: 2 },
      { id: "TAL_FLEX2", nombre: "Taller Flex B (06:30 - 16:00)", inicio: "06:30", fin: "16:00", descansos: 2 },
      { id: "M8", nombre: "Mañana (06:00 - 14:00)", inicio: "06:00", fin: "14:00", descansos: 1 },
      { id: "T8", nombre: "Tarde (14:00 - 22:00)", inicio: "14:00", fin: "22:00", descansos: 1 },
      { id: "N8", nombre: "Noche (22:00 - 06:00)", inicio: "22:00", fin: "06:00", descansos: 1 },
      { id: "M12", nombre: "12H Mañana (06:00 - 18:00)", inicio: "06:00", fin: "18:00", descansos: 2 },
      { id: "N12", nombre: "12H Noche (18:00 - 06:00)", inicio: "18:00", fin: "06:00", descansos: 2 }
    ]
  }
};
export const getDefaultCategoryForCargo = (cargo) => {
  const c = String(cargo || "").toUpperCase().trim();
  if (
    c.includes("INYECCIÓN") || 
    c.includes("INYECCION") || 
    c.includes("MONTADOR") || 
    c.includes("MONITOR")
  ) {
    return "INYECCIÓN";
  }
  if (
    c.includes("TALLER") || 
    c.includes("MECÁNICO") || 
    c.includes("MECANICO") || 
    c.includes("CNC") || 
    c.includes("TORNO") || 
    c.includes("PROGRAMADOR")
  ) {
    return "TALLER";
  }
  if (c.includes("NUEVO")) {
    return "NUEVOS";
  }
  return "OTROS";
};
export const getProfileForCategory = (category) => {
  const cat = String(category || "").toUpperCase().trim();
  if (cat === "INYECCIÓN" || cat === "INYECCION" || cat === "NUEVOS") {
    return "INYECCION_MONITORES_MONTADORES";
  }
  return "TALLER_Y_OTROS";
};
export const getTemplatesForCategory = (category) => {
  const profileKey = getProfileForCategory(category);
  const profile = PERFILES_TURNOS[profileKey] || PERFILES_TURNOS.TALLER_Y_OTROS;
  return profile.turnosValidos.map(t => {
    const entPago = timeStrToDecimal(t.inicio);
    const salPago = timeStrToDecimal(t.fin);
    const overnight = salPago < entPago;
    const expectedHours = getDecimalHours(t.inicio, t.fin);
    return {
      key: t.id,
      entPago,
      salPago,
      expectedHours,
      overnight,
      breaks: t.descansos
    };
  });
};
export const NOMINA_DATE_RANGE_KEY = "nomina_date_range_v1";
export const loadPersistedDateRange = () => {
  if (typeof window === "undefined") {
    return { start: "2026-04-25", end: "2026-05-15" };
  }
  try {
    const raw = localStorage.getItem(NOMINA_DATE_RANGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.start && parsed?.end) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { start: "2026-04-25", end: "2026-05-15" };
};
export const PLANILLA_COLUMNS = [
  { key: "consecutivo", label: "Consecutivo", letter: "B", type: "number", center: true, sticky: "left-0", width: "w-16", editable: false },
  { key: "nombre", label: "Nombre", letter: "C", type: "text", sticky: "left-16", width: "w-60", editable: false },
  { key: "cedula", label: "Cédula", letter: "D", type: "number", editable: true },
  { key: "cargo", label: "Cargo", letter: "E", type: "text", editable: true },
  { key: "categoria", label: "Categoría", letter: "CAT", type: "text", center: true, editable: true, options: ["INYECCIÓN", "TALLER", "OTROS", "NUEVOS"] },
  { key: "salario", label: "Salario Base", letter: "F", type: "number", isCurrency: true, editable: true },
  { key: "dias_pagados", label: "Días Pagados", letter: "G", type: "number", center: true, editable: true },
  
  { key: "horas_diurnas", label: "Hrs Diurnas (H)", letter: "H", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5", editable: true },
  { key: "horas_nocturnas", label: "Hrs Nocturnas (I)", letter: "I", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5", editable: true },
  { key: "extras_diurnas", label: "Ext Diurnas (J)", letter: "J", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5", editable: true },
  { key: "extras_nocturnas", label: "Ext Nocturnas (K)", letter: "K", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5", editable: true },
  { key: "extras_festivas", label: "Ext Festivas (L)", letter: "L", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5", editable: true },
  
  { key: "sueldo", label: "Sueldo (M)", letter: "M", type: "number", isCurrency: true, editable: true },
  { key: "recargo_nocturno", label: "Recargo Noct (N)", letter: "N", type: "number", isCurrency: true, editable: true },
  { key: "val_extras_diurnas", label: "Ext Diurnas Vr (O)", letter: "O", type: "number", isCurrency: true, editable: true },
  { key: "val_extras_nocturnas", label: "Ext Nocturnas Vr (P)", letter: "P", type: "number", isCurrency: true, editable: true },
  { key: "val_extras_festivas", label: "Ext Festivas Vr (Q)", letter: "Q", type: "number", isCurrency: true, editable: true },
  { key: "comisiones", label: "Comisiones (R)", letter: "R", type: "number", isCurrency: true, editable: true },
  { key: "transporte", label: "Aux. Transp (S)", letter: "S", type: "number", isCurrency: true, editable: true },
  { key: "rodamiento", label: "Rodamiento (T)", letter: "T", type: "number", isCurrency: true, editable: true },
  { key: "dias_incapacidad", label: "Días Incap (U)", letter: "U", type: "number", center: true, editable: true },
  { key: "incapacidad", label: "Valor Incap (V)", letter: "V", type: "number", isCurrency: true, editable: true },
  { key: "total_devengados", label: "Total Devengado (W)", letter: "W", type: "number", isCurrency: true, bg: "bg-emerald-500/5 font-extrabold text-emerald-800", editable: true },
  
  { key: "salud", label: "Salud 4% (X)", letter: "X", type: "number", isCurrency: true, textClass: "text-rose-600", editable: true },
  { key: "pension", label: "Pensión 4% (Y)", letter: "Y", type: "number", isCurrency: true, textClass: "text-rose-600", editable: true },
  { key: "solidaridad", label: "Solidaridad 1% (Z)", letter: "Z", type: "number", isCurrency: true, editable: true },
  { key: "prestamos", label: "Préstamos (AA)", letter: "AA", type: "number", isCurrency: true, editable: true },
  { key: "poliza_bolivar", label: "Póliza Bolívar (AB)", letter: "AB", type: "number", isCurrency: true, editable: true },
  { key: "poliza_plenitud", label: "Póliza Plenitud (AC)", letter: "AC", type: "number", isCurrency: true, editable: true },
  { key: "libranza_comfama", label: "Comfama (AD)", letter: "AD", type: "number", isCurrency: true, editable: true },
  { key: "poliza_sura", label: "Póliza Sura (AE)", letter: "AE", type: "number", isCurrency: true, editable: true },
  { key: "optica", label: "Óptica (AF)", letter: "AF", type: "number", isCurrency: true, editable: true },
  { key: "celular", label: "Celular (AG)", letter: "AG", type: "number", isCurrency: true, editable: true },
  { key: "retencion", label: "Retención (AH)", letter: "AH", type: "number", isCurrency: true, editable: true },
  { key: "total_deducciones", label: "Total Deducido (AI)", letter: "AI", type: "number", isCurrency: true, bg: "bg-rose-500/5 font-extrabold text-rose-800", editable: true },
  
  { key: "total_pagar", label: "Total a Pagar (AJ)", letter: "AJ", type: "number", isCurrency: true, editable: true },
  { key: "bonificacion", label: "Bonif. No Sal (AK)", letter: "AK", type: "number", isCurrency: true, editable: true },
  { key: "neto_pagar", label: "Neto a Pagar (AL)", letter: "AL", type: "number", isCurrency: true, bg: "bg-amber-500/10 font-black text-amber-900", editable: true },
  { key: "saldo_prestamo", label: "Saldo Préstamo (AM)", letter: "AM", type: "number", isCurrency: true, editable: true },
  { key: "verificacion", label: "Verificación 40% (AN)", letter: "AN", type: "number", isCurrency: true, editable: true },
  { key: "banco", label: "Entidad Banco (AO)", letter: "AO", type: "text", center: true, editable: true }
];
export const DAILY_COLUMNS = [
  { key: "dia", label: "Día/Fecha", letter: "A", type: "text", center: true },
  { key: "hr_ent", label: "Reloj Hr Ent", letter: "B", type: "text", center: true, bg: "bg-blue-500/5" },
  { key: "hr_sal", label: "Reloj Hr Sal", letter: "C", type: "text", center: true, bg: "bg-blue-500/5" },
  { key: "hr_ent_desc1", label: "Descanso 1 Ent", letter: "D", type: "text", center: true },
  { key: "hr_sal_desc1", label: "Descanso 1 Sal", letter: "E", type: "text", center: true },
  { key: "total_desc1", label: "Desc 1 Total", letter: "F", type: "text", center: true, bg: "bg-slate-500/5" },
  { key: "hr_ent_desc2", label: "Descanso 2 Ent", letter: "G", type: "text", center: true },
  { key: "hr_sal_desc2", label: "Descanso 2 Sal", letter: "H", type: "text", center: true },
  { key: "total_desc2", label: "Desc 2 Total", letter: "I", type: "text", center: true, bg: "bg-slate-500/5" },
  { key: "hr_ent_pago", label: "Pago Entrada", letter: "J", type: "text", center: true, bg: "bg-indigo-500/5 text-indigo-900" },
  { key: "hr_sal_pago", label: "Pago Salida", letter: "K", type: "text", center: true, bg: "bg-indigo-500/5 text-indigo-900" },
  { key: "hr_lab", label: "Hrs Laboradas", letter: "L", type: "number", isDecimal: true, bg: "bg-emerald-500/5 text-emerald-900" },
  { key: "desc_lunch", label: "Desc. Almuerzo", letter: "M", type: "number", isDecimal: true, center: true },
  { key: "hr_pag", label: "Hrs Pagadas", letter: "N", type: "number", isDecimal: true, center: true },
  { key: "diurnas", label: "Ordinarias Diurnas", letter: "O", type: "number", isDecimal: true, center: true, bg: "bg-blue-500/5 text-blue-700" },
  { key: "nocturnas", label: "Ordinarias Nocturnas", letter: "P", type: "number", isDecimal: true, center: true, bg: "bg-indigo-500/5 text-indigo-700" },
  { key: "fes_diu", label: "Festiva Diurna", letter: "Q", type: "number", isDecimal: true, center: true, bg: "bg-emerald-500/5 text-emerald-700" },
  { key: "fes_noc", label: "Festiva Nocturna", letter: "R", type: "number", isDecimal: true, center: true, bg: "bg-purple-500/5 text-purple-700" },
  { key: "ext_diu", label: "Extras Diurnas", letter: "S", type: "number", isDecimal: true, center: true, bg: "bg-amber-500/5 text-amber-700 font-bold" },
  { key: "ext_noc", label: "Extra Nocturna", letter: "T", type: "number", isDecimal: true, center: true, bg: "bg-orange-500/5 text-orange-700" },
  { key: "ext_fes_diu", label: "Extra Fes Diu", letter: "U", type: "number", isDecimal: true, center: true, bg: "bg-red-500/5 text-red-700" },
  { key: "ext_fes_noc", label: "Extra Fes Noc", letter: "V", type: "number", isDecimal: true, center: true, bg: "bg-rose-500/5 text-rose-700" },
  { key: "llegada_tarde", label: "Llegada Tarde", letter: "W", type: "number", center: true },
  { key: "llegada_tarde_min", label: "Llegada Tarde Min", letter: "X", type: "number", center: true }
];
export const LIQUIDATION_CONCEPTS = [
  { key: "h_diurna", label: "Horas Diurnas Ordinarias", pctKey: "h_diurna_pct", hrKey: "h_diurna_hr", valKey: "h_diurna_val", defaultPct: 0.0, textClass: "text-slate-900" },
  { key: "h_nocturna", label: "Recargo Nocturno Ordinario", pctKey: "h_nocturna_pct", hrKey: "h_nocturna_hr", valKey: "h_nocturna_val", defaultPct: 0.35, textClass: "text-indigo-900 font-bold" },
  { key: "h_festiva_diurna", label: "Recargo Festivo Diurno", pctKey: "h_festiva_diurna_pct", hrKey: "h_festiva_diurna_hr", valKey: "h_festiva_diurna_val", defaultPct: 0.75, textClass: "text-emerald-900" },
  { key: "h_festiva_nocturna", label: "Recargo Festivo Nocturno", pctKey: "h_festiva_nocturna_pct", hrKey: "h_festiva_nocturna_hr", valKey: "h_festiva_nocturna_val", defaultPct: 2.1, textClass: "text-purple-900" },
  { key: "h_extra_diurna", label: "Horas Extras Diurnas (S24 - Debe B26)", pctKey: "h_extra_diurna_pct", hrKey: "h_extra_diurna_hr", valKey: "h_extra_diurna_val", defaultPct: 1.5, textClass: "text-amber-900 font-bold" },
  { key: "h_extra_nocturna", label: "Horas Extras Nocturnas", pctKey: "h_extra_nocturna_pct", hrKey: "h_extra_nocturna_hr", valKey: "h_extra_nocturna_val", defaultPct: 1.75, textClass: "text-orange-900" },
  { key: "h_extra_festiva_diurna", label: "Extras Festivas Diurnas", pctKey: "h_extra_festiva_diurna_pct", hrKey: "h_extra_festiva_diurna_hr", valKey: "h_extra_festiva_diurna_val", defaultPct: 2.0, textClass: "text-red-900" },
  { key: "h_extra_festiva_nocturna", label: "Extras Festivas Nocturnas", pctKey: "h_extra_festiva_nocturna_pct", hrKey: "h_extra_festiva_nocturna_hr", valKey: "h_extra_festiva_nocturna_val", defaultPct: 2.5, textClass: "text-rose-900" }
];

