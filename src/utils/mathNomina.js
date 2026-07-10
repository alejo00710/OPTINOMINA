import { DIVISOR_HORAS_EXTRAS, DIVISOR_RECARGOS_NOCTURNOS, FACTOR_EXTRA_DIURNA, FACTOR_EXTRA_NOCTURNA, FACTOR_EXTRA_FESTIVA, FACTOR_RECARGO_NOCTURNO } from "./constants";

// --- Time & Conversion Helpers ---
export const timeStrToDecimal = (t) => {
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
export const decimalToTimeStr = (dec) => {
  if (dec === null || dec === undefined || isNaN(dec)) return "00:00";
  let val = parseFloat(dec);
  if (isNaN(val)) return "00:00";
  if (val < 0) val += 24;
  if (val >= 24) val %= 24;
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
export const diffTimeStr = (t1, t2) => {
  if (!t1 || !t2) return "00:00";
  const dec1 = timeStrToDecimal(t1);
  const dec2 = timeStrToDecimal(t2);
  let diff = dec2 - dec1;
  if (diff < 0) diff += 24; // Rollover overnight
  return decimalToTimeStr(diff);
};
export const getDecimalHours = (t1, t2) => {
  if (!t1 || !t2) return 0;
  const dec1 = timeStrToDecimal(t1);
  const dec2 = timeStrToDecimal(t2);
  if (isNaN(dec1) || isNaN(dec2)) return 0;
  let diff = dec2 - dec1;
  if (diff < 0) diff += 24; // Rollover overnight
  return Number(diff.toFixed(4));
};
export const getHourDist = (h1, h2) => {
  let d = Math.abs(h1 - h2);
  if (d > 12) d = 24 - d;
  return d;
};
/**
 * Format a number as Colombian currency (COP) using dots as thousand separators.
 * This is locale-independent so it produces identical output on the Node.js SSR
 * server and the browser, preventing React hydration mismatches.
 */
export const fmtCOP = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "0";
  // Redondeamos al entero más cercano antes de formatear
  const rounded = Math.round(Number(n));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
/**
 * Format a decimal number with 1-2 decimal places, using dot-separated thousands
 * and comma as decimal separator (Colombian style), without relying on locale.
 */
export const fmtDec = (n, min = 1, max = 2) => {
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

export const parseLocalNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number(val.toFixed(2));
  let s = String(val).replace(/\$|\s/g, '').trim();
  s = s.replace(/\./g, '');
  s = s.replace(/,/g, '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Number(n.toFixed(2));
};

export const getTimeDifference = (start, end, allowMidnight = true) => {
  if (!start || !end || start === "-" || end === "-" || start === "00:00" || end === "00:00") return 0;
  
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  
  const startTotal = (sh * 60) + sm;
  const endTotal = (eh * 60) + em;
  
  let diff = endTotal - startTotal;
  if (diff < 0) {
    if (allowMidnight) {
      diff += 1440; // Cruce de medianoche
    } else {
      return 0; // Si da negativo o absurdo por falta de datos, que retorne 0.00
    }
  }
  
  return Number((diff / 60).toFixed(4));
};

export const calculateDailyRecord = (day, overrides, prefix, horaInicioDiurna, horaFinDiurna) => {
  const isTime = (t) => t && String(t).trim() !== "" && String(t).trim() !== "-" && String(t).trim() !== "00:00";

  // Descansos (F y I)
  const hrEntDesc1 = overrides[`${prefix}_hr_ent_desc1`] !== undefined ? String(overrides[`${prefix}_hr_ent_desc1`]) : (day.hr_ent_desc1 || "-");
  const hrSalDesc1 = overrides[`${prefix}_hr_sal_desc1`] !== undefined ? String(overrides[`${prefix}_hr_sal_desc1`]) : (day.hr_sal_desc1 || "-");
  const hrEntDesc2 = overrides[`${prefix}_hr_ent_desc2`] !== undefined ? String(overrides[`${prefix}_hr_ent_desc2`]) : (day.hr_ent_desc2 || "-");
  const hrSalDesc2 = overrides[`${prefix}_hr_sal_desc2`] !== undefined ? String(overrides[`${prefix}_hr_sal_desc2`]) : (day.hr_sal_desc2 || "-");

  const desc1 = getTimeDifference(hrSalDesc1, hrEntDesc1, false);
  const desc2 = getTimeDifference(hrSalDesc2, hrEntDesc2, false);

  // Pago Ent (J) y Pago Sal (K)
  // J debe ser B (hr_ent), K debe ser C (hr_sal) estrictamente
  const baseHrEnt = day.hr_ent || "-";
  const baseHrSal = day.hr_sal || "-";

  const hrEntPago = overrides[`${prefix}_hr_ent_pago`] !== undefined ? String(overrides[`${prefix}_hr_ent_pago`]) : baseHrEnt;
  const hrSalPago = overrides[`${prefix}_hr_sal_pago`] !== undefined ? String(overrides[`${prefix}_hr_sal_pago`]) : baseHrSal;
  
  // Col L: Hr. Lab = Diferencia entre J y K, menos los descansos
  let hrLab = 0;
  if (isTime(hrEntPago) && isTime(hrSalPago)) {
     hrLab = getTimeDifference(hrEntPago, hrSalPago) - desc1 - desc2;
     if (hrLab < 0) hrLab = 0;
  }
  
  // Col M: Des = SI(L3>8.9; 0.5; 0)
  const des = hrLab > 8.9 ? 0.5 : 0;
  
  // Col N: Hr. Pag = L3 - M3
  const hrPag = hrLab > 0 ? hrLab - des : 0;
  
  const J3 = isTime(hrEntPago) ? timeStrToDecimal(hrEntPago) : 0;
  const C41 = timeStrToDecimal(horaInicioDiurna);
  const D41 = timeStrToDecimal(horaFinDiurna);
  
  // Col P: Noct = SI(J3>D41; 44/6; 0)
  const noct = (hrPag > 0 && J3 > D41) ? (44 / 6) : 0;
  
  // Col O: Diurn = SI(Y(J3>=C41; J3<=D41); (44/6)-P3; 0)
  const diurn = (hrPag > 0 && J3 >= C41 && J3 <= D41) ? (44 / 6) - noct : 0;
  
  // Manuals overriding or defaults to 0
  const fesDiu = overrides[`${prefix}_fes_diu`] !== undefined ? Number(overrides[`${prefix}_fes_diu`]) : Number(day.fes_diu || 0);
  const fesNoc = overrides[`${prefix}_fes_noc`] !== undefined ? Number(overrides[`${prefix}_fes_noc`]) : Number(day.fes_noc || 0);
  const extNoc = overrides[`${prefix}_ext_noc`] !== undefined ? Number(overrides[`${prefix}_ext_noc`]) : Number(day.ext_noc || 0);
  const extFesDiu = overrides[`${prefix}_ext_fes_diu`] !== undefined ? Number(overrides[`${prefix}_ext_fes_diu`]) : Number(day.ext_fes_diu || 0);
  const extFesNoc = overrides[`${prefix}_ext_fes_noc`] !== undefined ? Number(overrides[`${prefix}_ext_fes_noc`]) : Number(day.ext_fes_noc || 0);
  
  const llegadaTarde = overrides[`${prefix}_llegada_tarde`] !== undefined ? Number(overrides[`${prefix}_llegada_tarde`]) : Number(day.llegada_tarde || 0);
  const llegadaTardeMin = overrides[`${prefix}_llegada_tarde_min`] !== undefined ? Number(overrides[`${prefix}_llegada_tarde_min`]) : Number(day.llegada_tarde_min || 0);
  
  // Col S: Ext. Diu = N3 - O3 - P3 - Q3 - R3 - T3 - U3 - V3
  const extDiuCalc = hrPag - diurn - noct - fesDiu - fesNoc - extNoc - extFesDiu - extFesNoc;
  const extDiu = extDiuCalc > 0 ? extDiuCalc : 0;

  // Let overrides take precedence on final values if the user edited them manually
  const finalDiurnas = overrides[`${prefix}_diurnas`] !== undefined ? Number(overrides[`${prefix}_diurnas`]) : diurn;
  const finalNocturnas = overrides[`${prefix}_nocturnas`] !== undefined ? Number(overrides[`${prefix}_nocturnas`]) : noct;
  const finalExtDiu = overrides[`${prefix}_ext_diu`] !== undefined ? Number(overrides[`${prefix}_ext_diu`]) : extDiu;

  return {
    ...day,
    hr_ent_desc1: hrEntDesc1,
    hr_sal_desc1: hrSalDesc1,
    total_desc1: desc1,
    hr_ent_desc2: hrEntDesc2,
    hr_sal_desc2: hrSalDesc2,
    total_desc2: desc2,
    hr_ent_pago: hrEntPago,
    hr_sal_pago: hrSalPago,
    hr_lab: hrLab,
    desc_lunch: des,
    hr_pag: hrPag,
    diurnas: finalDiurnas,
    nocturnas: finalNocturnas,
    fes_diu: fesDiu,
    fes_noc: fesNoc,
    ext_diu: finalExtDiu,
    ext_noc: extNoc,
    ext_fes_diu: extFesDiu,
    ext_fes_noc: extFesNoc,
    llegada_tarde: llegadaTarde,
    llegada_tarde_min: llegadaTardeMin
  };
};
