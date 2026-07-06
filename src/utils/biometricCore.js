import * as XLSX from "xlsx";
import { timeStrToDecimal, decimalToTimeStr } from "./mathNomina";
import { getTemplatesForCategory } from "./constants";

export const detectShiftTemplate = (hrEnt, hrSal, durationHrs, category = "OTROS") => {
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

// Utils and Constants
const shiftTemplates = {
  diurno: { in: "05:00", out: "14:00" },
  tarde: { in: "14:00", out: "21:00" },
  nocturno: { in: "21:00", out: "05:00" },
  oficina: { in: "08:00", out: "18:00" }
};

export const findEmployeeMatch = (biometricName, directoryEmployees) => {
  if (!biometricName || !directoryEmployees) return null;
  
  const cleanStr = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, "");
  const bioCleaned = cleanStr(biometricName);
  
  for (const emp of directoryEmployees) {
    if (!emp.nombre) continue;
    const dirCleaned = cleanStr(emp.nombre);
    
    if (bioCleaned === dirCleaned) {
       return { cedula: emp.cedula, isExact: true, dirName: emp.nombre };
    }
    
    if (dirCleaned.includes(bioCleaned) || bioCleaned.includes(dirCleaned)) {
       return { cedula: emp.cedula, isExact: false, dirName: emp.nombre };
    }
  }
  return null;
};

export const emptyAttendanceDay = (dateStr) => ({
  dia: dateStr,
  hr_ent: "",
  hr_sal: "",
  hr_ent_desc1: "",
  hr_sal_desc1: "",
  total_desc1: "00:00",
  hr_ent_desc2: "",
  hr_sal_desc2: "",
  total_desc2: "00:00",
  observacion: ""
});

export const parseMarcacionDate = (val) => {
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
    if (p1 > 12) { d = p1; m = p2; }
    else if (p2 > 12) { m = p1; d = p2; }
    else { d = p1; m = p2; }
    return `${m2[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
};

export const parseMarcacionTime = (val) => {
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

export async function parseBiometricExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, cellDates: true });

        const cleanData = [];
        let currentEmployeeName = "";
        let currentCedula = "";

        rows.forEach(row => {
          if (!row || !row.length) return;
          const col0 = String(row[0] || '').trim();

          // Detección del Empleado
          if (col0.startsWith("Employee ID:") || col0.includes("Nombres:")) {
            const idMatch = col0.match(/Employee ID:\s*([^,]+)/i);
            if (idMatch) currentCedula = idMatch[1].trim();

            const nameMatch = col0.match(/Nombres:\s*([^,]+)/i);
            if (nameMatch) currentEmployeeName = nameMatch[1].trim().toUpperCase();
            return;
          }

          // Detección de Fila de Datos
          const estado = String(row[0] || '').trim().toLowerCase();
          if (estado === "habilitado") {
            let parsedFecha = null;
            let parsedHora = null;

            for (let i = 1; i < row.length; i++) {
              const val = row[i];
              if (val === undefined || val === null || val === "") continue;

              if (val instanceof Date && !isNaN(val.getTime())) {
                const y = val.getFullYear();
                if (y > 1900 && !parsedFecha) {
                  parsedFecha = parseMarcacionDate(val);
                } else if (!parsedHora) {
                  parsedHora = parseMarcacionTime(val);
                }
              } else if (typeof val === "number") {
                if (val > 1000 && !parsedFecha) {
                  parsedFecha = parseMarcacionDate(val);
                } else if (val < 1 && val >= 0 && !parsedHora) {
                  parsedHora = parseMarcacionTime(val);
                }
              } else {
                const s = String(val).trim();
                const isDateStr = /^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/.test(s);
                const isTimeStr = /^(\d{1,2}):(\d{2})/.test(s);
                if (isDateStr && !parsedFecha) {
                  parsedFecha = parseMarcacionDate(val);
                } else if (isTimeStr && !parsedHora) {
                  parsedHora = parseMarcacionTime(val);
                }
              }
            }

            if (parsedFecha && parsedHora) {
              const [y, m, d] = parsedFecha.split("-").map(Number);
              const [hh, mm] = parsedHora.split(":").map(Number);
              const exactTimestamp = new Date(y, m - 1, d, hh, mm).getTime();

              cleanData.push({
                cedula: currentCedula,
                nombre: currentEmployeeName,
                fecha: parsedFecha,
                hora: parsedHora,
                timestamp: exactTimestamp
              });
            }
          }
        });

        resolve(cleanData);
      } catch (error) {
        reject("Error procesando el archivo Excel: " + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- ALGORITMO DE LIMPIEZA ---
export const cleanWorkerPunches = (punches, startDate, endDate) => {
  const getDatesInRange = (start, end) => {
    const dates = [];
    try {
      const [sy, sm, sd] = start.split("-").map(Number);
      const [ey, em, ed] = end.split("-").map(Number);
      let curr = new Date(sy, sm - 1, sd);
      const stop = new Date(ey, em - 1, ed);
      let limit = 0;
      while (curr <= stop && limit < 90) {
        const ny = curr.getFullYear();
        const nm = String(curr.getMonth() + 1).padStart(2, "0");
        const nd = String(curr.getDate()).padStart(2, "0");
        dates.push(`${ny}-${nm}-${nd}`);
        curr.setDate(curr.getDate() + 1);
        limit++;
      }
    } catch (e) { console.error(e); }
    return dates;
  };

  const dates = getDatesInRange(startDate, endDate);
  const attendanceRows = {};
  dates.forEach(dateStr => {
    attendanceRows[dateStr] = emptyAttendanceDay(dateStr);
  });

  if (!punches || punches.length === 0) return attendanceRows;

  // 1. Contexto de Fechas
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const startMs = new Date(startYear, startMonth - 1, startDay, 0, 0, 0).getTime();
  const endMs = new Date(endYear, endMonth - 1, endDay, 23, 59, 59).getTime();
  const contextStartMs = startMs - (24 * 3600000);

  // 2. Ordenamiento Absoluto
  const punchesWithTime = [...punches]
    .filter(p => p.timestamp >= contextStartMs && p.timestamp <= endMs)
    .sort((a, b) => a.timestamp - b.timestamp);

  // 3. De-duplicación (5 minutos)
  const filteredPunches = [];
  for (let i = 0; i < punchesWithTime.length; i++) {
    const p = punchesWithTime[i];
    if (filteredPunches.length === 0) {
      filteredPunches.push(p);
    } else {
      const last = filteredPunches[filteredPunches.length - 1];
      const diffMin = (p.timestamp - last.timestamp) / 60000;
      if (diffMin >= 5) filteredPunches.push(p);
    }
  }

  // 4. Regla de Cruce de medianoche
  const punchesByDate = {};
  for (let i = 0; i < filteredPunches.length; i++) {
    const p = filteredPunches[i];
    let effectiveDate = p.fecha;

    if (p.hora >= "00:00" && p.hora <= "07:00") {
      let isNightShiftExit = true;
      let nextP = null;
      for (let j = i + 1; j < filteredPunches.length; j++) {
        if (filteredPunches[j].fecha === p.fecha) { nextP = filteredPunches[j]; break; }
      }

      let lookaheadDetermined = false;
      if (nextP && nextP.hora >= "15:00") {
        const gapToNext = (nextP.timestamp - p.timestamp) / 3600000;
        if (gapToNext >= 13) { isNightShiftExit = true; lookaheadDetermined = true; }
      }

      if (!lookaheadDetermined) {
        if (i > 0) {
          const prev = filteredPunches[i - 1];
          const diffHours = (p.timestamp - prev.timestamp) / 3600000;
          const prevEffectiveDate = prev.effectiveDate || prev.fecha;
          const punchesInPrevDay = punchesByDate[prevEffectiveDate] || [];
          const firstPunchOfPrevDay = punchesInPrevDay.length > 0 ? punchesInPrevDay[0].hora : prev.hora;

          if (firstPunchOfPrevDay && firstPunchOfPrevDay < "16:00") {
            if (p.hora >= "04:00" || diffHours > 8) isNightShiftExit = false;
          } else {
            if (diffHours > 14) isNightShiftExit = false;
          }
        } else {
          if (p.hora >= "04:00") isNightShiftExit = false;
        }
      }

      if (isNightShiftExit) {
        const [y, m, d] = p.fecha.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() - 1);
        effectiveDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      }
    }

    p.effectiveDate = effectiveDate;
    if (!punchesByDate[effectiveDate]) punchesByDate[effectiveDate] = [];
    punchesByDate[effectiveDate].push(p);
  }

  // 5. ASIGNACIÓN SECUENCIAL PURA
  Object.keys(punchesByDate).forEach(dateStr => {
    if (!attendanceRows[dateStr]) return;

    const dayPunches = punchesByDate[dateStr].sort((a, b) => a.timestamp - b.timestamp);
    if (dayPunches.length === 0) return;

    let hr_ent = "", hr_sal_desc1 = "", hr_ent_desc1 = "", hr_sal_desc2 = "", hr_ent_desc2 = "", hr_sal = "";
    const n = dayPunches.length;

    if (n === 1) {
      hr_ent = dayPunches[0].hora;
    }
    else if (n === 2) {
      hr_ent = dayPunches[0].hora;
      hr_sal = dayPunches[1].hora;
    }
    else if (n === 3) {
      hr_ent = dayPunches[0].hora;
      hr_sal_desc1 = dayPunches[1].hora;
      hr_sal = dayPunches[2].hora;
    }
    else if (n === 4) {
      hr_ent = dayPunches[0].hora;
      hr_sal_desc1 = dayPunches[1].hora;
      hr_ent_desc1 = dayPunches[2].hora;
      hr_sal = dayPunches[3].hora;
    }
    else if (n === 5) {
      hr_ent = dayPunches[0].hora;
      hr_sal_desc1 = dayPunches[1].hora;
      hr_ent_desc1 = dayPunches[2].hora;
      hr_sal_desc2 = dayPunches[3].hora;
      hr_sal = dayPunches[4].hora;
    }
    else if (n >= 6) {
      hr_ent = dayPunches[0].hora;
      hr_sal_desc1 = dayPunches[1].hora;
      hr_ent_desc1 = dayPunches[2].hora;
      hr_sal_desc2 = dayPunches[3].hora;
      hr_ent_desc2 = dayPunches[4].hora;
      hr_sal = dayPunches[n - 1].hora;
    }

    attendanceRows[dateStr] = {
      ...attendanceRows[dateStr],
      hr_ent,
      hr_sal_desc1,
      hr_ent_desc1,
      hr_sal_desc2,
      hr_ent_desc2,
      hr_sal
    };
  });

  return attendanceRows;
};
