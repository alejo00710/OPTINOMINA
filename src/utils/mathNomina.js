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
  if (n === null || n === undefined || isNaN(n)) return "-";
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
