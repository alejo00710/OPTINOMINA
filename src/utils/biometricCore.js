import Papa from "papaparse";
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


const normalizeString = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
};

const fuzzyMatch = (csvName, nominaRows) => {
  if (!csvName || !nominaRows || nominaRows.length === 0) return null;
  const cleanCsv = normalizeString(csvName);
  
  // Coincidencia exacta
  let match = nominaRows.find(n => normalizeString(n.nombre) === cleanCsv);
  if (match) return match;
  
  // Coincidencia parcial (inclusión)
  match = nominaRows.find(n => {
    const cleanDb = normalizeString(n.nombre);
    return cleanCsv.includes(cleanDb) || cleanDb.includes(cleanCsv);
  });
  
  return match || null;
};

export async function parseBiometricCSV(file, startDate, endDate, nominaRows = []) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const startMs = new Date(`${startDate}T00:00:00`).getTime();
          const endMs = new Date(`${endDate}T23:59:59`).getTime();

          const allEmployeesMap = new Map();
          const cleanData = [];
          
          results.data.forEach(row => {
            const getVal = (keys) => {
              const k = Object.keys(row).find(key => keys.some(search => key.toLowerCase().includes(search.toLowerCase())));
              return k ? row[k] : null;
            };

            let cedula = getVal(["Employee ID", "cedula", "id", "empleado"]);
            let nombre = getVal(["Nombres", "nombre", "name"]);
            let fecha = getVal(["Fecha", "date"]);
            let hora = getVal(["Hora", "time"]);

            if (!cedula || !nombre || !fecha || !hora) return;

            cedula = String(cedula).trim();
            nombre = String(nombre).trim().toUpperCase();
            fecha = String(fecha).trim();
            hora = String(hora).trim();

            // TAREA 3: Match por biometric_id / cedula + Fallback a Fuzzy Matching
            let match = null;
            const rawId = row["Employee ID"] || row["cedula"] || row["id"] || row["empleado"] || cedula;
            if (rawId) {
               const cleanId = String(rawId).trim();
               match = nominaRows.find(n => String(n.biometric_id || "").trim() === cleanId || String(n.cedula).trim() === cleanId);
            }
            if (!match) {
               match = fuzzyMatch(nombre, nominaRows);
            }

            if (match) {
               cedula = match.cedula;
               nombre = match.nombre;
               allEmployeesMap.set(cedula, nombre);
            } else {
               // Si no coincide con un trabajador real, se omite por completo
               return;
            }

            const isoFechaMatch = fecha.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
            const dmyFechaMatch = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            
            let parsedFecha = null;
            if (isoFechaMatch) {
              parsedFecha = `${isoFechaMatch[1]}-${String(isoFechaMatch[2]).padStart(2, '0')}-${String(isoFechaMatch[3]).padStart(2, '0')}`;
            } else if (dmyFechaMatch) {
               let p1 = parseInt(dmyFechaMatch[1], 10);
               let p2 = parseInt(dmyFechaMatch[2], 10);
               let d = p1, m = p2;
               if (p1 > 12) { d = p1; m = p2; }
               else if (p2 > 12) { m = p1; d = p2; }
               parsedFecha = `${dmyFechaMatch[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }

            if (!parsedFecha) return;

            const hmMatch = hora.match(/^(\d{1,2}):(\d{2})/);
            if (!hmMatch) return;
            const parsedHora = `${String(parseInt(hmMatch[1], 10)).padStart(2, '0')}:${hmMatch[2]}`;

            const [y, m, d] = parsedFecha.split("-").map(Number);
            const [hh, mm] = parsedHora.split(":").map(Number);
            const timestamp = new Date(y, m - 1, d, hh, mm).getTime();

            if (timestamp >= startMs && timestamp <= endMs) {
              cleanData.push({
                cedula,
                nombre,
                fecha: parsedFecha,
                hora: parsedHora,
                timestamp
              });
            }
          });

          // TAREA 1 & 2: Inicialización Universal
          const foundEmployeeIds = new Set(cleanData.map(e => e.cedula));
          for (const [c, n] of allEmployeesMap.entries()) {
             if (!foundEmployeeIds.has(c)) {
                 cleanData.push({
                    cedula: c,
                    nombre: n,
                    fecha: null,
                    hora: null,
                    timestamp: null
                 });
             }
          }

          // Etapa 2.1: Ordenar cronológicamente (Fecha + Hora)
          cleanData.sort((a, b) => {
             if (a.timestamp === null) return -1;
             if (b.timestamp === null) return 1;
             return a.timestamp - b.timestamp;
          });
          resolve(cleanData);
        } catch (err) {
          reject("Error procesando CSV: " + err.message);
        }
      },
      error: (err) => reject("Error leyendo CSV: " + err.message)
    });
  });
}

// ETAPAS 2, 3 y 4
export const cleanWorkerPunches = (employeePunches, startDate, endDate) => {
  const getDatesInRange = (start, end) => {
    const dates = [];
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
    return dates;
  };

  const dates = getDatesInRange(startDate, endDate);
  const attendanceRows = {};
  dates.forEach(dateStr => {
    attendanceRows[dateStr] = { ...emptyAttendanceDay(dateStr), estado: "" };
  });

  if (!employeePunches || employeePunches.length === 0) return attendanceRows;

  // ETAPA 2.2: Agrupador Lógico por Huecos (Turnos)
  const shifts = [];
  let currentShift = [];

  for (let i = 0; i < employeePunches.length; i++) {
    const p = employeePunches[i];
    if (!p.timestamp) continue;
    if (currentShift.length === 0) {
      currentShift.push(p);
    } else {
      const last = currentShift[currentShift.length - 1];
      const diffHours = (p.timestamp - last.timestamp) / 3600000;
      
      if (diffHours < (5 / 60)) continue; // Ignorar marcaciones dobles (menos de 5 mins)

      if (diffHours > 8) {
        shifts.push([...currentShift]);
        currentShift = [p];
      } else {
        currentShift.push(p);
      }
    }
  }

  if (currentShift.length > 0) {
    shifts.push(currentShift);
  }

  // ETAPA 3 & 4: Clasificador Posicional y Mapeo a la UI
  shifts.forEach(shift => {
    if (shift.length === 0) return;
    
    // El "Día Lógico" del turno corresponde a su fecha de entrada
    const shiftLogicalDate = shift[0].fecha; 
    
    if (!attendanceRows[shiftLogicalDate]) return;

    let hr_ent = "", hr_sal_desc1 = "", hr_ent_desc1 = "", hr_sal_desc2 = "", hr_ent_desc2 = "", hr_sal = "";
    let estado = "";

    const n = shift.length;

    hr_ent = shift[0].hora;
    
    if (n === 2) {
      hr_sal = shift[1].hora;
    } else if (n === 3) {
      hr_ent_desc1 = shift[1].hora;
      hr_sal = shift[2].hora;
      estado = "incompleto";
    } else if (n === 4) {
      hr_ent_desc1 = shift[1].hora;
      hr_sal_desc1 = shift[2].hora;
      hr_sal = shift[3].hora;
    } else if (n === 5) {
      hr_ent_desc1 = shift[1].hora;
      hr_sal_desc1 = shift[2].hora;
      hr_ent_desc2 = shift[3].hora;
      hr_sal = shift[4].hora;
      estado = "incompleto";
    } else if (n >= 6) {
      hr_ent_desc1 = shift[1].hora;
      hr_sal_desc1 = shift[2].hora;
      hr_ent_desc2 = shift[3].hora;
      hr_sal_desc2 = shift[4].hora;
      hr_sal = shift[n - 1].hora;
      if (n % 2 !== 0) estado = "incompleto";
    } else if (n === 1) {
      estado = "incompleto";
    }

    attendanceRows[shiftLogicalDate] = {
      ...attendanceRows[shiftLogicalDate],
      hr_ent,
      hr_sal_desc1,
      hr_ent_desc1,
      hr_sal_desc2,
      hr_ent_desc2,
      hr_sal,
      estado
    };
  });

  return attendanceRows;
};
