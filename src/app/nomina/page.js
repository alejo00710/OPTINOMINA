"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Filter, Coins, Info, SlidersHorizontal, Download, RotateCcw, AlertTriangle, Briefcase, FileSpreadsheet, CheckCircle2, ChevronDown, ChevronRight, Calculator, Plus, Trash2, Calendar as CalendarIcon, UploadCloud, Users, ChevronLeft, CalendarRange } from "lucide-react";
import TabDirectorio from "@/components/Nomina/TabDirectorio";
import TabReportes from "@/components/Nomina/TabReportes";
import ColumnVisibilityToggle from "@/components/Nomina/ColumnVisibilityToggle";
import NominaSummaryCards from "@/components/Nomina/NominaSummaryCards";
import EditableCell from "@/components/Nomina/EditableCell";
import TabPanelGeneral from "@/components/Nomina/TabPanelGeneral";
import TabColillas from "@/components/Nomina/TabColillas";
import TabLiquidacion from "@/components/Nomina/TabLiquidacion";
import { NOMINA_DATE_RANGE_KEY, loadPersistedDateRange, savePersistedDateRange, PLANILLA_COLUMNS, DAILY_COLUMNS, LIQUIDATION_CONCEPTS, SMLV, AUX_TRANSPORTE, DIVISOR_RECARGOS_NOCTURNOS, DIVISOR_HORAS_EXTRAS, FACTOR_RECARGO_NOCTURNO, FACTOR_EXTRA_DIURNA, FACTOR_EXTRA_NOCTURNA, FACTOR_EXTRA_FESTIVA } from "@/utils/constants";
import { timeStrToDecimal, decimalToTimeStr, diffTimeStr, getDecimalHours, getHourDist, fmtCOP, fmtDec, parseLocalNumber } from "@/utils/mathNomina";
import { supabase, savePayrollToCloud, loadPayrollFromCloud, loadEmployeesFromCloud, uploadEmployeesBulk } from "@/utils/supabase";
import { detectShiftTemplate, emptyAttendanceDay, cleanWorkerPunches, parseBiometricExcel } from "@/utils/biometricCore";

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

export default function NominaPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsWorkerName, setDetailsWorkerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");

  const [nominaRows, setNominaRows] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState({});
  const [ratesMap] = useState({});
  const [overrides, setOverrides] = useState({});
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [showColumnManager, setShowColumnManager] = useState(false);

  const [selectedWorkerName, setSelectedWorkerName] = useState("");

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
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-05-15");

  const loadEmployees = async () => {
      try {
        let masterEmployees = [];
        const empRes = await loadEmployeesFromCloud();
        if (empRes.success && empRes.data) {
          masterEmployees = empRes.data.map((emp, index) => ({
            consecutivo: index + 1,
            cedula: emp.cedula,
            nombre: emp.nombre,
            cargo: emp.cargo,
            categoria: emp.categoria,
            salario: Number(emp.salario_base || emp.salario || 0),
            aux_transporte: Number(emp.aux_transporte || 0),
            rodamiento: Number(emp.rodamiento || 0),
            comisiones: 0,
            poliza_bolivar: Number(emp.poliza_bolivar || 0),
            poliza_sura: Number(emp.poliza_sura || 0),
            optica: Number(emp.optica || 0),
            prestamos: Number(emp.prestamos || 0),
            // Transaccionales inicializados en 0
            dias_pagados: 0,
            horas_diurnas: 0,
            horas_nocturnas: 0,
            extras_diurnas: 0,
            extras_nocturnas: 0,
            extras_festivas: 0,
            total_devengados: 0,
            total_deducciones: 0,
            neto_pagar: 0
          }));
        }

        // TAREA 3: Iniciar en blanco (solo cargar masterEmployees y estados vacíos)
        setNominaRows(masterEmployees);
        setAttendanceLogs({});
        setOverrides({});
      } catch (e) {
        console.error("Error loading persisted payroll data from cloud:", e);
      } finally {
        setIsDbLoading(false);
      }
    };



  useEffect(() => {


    const range = loadPersistedDateRange();


    setStartDate(range.start);


    setEndDate(range.end);


    loadEmployees();


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
    console.log("RECALCULATING PAYROLL DATA. Attendance logs:", Object.keys(attendanceLogs).length, "employees");
    return nominaRows.map(emp => {
      const cedula = emp.cedula;
      const logs = attendanceLogs[cedula] || [];
      
      // 1. Sumatorias del Biométrico (Equivalente a Fila 24 de hojas individuales)
      let sumDiurnas = 0, sumNocturnas = 0, sumFesDiu = 0, sumFesNoc = 0;
      let sumExtDiu = 0, sumExtNoc = 0, sumExtFesDiu = 0, sumExtFesNoc = 0;
      let diasLaborados = 0;

      logs.forEach(day => {
        if (day.hr_lab > 0) diasLaborados++;
        sumDiurnas += Number(day.diurnas || 0);
        sumNocturnas += Number(day.nocturnas || 0);
        sumFesDiu += Number(day.fes_diu || 0);
        sumFesNoc += Number(day.fes_noc || 0);
        sumExtDiu += Number(day.ext_diu || 0);
        sumExtNoc += Number(day.ext_noc || 0);
        sumExtFesDiu += Number(day.ext_fes_diu || 0);
        sumExtFesNoc += Number(day.ext_fes_noc || 0);
      });

      // Sobreescribir días pagados si el usuario lo editó manualmente (overrides) o usar los calculados
      const diasPagados = resolveValue(overrides, `${cedula}_dias_pagados`, () => (diasLaborados > 0 ? diasLaborados : 15));
      const salarioBase = Number(emp.salario_base || emp.salario || 0);
      const valDia = salarioBase / 30;
      const sueldoBasico = resolveValue(overrides, `${cedula}_sueldo`, () => parseLocalNumber(valDia * diasPagados));

      // 2. Cálculo de Valores (Fórmulas Excel Columnas N a R)
      // Nota: Usamos las variables de DIVISOR y FACTOR importadas de constants.js
      const valRecargoNocturno = resolveValue(overrides, `${cedula}_recargo_nocturno`, () => parseLocalNumber((salarioBase / DIVISOR_RECARGOS_NOCTURNOS) * FACTOR_RECARGO_NOCTURNO * sumNocturnas));
      const valExtDiurna = resolveValue(overrides, `${cedula}_val_extras_diurnas`, () => parseLocalNumber((salarioBase / DIVISOR_HORAS_EXTRAS) * FACTOR_EXTRA_DIURNA * sumExtDiu));
      const valExtNocturna = resolveValue(overrides, `${cedula}_val_extras_nocturnas`, () => parseLocalNumber((salarioBase / DIVISOR_HORAS_EXTRAS) * FACTOR_EXTRA_NOCTURNA * sumExtNoc));
      const valExtFesDiuRaw = (salarioBase / DIVISOR_HORAS_EXTRAS) * FACTOR_EXTRA_FESTIVA * sumExtFesDiu;
      const valExtFesTotal = resolveValue(overrides, `${cedula}_val_extras_festivas`, () => parseLocalNumber(valExtFesDiuRaw));

      const comisiones = resolveValue(overrides, `${cedula}_comisiones`, () => 0);
      
      // Auxilio de Transporte (Columna S: =SI(F<=(SMLV*2);(AUX_TRANSPORTE/30)*G;0))
      let auxTransporteCalculado = 0;
      if (salarioBase <= (SMLV * 2)) {
         auxTransporteCalculado = (AUX_TRANSPORTE / 30) * diasPagados;
      }
      // Respetar si hay un aux_transporte fijo en el perfil (para excepciones)
      const auxTransporteFinal = resolveValue(overrides, `${cedula}_transporte`, () => parseLocalNumber(Number(emp.aux_transporte) > 0 ? Number(emp.aux_transporte) : auxTransporteCalculado));
      
      const rodamiento = resolveValue(overrides, `${cedula}_rodamiento`, () => parseLocalNumber(Number(emp.rodamiento || 0)));
      const diasIncapacidad = resolveValue(overrides, `${cedula}_dias_incapacidad`, () => parseLocalNumber(Number(emp.dias_incapacidad || 0)));
      const valDiarioIncap = ((salarioBase / 30) / 3) * 2;
      const minDiario = SMLV / 30;
      const calcIncap = diasIncapacidad > 0 ? diasIncapacidad * (valDiarioIncap > minDiario ? valDiarioIncap : minDiario) : 0;
      const incapacidad = resolveValue(overrides, `${cedula}_incapacidad`, () => parseLocalNumber(calcIncap));
      const bonificacion = resolveValue(overrides, `${cedula}_bonificacion`, () => 0);

      // 3. Total Devengado (Columna W)
      const totalDevengado = resolveValue(overrides, `${cedula}_total_devengados`, () => parseLocalNumber(sueldoBasico + valRecargoNocturno + valExtDiurna + valExtNocturna + valExtFesTotal + comisiones + auxTransporteFinal + rodamiento + incapacidad));

      // 4. Deducciones Base (Columnas X, Y, Z)
      // Base para seguridad social (no incluye transporte ni rodamiento)
      const baseSeguridadSocial = totalDevengado - auxTransporteFinal - rodamiento; 
      const salud = resolveValue(overrides, `${cedula}_salud`, () => parseLocalNumber(baseSeguridadSocial * 0.04));
      const pension = resolveValue(overrides, `${cedula}_pension`, () => parseLocalNumber(baseSeguridadSocial * 0.04));
      const solidaridad = resolveValue(overrides, `${cedula}_solidaridad`, () => parseLocalNumber(salarioBase >= (SMLV * 4) ? (baseSeguridadSocial * 0.01) : 0));

      // 5. Deducciones Fijas de la BD (Columnas AA a AH)
      const prestamos = resolveValue(overrides, `${cedula}_prestamos`, () => parseLocalNumber(Number(emp.prestamos || 0)));
      const polizaBolivar = resolveValue(overrides, `${cedula}_poliza_bolivar`, () => parseLocalNumber(Number(emp.poliza_bolivar || 0)));
      const polizaPlenitud = resolveValue(overrides, `${cedula}_poliza_plenitud`, () => parseLocalNumber(Number(emp.poliza_plenitud || 0)));
      const libranzaComfama = resolveValue(overrides, `${cedula}_libranza_comfama`, () => parseLocalNumber(Number(emp.libranza_comfama || 0)));
      const polizaSura = resolveValue(overrides, `${cedula}_poliza_sura`, () => parseLocalNumber(Number(emp.poliza_sura || 0)));
      const optica = resolveValue(overrides, `${cedula}_optica`, () => parseLocalNumber(Number(emp.optica || 0)));
      const celular = resolveValue(overrides, `${cedula}_celular`, () => parseLocalNumber(Number(emp.celular || 0)));
      const retencion = resolveValue(overrides, `${cedula}_retencion`, () => parseLocalNumber(Number(emp.retencion || 0)));

      // 6. Total Deducido y Neto (Columnas AI, AJ)
      const totalDeducciones = resolveValue(overrides, `${cedula}_total_deducciones`, () => parseLocalNumber(salud + pension + solidaridad + prestamos + polizaBolivar + polizaPlenitud + libranzaComfama + polizaSura + optica + celular + retencion));
      const netoPagar = resolveValue(overrides, `${cedula}_neto_pagar`, () => parseLocalNumber(totalDevengado - totalDeducciones + bonificacion)); // bonificacion no salarial

      return {
        masterRow: emp,
        ...emp,
        dias_pagados: diasPagados,
        horas_diurnas: sumDiurnas,
        horas_nocturnas: sumNocturnas,
        extras_diurnas: sumExtDiu,
        extras_nocturnas: sumExtNoc,
        extras_festivas: sumExtFesDiu,
        sueldo: sueldoBasico,
        recargo_nocturno: valRecargoNocturno,
        val_extras_diurnas: valExtDiurna,
        val_extras_nocturnas: valExtNocturna,
        val_extras_festivas: valExtFesTotal,
        comisiones,
        transporte: auxTransporteFinal,
        rodamiento,
        dias_incapacidad: diasIncapacidad,
        incapacidad,
        total_devengados: totalDevengado,
        salud,
        pension,
        solidaridad,
        prestamos,
        poliza_bolivar: polizaBolivar,
        poliza_plenitud: polizaPlenitud,
        libranza_comfama: libranzaComfama,
        poliza_sura: polizaSura,
        optica,
        celular,
        retencion,
        total_deducciones: totalDeducciones,
        bonificacion,
        neto_pagar: netoPagar,
        workerDays: logs,
        liquidation: {
            total_extra_val: valRecargoNocturno + valExtDiurna + valExtNocturna + valExtFesTotal
        }
      };
    });
  }, [nominaRows, attendanceLogs, overrides]);

  // Filtering based on SearchTerm and Position selector
  const filteredPayrollData = useMemo(() => {
    return payrollData.filter(item => {
      const itemName = item.nombre || item.name || "";
      const nameMatch = itemName.toLowerCase().includes(searchTerm.toLowerCase()) || String(item.masterRow?.cedula || "").includes(searchTerm);
      const posMatch = filterPosition === "all" || item.masterRow?.cargo === filterPosition;
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
        segments[normalizedCat].salarioBase += (item.salario || 0);
        segments[normalizedCat].devengado += (item.total_devengados || 0);
        segments[normalizedCat].deducciones += (item.total_deducciones || 0);
        segments[normalizedCat].neto += (item.neto_pagar || 0);
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
          const val = item[col.key];
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
      const bank = String(item.banco || item.masterRow?.banco || "").toUpperCase();
      const val = item.neto_pagar || 0;
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
    return payrollData.find(item => (item.nombre || item.name) === selectedWorkerName) || null;
  }, [payrollData, selectedWorkerName]);

  const handleCellEdit = (cellKey, val) => {
    setOverrides(prev => ({
      ...prev,
      [cellKey]: parseLocalNumber(val)
    }));
  };
  
  const handleClearAll = async () => {
    if (window.confirm("¿Seguro de iniciar una nueva quincena? (Se conservarán datos fijos y se borrarán horas/extras).")) {
      const freshRows = nominaRows.map(emp => ({
        ...emp,
        consecutivo: emp.consecutivo,
        cedula: emp.cedula,
        nombre: emp.nombre,
        cargo: emp.cargo,
        categoria: emp.categoria,
        salario: Number(emp.salario_base || emp.salario || 0),
        aux_transporte: Number(emp.aux_transporte || 0),
        rodamiento: Number(emp.rodamiento || 0),
        prestamos: Number(emp.prestamos || 0),
        poliza_bolivar: Number(emp.poliza_bolivar || 0),
        poliza_sura: Number(emp.poliza_sura || 0),
        optica: Number(emp.optica || 0),
        dias_pagados: 0,
        horas_diurnas: 0,
        horas_nocturnas: 0,
        extras_diurnas: 0,
        extras_nocturnas: 0,
        extras_festivas: 0,
        total_devengados: 0,
        total_deducciones: 0,
        neto_pagar: 0
      }));
      setNominaRows(freshRows);
      setAttendanceLogs({});
      setOverrides({});
      
      try {
        await supabase
          .from('optimoldes_payroll')
          .upsert({
            id: 'quincena_activa',
            start_date: startDate,
            end_date: endDate,
            nomina_rows: freshRows,
            attendance_logs: {},
            overrides: {},
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
        alert("Planilla reseteada en la nube. Lista para nuevo biométrico.");
      } catch (err) {
        console.error("Error limpiando quincena en la nube:", err);
        alert("Error al limpiar en la nube. Revisa tu conexión.");
      }
    }
  };

const handleSaveToCloud = async () => {
    setToast({ message: "Guardando en la nube...", type: "info" });
    try {
      await savePayrollToCloud({ startDate, endDate, nominaRows, attendanceLogs, overrides, hiddenColumns });
      setToast({
        message: "¡Datos guardados y sincronizados en la nube!",
        type: "success"
      });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error saving data:", error);
      setToast({
        message: "Error al guardar en la nube. Revisa la consola.",
        type: "error"
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  
  const isCellOverridden = (key) => overrides[key] !== undefined;

  // --- Clock-ins Excel Uploader ---
  const normalizeString = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  
  const findRealEmployee = (bioName, masterRows) => {
    if (!bioName) return null;
    const normBio = normalizeString(bioName).split(" ").filter(w => w.length > 2);
    
    for (const row of masterRows) {
      const normReal = normalizeString(row.nombre);
      if (normReal.includes(normalizeString(bioName)) || normalizeString(bioName).includes(normReal)) {
        return row;
      }
      let matchCount = 0;
      normBio.forEach(word => { if (normReal.includes(word)) matchCount++; });
      if (matchCount >= 2) return row;
    }
    return null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setUploadStatus({
      state: "reading",
      fileName: file.name,
      progress: 15,
      detail: "Leyendo archivo...",
    });

    try {
      const cleanData = await parseBiometricExcel(file);
      
      setUploadStatus((prev) => ({
        ...prev,
        state: "processing",
        progress: 55,
        detail: "Interpretando marcaciones...",
      }));

      const newAttendance = { ...attendanceLogs };
      const stats = {
        parsedCount: 0,
        filledDays: 0,
        unmatched: [],
        matchedNames: [],
        totalPunches: cleanData.length,
      };

      // Group punches by employee
      const punchesByEmployee = {};
      cleanData.forEach(row => {
         const realEmp = findRealEmployee(row.nombre, nominaRows);
         const key = realEmp ? realEmp.cedula : "No Encontrados";
         
         if (!punchesByEmployee[key]) {
            punchesByEmployee[key] = [];
         }
         punchesByEmployee[key].push(row);
      });

      for (const [groupKey, punches] of Object.entries(punchesByEmployee)) {
         if (groupKey === "No Encontrados") {
            const uniqueUnmatched = punches.map(p => p.nombre).filter((v, i, a) => a.indexOf(v) === i);
            stats.unmatched.push(...uniqueUnmatched);
            continue;
         }

         const cleaned = cleanWorkerPunches(punches, startDate, endDate);
         if (!newAttendance[groupKey]) {
            newAttendance[groupKey] = [];
         }

         const existing = newAttendance[groupKey];
         const byDate = new Map(existing.map(d => [d.dia, d]));

         Object.keys(cleaned).forEach(dateStr => {
            const currentDay = cleaned[dateStr];
            if (currentDay.hr_ent || currentDay.hr_sal) {
               byDate.set(dateStr, { ...(byDate.get(dateStr) || {}), ...currentDay });
            }
         });

         newAttendance[groupKey] = Array.from(byDate.values());
         stats.parsedCount++;
         stats.matchedNames.push(groupKey);
         stats.filledDays += Object.keys(cleaned).length;
      }

      console.log("Updating attendanceLogs from file upload. Matched employees:", stats.matchedNames.length);
      setAttendanceLogs(newAttendance);
      
      setToast({
        message: stats.parsedCount === 0 
          ? `Se encontraron ${stats.totalPunches} marcas, pero 0 coincidieron.`
          : `${stats.parsedCount} colaborador(es) procesado(s) correctamente.`,
        type: stats.parsedCount === 0 ? "error" : "success",
      });
      setTimeout(() => setToast(null), 8000);

    } catch (error) {
      console.error(error);
      setToast({
        message: `Error: ${String(error)}`,
        type: "error",
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleClearAttendanceData = (scope = "worker") => {
    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) return;

    const confirmMsg = scope === "all"
      ? "¿Borrar marcaciones de TODOS los trabajadores en el rango seleccionado?"
      : `¿Borrar marcaciones de ${selectedWorkerName} en el rango ${startDate} a ${endDate}?`;

    if (!confirm(confirmMsg)) return;

    const nuevosLogs = { ...attendanceLogs };
    const targets = scope === "all" ? nominaRows.map(r => r.cedula) : [nominaRows.find(r => (r.nombre || r.name) === selectedWorkerName)?.cedula].filter(Boolean);

    targets.forEach(targetKey => {
      const existing = nuevosLogs[targetKey] || [];
      const byDate = new Map(existing.map(d => [d.dia, d]));
      dates.forEach(dateStr => {
        byDate.set(dateStr, emptyAttendanceDay(dateStr));
      });
      nuevosLogs[targetKey] = Array.from(byDate.values()).sort((a, b) => a.dia.localeCompare(b.dia));
    });

    setAttendanceLogs(nuevosLogs);
    setToast({
      message: scope === "all" ? "Marcaciones borradas para todos en el rango." : `Marcaciones borradas para ${selectedWorkerName}.`,
      type: "success",
    });
    setTimeout(() => setToast(null), 4000);
  };
  const handleImportBackup = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
         const data = JSON.parse(event.target.result);
         if (data.nominaRows) setNominaRows(data.nominaRows);
         if (data.attendanceLogs) setAttendanceLogs(data.attendanceLogs);
         if (data.overrides) setOverrides(data.overrides);
         if (data.startDate) setStartDate(data.startDate);
         if (data.endDate) setEndDate(data.endDate);
         
         setToast({ message: "Backup restaurado exitosamente.", type: "success" });
      } catch (error) {
         setToast({ message: "Error al leer el backup: archivo no válido.", type: "error" });
      }
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <>
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
      </header>

      {/* Global Information Alert & Formula Reset Control */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-md">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
          <Info size={16} className="text-accent shrink-0" />
          <span>Haz clic en cualquier celda para editar. Al escribir, la celda se congelará (color ámbar) anulando el cálculo automático de Excel.</span>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={handleSaveToCloud}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-100 active:scale-95 duration-200"
          >
            <CheckCircle2 size={14} />
            Guardar Cambios
          </button>

            

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 duration-200 cursor-pointer">
            <RotateCcw size={14} className="rotate-180" />
            Cargar Backup
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>

      
      {/* Global Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end animate-stitch mx-auto w-fit">
         <div className="flex gap-4 items-center">
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fecha Inicio</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
               <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fecha Fin</label>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
         </div>

         <div className="flex gap-3">
            <label className="cursor-pointer bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm">
               <span>📂 Importar Excel Biométrico</span>
               <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button 
              onClick={() => handleClearAttendanceData('all')}
              className="bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
               Limpiar Biométrico
            </button>

            <button
              onClick={handleClearAll}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Limpiar Quincena
            </button>
         </div>
         
         {activeTab !== "dashboard" && nominaRows.length > 0 && (
           <div className="ml-auto flex items-center gap-2">
             <label className="block text-[10px] font-black uppercase text-slate-400">Operario Actual:</label>
             <select 
                value={selectedWorkerName} 
                onChange={(e) => setSelectedWorkerName(e.target.value)}
                className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-sm font-bold px-3 py-1.5 rounded-lg outline-none min-w-[200px]"
             >
               {nominaRows.map(member => (
                  <option key={member.nombre} value={member.nombre}>{member.nombre}</option>
               ))}
             </select>
           </div>
         )}
      </div>

      {/* Tab Navigation */}
      {nominaRows.length > 0 && (
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit mx-auto mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            📊 Panel General
          </button>
          <button
            onClick={() => setActiveTab("liquidacion")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "liquidacion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            📝 Liquidación
          </button>
          <button
            onClick={() => setActiveTab("directorio")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "directorio" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-200/50"}`}
          >
            Directorio HR
          </button>
          <button
            onClick={() => setActiveTab("colilla")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "colilla" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            🖨️ Colillas
          </button>
          <button
            onClick={() => setActiveTab("reportes")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "reportes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            📈 Reportes
          </button>
        </div>
      )}
      
{nominaRows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-stitch">
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-12 max-w-lg shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">El área de trabajo está vacía</h2>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed">
              Para comenzar, sube el archivo Excel <span className="font-bold text-slate-700">"MATRIZ Y LIQUIDADOR"</span> y luego importa el archivo CSV de marcas biométricas.
            </p>
          </div>
        </div>
      ) : (
        <>
      {activeTab === "directorio" && (
        <TabDirectorio 
          employees={nominaRows} 
          onRefresh={loadEmployees} 
        />
      )}
      
      {activeTab === "dashboard" && (

          <>
            {/* --- TAB 1: PLANILLA GENERAL GENERAL DE NOMINA --- */}
            <div className="space-y-6 animate-stitch">
          

        

          {/* Action Bar */}
          <section className="bg-white/70 backdrop-blur-md border border-white/40 shadow-xl rounded-3xl p-4 md:p-6 mb-8 mt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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


        <ColumnVisibilityToggle 
          hiddenColumns={hiddenColumns}
          setHiddenColumns={setHiddenColumns}
          showColumnManager={showColumnManager}
          setShowColumnManager={setShowColumnManager}
          PLANILLA_COLUMNS={PLANILLA_COLUMNS}
        />
            </div>
          </div>
        </section>


          {/* --- TAB 1: PLANILLA GENERAL (MODULARIZADA) --- */}
          <TabPanelGeneral 
             nominaRows={nominaRows}
             setNominaRows={setNominaRows}
             filteredPayrollData={filteredPayrollData}
             hiddenColumns={hiddenColumns}
             handleLiquidar={(nombre) => { setSelectedWorkerName(nombre); setActiveTab("liquidacion"); }}
             handleDetalles={(nombre) => { setDetailsWorkerName(nombre); setIsDetailsModalOpen(true); }}
             handleCellEdit={handleCellEdit}
             overrides={overrides}
             fmtCOP={fmtCOP}
          />

          

          
        </div>
        </>
      )}

            {/* --- TAB 2: FORMULARIO DE LIQUIDACIÓN --- */}
      {activeTab === "liquidacion" && (
  function() {
     const selectedWorkerData = filteredPayrollData.find(d => d.masterRow.nombre === selectedWorkerName) || null;
     if (!selectedWorkerData) return (
        <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm animate-stitch">
           Selecciona un operario desde el Panel General para liquidar.
        </div>
     );

     const handleCellEdit = (key, value) => {
        setOverrides(prev => ({
           ...prev,
           [key]: value === "" ? undefined : (isNaN(Number(value)) ? value : Number(value))
        }));
     };

     return (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100">
                    {selectedWorkerData.nombre.charAt(0)}
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedWorkerData.nombre}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Info size={12} className="text-indigo-400"/> CC: {selectedWorkerData.cedula}</span>
                       <span className="flex items-center gap-1 text-slate-400">&bull; {selectedWorkerData.cargo.toLowerCase()}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT PANEL */}
              <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 overflow-hidden">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Registro Diario (A - X)</h3>
                 <div className="overflow-x-auto custom-scrollbar">
<table className="w-full text-left table-auto">
                          <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-20">
                             <tr className="border-b border-slate-200 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                   <th colSpan="1" className="py-2 border-b border-slate-200">Fecha</th>
                                   <th colSpan="2" className="py-2 bg-blue-50/50 border-b border-blue-100 text-blue-600">Marcas Biomtrico</th>
                                   <th colSpan="6" className="py-2 bg-slate-100 border-b border-slate-200">Control de Descansos</th>
                                   <th colSpan="5" className="py-2 bg-indigo-50/50 border-b border-indigo-100 text-indigo-600">Liquidacin Base</th>
                                   <th colSpan="8" className="py-2 bg-amber-50/50 border-b border-amber-100 text-amber-700">Clasificacin Extras/Recargos</th>
                                   <th colSpan="2" className="py-2 bg-rose-50/50 border-b border-rose-100 text-rose-600">Novedades</th>
                             </tr>
                             <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                <th className="px-2 py-2" title="Da/Fecha">A (Fecha)</th>
                                <th className="px-2 py-2 text-blue-500" title="Reloj Hr Ent">B (R.Ent)</th>
                                <th className="px-2 py-2 text-blue-500" title="Reloj Hr Sal">C (R.Sal)</th>
                                <th className="px-2 py-2 text-rose-500" title="Descanso 1 Hr Ent">D (D1.E)</th>
                                <th className="px-2 py-2 text-emerald-500" title="Descanso 1 Hr Sal">E (D1.S)</th>
                                <th className="px-2 py-2" title="Descanso 1 Total">F (D1.Tot)</th>
                                <th className="px-2 py-2 text-rose-500" title="Descanso 2 Hr Ent">G (D2.E)</th>
                                <th className="px-2 py-2 text-emerald-500" title="Descanso 2 Hr Sal">H (D2.S)</th>
                                <th className="px-2 py-2" title="Descanso 2 Total">I (D2.Tot)</th>
                                <th className="px-2 py-2 text-purple-500" title="Pago Entrada">J (P.Ent)</th>
                                <th className="px-2 py-2 text-purple-500" title="Pago Salida">K (P.Sal)</th>
                                <th className="px-2 py-2" title="Horas Laboradas">L (H.Lab)</th>
                                <th className="px-2 py-2" title="Descuento Almuerzo">M (D.Alm)</th>
                                <th className="px-2 py-2" title="Horas Pagadas">N (H.Pag)</th>
                                <th className="px-2 py-2 text-right" title="Ordinaria Diurna">O (Ord.D)</th>
                                <th className="px-2 py-2 text-right" title="Ordinaria Nocturna">P (Ord.N)</th>
                                <th className="px-2 py-2 text-right" title="Festiva Diurna">Q (Fes.D)</th>
                                <th className="px-2 py-2 text-right" title="Festiva Nocturna">R (Fes.N)</th>
                                <th className="px-2 py-2 text-right" title="Extra Diurna">S (Ext.D)</th>
                                <th className="px-2 py-2 text-right" title="Extra Nocturna">T (Ext.N)</th>
                                <th className="px-2 py-2 text-right" title="Extra Fest Diur">U (Ex.FD)</th>
                                <th className="px-2 py-2 text-right" title="Extra Fest Noc">V (Ex.FN)</th>
                                <th className="px-2 py-2 text-right text-rose-500" title="Llegada Tarde">W (Lleg.T)</th>
                                <th className="px-2 py-2 text-right text-rose-500" title="Llegada Tarde Min">X (Lleg.Min)</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[10px] font-semibold text-slate-700">
                             {selectedWorkerData.workerDays.map((day) => {
                                const dateObj = new Date(day.dia + "T00:00:00");
                                const dayName = dateObj.toLocaleDateString("es-CO", { weekday: "short" });
                                const displayDate = day.dia;
                                const prefix = `${selectedWorkerData.cedula}_${displayDate}`;
  const handleImportBackup = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
         const data = JSON.parse(event.target.result);
         if (data.nominaRows) setNominaRows(data.nominaRows);
         if (data.attendanceLogs) setAttendanceLogs(data.attendanceLogs);
         if (data.overrides) setOverrides(data.overrides);
         if (data.startDate) setStartDate(data.startDate);
         if (data.endDate) setEndDate(data.endDate);
         
         setToast({ message: "Backup restaurado exitosamente.", type: "success" });
      } catch (error) {
         setToast({ message: "Error al leer el backup: archivo no válido.", type: "error" });
      }
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
                                   <tr key={displayDate} className="hover:bg-slate-50">
                                      <td className="px-2 py-2 whitespace-nowrap"><span className="text-slate-400 mr-1">{dayName}</span> {displayDate}</td>
                                      <td className="px-2 py-2 text-blue-600 font-mono">{day.hr_ent || "-"}</td>
                                      <td className="px-2 py-2 text-blue-600 font-mono">{day.hr_sal || "-"}</td>
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_sal_desc1`] !== undefined ? overrides[`${prefix}_hr_sal_desc1`] : (day.hr_sal_desc1 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_desc1`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_ent_desc1`] !== undefined ? overrides[`${prefix}_hr_ent_desc1`] : (day.hr_ent_desc1 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_desc1`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-2 py-2 text-center text-slate-400 font-mono">{day.total_desc1 || "-"}</td>
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_sal_desc2`] !== undefined ? overrides[`${prefix}_hr_sal_desc2`] : (day.hr_sal_desc2 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_desc2`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_ent_desc2`] !== undefined ? overrides[`${prefix}_hr_ent_desc2`] : (day.hr_ent_desc2 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_desc2`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-2 py-2 text-center text-slate-400 font-mono">{day.total_desc2 || "-"}</td>
                                      
                                      {/* Pago Entrada/Salida */}
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_ent_pago`] !== undefined ? overrides[`${prefix}_hr_ent_pago`] : (day.hr_ent_pago || day.hr_ent || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_pago`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none text-purple-600" />
                                      </td>
                                      <td className="px-1 py-1">
                                         <input type="text" value={overrides[`${prefix}_hr_sal_pago`] !== undefined ? overrides[`${prefix}_hr_sal_pago`] : (day.hr_sal_pago || day.hr_sal || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_pago`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none text-purple-600" />
                                      </td>

                                      <td className="px-2 py-2 text-center text-slate-400">{Number(day.hr_lab || 0).toFixed(2)}</td>
                                      <td className="px-2 py-2 text-center text-slate-400">{Number(day.desc_lunch || 0).toFixed(2)}</td>
                                      <td className="px-2 py-2 text-center font-bold text-slate-600">{Number(day.hr_pag || 0).toFixed(2)}</td>
                                      
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_diurnas`] !== undefined ? overrides[`${prefix}_diurnas`] : Number(day.diurnas || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_diurnas`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_nocturnas`] !== undefined ? overrides[`${prefix}_nocturnas`] : Number(day.nocturnas || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_nocturnas`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_fes_diu`] !== undefined ? overrides[`${prefix}_fes_diu`] : Number(day.fes_diu || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_fes_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_fes_noc`] !== undefined ? overrides[`${prefix}_fes_noc`] : Number(day.fes_noc || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_fes_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_ext_diu`] !== undefined ? overrides[`${prefix}_ext_diu`] : Number(day.ext_diu || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_ext_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_ext_noc`] !== undefined ? overrides[`${prefix}_ext_noc`] : Number(day.ext_noc || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_ext_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_ext_fes_diu`] !== undefined ? overrides[`${prefix}_ext_fes_diu`] : Number(day.ext_fes_diu || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_ext_fes_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_ext_fes_noc`] !== undefined ? overrides[`${prefix}_ext_fes_noc`] : Number(day.ext_fes_noc || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_ext_fes_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_llegada_tarde`] !== undefined ? overrides[`${prefix}_llegada_tarde`] : Number(day.llegada_tarde || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_llegada_tarde`, e.target.value)} className="w-10 bg-rose-50 border border-slate-200 text-right rounded focus:ring-1 outline-none text-rose-700" />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                         <input type="text" value={overrides[`${prefix}_llegada_tarde_min`] !== undefined ? overrides[`${prefix}_llegada_tarde_min`] : Number(day.llegada_tarde_min || 0).toFixed(2)} onChange={(e) => handleCellEdit(`${prefix}_llegada_tarde_min`, e.target.value)} className="w-10 bg-rose-50 border border-slate-200 text-right rounded focus:ring-1 outline-none text-rose-700" />
                                      </td>
                                   </tr>
                                )
                             })}
                          </tbody>
                       </table>
                 </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="lg:col-span-4">
                 <div className="sticky top-6 space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Liquidacin de Horas (26-38)</h3>
                       
                       <div className="space-y-4 mb-6">
                          <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">26. Horas que debe</span>
                             <div className="w-24">
                                <input
                                   type="text"
                                   value={overrides[`${selectedWorkerData.cedula}_horas_que_debe`] !== undefined ? overrides[`${selectedWorkerData.cedula}_horas_que_debe`] : (selectedWorkerData.horas_debe || 0)}
                                   onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_horas_que_debe`, e.target.value)}
                                   className="w-full bg-slate-800 text-white border-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-right transition-all"
                                />
                             </div>
                          </div>
                          
                          <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horas Pendientes</span>
                             <span className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                {selectedWorkerData.horas_pendientes || 0}
                             </span>
                          </div>

                          <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salario Bsico (B37)</span>
                             <div className="w-28">
                                <input
                                   type="text"
                                   value={overrides[`${selectedWorkerData.cedula}_sueldo`] !== undefined ? overrides[`${selectedWorkerData.cedula}_sueldo`] : (selectedWorkerData.salario || 0)}
                                   onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_sueldo`, e.target.value)}
                                   className="w-full bg-slate-800 text-emerald-400 border-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-right transition-all"
                                />
                             </div>
                          </div>
                       </div>

                       <div className="border-t border-slate-800 pt-4 space-y-1">
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">28. Diurnas</span>
                                <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full border border-slate-700">x 0.0</span>
                             </div>
                             <div className="text-sm font-bold text-slate-500">N/A</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">29. Nocturnas</span>
                                <span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800">x 0.35</span>
                             </div>
                             <div className="text-sm font-bold text-indigo-400">${fmtCOP(selectedWorkerData.recargo_nocturno)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">30. Festiva Diurna</span>
                                <span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800">x 0.75</span>
                             </div>
                             <div className="text-sm font-bold text-indigo-400">${fmtCOP(selectedWorkerData.val_extras_festivas || 0)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">31. Fest Noc</span>
                                <span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800">x 2.10</span>
                             </div>
                             <div className="text-sm font-bold text-indigo-400">${fmtCOP(selectedWorkerData.val_extras_festivas_nocturnas || 0)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">32. Extra Diurna</span>
                                <span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800">x 1.25</span>
                             </div>
                             <div className="text-sm font-bold text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_diurnas)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">33. Extra Noc</span>
                                <span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800">x 1.75</span>
                             </div>
                             <div className="text-sm font-bold text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_nocturnas)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">34. Ext Fes Diu</span>
                                <span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800">x 2.00</span>
                             </div>
                             <div className="text-sm font-bold text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_festivas)}</div>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-slate-800/60">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">35. Ext Fes Noc</span>
                                <span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800">x 2.50</span>
                             </div>
                             <div className="text-sm font-bold text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_festivas_nocturnas || 0)}</div>
                          </div>
                       </div>

                       <div className="mt-8 pt-6 border-t border-slate-700 text-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">36. Totales Extras/Recargos</div>
                          <div className="text-4xl font-black text-emerald-400 tracking-tight">${fmtCOP(selectedWorkerData.liquidation.total_extra_val)}</div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
     );
  }()
)}

      {/* --- TAB 3: COLILLAS DE PAGO (MODULARIZADA) --- */}
      {activeTab === "colilla" && (
        <TabColillas 
          nominaRows={nominaRows}
          payrollData={filteredPayrollData}
          fmtCOP={fmtCOP}
          startDate={startDate}
          endDate={endDate}
        />
      )}
      {/* Info Alert footer bar */}
      <div className="p-6 bg-slate-100 rounded-[1.5rem] border border-slate-200/60 flex items-start gap-4 shadow-sm mt-6">
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

      </>
    )}

    </div>
  
    {/* --- DETALLES MODAL FLOTANTE PREMIUM --- */}
{isDetailsModalOpen && (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
    
    {/* Capa invisible para cerrar al hacer clic afuera */}
    <div className="absolute inset-0 cursor-pointer" onClick={() => setIsDetailsModalOpen(false)}></div>

    {/* Cuadro Flotante */}
    <div className="relative w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-stitch border border-slate-200/50">
      
      {/* Header del Modal */}
      <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-100 px-3 py-1 rounded-lg">Auditora de Liquidacin</span>
          <h3 className="font-black text-2xl text-slate-900 mt-2">{detailsWorkerName}</h3>
        </div>
        <button 
          onClick={() => setIsDetailsModalOpen(false)} 
          className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 hover:text-rose-600 rounded-full text-slate-400 transition-all shadow-sm"
        >
          
        </button>
      </div>
      
      {/* Cuerpo Scrollable con Grid de 40 columnas */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
             const workerData = filteredPayrollData.find(d => d.masterRow.nombre === detailsWorkerName) || filteredPayrollData[0];
             if (!workerData) return null;
             
             return PLANILLA_COLUMNS.map(col => {
                const cKey = `${workerData.masterRow.cedula}_${col.key}`;
                let val = overrides[cKey] !== undefined ? overrides[cKey] : (workerData[col.key] !== undefined ? workerData[col.key] : "");
                if (col.isCurrency && val !== "") val = Math.round(Number(val));
                
                return (
                  <div key={col.key} className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mb-2 group-hover:text-emerald-600 transition-colors" title={col.label}>
                       {col.label}
                     </span>
                     <EditableCell
                        value={val}
                        onChange={(newVal) => handleCellEdit(cKey, newVal)}
                        isOverridden={overrides[cKey] !== undefined}
                        isCurrency={col.isCurrency}
                        isDecimal={col.isDecimal}
                     />
                  </div>
                )
             });
          })()}
        </div>
      </div>
    </div>
  </div>
)}
  </>
);
}
