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
export const parseEmployeeNameFromHeader = (firstCell) => {
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
// --- Biometric Cleaning Algorithm ---
export const cleanWorkerPunches = (punches, startDate, endDate) => {
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

  // 1.5. Filtrado Estricto por Rango de Fechas
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const startMs = new Date(startYear, startMonth - 1, startDay, 0, 0, 0).getTime();
  const endMs = new Date(endYear, endMonth - 1, endDay, 23, 59, 59).getTime();
  const contextStartMs = startMs - (24 * 3600000); // 24 horas de contexto previo

  // 2. Ordenamiento Cronológico Absoluto y Filtrado de Fechas
  const punchesWithTime = punches.map(p => {
    const [y, m, d] = p.fecha.split("-").map(Number);
    const [hh, mm] = p.hora.split(":").map(Number);
    const realTimeMs = new Date(y, m - 1, d, hh, mm).getTime();
    return { ...p, realTimeMs };
  }).filter(p => p.realTimeMs >= contextStartMs && p.realTimeMs <= endMs)
  .sort((a, b) => a.realTimeMs - b.realTimeMs);

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
  // Evaluamos de manera iterativa para construir el contexto
  const punchesByDate = {};
  
  for (let i = 0; i < filteredPunches.length; i++) {
    const p = filteredPunches[i];
    let effectiveDate = p.fecha;
    
    if (p.hora >= "00:00" && p.hora <= "07:00") {
      let isNightShiftExit = true; 

      // 1. Detección Inteligente por Look-ahead (Para salidas huérfanas)
      // Buscamos la siguiente marca de este MISMO día calendario.
      let nextP = null;
      for (let j = i + 1; j < filteredPunches.length; j++) {
        if (filteredPunches[j].fecha === p.fecha) {
          nextP = filteredPunches[j];
          break;
        }
      }

      let lookaheadDetermined = false;
      if (nextP && nextP.hora >= "15:00") {
        const gapToNext = (nextP.realTimeMs - p.realTimeMs) / 3600000;
        if (gapToNext >= 13) {
          // Es 100% una marca de salida del turno de la noche anterior.
          isNightShiftExit = true;
          lookaheadDetermined = true;
        }
      }

      // 2. Lógica de Máquina de Estados (Si no fue determinado por Look-ahead)
      if (!lookaheadDetermined) {
        if (i > 0) {
          const prev = filteredPunches[i - 1];
          const diffHours = (p.realTimeMs - prev.realTimeMs) / 3600000;
          
          const prevEffectiveDate = prev.effectiveDate || prev.fecha;
          const punchesInPrevDay = punchesByDate[prevEffectiveDate] || [];
          const firstPunchOfPrevDay = punchesInPrevDay.length > 0 ? punchesInPrevDay[0].hora : prev.hora;

          if (firstPunchOfPrevDay && firstPunchOfPrevDay < "16:00") {
            if (p.hora >= "04:00") {
              isNightShiftExit = false;
            } else if (diffHours > 8) {
              isNightShiftExit = false;
            }
          } else {
            if (diffHours > 14) {
              isNightShiftExit = false;
            }
          }
        } else {
          if (p.hora >= "04:00") {
            isNightShiftExit = false;
          }
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
    
    p.effectiveDate = effectiveDate; // Store it for context
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
    let hr_sal_desc2 = "";
    let hr_ent_desc2 = "";
    let hr_sal = "";

    const n = dayPunches.length;
    if (n === 1) {
      hr_ent = dayPunches[0].hora;
    } else if (n === 2) {
      hr_ent = dayPunches[0].hora;
      hr_sal = dayPunches[1].hora;
    } else {
      hr_ent = dayPunches[0].hora;
      hr_sal = dayPunches[n - 1].hora;
      
      const middle = dayPunches.slice(1, -1);
      
      if (middle.length === 1) {
        // Una marca huérfana en medio del turno (asumimos que salió a descansar y olvidó marcar regreso)
        hr_sal_desc1 = middle[0].hora;
      } else if (middle.length === 2) {
        // Dos marcas intermedias, evaluar si son un descanso válido (menos de 90 mins)
        const gapMins = (middle[1].realTimeMs - middle[0].realTimeMs) / 60000;
        if (gapMins <= 90) {
          // La primera marca es la salida a descanso (Descanso Sal), la segunda es el regreso (Descanso Ent)
          hr_sal_desc1 = middle[0].hora;
          hr_ent_desc1 = middle[1].hora;
        } else {
          // Brecha muy grande, se asumen dos salidas a descansos distintos
          hr_sal_desc1 = middle[0].hora;
          hr_sal_desc2 = middle[1].hora;
        }
      } else if (middle.length === 3) {
        // Tres marcas intermedias, buscar cuál es el par válido
        const gap1 = (middle[1].realTimeMs - middle[0].realTimeMs) / 60000;
        const gap2 = (middle[2].realTimeMs - middle[1].realTimeMs) / 60000;
        
        if (gap1 <= 90 && gap1 <= gap2) {
          hr_sal_desc1 = middle[0].hora;
          hr_ent_desc1 = middle[1].hora;
          hr_sal_desc2 = middle[2].hora;
        } else if (gap2 <= 90 && gap2 < gap1) {
          hr_sal_desc1 = middle[0].hora;
          hr_sal_desc2 = middle[1].hora;
          hr_ent_desc2 = middle[2].hora;
        } else {
          hr_sal_desc1 = middle[0].hora;
          hr_sal_desc2 = middle[1].hora;
        }
      } else if (middle.length >= 4) {
        // Cuatro o más marcas intermedias (Turnos 12 horas, asume pares consecutivos)
        hr_sal_desc1 = middle[0].hora;
        hr_ent_desc1 = middle[1].hora;
        hr_sal_desc2 = middle[2].hora;
        hr_ent_desc2 = middle[3].hora;
      }
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

export async function parseBiometricExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Leer como array 2D de strings puros
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        const cleanData = [];
        let currentEmployeeName = "";
        let currentCedula = "";

        rows.forEach(row => {
          if (!row || !row.length) return;
          const col0 = String(row[0] || '').trim();

          // Detección de Fila de Cabecera de Empleado
          // Ejemplo: "Employee ID: 10,Nombres: ENODIS POLO,Departamento: Departamento"
          if (col0.startsWith("Employee ID:")) {
              const idMatch = col0.match(/Employee ID:\s*([^,]+)/i);
              if (idMatch) currentCedula = idMatch[1].trim();
              
              const nameMatch = col0.match(/Nombres:\s*([^,]+)/i);
              if (nameMatch) currentEmployeeName = nameMatch[1].trim();
              return;
          }

          // Detección de Fila de Datos (Normalmente la Fecha esta en la col 3 y Hora en la col 4)
          const fechaStr = String(row[3] || '').trim();
          const horaStr = String(row[4] || '').trim();

          // Validación de que sean fecha y hora
          if ((fechaStr.includes('-') || fechaStr.includes('/')) && horaStr.includes(':')) {
              let year, month, day;
              let fStr = fechaStr;
              
              if (fStr.includes('/')) {
                  const parts = fStr.split('/');
                  day = parts[0].padStart(2, '0');
                  month = parts[1].padStart(2, '0');
                  year = parts[2];
                  if (year.length === 2) year = "20" + year; 
                  fStr = `${year}-${month}-${day}`;
              } else if (fStr.includes('-')) {
                  const parts = fStr.split('-');
                  if (parts[0].length === 4) {
                      year = parts[0];
                      month = parts[1].padStart(2, '0');
                      day = parts[2].padStart(2, '0');
                  } else {
                      day = parts[0].padStart(2, '0');
                      month = parts[1].padStart(2, '0');
                      year = parts[2];
                      if (year.length === 2) year = "20" + year;
                  }
                  fStr = `${year}-${month}-${day}`;
              }

              let hStr = horaStr;
              let isPM = hStr.toUpperCase().includes('P');
              hStr = hStr.replace(/[^0-9:]/g, ''); 
              const timeParts = hStr.split(':');
              let hours = parseInt(timeParts[0] || '0', 10);
              let minutes = parseInt(timeParts[1] || '0', 10);
              if (isPM && hours < 12) hours += 12;
              if (!isPM && hours === 12) hours = 0; 
              
              const hoursStr = String(hours).padStart(2, '0');
              const minutesStr = String(minutes).padStart(2, '0');
              hStr = `${hoursStr}:${minutesStr}`;

              const exactTimestamp = new Date(year, parseInt(month) - 1, parseInt(day), hours, minutes).getTime();

              cleanData.push({
                  cedula: currentCedula,
                  nombre: currentEmployeeName,
                  fecha: fStr,
                  hora: hStr,
                  timestamp: exactTimestamp
              });
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
