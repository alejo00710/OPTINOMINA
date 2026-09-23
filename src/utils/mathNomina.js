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
  if (t1 === undefined || t1 === null || t1 === "" || t2 === undefined || t2 === null || t2 === "") return "00:00";
  const dec1 = timeStrToDecimal(t1);
  const dec2 = timeStrToDecimal(t2);
  let diff = dec2 - dec1;
  if (diff < 0) diff += 24; // Rollover overnight
  return decimalToTimeStr(diff);
};
export const getDecimalHours = (t1, t2) => {
  if (t1 === undefined || t1 === null || t1 === "" || t2 === undefined || t2 === null || t2 === "") return 0;
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
  if (typeof val === "number") return Number(val.toFixed(1));
  let s = String(val).replace(/\$|\s/g, '').trim();
  s = s.replace(/\./g, '');
  s = s.replace(/,/g, '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Number(n.toFixed(1));
};

export const getTimeDifferenceHHMM = (start, end, allowMidnight = true) => {
  if (start === undefined || start === null || start === "" || start === "-" || end === undefined || end === null || end === "" || end === "-") return "00:00";
  let sStr = start;
  let eStr = end;
  if (typeof start === "number" || (typeof start === "string" && !String(start).includes(":"))) sStr = decimalToTimeStr(start);
  if (typeof end === "number" || (typeof end === "string" && !String(end).includes(":"))) eStr = decimalToTimeStr(end);

  const [sh, sm] = String(sStr).split(":").map(Number);
  const [eh, em] = String(eStr).split(":").map(Number);
  
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "00:00";
  
  // Inyección de Lógica Matemática de Medianoche (Overnight)
  const fechaEntrada = new Date(2000, 0, 1, sh, sm);
  const fechaSalida = new Date(2000, 0, 1, eh, em);

  if (fechaSalida < fechaEntrada) {
      if (allowMidnight) {
          fechaSalida.setDate(fechaSalida.getDate() + 1);
      } else {
          return "00:00";
      }
  }
  
  const diffMinutes = (fechaSalida.getTime() - fechaEntrada.getTime()) / 60000;
  if (diffMinutes < 0) return "00:00";
  
  let outH = Math.floor(diffMinutes / 60);
  let outM = diffMinutes % 60;
  return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
};

export const getTimeDifference = (start, end, allowMidnight = true) => {
  if (start === undefined || start === null || start === "" || start === "-" || end === undefined || end === null || end === "" || end === "-") return 0;
  
  let sStr = start;
  let eStr = end;
  if (typeof start === "number" || (typeof start === "string" && !String(start).includes(":"))) sStr = decimalToTimeStr(start);
  if (typeof end === "number" || (typeof end === "string" && !String(end).includes(":"))) eStr = decimalToTimeStr(end);

  const [sh, sm] = String(sStr).split(":").map(Number);
  const [eh, em] = String(eStr).split(":").map(Number);
  
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  
  // Inyección de Lógica Matemática de Medianoche (Overnight) con Date objects
  const fechaEntrada = new Date(2000, 0, 1, sh, sm);
  const fechaSalida = new Date(2000, 0, 1, eh, em);

  if (fechaSalida < fechaEntrada) {
      if (allowMidnight) {
          fechaSalida.setDate(fechaSalida.getDate() + 1);
      } else {
          return 0; // Si no se permite cruce y da negativo
      }
  }
  
  const diffMinutes = (fechaSalida.getTime() - fechaEntrada.getTime()) / 60000;
  if (diffMinutes < 0) return 0; // Fallback extremo
  
  return Number((diffMinutes / 60).toFixed(4));
};


export const getOfficialShiftTime = (timeStr, type, turnoProgramadoDelDia = null) => {
  if (timeStr === undefined || timeStr === null || timeStr === "" || timeStr === "-") return "-";
  
  // 1. Escudo Anti-Crash Inmediato
  if (!turnoProgramadoDelDia || turnoProgramadoDelDia === 'null' || turnoProgramadoDelDia === 'undefined') {
      const isEnt = String(type).toLowerCase().includes('ent') || String(type).toLowerCase().includes('in') || String(type).toLowerCase() === 'e';
      return isEnt ? "06:00" : "14:00"; 
  }

  let text = String(turnoProgramadoDelDia).toUpperCase().trim();
  const isEntrada = String(type).toLowerCase().includes('ent') || String(type).toLowerCase().includes('in') || String(type).toLowerCase() === 'e';

  // FIX ESTRICTO: Split por " A " si existe
  if (text.includes(" A ")) {
      const partes = text.split(" A ");
      const matchText = isEntrada ? partes[0] : partes[1];
      const timeRegex = /(?:^|\b|\s)(\d{1,2})(?::(\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?)?(?:\b|\s|$)/i;
      const match = matchText.match(timeRegex);
      
      if (match) {
          let hh = parseInt(match[1], 10);
          const mm = match[2] || "00";
          const modifier = match[3] ? match[3].replace(/\./g, '').toUpperCase().trim() : undefined;
          const isAM = modifier === 'AM';
          const isPM = modifier === 'PM';
          
          if (isAM && hh === 12) hh = 0;
          if (isPM && hh < 12) hh += 12;
          
          return `${String(hh).padStart(2, "0")}:${mm}`;
      }
  }

  // 2. Escáner de Fuerza Bruta: Fallback
  const globalRegex = /(?:^|\b|\s)(\d{1,2})(?::(\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?)?(?:\b|\s|$)/ig;
  const matches = [...text.matchAll(globalRegex)];

  if (matches.length >= 2) {
      const match = isEntrada ? matches[0] : matches[1];
      let hh = parseInt(match[1], 10);
      const mm = match[2] || "00";
      const modifier = match[3] ? match[3].replace(/\./g, '').toUpperCase().trim() : undefined;
      const isAM = modifier === 'AM';
      const isPM = modifier === 'PM';
      
      if (isAM && hh === 12) hh = 0;
      if (isPM && hh < 12) hh += 12;
      
      return `${String(hh).padStart(2, "0")}:${mm}`;
  }
  const parts = timeStr.split(":");
  if (parts.length !== 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  let totalMinutes = hours * 60 + minutes;

  const validShifts = [360, 840, 1080, 1320];
  let closestShift = validShifts[0];
  let minDiff = Math.abs(totalMinutes - closestShift);
  
  for (let i = 1; i < validShifts.length; i++) {
    const diff = Math.abs(totalMinutes - validShifts[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestShift = validShifts[i];
    }
  }
  
  totalMinutes = closestShift;

  let newHours = Math.floor(totalMinutes / 60);
  let newMinutes = totalMinutes % 60;
  
  // Manejo de cruce de medianoche por redondeo
  if (newHours >= 24) newHours -= 24;

  const hh = String(newHours).padStart(2, "0");
  const mm = String(newMinutes).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const calculateSmartShift = (dbShiftText, realPunchIn, realPunchOut) => {
    if (String(dbShiftText).toUpperCase().includes('DESCANSO')) {
        return { officialIn: null, officialOut: null, isRestDay: true, lateMinutes: 0 };
    }
    const isEmptyPunchIn = realPunchIn === undefined || realPunchIn === null || realPunchIn === '--:--' || realPunchIn === 'null' || String(realPunchIn).trim() === '' || realPunchIn === '-';
    const isEmptyPunchOut = realPunchOut === undefined || realPunchOut === null || realPunchOut === '--:--' || realPunchOut === 'null' || String(realPunchOut).trim() === '' || realPunchOut === '-';

    let baseInHH = 6, baseInMM = 0, baseOutHH = 14, baseOutMM = 0;
    let usedDB = false;

    // 2. Prioridad 1: Leer Base de Datos (Parseo Manual Estricto por ' A ')
    const isEmptyDB = !dbShiftText || dbShiftText === 'null' || dbShiftText === 'undefined' || String(dbShiftText).trim() === '{}' || String(dbShiftText).trim() === '';
    if (!isEmptyDB) {
        let textToParse = String(dbShiftText).toUpperCase().trim();
        
        // FIX ESTRICTO: Dividir el string en entrada y salida si contiene " A "
        if (textToParse.includes(" A ")) {
            const partes = textToParse.split(" A ");
            const timeRegex = /(?:^|\b|\s)(\d{1,2})(?::(\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?)?(?:\b|\s|$)/i;
            
            const matchIn = partes[0].match(timeRegex);
            const matchOut = partes[1].match(timeRegex);
            
            if (matchIn && matchOut) {
                const formatTime = (match) => {
                    let hh = parseInt(match[1], 10);
                    const mm = parseInt(match[2] || "00", 10);
                    const mod = match[3] ? match[3].replace(/\./g, '').toUpperCase().trim() : undefined;
                    const isAM = mod === 'AM';
                    const isPM = mod === 'PM';
                    
                    if (isAM && hh === 12) hh = 0;
                    if (isPM && hh < 12) hh += 12;
                    
                    return { hh, mm };
                };
                
                const bIn = formatTime(matchIn);
                const bOut = formatTime(matchOut);
                
                baseInHH = bIn.hh; baseInMM = bIn.mm;
                baseOutHH = bOut.hh; baseOutMM = bOut.mm;
                usedDB = true;
            }
        }
        
        // Fallback al escáner global si no tenía " A "
        if (!usedDB) {
            const globalRegex = /(?:^|\b|\s)(\d{1,2})(?::(\d{2}))?\s*(A\.?\s*M\.?|P\.?\s*M\.?)?(?:\b|\s|$)/ig;
            let matches = [...textToParse.matchAll(globalRegex)].filter(m => parseInt(m[1], 10) <= 24);
            if (matches.length >= 2) {
                const formatTime = (match) => {
                    let hh = parseInt(match[1], 10);
                    const mm = parseInt(match[2] || "00", 10);
                    const mod = match[3] ? match[3].replace(/\./g, '').toUpperCase().trim() : undefined;
                    const isAM = mod === 'AM';
                    const isPM = mod === 'PM';
                    
                    if (isAM && hh === 12) hh = 0;
                    if (isPM && hh < 12) hh += 12;
                    
                    return { hh, mm };
                };
                const bIn = formatTime(matches[0]);
                const bOut = formatTime(matches[matches.length - 1]);
                baseInHH = bIn.hh; baseInMM = bIn.mm;
                baseOutHH = bOut.hh; baseOutMM = bOut.mm;
                usedDB = true;
            }
        }
    }

    // 2.5 Cortocircuito si faltan marcas físicas (retorna el oficial puro extraído)
    if (isEmptyPunchIn || isEmptyPunchOut) {
        if (!usedDB) return { officialIn: "-", officialOut: "-", lateMinutes: 0 };
        const pad = (n) => String(n).padStart(2, '0');
        return { 
            officialIn: `${pad(baseInHH)}:${pad(baseInMM)}`, 
            officialOut: `${pad(baseOutHH)}:${pad(baseOutMM)}`, 
            lateMinutes: 0 
        };
    }

    const [realHH, realMM] = String(realPunchIn).split(':').map(Number);
    const realTotalMins = (realHH * 60) + realMM;


    // 3. Prioridad 2: Template Matching en Minutos (Si BD falla o está vacía)
    if (!usedDB) {
        // Catálogo Global de Turnos (Planta + Taller)
        const templates = [
            { inHH: 6, inMM: 0, outHH: 14, outMM: 0 },   // 06:00 a 14:00
            { inHH: 6, inMM: 0, outHH: 18, outMM: 0 },   // 06:00 a 18:00
            { inHH: 7, inMM: 0, outHH: 17, outMM: 0 },   // 07:00 a 17:00
            { inHH: 7, inMM: 30, outHH: 16, outMM: 0 },  // 07:30 a 16:00 (TALLER VIERNES)
            { inHH: 7, inMM: 30, outHH: 17, outMM: 0 },  // 07:30 a 17:00 (TALLER 9.5h)
            { inHH: 7, inMM: 30, outHH: 18, outMM: 0 },  // 07:30 a 18:00 (TALLER 10.5h)
            { inHH: 10, inMM: 0, outHH: 18, outMM: 0 },  // 10:00 a 18:00
            { inHH: 10, inMM: 0, outHH: 22, outMM: 0 },  // 10:00 a 22:00
            { inHH: 14, inMM: 0, outHH: 22, outMM: 0 },  // 14:00 a 22:00
            { inHH: 18, inMM: 0, outHH: 6, outMM: 0 },   // 18:00 a 06:00
            { inHH: 22, inMM: 0, outHH: 6, outMM: 0 }    // 22:00 a 06:00
        ];

        const [outHH, outMM] = String(realPunchOut || "00:00").split(':').map(Number);
        const realInMins = (realHH * 60) + (realMM || 0);
        const realOutMins = (outHH * 60) + (outMM || 0);
        
        let bestMatch = templates[0];
        let minDiff = Infinity;

        templates.forEach(t => {
            let tInMins = (t.inHH * 60) + t.inMM;
            let inDiff = Math.abs(realInMins - tInMins);
            if (inDiff > 720) inDiff = 1440 - inDiff; // Tolerancia de trasnoche
            
            let tOutMins = (t.outHH * 60) + t.outMM;
            let outDiff = Math.abs(realOutMins - tOutMins);
            if (outDiff > 720) outDiff = 1440 - outDiff;

            const totalDiff = inDiff + outDiff;
            if (totalDiff < minDiff) {
                minDiff = totalDiff;
                bestMatch = t;
            }
        });

        baseInHH = bestMatch.inHH;
        baseInMM = bestMatch.inMM;
        baseOutHH = bestMatch.outHH;
        baseOutMM = bestMatch.outMM;
        
        // --- INICIO CORRECCIÓN ADIVINANZA TALLER ---
        // Si el sistema adivinó el turno de las 07:00, forzarlo al turno real de 07:30
        if (baseInHH === 7 && baseInMM === 0) {
            baseInMM = 30; // Lo empuja a las 07:30
        }
        // --- FIN CORRECCIÓN ADIVINANZA TALLER ---
    }

    // 4. Regla Industrial: Exigencia de 10 mins y Snapping
    const baseTotalMins = (baseInHH * 60) + baseInMM;
    const targetTotalMins = baseTotalMins - 10; 

    let lateMins = 0;
    let finalJ_HH = baseInHH;
    let finalJ_MM = baseInMM;

    if (realTotalMins > targetTotalMins) {
        lateMins = realTotalMins - targetTotalMins; 
        
        if (realTotalMins > baseTotalMins) {
            const diffFromBase = realTotalMins - baseTotalMins;
            const extraMins = Math.ceil(diffFromBase / 30) * 30; // Bloques de 30 mins
            
            finalJ_HH = baseInHH + Math.floor(extraMins / 60);
            finalJ_MM = baseInMM + (extraMins % 60);
            if (finalJ_MM >= 60) { finalJ_HH += 1; finalJ_MM -= 60; }
        }
    }

    // 5. Castigo de Salida (Snapping Dinámico para K)
    let finalK_HH = baseOutHH;
    let finalK_MM = baseOutMM;

    if (realPunchOut && realPunchOut !== '--:--' && realPunchOut !== 'null') {
        const [outHH, outMM] = String(realPunchOut).split(':').map(Number);
        
        // Inyección de Lógica Matemática de Medianoche (Overnight)
        const fechaEntradaReal = new Date(2000, 0, 1, realHH, realMM);
        const fechaSalidaReal = new Date(2000, 0, 1, outHH, outMM);
        if (fechaSalidaReal < fechaEntradaReal) {
            fechaSalidaReal.setDate(fechaSalidaReal.getDate() + 1);
        }

        const fechaEntradaProgramada = new Date(2000, 0, 1, baseInHH, baseInMM);
        const fechaSalidaProgramada = new Date(2000, 0, 1, baseOutHH, baseOutMM);
        if (fechaSalidaProgramada < fechaEntradaProgramada) {
            fechaSalidaProgramada.setDate(fechaSalidaProgramada.getDate() + 1);
        }
        
        const adjRealOut = fechaSalidaReal.getTime() / 60000;
        const adjBaseOut = fechaSalidaProgramada.getTime() / 60000;

        // REGLA: Si salió ANTES de la hora oficial, castigamos la K
        if (adjRealOut < adjBaseOut) {
            // Redondea hacia abajo al bloque de 30 mins que sí completó (ajustado sobre 0)
            const baseEpoch = new Date(2000, 0, 1).getTime() / 60000;
            const snappedMins = Math.floor((adjRealOut - baseEpoch) / 30) * 30;
            finalK_HH = Math.floor(snappedMins / 60) % 24;
            finalK_MM = snappedMins % 60;
        }
    }

    let isMissingOut = realPunchOut === undefined || realPunchOut === null || realPunchOut === '--:--' || realPunchOut === 'null' || String(realPunchOut).trim() === '';

    const pad = (n) => String(n).padStart(2, '0');
    return {
        officialIn: `${pad(finalJ_HH)}:${pad(finalJ_MM)}`,
        officialOut: isMissingOut ? "" : `${pad(finalK_HH)}:${pad(finalK_MM)}`,
        lateMinutes: lateMins
    };
};

export const calculateDailyRecord = (day, overrides, prefix, horaInicioDiurna, horaFinDiurna, turnoProgramadoDelDia = null) => {
  const isTime = (t) => t !== undefined && t !== null && String(t).trim() !== "" && String(t).trim() !== "-";

  // Descansos (F y I)
  const hrEntDesc1 = overrides[`${prefix}_hr_ent_desc1`] !== undefined ? String(overrides[`${prefix}_hr_ent_desc1`]) : (day.hr_ent_desc1 || "-");
  const hrSalDesc1 = overrides[`${prefix}_hr_sal_desc1`] !== undefined ? String(overrides[`${prefix}_hr_sal_desc1`]) : (day.hr_sal_desc1 || "-");
  const hrEntDesc2 = overrides[`${prefix}_hr_ent_desc2`] !== undefined ? String(overrides[`${prefix}_hr_ent_desc2`]) : (day.hr_ent_desc2 || "-");
  const hrSalDesc2 = overrides[`${prefix}_hr_sal_desc2`] !== undefined ? String(overrides[`${prefix}_hr_sal_desc2`]) : (day.hr_sal_desc2 || "-");

  let desc1 = "00:00";
  if (isTime(hrEntDesc1) && !isTime(hrSalDesc1)) {
      desc1 = "00:30";
  } else {
      desc1 = getTimeDifferenceHHMM(hrEntDesc1, hrSalDesc1, false);
  }

  let desc2 = "00:00";
  if (isTime(hrEntDesc2) && !isTime(hrSalDesc2)) {
      desc2 = "00:30";
  } else {
      desc2 = getTimeDifferenceHHMM(hrEntDesc2, hrSalDesc2, false);
  }
  
  let comidasExcedidasVeces = 0;
  let comidasExcedidasMin = 0;

  if (desc1 !== "00:00" && desc1 !== "") {
     const [h1, m1] = desc1.split(':').map(Number);
     const totalMin1 = (h1 * 60) + m1;
     if (totalMin1 > 30) {
         comidasExcedidasVeces += 1;
         comidasExcedidasMin += (totalMin1 - 30);
     }
  }

  if (desc2 !== "00:00" && desc2 !== "") {
     const [h2, m2] = desc2.split(':').map(Number);
     const totalMin2 = (h2 * 60) + m2;
     if (totalMin2 > 30) {
         comidasExcedidasVeces += 1;
         comidasExcedidasMin += (totalMin2 - 30);
     }
  }
  
  const desc1Val = timeStrToDecimal(desc1);
  const desc2Val = timeStrToDecimal(desc2);

  // Pago Ent (J) y Pago Sal (K) con Cerebro de Turnos
  const smartShift = calculateSmartShift(turnoProgramadoDelDia, day.hr_ent, day.hr_sal);
  const baseHrEnt = smartShift.officialIn;
  const baseHrSal = smartShift.officialOut;

  // REGLA ESTRICTA DE PRIORIDAD: Si el JSON tiene un turno (texto), ignora cualquier override histórico.
  const isJSONShiftActive = typeof turnoProgramadoDelDia === 'string' && turnoProgramadoDelDia.trim() !== "";

  const hrEntPago = isJSONShiftActive 
      ? baseHrEnt 
      : (overrides[`${prefix}_hr_ent_pago`] !== undefined ? String(overrides[`${prefix}_hr_ent_pago`]) : baseHrEnt);
      
  const hrSalPago = isJSONShiftActive 
      ? baseHrSal 
      : (overrides[`${prefix}_hr_sal_pago`] !== undefined ? String(overrides[`${prefix}_hr_sal_pago`]) : baseHrSal);
  
  // Col L: Hr. Lab = Diferencia entre J y K
  let hrLab = 0;
  if (isTime(hrEntPago) && isTime(hrSalPago)) {
     hrLab = getTimeDifference(hrEntPago, hrSalPago); // Ya maneja cruce de medianoche por defecto
     if (hrLab < 0) hrLab = 0;
  }
  
  // Col M: Descuento Dinámico basado en horas físicas (brutas)
  let horasBrutas = 0;
  if (isTime(day.hr_ent) && isTime(day.hr_sal)) {
      horasBrutas = getTimeDifference(day.hr_ent, day.hr_sal);
  }

  let des = 0;
  if (hrLab > 0) {
      if (hrLab > 8.0) {
          des = 1.0;
      } else {
          des = 0.5;
      }
  }

  const isValidPunch = (t) => t !== undefined && t !== null && String(t).trim() !== "" && String(t).trim() !== "-";
  const diaIncompletoFlag = !isValidPunch(hrEntPago) || !isValidPunch(hrSalPago);
  
  if (diaIncompletoFlag) {
      des = 0;
  }
  
  // Col N: Hr. Pag = L3 - M3
  const hrPag = hrLab > 0 ? hrLab - des : 0;
  
  const MAX_ORDINARY = 7.0;

  let diurn = 0;
  let noct = 0;
  let extDiu = 0;
  let extNoc = 0;

  if (smartShift.isRestDay) {
      day.estado = "DESCANSO";
      day.novedad = "";
  } else if (hrPag > 0 && hrEntPago && hrSalPago && hrEntPago !== "-" && hrSalPago !== "-") {
      let start = timeStrToDecimal(hrEntPago);
      let end = timeStrToDecimal(hrSalPago);
      if (end <= start && (end > 0 || start > 0)) end += 24;
      
      let rawDiu = 0;
      let rawNoc = 0;
      
      // Diurnal: 06:00 to 19:00
      const diuRanges = [{ s: 6, e: 19 }, { s: 30, e: 43 }];
      for (let i = 0; i < diuRanges.length; i++) {
          let s = Math.max(start, diuRanges[i].s);
          let e = Math.min(end, diuRanges[i].e);
          if (s < e) rawDiu += (e - s);
      }
      
      rawNoc = (end - start) - rawDiu;
      
      let netDiu = rawDiu;
      let netNoc = rawNoc;
      
      if (rawDiu >= rawNoc) {
          netDiu = Math.max(0, rawDiu - des);
          let remainder = des - (rawDiu - netDiu);
          netNoc = Math.max(0, rawNoc - remainder);
      } else {
          netNoc = Math.max(0, rawNoc - des);
          let remainder = des - (rawNoc - netNoc);
          netDiu = Math.max(0, rawDiu - remainder);
      }
      
      // Prioridad a las nocturnas para la base ordinaria
      noct = Math.min(netNoc, MAX_ORDINARY);
      let remainingOrd = Math.max(0, MAX_ORDINARY - noct);
      diurn = Math.min(netDiu, remainingOrd);
      
      extNoc = Math.max(0, netNoc - noct);
      extDiu = Math.max(0, netDiu - diurn);
  }
  
  // Manuals overriding or defaults to 0
  let fesDiu = overrides[`${prefix}_fes_diu`] !== undefined ? Number(overrides[`${prefix}_fes_diu`]) : Number(day.fes_diu || 0);
  let fesNoc = overrides[`${prefix}_fes_noc`] !== undefined ? Number(overrides[`${prefix}_fes_noc`]) : Number(day.fes_noc || 0);
  let extFesDiu = overrides[`${prefix}_ext_fes_diu`] !== undefined ? Number(overrides[`${prefix}_ext_fes_diu`]) : Number(day.ext_fes_diu || 0);
  let extFesNoc = overrides[`${prefix}_ext_fes_noc`] !== undefined ? Number(overrides[`${prefix}_ext_fes_noc`]) : Number(day.ext_fes_noc || 0);
  
  // Apply overrides for computed fields
  let finalDiurnas = overrides[`${prefix}_diurnas`] !== undefined ? Number(overrides[`${prefix}_diurnas`]) : diurn;
  let finalNocturnas = overrides[`${prefix}_nocturnas`] !== undefined ? Number(overrides[`${prefix}_nocturnas`]) : noct;
  let finalExtDiu = overrides[`${prefix}_ext_diu`] !== undefined ? Number(overrides[`${prefix}_ext_diu`]) : extDiu;
  extNoc = overrides[`${prefix}_ext_noc`] !== undefined ? Number(overrides[`${prefix}_ext_noc`]) : extNoc;
  
  const calcLlegadaTardeMin = smartShift.lateMinutes || 0;
  const calcLlegadaTarde = calcLlegadaTardeMin > 0 ? 1 : 0;
  
  let llegadaTarde = overrides[`${prefix}_llegada_tarde`] !== undefined ? Number(overrides[`${prefix}_llegada_tarde`]) : calcLlegadaTarde;
  let llegadaTardeMin = overrides[`${prefix}_llegada_tarde_min`] !== undefined ? Number(overrides[`${prefix}_llegada_tarde_min`]) : calcLlegadaTardeMin;

  // CORTACIRCUITOS (KILL SWITCH) PARA CÁLCULOS MATEMÁTICOS
  const faltaTurnoOficial = !hrEntPago || hrEntPago === "-" || !hrSalPago || hrSalPago === "-";
  
  if (faltaTurnoOficial) {
      finalDiurnas = 0;
      finalNocturnas = 0;
      fesDiu = 0;
      fesNoc = 0;
      finalExtDiu = 0;
      extNoc = 0;
      extFesDiu = 0;
      extFesNoc = 0;
      llegadaTarde = 0;
      llegadaTardeMin = 0;
  }

  // Novedad por Salida Temprana
  const horasTurnoOficial = getTimeDifference(baseHrEnt, baseHrSal);
  if (horasBrutas > 0 && horasBrutas < (horasTurnoOficial - 0.25)) {
      if (day.estado === "normal") {
          day.estado = "incompleto";
          day.novedad = "SALIDA ANTICIPADA / TIEMPO INCOMPLETO";
      }
  }

// --- INICIO INTERCEPTOR DEFINITIVO ---
// 1. Limpiar extras falsas tolerando la imprecisión de decimales (1.500001)
if (hrLab <= 9.6) {
    if (finalExtDiu >= 1.4 && finalExtDiu <= 1.6) finalExtDiu = 0;
    if (extNoc >= 1.4 && extNoc <= 1.6) extNoc = 0;
}
if (hrLab <= 8.1) {
    if (finalExtDiu >= 0.4 && finalExtDiu <= 0.6) finalExtDiu = 0;
    if (extNoc >= 0.4 && extNoc <= 0.6) extNoc = 0;
}

// 2 & 3. Corregir llegada tarde del Taller (Escáner Global)
const dataFila = JSON.stringify(day || {}).toLowerCase() + String(typeof turnoProgramadoDelDia !== 'undefined' ? turnoProgramadoDelDia : "").toLowerCase();

if (dataFila.includes("7:30") || dataFila.includes("07:30")) {
    if (llegadaTardeMin > 0) {
        llegadaTardeMin = Math.max(0, llegadaTardeMin - 30);
        llegadaTarde = llegadaTardeMin > 0 ? 1 : 0;
    }
}

// --- NUEVO CHISMOSO CON ID ---
const idEmpleado = day.cedula || day.empleado_id || day.documento || "Sin ID";
const fechaDia = day.fecha || day.date || day.dia || "Sin Fecha";
    
console.log(`🔎 EMPLEADO: ${idEmpleado} | FECHA: ${fechaDia} | TURNO BRUTO:`, day.turno || day.horario || day.horario_id || "Ninguno", "| DATA COMPLETA:", day);
// --- FIN NUEVO CHISMOSO ---
// --- FIN INTERCEPTOR DEFINITIVO ---

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
    llegada_tarde_min: llegadaTardeMin,
    comidas_excedidas_veces: overrides[`${prefix}_comidas_excedidas_veces`] !== undefined ? Number(overrides[`${prefix}_comidas_excedidas_veces`]) : comidasExcedidasVeces,
    comidas_excedidas_min: overrides[`${prefix}_comidas_excedidas_min`] !== undefined ? Number(overrides[`${prefix}_comidas_excedidas_min`]) : comidasExcedidasMin,
    officialIn: baseHrEnt,
    officialOut: baseHrSal
  };
};
