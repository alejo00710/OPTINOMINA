"use client";

import { 
  Coins, 
  Users, 
  Clock, 
  Search, 
  SlidersHorizontal, 
  Download,
  Info,
  ChevronRight,
  X,
  FileText,
  UserCheck,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Plus,
  ArrowRight,
  AlertCircle,
  Upload,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { MOCK_NOMINA_ROWS, MOCK_ATTENDANCE_MAP, MOCK_RATES_MAP } from "./excel_data";

// --- Time & Conversion Helpers ---
const timeStrToDecimal = (t) => {
  if (t === null || t === undefined || t === "") return 0;
  if (typeof t === "number") return isNaN(t) ? 0 : t;
  const s = String(t).trim();
  const parts = s.split(":");
  if (parts.length < 2) {
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val;
  }
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h + m / 60;
};

const decimalToTimeStr = (dec) => {
  if (dec === null || dec === undefined || isNaN(dec)) return "00:00";
  let val = parseFloat(dec);
  if (isNaN(val)) return "00:00";
  if (val < 0) val += 24;
  if (val >= 24) val %= 24;
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const diffTimeStr = (t1, t2) => {
  if (!t1 || !t2) return "00:00";
  const dec1 = timeStrToDecimal(t1);
  const dec2 = timeStrToDecimal(t2);
  let diff = dec2 - dec1;
  if (diff < 0) diff += 24; // Rollover overnight
  return decimalToTimeStr(diff);
};

const getDecimalHours = (t1, t2) => {
  if (!t1 || !t2) return 0;
  const dec1 = timeStrToDecimal(t1);
  const dec2 = timeStrToDecimal(t2);
  if (isNaN(dec1) || isNaN(dec2)) return 0;
  let diff = dec2 - dec1;
  if (diff < 0) diff += 24; // Rollover overnight
  return Number(diff.toFixed(4));
};

const getHourDist = (h1, h2) => {
  let d = Math.abs(h1 - h2);
  if (d > 12) d = 24 - d;
  return d;
};

/**
 * Format a number as Colombian currency (COP) using dots as thousand separators.
 * This is locale-independent so it produces identical output on the Node.js SSR
 * server and the browser, preventing React hydration mismatches.
 */
const fmtCOP = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "-";
  const rounded = Math.round(Number(n));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Format a decimal number with 1-2 decimal places, using dot-separated thousands
 * and comma as decimal separator (Colombian style), without relying on locale.
 */
const fmtDec = (n, min = 1, max = 2) => {
  if (n === null || n === undefined || isNaN(n)) return "-";
  const val = Number(n);
  const fixed = val.toFixed(max);
  // Remove trailing zeros up to min decimal places
  const parts = fixed.split(".");
  let dec = parts[1] || "0";
  while (dec.length > min && dec.endsWith("0")) dec = dec.slice(0, -1);
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intPart},${dec}`;
};

// --- Config Parameters ---
const PERFILES_TURNOS = {
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

const getDefaultCategoryForCargo = (cargo) => {
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

const getProfileForCategory = (category) => {
  const cat = String(category || "").toUpperCase().trim();
  if (cat === "INYECCIÓN" || cat === "INYECCION" || cat === "NUEVOS") {
    return "INYECCION_MONITORES_MONTADORES";
  }
  return "TALLER_Y_OTROS";
};

const getTemplatesForCategory = (category) => {
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

const detectShiftTemplate = (hrEnt, hrSal, durationHrs, category = "OTROS") => {
  const ent = timeStrToDecimal(hrEnt);
  let sal = timeStrToDecimal(hrSal);
  const overnight = sal < ent;
  if (overnight) sal += 24;

  const shiftsToSearch = getTemplatesForCategory(category);

  let best = shiftsToSearch[0];
  let bestScore = Infinity;

  for (const t of shiftsToSearch) {
    const tplSal = t.overnight ? t.salPago + 24 : t.salPago;
    let score = Math.abs(ent - t.entPago) * 2 + Math.abs(sal - tplSal) * 2;
    score += Math.abs(durationHrs - t.expectedHours) * 3;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
};

const NOMINA_DATE_RANGE_KEY = "nomina_date_range_v1";

const loadPersistedDateRange = () => {
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

const emptyAttendanceDay = (dateStr) => ({
  dia: dateStr,
  hr_ent: "",
  hr_sal: "",
  hr_ent_desc1: "",
  hr_sal_desc1: "",
  total_desc1: "00:00",
  hr_ent_desc2: "",
  hr_sal_desc2: "",
  total_desc2: "00:00",
  hr_ent_pago: "",
  hr_sal_pago: "",
  hr_lab: 0,
  desc_lunch: 0,
  hr_pag: 0,
  diurnas: 0,
  nocturnas: 0,
  fes_diu: 0,
  fes_noc: 0,
  ext_diu: 0,
  ext_noc: 0,
  ext_fes_diu: 0,
  ext_fes_noc: 0,
  llegada_tarde: 0,
  llegada_tarde_min: 0,
});

const isEmployeeHeaderRow = (firstCell) => {
  const s = String(firstCell || "").trim();
  return (
    s.startsWith("Employee:") ||
    /^Employee\s*ID:/i.test(s) ||
    /Nombres:/i.test(s)
  );
};

const parseEmployeeNameFromHeader = (firstCell) => {
  const s = String(firstCell || "").trim();
  if (!s) return null;

  const nombresMatch = s.match(/Nombres:\s*([^,]+)/i);
  if (nombresMatch) return nombresMatch[1].trim().toUpperCase();

  if (s.startsWith("Employee:")) {
    const nameMatch = s.match(/First Name:\s*\[([^\]]+)\]/);
    const lastNameMatch = s.match(/Last Name:\s*\[([^\]]+)\]/);
    let empName = "";
    if (nameMatch) empName += nameMatch[1];
    if (lastNameMatch && lastNameMatch[1]) empName += " " + lastNameMatch[1];
    return empName.trim().toUpperCase() || null;
  }

  return null;
};

const parseMarcacionDate = (val) => {
  if (val == null || val === "") return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(epoch.getTime() + val * 86400000);
    if (!isNaN(dt.getTime())) {
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    }
  }
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m2) {
    let p1 = parseInt(m2[1], 10);
    let p2 = parseInt(m2[2], 10);
    let d, m;
    if (p1 > 12) {
      d = p1; m = p2;
    } else if (p2 > 12) {
      m = p1; d = p2;
    } else {
      // Default to DD/MM/YYYY for Colombia if ambiguous
      d = p1; m = p2;
    }
    return `${m2[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
};

const parseMarcacionTime = (val) => {
  if (val == null || val === "") return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${String(val.getHours()).padStart(2, "0")}:${String(val.getMinutes()).padStart(2, "0")}`;
  }
  if (typeof val === "number") {
    const totalMin = Math.round(val * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${String(parseInt(m[1], 10)).padStart(2, "0")}:${m[2]}`;
  return null;
};

// --- Biometric Cleaning Algorithm ---
const cleanWorkerPunches = (punches, startDate, endDate) => {
  // 1. Matriz Fija de la Quincena Inmutable
  const getDatesInRange = (start, end) => {
    const dates = [];
    try {
      const [sy, sm, sd] = start.split("-").map(Number);
      const [ey, em, ed] = end.split("-").map(Number);
      let curr = new Date(sy, sm - 1, sd);
      const stop = new Date(ey, em - 1, ed);
      if (isNaN(curr.getTime()) || isNaN(stop.getTime())) return [];
      let limit = 0;
      while (curr <= stop && limit < 90) {
        const ny = curr.getFullYear();
        const nm = String(curr.getMonth() + 1).padStart(2, "0");
        const nd = String(curr.getDate()).padStart(2, "0");
        dates.push(`${ny}-${nm}-${nd}`);
        curr.setDate(curr.getDate() + 1);
        limit++;
      }
    } catch (e) {
      console.error(e);
    }
    return dates;
  };

  const dates = getDatesInRange(startDate, endDate);
  const attendanceRows = {};
  dates.forEach(dateStr => {
    attendanceRows[dateStr] = {
      dia: dateStr,
      hr_ent: null,
      hr_sal_desc1: null,
      hr_ent_desc1: null,
      hr_sal: null,
    };
  });

  if (!punches || punches.length === 0) return attendanceRows;

  // 2. Ordenamiento Cronológico Absoluto
  const punchesWithTime = punches.map(p => {
    const [y, m, d] = p.fecha.split("-").map(Number);
    const [hh, mm] = p.hora.split(":").map(Number);
    const realTimeMs = new Date(y, m - 1, d, hh, mm).getTime();
    return { ...p, realTimeMs };
  }).sort((a, b) => a.realTimeMs - b.realTimeMs);

  // 3. De-duplicación por proximidad (5 minutos)
  const filteredPunches = [];
  for (let i = 0; i < punchesWithTime.length; i++) {
    const p = punchesWithTime[i];
    if (filteredPunches.length === 0) {
      filteredPunches.push(p);
    } else {
      const last = filteredPunches[filteredPunches.length - 1];
      const diffMin = (p.realTimeMs - last.realTimeMs) / 60000;
      if (diffMin >= 5) {
        filteredPunches.push(p);
      }
    }
  }

  // 4. Regla Siderúrgica del Cruce de Medianoche (Fecha Efectiva)
  const punchesByDate = {};
  for (let i = 0; i < filteredPunches.length; i++) {
    const p = filteredPunches[i];
    let effectiveDate = p.fecha;
    
    if (p.hora >= "00:00" && p.hora <= "07:00") {
      let isNightShiftExit = true; 
      if (i > 0) {
        const prev = filteredPunches[i - 1];
        const diffHours = (p.realTimeMs - prev.realTimeMs) / 3600000;
        
        // Si han pasado más de 14 horas desde la última marca, es un nuevo turno (Entrada de mañana)
        if (diffHours > 14) {
          isNightShiftExit = false;
        } 
        // Si la marca anterior fue una salida en la tarde (ej. 16:00 o 17:00) y pasaron ~13 horas,
        // esto es una nueva entrada al día siguiente.
        else if (diffHours > 8) {
          if (prev.hora >= "07:00" && prev.hora <= "17:30") {
            isNightShiftExit = false;
          }
        }
      } else {
        // Si es la primera marca de toda la quincena y es a las 06:00 AM, asumimos que es entrada
        // a menos que sea antes de las 04:00 AM.
        if (p.hora >= "04:00") {
          isNightShiftExit = false;
        }
      }

      if (isNightShiftExit) {
        const [y, m, d] = p.fecha.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() - 1);
        const ny = dateObj.getFullYear();
        const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
        const nd = String(dateObj.getDate()).padStart(2, "0");
        effectiveDate = `${ny}-${nm}-${nd}`;
      }
    }
    
    if (!punchesByDate[effectiveDate]) {
      punchesByDate[effectiveDate] = [];
    }
    punchesByDate[effectiveDate].push(p);
  }

  // 5. Asignación Matricial Inteligente
  Object.keys(punchesByDate).forEach(dateStr => {
    // Solo asignamos a días dentro de nuestro rango
    if (!attendanceRows[dateStr]) return;

    const dayPunches = punchesByDate[dateStr].sort((a, b) => a.realTimeMs - b.realTimeMs);
    if (dayPunches.length === 0) return;

    let hr_ent = "";
    let hr_sal_desc1 = "";
    let hr_ent_desc1 = "";
    let hr_sal = "";

    if (dayPunches.length === 1) {
      hr_ent = dayPunches[0].hora;
    } else if (dayPunches.length === 2) {
      hr_ent = dayPunches[0].hora;
      hr_sal = dayPunches[1].hora;
    } else if (dayPunches.length === 3) {
      hr_ent = dayPunches[0].hora;
      const thirdPunch = dayPunches[2].hora;
      if (thirdPunch > "14:00") {
        hr_sal = thirdPunch;
      } else {
        hr_sal_desc1 = dayPunches[1].hora;
        hr_sal = thirdPunch;
      }
    } else {
      hr_ent = dayPunches[0].hora;
      hr_sal_desc1 = dayPunches[1].hora;
      hr_ent_desc1 = dayPunches[2].hora;
      hr_sal = dayPunches[dayPunches.length - 1].hora;
    }

    attendanceRows[dateStr] = {
      ...attendanceRows[dateStr],
      hr_ent,
      hr_sal_desc1,
      hr_ent_desc1,
      hr_sal
    };
  });

  return attendanceRows;
};

// --- In-cell editing component with premium layout ---
function EditableCell({ value, onChange, type = "text", className = "", isCurrency = false, isDecimal = false, isOverridden = false, options = null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    let parsed = localVal;
    if (type === "number") {
      parsed = parseFloat(localVal);
      if (isNaN(parsed)) parsed = 0;
    }
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setLocalVal(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (options && Array.isArray(options)) {
      return (
        <select
          value={localVal || ""}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full min-w-[85px] bg-slate-900 text-white border-2 border-accent rounded px-1.5 py-0.5 outline-none text-[11px] font-bold"
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-slate-900 text-white text-[11px]">
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={type}
        step="any"
        value={localVal === null || localVal === undefined || isNaN(localVal) ? "" : localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full min-w-[70px] bg-slate-900 text-white border-2 border-accent rounded px-1.5 py-0.5 outline-none text-[11px] font-bold"
      />
    );
  }

  let displayVal = value;
  if (typeof value === "number" && !isNaN(value)) {
    if (isCurrency) {
      displayVal = `$${fmtCOP(value)}`;
    } else if (isDecimal) {
      displayVal = fmtDec(value);
    }
  } else if (value === null || value === undefined || (typeof value === "number" && isNaN(value))) {
    displayVal = "-";
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-accent/10 min-h-[22px] py-1 px-2 rounded-lg transition-all text-[11px] font-semibold border border-transparent hover:border-accent/40 ${
        isOverridden ? "bg-amber-500/10 border-amber-500/30 text-amber-800 hover:bg-amber-500/20" : "text-slate-800"
      } ${className}`}
    >
      {displayVal}
    </div>
  );
}

// Helper to look up overridden state values
const resolveValue = (overrides, key, formulaFn) => {
  if (overrides[key] !== undefined) {
    const val = overrides[key];
    if (typeof val === "number" && isNaN(val)) {
      return 0;
    }
    return val;
  }
  const computed = formulaFn();
  if (typeof computed === "number" && isNaN(computed)) {
    return 0;
  }
  return computed;
};

const PLANILLA_COLUMNS = [
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

const DAILY_COLUMNS = [
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

const LIQUIDATION_CONCEPTS = [
  { key: "h_diurna", label: "Horas Diurnas Ordinarias", pctKey: "h_diurna_pct", hrKey: "h_diurna_hr", valKey: "h_diurna_val", defaultPct: 0.0, textClass: "text-slate-900" },
  { key: "h_nocturna", label: "Recargo Nocturno Ordinario", pctKey: "h_nocturna_pct", hrKey: "h_nocturna_hr", valKey: "h_nocturna_val", defaultPct: 0.35, textClass: "text-indigo-900 font-bold" },
  { key: "h_festiva_diurna", label: "Recargo Festivo Diurno", pctKey: "h_festiva_diurna_pct", hrKey: "h_festiva_diurna_hr", valKey: "h_festiva_diurna_val", defaultPct: 0.75, textClass: "text-emerald-900" },
  { key: "h_festiva_nocturna", label: "Recargo Festivo Nocturno", pctKey: "h_festiva_nocturna_pct", hrKey: "h_festiva_nocturna_hr", valKey: "h_festiva_nocturna_val", defaultPct: 2.1, textClass: "text-purple-900" },
  { key: "h_extra_diurna", label: "Horas Extras Diurnas (S24 - Debe B26)", pctKey: "h_extra_diurna_pct", hrKey: "h_extra_diurna_hr", valKey: "h_extra_diurna_val", defaultPct: 1.5, textClass: "text-amber-900 font-bold" },
  { key: "h_extra_nocturna", label: "Horas Extras Nocturnas", pctKey: "h_extra_nocturna_pct", hrKey: "h_extra_nocturna_hr", valKey: "h_extra_nocturna_val", defaultPct: 1.75, textClass: "text-orange-900" },
  { key: "h_extra_festiva_diurna", label: "Extras Festivas Diurnas", pctKey: "h_extra_festiva_diurna_pct", hrKey: "h_extra_festiva_diurna_hr", valKey: "h_extra_festiva_diurna_val", defaultPct: 2.0, textClass: "text-red-900" },
  { key: "h_extra_festiva_nocturna", label: "Extras Festivas Nocturnas", pctKey: "h_extra_festiva_nocturna_pct", hrKey: "h_extra_festiva_nocturna_hr", valKey: "h_extra_festiva_nocturna_val", defaultPct: 2.5, textClass: "text-rose-900" }
];

export default function NominaPage() {
  const [activeTab, setActiveTab] = useState("planilla"); // planilla, trabajadores, colilla
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");

  const [nominaRows, setNominaRows] = useState(() => 
    MOCK_NOMINA_ROWS.map(row => ({
      ...row,
      categoria: row.categoria || getDefaultCategoryForCargo(row.cargo)
    }))
  );
  const [attendanceLogs, setAttendanceLogs] = useState(() => MOCK_ATTENDANCE_MAP);
  const [ratesMap] = useState(() => MOCK_RATES_MAP);
  const [overrides, setOverrides] = useState({});
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [showColumnManager, setShowColumnManager] = useState(false);

  const [selectedWorkerName, setSelectedWorkerName] = useState("ENODIS POLO MARTINEZ");

  // Toast notification state
  const [toast, setToast] = useState(null);

  // File upload state
  const [uploadStatus, setUploadStatus] = useState({
    state: "idle",   // "idle" | "reading" | "processing" | "success" | "error"
    fileName: "",
    progress: 0,
    detail: "",
  });

  // Prevent hydration mismatch by using same initial state on server and client, then updating after mount
  const [startDate, setStartDate] = useState("2026-04-25");
  const [endDate, setEndDate] = useState("2026-05-15");

  useEffect(() => {
    // Read persisted range on client side only, after hydration has completed
    const range = loadPersistedDateRange();
    setStartDate(range.start);
    setEndDate(range.end);

    try {
      const savedRows = localStorage.getItem("optimoldes_nomina_rows_v1");
      if (savedRows) setNominaRows(JSON.parse(savedRows));

      const savedLogs = localStorage.getItem("optimoldes_attendance_logs_v1");
      if (savedLogs) setAttendanceLogs(JSON.parse(savedLogs));

      const savedOverrides = localStorage.getItem("optimoldes_overrides_v1");
      if (savedOverrides) setOverrides(JSON.parse(savedOverrides));

      const savedHidden = localStorage.getItem("optimoldes_hidden_columns_v1");
      if (savedHidden) setHiddenColumns(JSON.parse(savedHidden));
    } catch (e) {
      console.error("Error loading persisted payroll data:", e);
    }
  }, []);

  useEffect(() => {
    document.title = "Nómina y Asistencia - OPTIMOLDES S.A.S.";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        NOMINA_DATE_RANGE_KEY,
        JSON.stringify({ start: startDate, end: endDate })
      );
    } catch {
      /* ignore */
    }
  }, [startDate, endDate]);

  const getDatesInRange = (start, end) => {
    const dates = [];
    try {
      let curr = new Date(start + "T00:00:00");
      const stop = new Date(end + "T00:00:00");
      if (isNaN(curr.getTime()) || isNaN(stop.getTime())) return [];
      let limit = 0;
      while (curr <= stop && limit < 90) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
        limit++;
      }
    } catch (e) {
      console.error(e);
    }
    return dates;
  };

  // --- Central Payroll Calculation Engine ---
  const payrollData = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);

    return nominaRows.map((registryRow) => {
      const workerName = registryRow.nombre;
      const mastPrefix = `${workerName}_master`;
      const cedula = resolveValue(overrides, `${mastPrefix}_cedula`, () => registryRow.cedula);
      const cargo = resolveValue(overrides, `${mastPrefix}_cargo`, () => registryRow.cargo);
      const categoria = resolveValue(overrides, `${mastPrefix}_categoria`, () => registryRow.categoria || getDefaultCategoryForCargo(cargo));

      // 1. Resolve daily attendance sheet rows for this period
      const workerDays = dates.map(dateStr => {
        const loggedDay = (attendanceLogs[workerName] || []).find(d => d.dia === dateStr) || emptyAttendanceDay(dateStr);
        const prefix = `${workerName}_day_${dateStr}`;

        const hr_ent = resolveValue(overrides, `${prefix}_hr_ent`, () => loggedDay.hr_ent);
        const hr_sal = resolveValue(overrides, `${prefix}_hr_sal`, () => loggedDay.hr_sal);
        const hr_ent_desc1 = resolveValue(overrides, `${prefix}_hr_ent_desc1`, () => loggedDay.hr_ent_desc1);
        const hr_sal_desc1 = resolveValue(overrides, `${prefix}_hr_sal_desc1`, () => loggedDay.hr_sal_desc1);
        const total_desc1 = resolveValue(overrides, `${prefix}_total_desc1`, () => diffTimeStr(hr_ent_desc1, hr_sal_desc1));
        const hr_ent_desc2 = resolveValue(overrides, `${prefix}_hr_ent_desc2`, () => loggedDay.hr_ent_desc2);
        const hr_sal_desc2 = resolveValue(overrides, `${prefix}_hr_sal_desc2`, () => loggedDay.hr_sal_desc2);
        const total_desc2 = resolveValue(overrides, `${prefix}_total_desc2`, () => diffTimeStr(hr_ent_desc2, hr_sal_desc2));

        const hr_ent_pago = resolveValue(overrides, `${prefix}_hr_ent_pago`, () => {
          if (!hr_ent || !hr_sal) return loggedDay.hr_ent_pago || null;
          const durationDecimal = getDecimalHours(hr_ent, hr_sal);
          const bestTpl = detectShiftTemplate(hr_ent, hr_sal, durationDecimal, categoria);
          return decimalToTimeStr(bestTpl.entPago);
        });

        const hr_sal_pago = resolveValue(overrides, `${prefix}_hr_sal_pago`, () => {
          if (!hr_ent || !hr_sal) return loggedDay.hr_sal_pago || null;
          const durationDecimal = getDecimalHours(hr_ent, hr_sal);
          const bestTpl = detectShiftTemplate(hr_ent, hr_sal, durationDecimal, categoria);
          return decimalToTimeStr(bestTpl.salPago);
        });

        const hr_lab = resolveValue(overrides, `${prefix}_hr_lab`, () => getDecimalHours(hr_ent_pago, hr_sal_pago));
        const desc_lunch = resolveValue(overrides, `${prefix}_desc_lunch`, () => (hr_lab > 8.9 ? 0.5 : 0));
        const hr_pag = resolveValue(overrides, `${prefix}_hr_pag`, () => Math.max(0, hr_lab - desc_lunch));

        const dateObj = new Date(dateStr + "T00:00:00");
        const isSunday = dateObj.getDay() === 0;

        const jDec = timeStrToDecimal(hr_ent_pago);
        const c41 = 4.8333; // 04:50
        const d41 = 18.0;   // 18:00

        let defaultO = 0;
        let defaultP = 0;
        let defaultQ = 0;
        let defaultR = 0;
        let defaultS = 0;
        let defaultT = 0;
        let defaultU = 0;
        let defaultV = 0;

        if (hr_ent_pago && hr_sal_pago) {
          if (isSunday) {
            const rVal = jDec > d41 ? (44 / 6) : 0;
            defaultR = Math.min(rVal, hr_pag);
            const qVal = (jDec >= c41 && jDec <= d41) ? (44 / 6) : 0;
            defaultQ = Math.min(qVal, Math.max(0, hr_pag - defaultR));
            
            if (jDec > d41) {
              defaultV = Math.max(0, hr_pag - defaultR);
            } else {
              defaultU = Math.max(0, hr_pag - defaultQ);
            }
          } else {
            const pVal = jDec > d41 ? (44 / 6) : 0;
            defaultP = Math.min(pVal, hr_pag);
            const oVal = (jDec >= c41 && jDec <= d41) ? ((44 / 6) - defaultP) : 0;
            defaultO = Math.min(oVal, Math.max(0, hr_pag - defaultP));
            
            if (jDec > d41) {
              defaultT = Math.max(0, hr_pag - defaultP);
            } else {
              defaultS = Math.max(0, hr_pag - defaultO);
            }
          }
        }

        const diurnas = resolveValue(overrides, `${prefix}_diurnas`, () => defaultO);
        const nocturnas = resolveValue(overrides, `${prefix}_nocturnas`, () => defaultP);
        const fes_diu = resolveValue(overrides, `${prefix}_fes_diu`, () => defaultQ);
        const fes_noc = resolveValue(overrides, `${prefix}_fes_noc`, () => defaultR);
        const ext_diu = resolveValue(overrides, `${prefix}_ext_diu`, () => defaultS);
        const ext_noc = resolveValue(overrides, `${prefix}_ext_noc`, () => defaultT);
        const ext_fes_diu = resolveValue(overrides, `${prefix}_ext_fes_diu`, () => defaultU);
        const ext_fes_noc = resolveValue(overrides, `${prefix}_ext_fes_noc`, () => defaultV);

        let defaultW = 0;
        let defaultX = 0;
        if (hr_ent && hr_ent_pago) {
          const entDec = timeStrToDecimal(hr_ent);
          const entPagoDec = timeStrToDecimal(hr_ent_pago);
          const diffMin = (entDec - entPagoDec) * 60;
          if (diffMin > 0) {
            defaultX = Math.round(diffMin);
            defaultW = 1;
          }
        }

        const llegada_tarde = resolveValue(overrides, `${prefix}_llegada_tarde`, () => defaultW);
        const llegada_tarde_min = resolveValue(overrides, `${prefix}_llegada_tarde_min`, () => defaultX);

        return {
          dia: dateStr,
          hr_ent,
          hr_sal,
          hr_ent_desc1,
          hr_sal_desc1,
          total_desc1,
          hr_ent_desc2,
          hr_sal_desc2,
          total_desc2,
          hr_ent_pago,
          hr_sal_pago,
          hr_lab,
          desc_lunch,
          hr_pag,
          diurnas,
          nocturnas,
          fes_diu,
          fes_noc,
          ext_diu,
          ext_noc,
          ext_fes_diu,
          ext_fes_noc,
          llegada_tarde,
          llegada_tarde_min
        };
      });

      // 2. Resolve Worker Liquidation Summary (B26, B37, D28-D36, F28-F36)
      const liqPrefix = `${workerName}_liq`;
      const salario_base = resolveValue(overrides, `${liqPrefix}_salario_base`, () => registryRow.salario || 0);
      const horas_debe = resolveValue(overrides, `${liqPrefix}_horas_debe`, () => {
        const mockRate = ratesMap[workerName];
        return mockRate ? mockRate.horas_debe : 0;
      });

      const sumDiu = workerDays.reduce((sum, d) => sum + (d.diurnas || 0), 0);
      const sumNoc = workerDays.reduce((sum, d) => sum + (d.nocturnas || 0), 0);
      const sumFesDiu = workerDays.reduce((sum, d) => sum + (d.fes_diu || 0), 0);
      const sumFesNoc = workerDays.reduce((sum, d) => sum + (d.fes_noc || 0), 0);
      const sumExtDiu = workerDays.reduce((sum, d) => sum + (d.ext_diu || 0), 0);
      const sumExtNoc = workerDays.reduce((sum, d) => sum + (d.ext_noc || 0), 0);
      const sumExtFesDiu = workerDays.reduce((sum, d) => sum + (d.ext_fes_diu || 0), 0);
      const sumExtFesNoc = workerDays.reduce((sum, d) => sum + (d.ext_fes_noc || 0), 0);

      const h_diurna_hr = resolveValue(overrides, `${liqPrefix}_h_diurna_hr`, () => sumDiu);
      const h_nocturna_hr = resolveValue(overrides, `${liqPrefix}_h_nocturna_hr`, () => sumNoc);
      const h_festiva_diurna_hr = resolveValue(overrides, `${liqPrefix}_h_festiva_diurna_hr`, () => sumFesDiu);
      const h_festiva_nocturna_hr = resolveValue(overrides, `${liqPrefix}_h_festiva_nocturna_hr`, () => sumFesNoc);
      const h_extra_diurna_hr = resolveValue(overrides, `${liqPrefix}_h_extra_diurna_hr`, () => sumExtDiu - horas_debe);
      const h_extra_nocturna_hr = resolveValue(overrides, `${liqPrefix}_h_extra_nocturna_hr`, () => sumExtNoc);
      const h_extra_festiva_diurna_hr = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_diurna_hr`, () => sumExtFesDiu);
      const h_extra_festiva_nocturna_hr = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_nocturna_hr`, () => sumExtFesNoc);

      const h_diurna_pct = resolveValue(overrides, `${liqPrefix}_h_diurna_pct`, () => 0.0);
      const h_nocturna_pct = resolveValue(overrides, `${liqPrefix}_h_nocturna_pct`, () => 0.35);
      const h_festiva_diurna_pct = resolveValue(overrides, `${liqPrefix}_h_festiva_diurna_pct`, () => 0.75);
      const h_festiva_nocturna_pct = resolveValue(overrides, `${liqPrefix}_h_festiva_nocturna_pct`, () => 2.1);
      const h_extra_diurna_pct = resolveValue(overrides, `${liqPrefix}_h_extra_diurna_pct`, () => 1.5);
      const h_extra_nocturna_pct = resolveValue(overrides, `${liqPrefix}_h_extra_nocturna_pct`, () => 1.75);
      const h_extra_festiva_diurna_pct = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_diurna_pct`, () => 2.0);
      const h_extra_festiva_nocturna_pct = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_nocturna_pct`, () => 2.5);

      const rateHour = salario_base / 240;
      const h_diurna_val = resolveValue(overrides, `${liqPrefix}_h_diurna_val`, () => rateHour * h_diurna_pct * h_diurna_hr);
      const h_nocturna_val = resolveValue(overrides, `${liqPrefix}_h_nocturna_val`, () => rateHour * h_nocturna_pct * h_nocturna_hr);
      const h_festiva_diurna_val = resolveValue(overrides, `${liqPrefix}_h_festiva_diurna_val`, () => rateHour * h_festiva_diurna_pct * h_festiva_diurna_hr);
      const h_festiva_nocturna_val = resolveValue(overrides, `${liqPrefix}_h_festiva_nocturna_val`, () => rateHour * h_festiva_nocturna_pct * h_festiva_nocturna_hr);
      const h_extra_diurna_val = resolveValue(overrides, `${liqPrefix}_h_extra_diurna_val`, () => rateHour * h_extra_diurna_pct * h_extra_diurna_hr);
      const h_extra_nocturna_val = resolveValue(overrides, `${liqPrefix}_h_extra_nocturna_val`, () => rateHour * h_extra_nocturna_pct * h_extra_nocturna_hr);
      const h_extra_festiva_diurna_val = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_diurna_val`, () => rateHour * h_extra_festiva_diurna_pct * h_extra_festiva_diurna_hr);
      const h_extra_festiva_nocturna_val = resolveValue(overrides, `${liqPrefix}_h_extra_festiva_nocturna_val`, () => rateHour * h_extra_festiva_nocturna_pct * h_extra_festiva_nocturna_hr);

      const horas_pendientes = resolveValue(overrides, `${liqPrefix}_horas_pendientes`, () => h_extra_diurna_hr + h_extra_nocturna_hr + h_extra_festiva_diurna_hr + h_extra_festiva_nocturna_hr);
      const total_extra_hrs = resolveValue(overrides, `${liqPrefix}_total_extra_hrs`, () => h_diurna_hr + h_nocturna_hr + h_festiva_diurna_hr + h_festiva_nocturna_hr + h_extra_diurna_hr + h_extra_nocturna_hr + h_extra_festiva_diurna_hr + h_extra_festiva_nocturna_hr);
      const total_extra_val = resolveValue(overrides, `${liqPrefix}_total_extra_val`, () => {
        const s = h_diurna_val + h_nocturna_val + h_festiva_diurna_val + h_festiva_nocturna_val + h_extra_diurna_val + h_extra_nocturna_val + h_extra_festiva_diurna_val + h_extra_festiva_nocturna_val;
        return s < 0 ? 0 : s;
      });

      const novedadesStr = `1. Recargo nocturno ${h_nocturna_hr.toFixed(2)} hrs`;

      // 3. Resolve Master General Planilla row data (A to AO)
      const dias_pagados = resolveValue(overrides, `${mastPrefix}_dias_pagados`, () => Math.min(15, dates.length));

      const horas_diurnas = resolveValue(overrides, `${mastPrefix}_horas_diurnas`, () => h_diurna_hr);
      const horas_nocturnas = resolveValue(overrides, `${mastPrefix}_horas_nocturnas`, () => h_nocturna_hr);
      const extras_diurnas = resolveValue(overrides, `${mastPrefix}_extras_diurnas`, () => h_extra_diurna_hr);
      const extras_nocturnas = resolveValue(overrides, `${mastPrefix}_extras_nocturnas`, () => h_extra_nocturna_hr);
      const extras_festivas = resolveValue(overrides, `${mastPrefix}_extras_festivas`, () => h_extra_festiva_diurna_hr);

      const sueldo = resolveValue(overrides, `${mastPrefix}_sueldo`, () => (salario_base / 30) * dias_pagados);
      const recargo_nocturno = resolveValue(overrides, `${mastPrefix}_recargo_nocturno`, () => ((salario_base / 230) * 0.35) * horas_nocturnas);
      const val_extras_diurnas = resolveValue(overrides, `${mastPrefix}_val_extras_diurnas`, () => ((salario_base / 240) * 1.25) * extras_diurnas);
      const val_extras_nocturnas = resolveValue(overrides, `${mastPrefix}_val_extras_nocturnas`, () => ((salario_base / 240) * 1.75) * extras_nocturnas);
      const val_extras_festivas = resolveValue(overrides, `${mastPrefix}_val_extras_festivas`, () => ((salario_base / 240) * 2.0) * extras_festivas);

      const comisiones = resolveValue(overrides, `${mastPrefix}_comisiones`, () => registryRow.comisiones || 0);
      const minWage = 1750905;
      const transportBase = 249095;
      const transporte = resolveValue(overrides, `${mastPrefix}_transporte`, () => (salario_base <= 2 * minWage ? (transportBase / 30) * dias_pagados : 0));
      const rodamiento = resolveValue(overrides, `${mastPrefix}_rodamiento`, () => registryRow.rodamiento || 0);

      const dias_incapacidad = resolveValue(overrides, `${mastPrefix}_dias_incapacidad`, () => registryRow.dias_incapacidad || 0);
      const incapacidad = resolveValue(overrides, `${mastPrefix}_incapacidad`, () => {
        const dailyMinBase = minWage / 30; // 58363.5
        const standardDailyBase = (salario_base / 30) * (2 / 3);
        const dailyIncapRate = standardDailyBase > dailyMinBase ? standardDailyBase : dailyMinBase;
        return dailyIncapRate * dias_incapacidad;
      });

      const total_devengados = resolveValue(overrides, `${mastPrefix}_total_devengados`, () => sueldo + recargo_nocturno + val_extras_diurnas + val_extras_nocturnas + val_extras_festivas + comisiones + transporte + rodamiento + incapacidad);

      const healthPensionBase = sueldo + recargo_nocturno + val_extras_diurnas + val_extras_nocturnas + val_extras_festivas + comisiones + incapacidad;
      const salud = resolveValue(overrides, `${mastPrefix}_salud`, () => healthPensionBase * 0.04);
      const pension = resolveValue(overrides, `${mastPrefix}_pension`, () => healthPensionBase * 0.04);
      const solidaridad = resolveValue(overrides, `${mastPrefix}_solidaridad`, () => (salario_base >= 4 * minWage ? (sueldo + recargo_nocturno + val_extras_diurnas + val_extras_nocturnas + val_extras_festivas + incapacidad) * 0.01 : 0));

      const prestamos = resolveValue(overrides, `${mastPrefix}_prestamos`, () => registryRow.prestamos || 0);
      const poliza_bolivar = resolveValue(overrides, `${mastPrefix}_poliza_bolivar`, () => registryRow.poliza_bolivar || 0);
      const poliza_plenitud = resolveValue(overrides, `${mastPrefix}_poliza_plenitud`, () => registryRow.poliza_plenitud || 0);
      const libranza_comfama = resolveValue(overrides, `${mastPrefix}_libranza_comfama`, () => registryRow.libranza_comfama || 0);
      const poliza_sura = resolveValue(overrides, `${mastPrefix}_poliza_sura`, () => registryRow.poliza_sura || 0);
      const optica = resolveValue(overrides, `${mastPrefix}_optica`, () => registryRow.optica || 0);
      const celular = resolveValue(overrides, `${mastPrefix}_celular`, () => registryRow.celular || 0);
      const retencion = resolveValue(overrides, `${mastPrefix}_retencion`, () => registryRow.retencion || 0);

      const total_deducciones = resolveValue(overrides, `${mastPrefix}_total_deducciones`, () => salud + pension + solidaridad + prestamos + poliza_bolivar + poliza_plenitud + libranza_comfama + poliza_sura + optica + celular + retencion);

      const total_pagar = resolveValue(overrides, `${mastPrefix}_total_pagar`, () => total_devengados - total_deducciones);
      const bonificacion = resolveValue(overrides, `${mastPrefix}_bonificacion`, () => registryRow.bonificacion || 0);
      const neto_pagar = resolveValue(overrides, `${mastPrefix}_neto_pagar`, () => total_pagar + bonificacion);
      const saldo_prestamo = resolveValue(overrides, `${mastPrefix}_saldo_prestamo`, () => registryRow.saldo_prestamo || 0);
      const verificacion = resolveValue(overrides, `${mastPrefix}_verificacion`, () => (total_devengados + bonificacion) * 0.40);

      const banco = resolveValue(overrides, `${mastPrefix}_banco`, () => registryRow.banco || "BANCOLOMBIA");
      const contract_type = registryRow.contract_type || "blue";

      return {
        name: workerName,
        registryRow,
        workerDays,
        liquidation: {
          salario_base,
          horas_debe,
          horas_pendientes,
          h_diurna_hr, h_diurna_pct, h_diurna_val,
          h_nocturna_hr, h_nocturna_pct, h_nocturna_val,
          h_festiva_diurna_hr, h_festiva_diurna_pct, h_festiva_diurna_val,
          h_festiva_nocturna_hr, h_festiva_nocturna_pct, h_festiva_nocturna_val,
          h_extra_diurna_hr, h_extra_diurna_pct, h_extra_diurna_val,
          h_extra_nocturna_hr, h_extra_nocturna_pct, h_extra_nocturna_val,
          h_extra_festiva_diurna_hr, h_extra_festiva_diurna_pct, h_extra_festiva_diurna_val,
          h_extra_festiva_nocturna_hr, h_extra_festiva_nocturna_pct, h_extra_festiva_nocturna_val,
          total_extra_hrs,
          total_extra_val,
          novedadesStr,
        },
        masterRow: {
          consecutivo: registryRow.consecutivo,
          nombre: workerName,
          cedula,
          cargo,
          categoria,
          salario: salario_base,
          dias_pagados,
          horas_diurnas,
          horas_nocturnas,
          extras_diurnas,
          extras_nocturnas,
          extras_festivas,
          sueldo,
          recargo_nocturno,
          val_extras_diurnas,
          val_extras_nocturnas,
          val_extras_festivas,
          comisiones,
          transporte,
          rodamiento,
          dias_incapacidad,
          incapacidad,
          total_devengados,
          salud,
          pension,
          solidaridad,
          prestamos,
          poliza_bolivar,
          poliza_plenitud,
          libranza_comfama,
          poliza_sura,
          optica,
          celular,
          retencion,
          total_deducciones,
          total_pagar,
          bonificacion,
          neto_pagar,
          saldo_prestamo,
          verificacion,
          banco,
          contract_type
        }
      };
    });
  }, [nominaRows, attendanceLogs, overrides, startDate, endDate, ratesMap]);

  // Filtering based on SearchTerm and Position selector
  const filteredPayrollData = useMemo(() => {
    return payrollData.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(item.masterRow.cedula).includes(searchTerm);
      const posMatch = filterPosition === "all" || item.masterRow.cargo === filterPosition;
      return nameMatch && posMatch;
    });
  }, [payrollData, searchTerm, filterPosition]);

  const categorySegmentedData = useMemo(() => {
    const segments = {
      "INYECCIÓN": { count: 0, salarioBase: 0, devengado: 0, deducciones: 0, neto: 0, extras: 0 },
      "TALLER": { count: 0, salarioBase: 0, devengado: 0, deducciones: 0, neto: 0, extras: 0 },
      "OTROS": { count: 0, salarioBase: 0, devengado: 0, deducciones: 0, neto: 0, extras: 0 },
      "NUEVOS": { count: 0, salarioBase: 0, devengado: 0, deducciones: 0, neto: 0, extras: 0 }
    };

    filteredPayrollData.forEach(item => {
      const cat = item.masterRow.categoria || "OTROS";
      const normalizedCat = ["INYECCIÓN", "INYECCION", "TALLER", "OTROS", "NUEVOS"].includes(cat.toUpperCase())
        ? (cat.toUpperCase() === "INYECCION" ? "INYECCIÓN" : cat.toUpperCase())
        : "OTROS";

      if (segments[normalizedCat]) {
        segments[normalizedCat].count += 1;
        segments[normalizedCat].salarioBase += (item.masterRow.salario || 0);
        segments[normalizedCat].devengado += (item.masterRow.total_devengados || 0);
        segments[normalizedCat].deducciones += (item.masterRow.total_deducciones || 0);
        segments[normalizedCat].neto += (item.masterRow.neto_pagar || 0);
        segments[normalizedCat].extras += (item.liquidation.total_extra_val || 0);
      }
    });

    return segments;
  }, [filteredPayrollData]);

  // List of positions for filters
  const positions = useMemo(() => {
    return ["all", ...new Set(nominaRows.map(r => r.cargo))];
  }, [nominaRows]);

  // Column totals in General Planilla, guarded against NaN addition
  const totals = useMemo(() => {
    const t = {};
    PLANILLA_COLUMNS.forEach(col => {
      t[col.key] = 0;
    });

    filteredPayrollData.forEach(item => {
      PLANILLA_COLUMNS.forEach(col => {
        if (col.type === "number") {
          const val = item.masterRow[col.key];
          t[col.key] += (typeof val === "number" && !isNaN(val) ? val : 0);
        }
      });
    });

    return t;
  }, [filteredPayrollData]);

  // Bank Summaries, guarded against NaN values
  const bankTotals = useMemo(() => {
    let bancolombia = 0;
    let cajaSocial = 0;
    filteredPayrollData.forEach(item => {
      const bank = String(item.masterRow.banco).toUpperCase();
      const val = item.masterRow.neto_pagar || 0;
      if (!isNaN(val)) {
        if (bank.includes("BANCOLOMBIA")) {
          bancolombia += val;
        } else if (bank.includes("SOCIAL") || bank.includes("BCSC") || bank.includes("CAJA")) {
          cajaSocial += val;
        }
      }
    });
    return { bancolombia, cajaSocial };
  }, [filteredPayrollData]);

  // Active selected worker data object
  const selectedWorkerData = useMemo(() => {
    return payrollData.find(item => item.name === selectedWorkerName) || payrollData[0];
  }, [payrollData, selectedWorkerName]);

  const handleCellEdit = (cellKey, val) => {
    setOverrides(prev => ({
      ...prev,
      [cellKey]: val
    }));
  };

  const handleResetOverrides = () => {
    if (confirm("¿Estás seguro de restablecer todas las celdas a sus fórmulas por defecto? Se perderán las modificaciones manuales.")) {
      setOverrides({});
      setUploadStatus({
        state: "idle",
        fileName: "",
        progress: 0,
        detail: "",
      });
      try {
        localStorage.removeItem("optimoldes_nomina_rows_v1");
        localStorage.removeItem("optimoldes_attendance_logs_v1");
        localStorage.removeItem("optimoldes_overrides_v1");
        localStorage.removeItem("optimoldes_hidden_columns_v1");
      } catch (e) {
        /* ignore */
      }
      setHiddenColumns({});
      setToast({
        message: "Se han restablecido todas las fórmulas de Excel.",
        type: "success"
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSaveToLocalStorage = () => {
    try {
      localStorage.setItem("optimoldes_nomina_rows_v1", JSON.stringify(nominaRows));
      localStorage.setItem("optimoldes_attendance_logs_v1", JSON.stringify(attendanceLogs));
      localStorage.setItem("optimoldes_overrides_v1", JSON.stringify(overrides));
      localStorage.setItem("optimoldes_hidden_columns_v1", JSON.stringify(hiddenColumns));
      setToast({
        message: "¡Cambios guardados con éxito en el navegador!",
        type: "success"
      });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setToast({
        message: "Error al guardar los cambios.",
        type: "error"
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const isCellOverridden = (key) => overrides[key] !== undefined;

  // --- Clock-ins Excel Uploader ---
  const matchEmployeeName = (clockInName) => {
    const norm = (s) => s.toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z\s]/g, "")
      .replace(/\s+/g, " ").trim();
      
    const cleanClockIn = norm(clockInName);
    let matched = null;
    const workerNames = nominaRows.map(r => r.nombre);
    
    for (const wName of workerNames) {
      const cleanW = norm(wName);
      if (cleanClockIn === cleanW || cleanW.includes(cleanClockIn) || cleanClockIn.includes(cleanW)) {
        matched = wName;
        break;
      }
      
      const wParts = cleanW.split(" ");
      const cParts = cleanClockIn.split(" ");
      if (wParts.length >= 2 && cParts.length >= 2) {
        if (wParts[0] === cParts[0] && wParts[1] === cParts[1]) {
          matched = wName;
          break;
        }
      }
    }
    return matched;
  };

  const handleFileUpload = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setUploadStatus({
      state: "reading",
      fileName: file.name,
      progress: 15,
      detail: "Leyendo archivo...",
    });

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(40, Math.round((ev.loaded / ev.total) * 40));
        setUploadStatus((prev) => ({ ...prev, progress: pct }));
      }
    };

    reader.onload = (evt) => {
      try {
        setUploadStatus((prev) => ({
          ...prev,
          state: "processing",
          progress: 55,
          detail: "Interpretando marcaciones...",
        }));

        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const newAttendance = { ...attendanceLogs };
        let currentEmployee = null;
        let employeePunches = [];
        const stats = {
          parsedCount: 0,
          filledDays: 0,
          unmatched: [],
          matchedNames: [],
          totalPunches: 0,
        };

        const flushEmployeeBlock = (accumulatedLogs, employeeName, punches, recordStats) => {
          if (!employeeName || punches.length === 0) return;
          const matchedName = matchEmployeeName(employeeName);
          if (!matchedName) {
            recordStats.unmatched.push(employeeName);
            return;
          }

          const cleaned = cleanWorkerPunches(punches, startDate, endDate);
          if (!accumulatedLogs[matchedName]) {
            accumulatedLogs[matchedName] = [];
          }

          const existing = accumulatedLogs[matchedName];
          const byDate = new Map(existing.map(d => [d.dia, d]));

          Object.keys(cleaned).forEach(dateStr => {
            byDate.set(dateStr, {
              ...(byDate.get(dateStr) || emptyAttendanceDay(dateStr)),
              ...cleaned[dateStr]
            });
          });

          accumulatedLogs[matchedName] = Array.from(byDate.values()).sort((a, b) => a.dia.localeCompare(b.dia));
          recordStats.parsedCount += 1;

          const filled = Object.keys(cleaned).filter(dateStr => cleaned[dateStr].hr_ent !== "").length;
          recordStats.filledDays += filled;
          recordStats.matchedNames.push(matchedName);
        };

        rows.forEach((row) => {
          if (!row || row.length === 0) return;
          const firstCell = String(row[0] || "").trim();

          if (isEmployeeHeaderRow(firstCell)) {
            flushEmployeeBlock(newAttendance, currentEmployee, employeePunches, stats);
            currentEmployee = parseEmployeeNameFromHeader(firstCell);
            employeePunches = [];
            return;
          }

          if (
            firstCell.toLowerCase().includes("estado de empleado") ||
            firstCell.toLowerCase().includes("reporte de marcaciones")
          ) {
            return;
          }

          if (currentEmployee && row.length >= 6) {
            const dateStr = parseMarcacionDate(row[3]);
            const timeStr = parseMarcacionTime(row[4]);
            const typeStr = String(row[5] || "").trim();

            if (dateStr && timeStr) {
              employeePunches.push({ fecha: dateStr, hora: timeStr, tipo: typeStr });
              stats.totalPunches += 1;
            }
          }
        });

        flushEmployeeBlock(newAttendance, currentEmployee, employeePunches, stats);

        if (stats.parsedCount > 0) {
          setAttendanceLogs(newAttendance);
          const firstMatched = stats.matchedNames[0];
          if (firstMatched) setSelectedWorkerName(firstMatched);

          const successHint = stats.filledDays === 0 && stats.totalPunches > 0
            ? "Marcaciones importadas fuera del rango quincenal actual."
            : `${stats.parsedCount} colaborador(es) procesado(s) (${startDate} → ${endDate})`;

          setUploadStatus({
            state: stats.filledDays === 0 && stats.totalPunches > 0 ? "error" : "success",
            fileName: file.name,
            progress: 100,
            detail: successHint,
          });

          let msg = `Cargado: ${stats.parsedCount} colaboradores, ${stats.totalPunches} marcaciones en total.`;
          if (stats.unmatched.length > 0) {
            msg += ` Sin coincidir: ${stats.unmatched.slice(0, 2).join(", ")}`;
          }
          setToast({
            message: msg,
            type: "success",
          });
          setTimeout(() => setToast(null), 5000);
        } else {
          setUploadStatus({
            state: "error",
            fileName: file.name,
            progress: 100,
            detail: "No se identificaron colaboradores del biométrico en la nómina.",
          });
          setToast({
            message: "No se encontraron marcaciones válidas para colaboradores registrados.",
            type: "error",
          });
          setTimeout(() => setToast(null), 5000);
        }
      } catch (err) {
        console.error(err);
        setUploadStatus({
          state: "error",
          fileName: file.name,
          progress: 100,
          detail: "Error al procesar el archivo Excel.",
        });
        setToast({
          message: "Formato de archivo inválido.",
          type: "error",
        });
        setTimeout(() => setToast(null), 5000);
      } finally {
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClearAttendanceData = (scope = "worker") => {
    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) return;

    const confirmMsg = scope === "all"
      ? "¿Borrar marcaciones de TODOS los trabajadores en el rango seleccionado?"
      : `¿Borrar marcaciones de ${selectedWorkerName} en el rango ${startDate} a ${endDate}?`;

    if (!confirm(confirmMsg)) return;

    const newLogs = { ...attendanceLogs };
    const targets = scope === "all" ? nominaRows.map(r => r.nombre) : [selectedWorkerName];

    targets.forEach(name => {
      const existing = newLogs[name] || [];
      const byDate = new Map(existing.map(d => [d.dia, d]));
      dates.forEach(dateStr => {
        byDate.set(dateStr, emptyAttendanceDay(dateStr));
      });
      newLogs[name] = Array.from(byDate.values()).sort((a, b) => a.dia.localeCompare(b.dia));
    });

    setAttendanceLogs(newLogs);
    setToast({
      message: scope === "all" ? "Marcaciones borradas para todos en el rango." : `Marcaciones borradas para ${selectedWorkerName}.`,
      type: "success",
    });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="w-full max-w-[98%] xl:max-w-[96%] mx-auto space-y-8 animate-stitch pb-12">
      
      {/* Header Banner - Sleek Glassmorphism */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/80 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-800 shadow-sm">
            <Coins size={12} className="text-yellow-400" />
            NÓMINA DE ALTA FIDELIDAD
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Nómina y Asistencia</h2>
          <p className="text-slate-500 font-medium text-sm">Cálculos salariales en cascada, marcaciones biométricas y recargos con edición manual estilo Excel.</p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-2xl border border-slate-200/40">
          <button 
            onClick={() => setActiveTab("planilla")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "planilla" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Planilla Nómina General
          </button>
          <button 
            onClick={() => setActiveTab("trabajadores")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "trabajadores" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Hoja Trabajador
          </button>
          <button 
            onClick={() => setActiveTab("colilla")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "colilla" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Colillas de Pago
          </button>
        </div>
      </header>

      {/* Global Information Alert & Formula Reset Control */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-md">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
          <Info size={16} className="text-accent shrink-0" />
          <span>Haz clic en cualquier celda para editar. Al escribir, la celda se congelará (color ámbar) anulando el cálculo automático de Excel.</span>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={handleSaveToLocalStorage}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-100 active:scale-95 duration-200"
          >
            <CheckCircle2 size={14} />
            Guardar Cambios
          </button>
          <button
            onClick={handleResetOverrides}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 duration-200"
          >
            <RotateCcw size={14} />
            Restablecer Fórmulas Excel
          </button>
        </div>
      </div>

      {/* --- TAB 1: PLANILLA GENERAL GENERAL DE NOMINA --- */}
      {activeTab === "planilla" && (
        <div className="space-y-6 animate-stitch">
          
          {/* Quick Metrics */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stitch-card p-6 bg-slate-900 text-white relative overflow-hidden group shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Neto a Pagar (AL)</p>
              <h3 className="text-3xl font-black tracking-tight">${fmtCOP(totals.neto_pagar)}</h3>
              <p className="text-[9px] font-bold text-yellow-400 mt-3 uppercase tracking-wider">Transferencias quincenales</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Devengado (W)</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">${fmtCOP(totals.total_devengados)}</h3>
              <p className="text-[9px] font-bold text-emerald-500 mt-3 uppercase tracking-wider">Sueldos, recargos y extras</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deducciones (AI)</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">${fmtCOP(totals.total_deducciones)}</h3>
              <p className="text-[9px] font-bold text-rose-500 mt-3 uppercase tracking-wider">Salud, Pensión, Pólizas, Préstamos</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Colaboradores Activos</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{filteredPayrollData.length} Operarios</h3>
              <p className="text-[9px] font-bold text-indigo-500 mt-3 uppercase tracking-wider">Filtro de planilla</p>
            </div>
          </section>

          {/* Segmentación de Costos por Categoría */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(categorySegmentedData).map(([catName, data]) => {
              let themeClass = "border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-white";
              let pillClass = "bg-blue-100 text-blue-800";
              let iconColor = "text-blue-500";
              if (catName === "INYECCIÓN") {
                themeClass = "border-cyan-200/50 bg-gradient-to-br from-cyan-50/30 to-white";
                pillClass = "bg-cyan-100 text-cyan-800";
                iconColor = "text-cyan-500";
              } else if (catName === "TALLER") {
                themeClass = "border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-white";
                pillClass = "bg-purple-100 text-purple-800";
                iconColor = "text-purple-500";
              } else if (catName === "OTROS") {
                themeClass = "border-slate-200/50 bg-gradient-to-br from-slate-50/30 to-white";
                pillClass = "bg-slate-100 text-slate-800";
                iconColor = "text-slate-500";
              } else if (catName === "NUEVOS") {
                themeClass = "border-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-white";
                pillClass = "bg-emerald-100 text-emerald-800";
                iconColor = "text-emerald-500";
              }

              return (
                <div key={catName} className={`stitch-card p-5 border shadow-sm transition-all duration-300 hover:shadow-md ${themeClass}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${pillClass}`}>
                      {catName}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {data.count} {data.count === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Neto a Pagar:</span>
                      <span className="text-base font-black text-slate-900">${fmtCOP(data.neto)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Costo Recargos/Extras:</span>
                      <span className={`text-xs font-extrabold ${iconColor}`}>${fmtCOP(data.extras)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Table Filters & Query Inputs */}
          <section className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o cédula..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-950"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 border border-slate-200 rounded-2xl w-full md:w-auto">
                <SlidersHorizontal size={16} className="text-slate-400" />
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none cursor-pointer capitalize w-full md:w-auto text-slate-950"
                >
                  {positions.map(pos => (
                    <option key={pos} value={pos}>
                      {pos === "all" ? "Todos los Cargos" : pos.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Columnas (Ocultar/Mostrar) */}
              <div className="relative w-full md:w-auto">
                <button
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:border-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 duration-150"
                >
                  <SlidersHorizontal size={14} className="text-slate-400" />
                  Columnas ({PLANILLA_COLUMNS.length - Object.values(hiddenColumns).filter(Boolean).length} visibles)
                </button>

                {showColumnManager && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 max-h-[300px] overflow-y-auto space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mostrar / Ocultar Columnas</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                      {PLANILLA_COLUMNS.map(col => {
                        const isProtected = ["consecutivo", "nombre"].includes(col.key);
                        if (isProtected) return null;
                        const isHidden = !!hiddenColumns[col.key];
                        return (
                          <label key={col.key} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => setHiddenColumns(prev => ({
                                ...prev,
                                [col.key]: !prev[col.key]
                              }))}
                              className="accent-slate-900 cursor-pointer"
                            />
                            <span className="truncate" title={col.label}>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Master Table Sheet */}
          <section className="stitch-card bg-white/70 backdrop-blur-md border border-white/40 shadow-xl overflow-hidden rounded-3xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <FileText size={16} className="text-slate-400" />
                Planilla de Nómina General (Columnas B - AO)
              </h4>
              <button 
                onClick={() => alert("Archivo generado con éxito: Planilla_Nomina_OPTIMOLDES.xlsx")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-accent text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md shadow-slate-200"
              >
                <Download size={14} />
                Exportar Planilla
              </button>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left border-collapse table-auto min-w-[3400px]">
                <thead>
                  {/* Row 1: Excel Column Letters */}
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 text-center uppercase border-b border-slate-200">
                    {PLANILLA_COLUMNS.map(col => {
                      if (hiddenColumns[col.key]) return null;
                      return (
                        <th 
                          key={col.key} 
                          className={`px-2 py-1 border-r border-slate-200 bg-slate-100/50 ${
                            col.sticky ? `sticky ${col.sticky} z-20` : ""
                          }`}
                        >
                          {col.letter}
                        </th>
                      );
                    })}
                  </tr>

                  {/* Row 2: Header Labels */}
                  <tr className="text-[10px] font-black text-slate-505 uppercase tracking-wider border-b border-slate-200 bg-white">
                    {PLANILLA_COLUMNS.map(col => {
                      if (hiddenColumns[col.key]) return null;
                      return (
                        <th 
                          key={col.key} 
                          className={`px-4 py-3.5 border-r border-slate-200 bg-white ${
                            col.sticky ? `sticky ${col.sticky} z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]` : ""
                          } ${col.center ? "text-center" : col.key === "nombre" || col.key === "cargo" ? "text-left" : "text-right"}`}
                        >
                          {col.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {filteredPayrollData.map((item) => {
                    const row = item.masterRow;
                    const isExt = row.contract_type === "green";
                    
                    return (
                      <tr 
                        key={row.consecutivo} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isExt 
                            ? "border-l-4 border-emerald-500 bg-emerald-50/5 hover:bg-emerald-50/10" 
                            : "border-l-4 border-blue-500 bg-blue-50/5 hover:bg-blue-50/10"
                        }`}
                      >
                        {PLANILLA_COLUMNS.map(col => {
                          if (hiddenColumns[col.key]) return null;
                          const overrideKey = `${row.nombre}_master_${col.key}`;
                          const isOver = isCellOverridden(overrideKey);
                          
                          // Handle sticky columns separately
                          if (col.key === "consecutivo") {
                            return (
                              <td 
                                key={col.key} 
                                className="px-4 py-2.5 text-center border-r border-slate-100 sticky left-0 bg-white z-10 font-bold text-slate-400 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                              >
                                {row.consecutivo}
                              </td>
                            );
                          }
                          if (col.key === "nombre") {
                            return (
                              <td 
                                key={col.key} 
                                className="px-4 py-2.5 border-r border-slate-100 sticky left-16 bg-white z-10 font-black text-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                              >
                                <div className="flex items-center gap-2">
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${isExt ? "bg-emerald-500" : "bg-blue-500"}`} 
                                    title={isExt ? "Externo (Saitemp)" : "Interno (Optimoldes)"}
                                  />
                                  <span>{row.nombre}</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td 
                              key={col.key} 
                              className={`px-2 py-1.5 border-r border-slate-100 ${col.bg || ""} ${col.center ? "text-center" : "text-right"}`}
                            >
                              {col.editable ? (
                                <EditableCell
                                  value={row[col.key]}
                                  type={col.type === "number" ? "number" : "text"}
                                  isCurrency={col.isCurrency}
                                  isDecimal={col.isDecimal}
                                  isOverridden={isOver}
                                  options={col.options}
                                  onChange={(val) => handleCellEdit(overrideKey, val)}
                                  className={`${col.center ? "text-center" : "text-right"} ${col.textClass || ""}`}
                                />
                              ) : (
                                <div className={`px-2 py-1 text-[11px] font-semibold text-slate-800 ${col.center ? "text-center" : "text-right"} ${col.textClass || ""}`}>
                                  {typeof row[col.key] === "number" && !isNaN(row[col.key])
                                    ? col.isCurrency 
                                      ? `$${fmtCOP(row[col.key])}`
                                      : col.isDecimal
                                        ? fmtDec(row[col.key])
                                        : row[col.key]
                                    : row[col.key] || "-"}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Totales Generales Row */}
                  <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                    {PLANILLA_COLUMNS.map(col => {
                      if (hiddenColumns[col.key]) return null;
                      if (col.key === "consecutivo") {
                        return (
                          <td key={col.key} className="px-4 py-4 border-r border-slate-800 sticky left-0 bg-slate-900 z-10 text-center uppercase tracking-widest">
                            TOTALES
                          </td>
                        );
                      }
                      if (col.key === "nombre") {
                        return (
                          <td key={col.key} className="px-4 py-4 border-r border-slate-800 sticky left-16 bg-slate-900 z-10 text-left font-black">
                            {filteredPayrollData.length} Operarios
                          </td>
                        );
                      }

                      const val = totals[col.key];
                      return (
                        <td key={col.key} className={`px-4 py-4 border-r border-slate-800 ${col.center ? "text-center" : "text-right"}`}>
                          {col.type === "number" ? (
                            col.isCurrency
                              ? `$${fmtCOP(val)}`
                              : col.isDecimal
                                ? fmtDec(val)
                                : (isNaN(val) ? "-" : Math.round(val))
                          ) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Bank Transfer Summaries */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="stitch-card p-6 bg-gradient-to-br from-yellow-50/50 to-white border border-yellow-200/50 shadow-md flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-1">TOTAL TRANSFERENCIAS BANCOLOMBIA</p>
                <p className="text-xs text-slate-500 font-bold">Colaboradores inscritos en Bancolombia</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900">${fmtCOP(bankTotals.bancolombia)}</h3>
            </div>
            <div className="stitch-card p-6 bg-gradient-to-br from-blue-50/50 to-white border border-blue-200/50 shadow-md flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">TOTAL TRANSFERENCIAS CAJA SOCIAL</p>
                <p className="text-xs text-slate-500 font-bold">Colaboradores inscritos en Caja Social</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900">${fmtCOP(bankTotals.cajaSocial)}</h3>
            </div>
          </section>
        </div>
      )}

      {/* --- TAB 2: HOJA INDIVIDUAL DE TRABAJADOR --- */}
      {activeTab === "trabajadores" && (
        <div className="space-y-6 animate-stitch">
          
          {/* Controls, Date range selectors, & Excel Upload */}
          <section className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md">
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-700 shrink-0" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Marcaciones Diarias y Liquidación</h4>
                <p className="text-slate-500 text-xs font-semibold">Cálculo de recargos de horas extras para liquidación individual.</p>
              </div>
            </div>
            
            {/* Date period inputs */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-slate-955 outline-none cursor-pointer text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-slate-955 outline-none cursor-pointer text-slate-900"
                />
              </div>
            </div>

            {/* Actions: File upload & Worker dropdown selection */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Drag-and-drop zone */}
              <div className="flex flex-col gap-2 min-w-[280px]">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add("border-slate-800", "bg-slate-100/50");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove("border-slate-800", "bg-slate-100/50");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove("border-slate-800", "bg-slate-100/50");
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleFileUpload({ target: { files: [file] } });
                    }
                  }}
                  onClick={() => document.getElementById("reloj-file-input").click()}
                  className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-sm text-center ${
                    uploadStatus.state === "success"
                      ? "border-emerald-400 bg-emerald-50/60"
                      : uploadStatus.state === "error"
                        ? "border-rose-300 bg-rose-50/50"
                        : "border-slate-200 hover:border-slate-800 bg-slate-50/50 hover:bg-slate-100/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {uploadStatus.state === "reading" || uploadStatus.state === "processing" ? (
                      <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : uploadStatus.state === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-slate-800" />
                    )}
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                      {uploadStatus.state === "success"
                        ? "Archivo cargado"
                        : uploadStatus.state === "reading" || uploadStatus.state === "processing"
                          ? "Procesando..."
                          : "Arrastra o selecciona archivo"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    Reporte Biométrico Plano (.xlsx)
                  </p>
                  <input
                    id="reloj-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {(uploadStatus.state !== "idle" || uploadStatus.fileName) && (
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <FileSpreadsheet size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate" title={uploadStatus.fileName}>
                        {uploadStatus.fileName}
                      </span>
                    </div>
                    <p className={`text-[9px] font-bold uppercase tracking-wide ${uploadStatus.state === "error" ? "text-rose-600" : "text-emerald-600"}`}>
                      {uploadStatus.detail}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleClearAttendanceData("worker")}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                  <Trash2 size={13} />
                  Limpiar Operario
                </button>
                <button
                  type="button"
                  onClick={() => handleClearAttendanceData("all")}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                  <Trash2 size={13} />
                  Limpiar Todos (Rango)
                </button>
              </div>

              {/* Worker selection dropdown */}
              <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ver Operario:</span>
                <select
                  value={selectedWorkerName}
                  onChange={(e) => setSelectedWorkerName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-950 outline-none cursor-pointer max-w-[220px]"
                >
                  {nominaRows.map(member => (
                    <option key={member.nombre} value={member.nombre}>
                      {member.nombre}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </section>

          {/* Selected Worker Header Banner */}
          {(() => {
            const isExt = selectedWorkerData.masterRow.contract_type === "green";
            return (
              <div 
                className={`p-6 rounded-[2rem] border transition-all shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isExt 
                    ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white border-emerald-200" 
                    : "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-white border-blue-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isExt ? "bg-emerald-500" : "bg-blue-500"}`} />
                    <span className="text-xs font-black tracking-widest uppercase opacity-75 text-slate-500">
                      {isExt ? "CONTRATO EXTERNO (SAITEMP) - HOJA VERDE" : "CONTRATO EMPRESA (OPTIMOLDES) - HOJA AZUL"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{selectedWorkerName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedWorkerData.masterRow.cargo} • C.C. {selectedWorkerData.masterRow.cedula}</p>
                    <span className="text-slate-300 select-none font-bold">|</span>
                    <div className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 transition-all">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Categoría:</span>
                      <select
                        value={selectedWorkerData.masterRow.categoria}
                        onChange={(e) => handleCellEdit(`${selectedWorkerName}_master_categoria`, e.target.value)}
                        className="bg-transparent border-none text-[10px] font-extrabold text-slate-800 focus:outline-none cursor-pointer uppercase py-0"
                      >
                        {["INYECCIÓN", "TALLER", "OTROS", "NUEVOS"].map(opt => (
                          <option key={opt} value={opt} className="bg-white text-slate-800 text-[10px]">{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide pt-1">
                    Perfil Turnos: <span className="text-slate-700 font-extrabold">{getProfileForCategory(selectedWorkerData.masterRow.categoria) === "INYECCION_MONITORES_MONTADORES" ? "Inyección, Monitores y Montadores" : "Taller y Otros"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">SALARIO BASE (B37)</span>
                    <span className="text-lg font-black text-slate-900">
                      ${fmtCOP(selectedWorkerData.liquidation.salario_base)}
                    </span>
                  </div>
                  <div className="text-right border-l pl-6 border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">TOTAL RECARGOS Y EXTRAS (F36)</span>
                    <span className={`text-lg font-black ${isExt ? "text-emerald-600" : "text-blue-600"}`}>
                      ${fmtCOP(selectedWorkerData.liquidation.total_extra_val)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* A. Daily Attendance Log (Rows 7 to 23) */}
          <section className="stitch-card bg-white/70 backdrop-blur-md border border-white/40 shadow-xl overflow-hidden rounded-3xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                A. Registro Diario de Horas y Descansos (Filas 7 a 23)
              </h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hojas individuales de asistencia quincenal</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto min-w-[2000px]">
                <thead>
                  {/* Row 1: Excel Column Letters */}
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 text-center uppercase border-b border-slate-200">
                    {DAILY_COLUMNS.map(col => (
                      <th key={col.key} className="px-2 py-1 border-r border-slate-200 bg-slate-100/50">
                        {col.letter}
                      </th>
                    ))}
                  </tr>

                  {/* Row 2: Labels */}
                  <tr className="text-[10px] font-black text-slate-505 uppercase tracking-wider border-b border-slate-200 bg-white">
                    {DAILY_COLUMNS.map(col => (
                      <th 
                        key={col.key} 
                        className={`px-4 py-3.5 border-r border-slate-200 bg-white ${col.center ? "text-center" : "text-right"}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {selectedWorkerData.workerDays.map((day) => {
                    const prefix = `${selectedWorkerName}_day_${day.dia}`;
                    
                    return (
                      <tr key={day.dia} className="hover:bg-slate-50/40 transition-colors">
                        {DAILY_COLUMNS.map(col => {
                          const overrideKey = `${prefix}_${col.key}`;
                          const isOver = isCellOverridden(overrideKey);
                          
                          // Handle day label as non-editable
                          if (col.key === "dia") {
                            return (
                              <td key={col.key} className="px-4 py-2 border-r border-slate-100 font-bold text-slate-800 text-center">
                                {day.dia}
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} className={`px-2 py-1.5 border-r border-slate-100 ${col.bg || ""} ${col.center ? "text-center" : "text-right"}`}>
                              <EditableCell
                                value={day[col.key]}
                                type={col.type === "number" ? "number" : "text"}
                                isCurrency={false}
                                isDecimal={col.isDecimal}
                                isOverridden={isOver}
                                onChange={(val) => handleCellEdit(overrideKey, val)}
                                className={col.center ? "text-center" : "text-right"}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* B. Calculations & Liquidation Summary (Rows 25 to 38) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Breakdown table */}
            <div className="lg:col-span-2 stitch-card bg-white/70 backdrop-blur-md border border-white/40 p-6 shadow-xl space-y-6 rounded-3xl">
              <div className="border-b pb-4 border-slate-100 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  B. Bloque de Liquidación de Recargos (Filas 25 a 36)
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 block uppercase">SALARIO ACORDADO (B37)</span>
                  <div className="w-36">
                    <EditableCell
                      value={selectedWorkerData.liquidation.salario_base}
                      type="number"
                      isCurrency={true}
                      isOverridden={isCellOverridden(`${selectedWorkerName}_liq_salario_base`)}
                      onChange={(val) => handleCellEdit(`${selectedWorkerName}_liq_salario_base`, val)}
                      className="text-right font-black border border-slate-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Debt & Pending Hours Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Horas que debe (B26)</span>
                    <span className="text-[9px] font-semibold text-rose-505">Descontadas de horas extras</span>
                  </div>
                  <div className="w-20">
                    <EditableCell
                      value={selectedWorkerData.liquidation.horas_debe}
                      type="number"
                      isDecimal={true}
                      isOverridden={isCellOverridden(`${selectedWorkerName}_liq_horas_debe`)}
                      onChange={(val) => handleCellEdit(`${selectedWorkerName}_liq_horas_debe`, val)}
                      className="text-center font-black text-rose-600 bg-rose-50/30 border-rose-200"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl shadow-sm">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Horas Pendientes (F26)</span>
                    <span className="text-[9px] font-bold text-yellow-400 block tracking-wider">SUMA(D32:D35)</span>
                  </div>
                  <span className="text-lg font-black tracking-tight text-white pr-2">
                    {selectedWorkerData.liquidation.horas_pendientes.toFixed(2)}h
                  </span>
                </div>
              </div>

              {/* Liquidation breakdown grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="px-4 py-2.5">Concepto Liquidado</th>
                      <th className="px-4 py-2.5 text-center">Horas (Columna D)</th>
                      <th className="px-4 py-2.5 text-center">Factor Recargo (Columna E)</th>
                      <th className="px-4 py-2.5 text-right">Valor a Pagar (Columna F)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {LIQUIDATION_CONCEPTS.map(concept => {
                      const liq = selectedWorkerData.liquidation;
                      const prefix = `${selectedWorkerName}_liq`;
                      
                      const isHrOver = isCellOverridden(`${prefix}_${concept.hrKey}`);
                      const isPctOver = isCellOverridden(`${prefix}_${concept.pctKey}`);
                      const isValOver = isCellOverridden(`${prefix}_${concept.valKey}`);

                      return (
                        <tr key={concept.key} className="hover:bg-slate-50/30 transition-colors">
                          <td className={`px-4 py-3 ${concept.textClass}`}>{concept.label}</td>
                          <td className="px-4 py-3 text-center bg-slate-50/30">
                            <EditableCell
                              value={liq[concept.hrKey]}
                              type="number"
                              isDecimal={true}
                              isOverridden={isHrOver}
                              onChange={(val) => handleCellEdit(`${prefix}_${concept.hrKey}`, val)}
                              className="text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">
                            <EditableCell
                              value={liq[concept.pctKey]}
                              type="number"
                              isDecimal={true}
                              isOverridden={isPctOver}
                              onChange={(val) => handleCellEdit(`${prefix}_${concept.pctKey}`, val)}
                              className="text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <EditableCell
                              value={liq[concept.valKey]}
                              type="number"
                              isCurrency={true}
                              isOverridden={isValOver}
                              onChange={(val) => handleCellEdit(`${prefix}_${concept.valKey}`, val)}
                              className="text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total row (Fila 36) */}
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="px-4 py-3 text-slate-300 font-bold uppercase tracking-wider">TOTAL (Fila 36)</td>
                      <td className="px-4 py-3 text-center font-extrabold text-white">
                        {selectedWorkerData.liquidation.total_extra_hrs.toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">-</td>
                      <td className="px-4 py-3 text-right font-black text-yellow-400 text-sm">
                        ${fmtCOP(selectedWorkerData.liquidation.total_extra_val)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar metadata card */}
            <div className="space-y-6">
              <div className="stitch-card bg-slate-955 text-white p-6 space-y-6 rounded-3xl">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">Resumen de Liquidación</span>
                  <h3 className="text-lg font-black text-white mt-1 uppercase leading-none">{selectedWorkerName}</h3>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-1.5">{selectedWorkerData.masterRow.cargo}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Salario Básico Mensual:</span>
                    <span className="font-bold text-white">${fmtCOP(selectedWorkerData.liquidation.salario_base)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Tarifa Ordinaria Hora:</span>
                    <span className="font-bold text-white">${fmtCOP(selectedWorkerData.liquidation.salario_base / 240)} COP</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Recargo Nocturno (0.35x):</span>
                    <span className="font-bold text-indigo-400">${fmtCOP((selectedWorkerData.liquidation.salario_base / 240) * 0.35)} COP</span>
                  </div>
                </div>

                {/* Turnos Autorizados por Perfil */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-1">Turnos Autorizados (Perfil)</span>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {(PERFILES_TURNOS[getProfileForCategory(selectedWorkerData.masterRow.categoria)]?.turnosValidos || []).map(t => (
                      <div key={t.id} className="flex justify-between items-center text-[10px] font-bold border-b border-slate-800/60 pb-1">
                        <span className="text-white shrink-0 bg-slate-800 px-1.5 py-0.5 rounded font-mono">{t.id}</span>
                        <span className="text-slate-300 text-right truncate ml-2 text-[10px]" title={t.nombre}>{t.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Novelties output box (Row 44) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Novedades Reportadas (A44)</span>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-200">
                    Novedades: <span className="text-emerald-400 font-bold">"{selectedWorkerData.liquidation.novedadesStr}"</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-start gap-3">
                  <AlertCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Las horas acumuladas en este desglose individual se transfieren automáticamente a las columnas **H, I, J, K, L** de la planilla general de Nómina para el recálculo total.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 3: COLILLAS DE PAGO --- */}
      {activeTab === "colilla" && (
        <div className="space-y-6 animate-stitch">
          
          {/* Print controls */}
          <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md">
            <div className="flex items-center gap-3">
              <FileText className="text-emerald-600" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Desprendibles de Pago (Colillas)</h4>
                <p className="text-slate-500 text-xs font-semibold">Generación de desprendibles listos para imprimir o exportar digitalmente.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Seleccionar Operario:</span>
              <select
                value={selectedWorkerName}
                onChange={(e) => setSelectedWorkerName(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm font-black text-slate-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-950 outline-none cursor-pointer animate-stitch text-slate-900"
              >
                {nominaRows.map(member => (
                  <option key={member.nombre} value={member.nombre}>
                    {member.nombre}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
              >
                <Printer size={14} />
                Imprimir Colilla
              </button>
            </div>
          </section>

          {/* Colilla (Voucher Design) */}
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl space-y-8 print:p-0 print:border-none print:shadow-none" id="printable-colilla">
            {/* Header info */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200/60">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-955">OPTIMOLDES S.A.S.</h3>
                <p className="text-xs font-bold text-slate-500">NIT 900.069.620-9</p>
                <p className="text-[10px] text-slate-400 font-medium">Carrera 41 C No. 50-16 - Itagüí • Tel: 277 77 18</p>
              </div>
              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Comprobante Quincenal
                </span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Periodo: {startDate} a {endDate}</p>
              </div>
            </div>

            {/* Worker Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Nombre del Trabajador</span>
                <span className="font-black text-slate-900">{selectedWorkerData.masterRow.nombre}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Cédula de Ciudadanía</span>
                <span className="font-bold text-slate-800">{selectedWorkerData.masterRow.cedula}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Cargo de Operación</span>
                <span className="font-bold text-slate-800 capitalize">{selectedWorkerData.masterRow.cargo.toLowerCase()}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Salario Básico Mensual</span>
                <span className="font-bold text-slate-800">${fmtCOP(selectedWorkerData.masterRow.salario)}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Días Liquidados</span>
                <span className="font-bold text-slate-800">{selectedWorkerData.masterRow.dias_pagados} Días</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block">Entidad Bancaria</span>
                <span className="font-black text-slate-900">{selectedWorkerData.masterRow.banco}</span>
              </div>
            </div>

            {/* Income & Deduction Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Devengos */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-200">
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-widest text-emerald-600">Devengos (Ingresos)</h5>
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Sueldo ordinario ({selectedWorkerData.masterRow.dias_pagados}d):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.sueldo)}</span>
                  </div>
                  {selectedWorkerData.masterRow.recargo_nocturno > 0 && (
                    <div className="flex justify-between">
                      <span>Recargo Nocturno ({selectedWorkerData.masterRow.horas_nocturnas.toFixed(1)}h):</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.recargo_nocturno)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.val_extras_diurnas > 0 && (
                    <div className="flex justify-between">
                      <span>Extras Diurnas ({selectedWorkerData.masterRow.extras_diurnas.toFixed(1)}h):</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.val_extras_diurnas)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.val_extras_nocturnas > 0 && (
                    <div className="flex justify-between">
                      <span>Extras Nocturnas ({selectedWorkerData.masterRow.extras_nocturnas.toFixed(1)}h):</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.val_extras_nocturnas)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.val_extras_festivas > 0 && (
                    <div className="flex justify-between">
                      <span>Extras Festivas ({selectedWorkerData.masterRow.extras_festivas.toFixed(1)}h):</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.val_extras_festivas)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.transporte > 0 && (
                    <div className="flex justify-between">
                      <span>Auxilio Legal Transporte:</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.transporte)}</span>
                    </div>
                  )}
                  {(selectedWorkerData.masterRow.rodamiento > 0 || selectedWorkerData.masterRow.comisiones > 0) && (
                    <div className="flex justify-between">
                      <span>Rodamiento / Comisiones:</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.rodamiento + selectedWorkerData.masterRow.comisiones)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.incapacidad > 0 && (
                    <div className="flex justify-between">
                      <span>Incapacidad Médica ({selectedWorkerData.masterRow.dias_incapacidad}d):</span>
                      <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.incapacidad)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deducciones */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-200">
                  <h5 className="font-black text-xs text-slate-900 uppercase tracking-widest text-rose-600">Deducciones (Descuentos)</h5>
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Aporte Salud (4%):</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.salud)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aporte Pensión (4%):</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.pension)}</span>
                  </div>
                  {selectedWorkerData.masterRow.solidaridad > 0 && (
                    <div className="flex justify-between">
                      <span>Fondo Solidaridad Pensional:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.solidaridad)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.prestamos > 0 && (
                    <div className="flex justify-between">
                      <span>Amortización Préstamos:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.prestamos)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.poliza_bolivar > 0 && (
                    <div className="flex justify-between">
                      <span>Póliza Seguro Bolívar:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.poliza_bolivar)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.poliza_plenitud > 0 && (
                    <div className="flex justify-between">
                      <span>Seguro Plenitud Funerario:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.poliza_plenitud)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.libranza_comfama > 0 && (
                    <div className="flex justify-between">
                      <span>Crédito Libranza Comfama:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.libranza_comfama)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.poliza_sura > 0 && (
                    <div className="flex justify-between">
                      <span>Seguro Póliza Sura:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.poliza_sura)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.optica > 0 && (
                    <div className="flex justify-between">
                      <span>Descuento Óptica / Celular:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.optica + selectedWorkerData.masterRow.celular)}</span>
                    </div>
                  )}
                  {selectedWorkerData.masterRow.retencion > 0 && (
                    <div className="flex justify-between">
                      <span>Retención en la Fuente:</span>
                      <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.masterRow.retencion)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Total net payment summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Devengado (W)</span>
                <span className="text-base font-extrabold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.total_devengados)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Deducciones (AI)</span>
                <span className="text-base font-extrabold text-slate-900">${fmtCOP(selectedWorkerData.masterRow.total_deducciones)}</span>
              </div>
              
              <div className="bg-slate-955 text-white p-6 rounded-3xl text-right space-y-1 shadow-md">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block">Neto Transferido (AL)</span>
                <span className="text-2xl font-black text-yellow-400 block">${fmtCOP(selectedWorkerData.masterRow.neto_pagar)} COP</span>
              </div>
            </div>

            {/* Signature layout */}
            <div className="pt-12 grid grid-cols-2 gap-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="space-y-4">
                <div className="border-b border-slate-300 h-10" />
                <p>Elaborado y Pagado por Empresa</p>
              </div>
              <div className="space-y-4">
                <div className="border-b border-slate-300 h-10" />
                <p>Recibido Conforme Trabajador (Firma y C.C)</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Info Alert footer bar */}
      <div className="p-6 bg-slate-100 rounded-[1.5rem] border border-slate-200/60 flex items-start gap-4 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-inner">
          <Info size={20} className="text-yellow-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900 leading-none mt-1">Garantía Legal de Cálculos Colombianos</p>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Las tasas de recargos (Nocturno 35%, Festivo Diurno 75%, Festivo Nocturno 210%, Extra Diurna 150%, Extra Nocturna 175%, Extra Festiva Diurna 200%, Extra Festiva Nocturna 250%), subsidios y deducciones del 4% corresponden estrictamente con la normativa vigente implementada para OPTIMOLDES S.A.S.
          </p>
        </div>
      </div>

      {/* Toast popup notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-xl border border-white/10 animate-slide-in text-xs font-semibold max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
