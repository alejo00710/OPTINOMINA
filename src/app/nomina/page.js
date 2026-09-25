"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Filter, Coins, Info, SlidersHorizontal, Download, RotateCcw, AlertTriangle, Briefcase, FileSpreadsheet, CheckCircle2, ChevronDown, ChevronRight, Calculator, Plus, Trash2, Calendar as CalendarIcon, UploadCloud, Users, ChevronLeft, CalendarRange } from "lucide-react";
import TabDirectorio from "@/components/Nomina/TabDirectorio";
import TabReportes from "@/components/Nomina/TabReportes";
import ColumnVisibilityToggle from "@/components/Nomina/ColumnVisibilityToggle";
import NominaSummaryCards from "@/components/Nomina/NominaSummaryCards";
import EditableCell from "@/components/Nomina/EditableCell";
import TabPanelGeneral from "@/components/Nomina/TabPanelGeneral";
import TabColillas from "@/components/Nomina/TabColillas";
import TabLiquidacion from "@/components/Nomina/TabLiquidacion";
import TabPanelHistorico from "@/components/Nomina/TabPanelHistorico";
import TabHorarios from "@/components/Nomina/TabHorarios";
import FormulaEditorModal from "@/components/Nomina/FormulaEditorModal";
import { NOMINA_DATE_RANGE_KEY, loadPersistedDateRange, savePersistedDateRange, PLANILLA_COLUMNS, DAILY_COLUMNS, LIQUIDATION_CONCEPTS, DEFAULT_FORMULAS, SMLV, AUX_TRANSPORTE, MINIMO_DIARIO_INCAPACIDAD, evaluateFormula, DIVISOR_RECARGOS_NOCTURNOS, DIVISOR_HORAS_EXTRAS, FACTOR_RECARGO_NOCTURNO, FACTOR_EXTRA_DIURNA, FACTOR_EXTRA_NOCTURNA, FACTOR_EXTRA_FESTIVA, FACTOR_EXTRA_FESTIVA_NOCTURNA, HORA_INICIO_DIURNA, HORA_FIN_DIURNA } from "@/utils/constants";
import { timeStrToDecimal, decimalToTimeStr, diffTimeStr, getDecimalHours, getHourDist, fmtCOP, fmtDec, parseLocalNumber, calculateDailyRecord } from "@/utils/mathNomina";
import { supabase, savePayrollToCloud, loadPayrollFromCloud, loadEmployeesFromCloud, uploadEmployeesBulk, loadWeeklySchedulesFromCloud } from "@/utils/supabase";
import { detectShiftTemplate, emptyAttendanceDay, cleanWorkerPunches, parseBiometricCSV, findEmployeeMatch } from "@/utils/biometricCore";

const safeParseNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Quitar TODO excepto números, signos menos y puntos decimales
  const cleanStr = String(val).replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper to look up overridden state values and ensure they are parsed as numbers for math formulas
const resolveValue = (overrides, key, formulaFn) => {
  // REGLA ESTRICTA (IGNORAR BD): Ciertos campos SIEMPRE se calculan dinámicamente y rechazan la BD.
  const isBlocked = key.includes('_dias_incapacidad') || 
                    key.includes('_dias_calamidad') || 
                    key.includes('_dias_lic_rem') || 
                    key.includes('_dias_vacaciones') ||
                    key.includes('_dias_lic_norem') ||
                    key.includes('_dias_incap_at') ||
                    key.includes('_dias_sancion');

  if (!isBlocked && overrides[key] !== undefined && overrides[key] !== "") {
    const val = typeof overrides[key] === "string" ? parseLocalNumber(overrides[key]) : overrides[key];
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

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsSaveStatus, setDetailsSaveStatus] = useState('idle'); // idle | saving | success
  const [deudaAnteriorModal, setDeudaAnteriorModal] = useState(0);
  const [detailsWorkerName, setDetailsWorkerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");

  const [nominaRows, setNominaRows] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState({});
  const [ratesMap] = useState({});
  const [overrides, setOverrides] = useState({});
  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [weeklySchedules, setWeeklySchedules] = useState([]);

  const [selectedWorkerName, setSelectedWorkerName] = useState("");

  const [activeFormulas, setActiveFormulas] = useState(DEFAULT_FORMULAS);

  useEffect(() => {
    const savedFormulas = localStorage.getItem('optinomina_global_formulas_v5');
    if (savedFormulas) {
      setActiveFormulas({ ...DEFAULT_FORMULAS, ...JSON.parse(savedFormulas) });
    }
  }, []);

  const [formulaConfig, setFormulaConfig] = useState({ isOpen: false, fieldId: null, currentFormula: '' });

  const handleOpenFormulaEditor = (campoId) => {
    const formulaBase = activeFormulas[campoId] || '';
    setFormulaConfig({ isOpen: true, fieldId: campoId, currentFormula: formulaBase });
  };

  const handleSaveFormula = (newFormula) => {
    const campoId = formulaConfig.fieldId;
    const updatedFormulas = { ...activeFormulas, [campoId]: newFormula };
    setActiveFormulas(updatedFormulas);
    localStorage.setItem('optinomina_global_formulas_v5', JSON.stringify(updatedFormulas));
    
    setToast({
      message: "¡Fórmula global actualizada!",
      type: "success"
    });
    setTimeout(() => setToast(null), 4000);
    setFormulaConfig({ ...formulaConfig, isOpen: false });
  };


  // Toast notification state
  const [toast, setToast] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isClosing, setIsClosing] = useState(false);

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

  const [globalSmmlv, setGlobalSmmlv] = useState(1750905);
  const [globalAuxTransporte, setGlobalAuxTransporte] = useState(249095);

  const [isClient, setIsClient] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setIsClient(true);
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    async function fetchDeudaModal() {
      if (!isDetailsModalOpen || !detailsWorkerName) {
        setDeudaAnteriorModal(0);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('historial_nominas')
          .select('payload_json')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (error) return;
        if (data?.payload_json?.nomina_calculada) {
            const pastWorker = data.payload_json.nomina_calculada.find(w => w.nombre === detailsWorkerName);
            if (pastWorker && pastWorker.horas_pendientes !== undefined && Number(pastWorker.horas_pendientes) < 0) {
                setDeudaAnteriorModal(Number(pastWorker.horas_pendientes));
            } else {
                setDeudaAnteriorModal(0);
            }
        }
      } catch (err) {}
    }
    fetchDeudaModal();
  }, [isDetailsModalOpen, detailsWorkerName]);


  const handleCerrarQuincena = async () => {
    if (!window.confirm("🚨 ALERTA: Estás a punto de CERRAR esta quincena. Se guardará una fotografía estática e inmutable de todos los cálculos. ¿Estás absolutamente seguro de continuar?")) return;
    
    setIsClosing(true);
    try {
      const nominaParaGuardar = typeof filteredPayrollData !== 'undefined' ? filteredPayrollData : nominaRows;

      // 1. Calcular KPIs globales sumando toda la grilla
      const total_devengado = nominaParaGuardar.reduce((acc, emp) => acc + (Number(emp.total_devengados) || 0), 0);
      const total_deducido = nominaParaGuardar.reduce((acc, emp) => acc + (Number(emp.total_deducciones) || 0), 0);
      const total_neto_pagado = nominaParaGuardar.reduce((acc, emp) => acc + (Number(emp.neto_pagar) || 0), 0);
      const total_empleados = nominaParaGuardar.length;

      // 2. Construir el objeto de inserción
      const payload = {
        identificador: `Quincena del ${startDate} al ${endDate}`,
        fecha_inicio: startDate,
        fecha_fin: endDate,
        estado: 'CERRADA',
        total_devengado,
        total_deducido,
        total_neto_pagado,
        total_empleados,
        empleados_jsonb: nominaParaGuardar,
        variables_globales: {
          smlv: globalSmmlv,
          aux_transporte: globalAuxTransporte
        }
      };

      // 3. Insertar directamente en historico_nominas_v2 vía Supabase
      const { error } = await supabase
        .from('historico_nominas_v2')
        .insert([payload]);

      if (error) throw error;

      // 4. Limpiar estado activo si el proceso fue exitoso
      await supabase
        .from('optimoldes_payroll')
        .update({ attendance_logs: {}, overrides: {} })
        .eq('id', 'quincena_activa');

      setOverrides({});
      setAttendanceLogs({});

      setToast({
        message: "¡Nómina cerrada exitosamente! Fotografía guardada.",
        type: "success"
      });
      setTimeout(() => setToast(null), 4000);
      
    } catch (error) {
      console.error("Error al cerrar quincena en V2:", error);
      setToast({
        message: "Error crítico al guardar el histórico.",
        type: "error"
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsClosing(false);
    }
  };

  const [isAppLoading, setIsAppLoading] = useState(true);

  const reloadEmployees = async () => {
    let masterEmployees = [];
    const empRes = await loadEmployeesFromCloud();
    if (empRes.success && empRes.data) {
      masterEmployees = empRes.data.map((emp, index) => {
        const esAdmin = emp.categoria === 'Administrativo' || emp.cargo?.toUpperCase() === 'ADMINISTRATIVO';
        return {
          consecutivo: index + 1,
          cedula: emp.cedula,
          biometric_id: emp.biometric_id || "",
          nombre: emp.nombre,
          cargo: emp.cargo,
          categoria: emp.categoria,
          area: emp.area || "Administrativo",
          banco: emp.banco || "",
          tipo_vinculacion: emp.tipo_vinculacion || "",
          salario: Number(emp.salario_base || emp.salario || 0),
          rodamiento: Number(emp.rodamiento || 0),
          comisiones: 0,
          poliza_bolivar: Number(emp.poliza_bolivar || 0),
          poliza_sura: Number(emp.poliza_sura || 0),
          prestamo_total: Number(emp.prestamo_total || 0),
          cuota_prestamo: Number(emp.cuota_prestamo || 0),
          optica_total: Number(emp.optica_total || 0),
          cuota_optica: Number(emp.cuota_optica || 0),
          dias_pagados: esAdmin ? 15 : 0,
          horas_diurnas: esAdmin ? 88 : 0,
          horas_nocturnas: 0,
          extras_diurnas: 0,
          extras_nocturnas: 0,
          extras_festivas: 0,
          total_devengados: 0,
          total_deducciones: 0,
          neto_pagar: 0
        };
      });
    }
    setNominaRows(masterEmployees);
  };

  const loadInitialData = async () => {
      try {
        setIsAppLoading(true);
        await reloadEmployees();

        // Cargar borrador activo desde Supabase
        const { data: cloudDraft, error: draftError } = await supabase
          .from('optimoldes_payroll')
          .select('*')
          .eq('id', 'quincena_activa')
          .single();

        if (cloudDraft && !draftError) {
          try {
            setStartDate(cloudDraft.start_date || startDate);
            setEndDate(cloudDraft.end_date || endDate);
            setAttendanceLogs(cloudDraft.attendance_logs || {});
            
            let loadedOverrides = cloudDraft.overrides || {};
            if (loadedOverrides['_MASTER_SCHEDULE_JSON']) {
                setWeeklySchedules(loadedOverrides['_MASTER_SCHEDULE_JSON']);
                delete loadedOverrides['_MASTER_SCHEDULE_JSON'];
                console.log("✅ Horarios recuperados exitosamente del borrador.");
            }
            setOverrides(loadedOverrides);
            
            console.log("✅ Datos iniciales cargados y sincronizados desde la nube.");
          } catch (e) {
            console.error("Error aplicando datos desde la nube:", e);
          }
        } else {
          setAttendanceLogs({});
          setOverrides({});
        }
      } catch (e) {
        console.error("Error loading persisted payroll data from cloud:", e);
      } finally {
        setIsAppLoading(false);
      }
    };

  useEffect(() => {
    loadInitialData();

    // Supabase Realtime Subscriptions
    const payrollChannel = supabase
      .channel('public:optimoldes_payroll')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'optimoldes_payroll', filter: "id=eq.quincena_activa" }, (payload) => {
        console.log("🔄 Actualización de nómina recibida:", payload);
        if (payload.eventType === 'DELETE') {
          setAttendanceLogs({});
          setOverrides({});
          setWeeklySchedules([]);
        } else if (payload.new) {
          setStartDate(prev => payload.new.start_date || prev);
          setEndDate(prev => payload.new.end_date || prev);
          setAttendanceLogs(payload.new.attendance_logs || {});
          setOverrides(payload.new.overrides || {});
        }
      })
      .subscribe();

    const employeesChannel = supabase
      .channel('public:optimoldes_employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'optimoldes_employees' }, (payload) => {
        console.log("🔄 Cambio en el directorio de empleados detectado:", payload);
        reloadEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(payrollChannel);
      supabase.removeChannel(employeesChannel);
    };
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
    
    // Load weekly schedules
    const fetchSchedules = async () => {
       const res = await loadWeeklySchedulesFromCloud(startDate, endDate);
       if (res.success) {
         setWeeklySchedules(res.data);
       }
    };
    fetchSchedules();

    const schedulesChannel = supabase
      .channel('public:horarios_semanales:page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios_semanales' }, () => {
        console.log("🔄 Cambio en horarios semanales detectado, recargando en la app principal");
        fetchSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
    };
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
    
  const getScheduledShift = (emp, dateStr, schedules) => {
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return null;

    const targetWeek = schedules.find(s => {
        const inicio = s.fecha_inicio || s.startDate || s.id_semana;
        const fin = s.fecha_fin || s.endDate;
        
        if (!inicio) return false;
        
        let finStr = fin;
        if (!finStr) {
            // Fallback seguro de +6 días en local
            const [iy, im, id] = inicio.split('-');
            const dObj = new Date(iy, im - 1, id);
            dObj.setDate(dObj.getDate() + 6);
            finStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        }
        return dateStr >= inicio && dateStr <= finStr;
    });

    if (!targetWeek || !targetWeek.datos_json) return null;

    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, m - 1, d); // Absolutamente local y seguro
    const dayNames = { 0: "DOMINGO", 1: "LUNES", 2: "MARTES", 3: "MIÉRCOLES", 4: "JUEVES", 5: "VIERNES", 6: "SÁBADO" };
    const targetDayName = dayNames[dateObj.getDay()];

    const posiblesIds = [emp.biometric_id, emp.id_biometrico, emp.cedula, emp.id].filter(Boolean).map(String).map(id => id.trim());

    for (const id of posiblesIds) {
      const cellKey = `${String(id)}_${targetDayName}`;
      
      // Intentar coincidencia exacta primero
      if (targetWeek.datos_json[cellKey] !== undefined) {
        return targetWeek.datos_json[cellKey];
      }
      
      // Fallback a coincidencia insensible a mayúsculas (respetando tildes)
      for (const [k, v] of Object.entries(targetWeek.datos_json)) {
        if (String(k).toUpperCase().trim() === cellKey.toUpperCase()) {
          return v;
        }
      }
    }

    return null;
  };

    return nominaRows.map(emp => {
      const cedula = emp.cedula;
      const logs = attendanceLogs[cedula] || [];
      const allDates = getDatesInRange(startDate, endDate);
      
      const processedLogs = allDates.map(date => {
         const existingLog = logs.find(l => l.dia === date);
         const dayLog = existingLog ? { ...existingLog } : { dia: date, hr_ent: "-", hr_sal: "-", hr_ent_desc1: "-", hr_sal_desc1: "-", hr_ent_desc2: "-", hr_sal_desc2: "-" };
         const scheduledShift = getScheduledShift(emp, date, weeklySchedules);
         const turnoStr = String(scheduledShift || "").toUpperCase().trim();

         // --- INYECCIÓN DE CONTEXTO PARA EL LIQUIDADOR ---
         dayLog.cedula = cedula;
         dayLog.turno = scheduledShift;
         
         // CONEXIÓN MAESTRA: Si el horario semanal dicta novedad o descanso, el día nace con esa información
         // Regla de Estado: Si turnoStr NO está vacío y NO contiene números... asigne DIRECTAMENTE ese string
         if (turnoStr && !/\d/.test(turnoStr) && !["NORMAL", "DIURNO", "NOCTURNO", "TURNO", ""].includes(turnoStr)) {
             dayLog.estado = turnoStr;
             dayLog.novedad = turnoStr;
             dayLog.ignorarBiometria = true;
         }
         dayLog.turnoPuroDelJSON = turnoStr;
         // --- FIN INYECCIÓN ---

         const prefix = `${cedula}_${date}`;
         return calculateDailyRecord(dayLog, overrides, prefix, HORA_INICIO_DIURNA, HORA_FIN_DIURNA, scheduledShift);
      });
      
      // 1. Sumatorias del Biométrico (Equivalente a Fila 24 de hojas individuales)
      let sumDiurnas = 0, sumNocturnas = 0, sumFesDiu = 0, sumFesNoc = 0;
      let sumExtDiu = 0, sumExtNoc = 0, sumExtFesDiu = 0, sumExtFesNoc = 0;
// --- INICIO CORRECCIÓN DÍAS PAGADOS ---
// --- INICIO CÁLCULO DE NOVEDADES ---
let diasLaborados = 0;
let diasPagadosCalculados = 0;
const novedadesResumen = {};
let sumLlegadasTarde = 0, sumLlegadasMin = 0;
let sumComidasVeces = 0, sumComidasMin = 0;

processedLogs.forEach(day => {
    if (day.hr_lab > 0) diasLaborados++;

    const turnoValor = String(typeof day.turno === 'object' ? (day.turno?.novedad || day.turno?.tipo || day.turno?.nombre || "") : day.turno).toUpperCase().trim();
    const tieneNumeros = /\d/.test(turnoValor);
    const esTurnoNormal = ["NORMAL", "DESCANSO", "DIURNO", "NOCTURNO", "TURNO"].some(t => turnoValor.includes(t)) || turnoValor === "" || tieneNumeros;

    // Si el turno tiene una novedad explícita (ej. CALAMIDAD), gana el turno. Si es un turno normal o vacío, lee el biométrico.
    // 1. Prioridad Absoluta: El cambio manual en la pantalla (override)
    const manualOverride = overrides[`${cedula}_${day.dia}_novedad_status`];

    let estadoRaw;
    if (manualOverride) {
        estadoRaw = String(manualOverride).toUpperCase().trim();
    } else if (turnoValor && !tieneNumeros && !["NORMAL", "DIURNO", "NOCTURNO", "TURNO", ""].includes(turnoValor)) {
        // 2. Prioridad Secundaria: La novedad programada en el horario semanal (direct pass-through)
        estadoRaw = turnoValor;
    } else {
        // 3. Fallback: El estado crudo del biométrico o vacío
        if (!day.ignorarBiometria) {
            const faltanMarcas = (!day.hr_ent || day.hr_ent === "") && (!day.hr_sal || day.hr_sal === "");
            if (faltanMarcas && turnoValor) {
                // Respeto por J y K: Si debía venir pero faltan marcas, marcar FALTA sin borrar turno programado
                estadoRaw = "FALTA";
            } else {
                estadoRaw = String(day.estado_marcacion || day.estado || day.observacion || day.novedad || "").toUpperCase().trim();
            }
        } else {
            estadoRaw = String(day.estado || turnoValor).toUpperCase().trim();
        }
    }
    const estado = estadoRaw === "" ? "NORMAL" : estadoRaw;

    // 1. Solo NORMAL, NOVEDAD y DESCANSO cuentan como día ordinario pagado.
    const paganNormal = ["NORMAL", "NOVEDAD", "DESCANSO"];
    let esDiaPagado = false;
    
    if (paganNormal.some(n => estado.includes(n))) {
        esDiaPagado = true;
    }

    if (esDiaPagado) diasPagadosCalculados++;

    // 2. Agrupar novedades (Todo lo que NO sea Normal, Novedad o Descanso)
    if (!paganNormal.some(n => estado.includes(n))) {
        if (!novedadesResumen[estado]) novedadesResumen[estado] = [];
        // Guardar solo el día y mes para que se vea limpio (ej. 16-07)
        const fechaCorta = day.dia.split('-').slice(1).join('-'); 
        novedadesResumen[estado].push(fechaCorta);
    }

    sumDiurnas += Number(day.diurnas || 0);
    sumNocturnas += Number(day.nocturnas || 0);
    sumFesDiu += Number(day.fes_diu || 0);
    sumFesNoc += Number(day.fes_noc || 0);
    sumExtDiu += Number(day.ext_diu || 0);
    sumExtNoc += Number(day.ext_noc || 0);
    sumExtFesDiu += Number(day.ext_fes_diu || 0);
    sumExtFesNoc += Number(day.ext_fes_noc || 0);
    sumLlegadasTarde += Number(day.llegada_tarde || 0);
    sumLlegadasMin += Number(day.llegada_tarde_min || 0);
    sumComidasVeces += Number(day.comidas_excedidas_veces || 0);
    sumComidasMin += Number(day.comidas_excedidas_min || 0);
});
// --- FIN CÁLCULO DE NOVEDADES ---

      // Sobreescribir días pagados si el usuario lo editó manualmente (overrides) o usar los calculados
      const diasPagados = resolveValue(overrides, `${cedula}_dias_pagados`, () => Math.min(15, diasPagadosCalculados));
// --- FIN CORRECCIÓN DÍAS PAGADOS ---
      const horasDebe = resolveValue(overrides, `${cedula}_horas_que_debe`, () => Number(emp.horas_debe || 0));
      
      const salarioBase = resolveValue(overrides, `${cedula}_salario_base`, () => Number(emp.salario_base || emp.salario || 0));

      // Allow global overrides for the summed hours
      const finalDiurnas = resolveValue(overrides, `${cedula}_horas_diurnas`, () => sumDiurnas);
      let finalNocturnas = resolveValue(overrides, `${cedula}_horas_nocturnas`, () => sumNocturnas);
      let finalFesDiu = resolveValue(overrides, `${cedula}_festivas_diurnas`, () => sumFesDiu);
      let finalFesNoc = resolveValue(overrides, `${cedula}_festivas_nocturnas`, () => sumFesNoc);
      let finalExtDiu = resolveValue(overrides, `${cedula}_extras_diurnas`, () => sumExtDiu);
      let finalExtNoc = resolveValue(overrides, `${cedula}_extras_nocturnas`, () => sumExtNoc);
      let finalExtFesDiu = resolveValue(overrides, `${cedula}_extras_festivas`, () => sumExtFesDiu);
      let finalExtFesNoc = resolveValue(overrides, `${cedula}_extras_festivas_nocturnas`, () => sumExtFesNoc);

      const esPersonalAdministrativo = emp.categoria === 'Administrativo' || emp.area === 'Administrativo';
      if (esPersonalAdministrativo) {
          finalNocturnas = 0;
          finalFesDiu = 0;
          finalFesNoc = 0;
          finalExtDiu = 0;
          finalExtNoc = 0;
          finalExtFesDiu = 0;
          finalExtFesNoc = 0;
      }


      const extraDiurnaNeto = finalExtDiu - horasDebe > 0 ? finalExtDiu - horasDebe : 0;
      const horasPendientes = extraDiurnaNeto + finalExtNoc + finalExtFesDiu + finalExtFesNoc;
      
      const comisiones = resolveValue(overrides, `${cedula}_comisiones`, () => 0);
      const rodamiento = resolveValue(overrides, `${cedula}_rodamiento`, () => parseLocalNumber(Number(emp.rodamiento || 0)));
      const diasIncapacidad = resolveValue(overrides, `${cedula}_dias_incapacidad`, () => {
          const keyIncap = Object.keys(novedadesResumen).find(k => k === 'INCAPACIDAD GENERAL');
          const valCalculado = keyIncap ? novedadesResumen[keyIncap]?.length : 0;
          return valCalculado > 0 ? valCalculado : parseLocalNumber(Number(emp.dias_incapacidad || 0));
      });
      
      const basePrestamo = parseLocalNumber(Number(emp.cuota_prestamo || 0));
      const rawDescuentosSaitemp = overrides[`${cedula}_prestamos`] !== undefined 
          ? String(overrides[`${cedula}_prestamos`]) 
          : (emp.cuota_prestamo ? String(emp.cuota_prestamo) : '');
      const prestamos = resolveValue(overrides, `${cedula}_prestamos`, () => basePrestamo);
      const prestamoTotal = parseLocalNumber(Number(emp.prestamo_total || 0));
      const saldoPrestamo = prestamoTotal - prestamos;

      const polizaBolivar = resolveValue(overrides, `${cedula}_poliza_bolivar`, () => parseLocalNumber(Number(emp.poliza_bolivar || 0)));
      const polizaPlenitud = resolveValue(overrides, `${cedula}_poliza_plenitud`, () => parseLocalNumber(Number(emp.poliza_plenitud || 0)));
      const libranzaComfama = resolveValue(overrides, `${cedula}_libranza_comfama`, () => parseLocalNumber(Number(emp.libranza_comfama || 0)));
      const polizaSura = resolveValue(overrides, `${cedula}_poliza_sura`, () => parseLocalNumber(Number(emp.poliza_sura || 0)));
      
      const baseOptica = parseLocalNumber(Number(emp.cuota_optica || 0));
      const optica = resolveValue(overrides, `${cedula}_optica`, () => baseOptica);
      
      const celular = resolveValue(overrides, `${cedula}_celular`, () => parseLocalNumber(Number(emp.celular || 0)));
      const retencion = resolveValue(overrides, `${cedula}_retencion`, () => parseLocalNumber(Number(emp.retencion || 0)));
      const bonificacion = resolveValue(overrides, `${cedula}_bonificacion`, () => 0);
      
      // Extracción estricta del valor visual que renderiza el <input>
      const getValExactoInput = (key, finalCalc) => {
         const cKey = `${cedula}_${key}`;
         let val = overrides[cKey] !== undefined ? overrides[cKey] : (finalCalc !== undefined ? finalCalc : "");
         return Number(val) || 0;
      };

      const hrsDiurnasParaCalculo = getValExactoInput('horas_diurnas', finalDiurnas);
      const hrsNocturnasParaCalculo = getValExactoInput('horas_nocturnas', finalNocturnas);
      const extDiurnasParaCalculo = getValExactoInput('extras_diurnas', extraDiurnaNeto);
      const extNocturnasParaCalculo = getValExactoInput('extras_nocturnas', finalExtNoc);
      const extFestivasParaCalculo = getValExactoInput('extras_festivas', finalExtFesDiu + finalExtFesNoc);

      // Mapeo Estricto de Novedades (Auditoría de Liquidación)
      const getNoveltyCount = (conditionFn) => {
          const key = Object.keys(novedadesResumen).find(conditionFn);
          return key ? novedadesResumen[key]?.length : 0;
      };

      const dias_vacaciones = resolveValue(overrides, `${cedula}_dias_vacaciones`, () => {
          const val = getNoveltyCount(k => k === 'VACACIONES');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_vacaciones || 0));
      });

      const dias_lic_rem = resolveValue(overrides, `${cedula}_dias_lic_rem`, () => {
          const val = getNoveltyCount(k => k === 'LICENCIA REMUNERADA');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_lic_rem || 0));
      });

      const dias_lic_norem = resolveValue(overrides, `${cedula}_dias_lic_norem`, () => {
          const val = getNoveltyCount(k => k === 'LICENCIA NO REMUNERADA');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_lic_norem || 0));
      });

      const dias_incap_at = resolveValue(overrides, `${cedula}_dias_incap_at`, () => {
          const val = getNoveltyCount(k => k === 'INCAPACIDAD AT' || k === 'INCAPACIDAD ACCIDENTE LABORAL');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_incap_at || 0));
      });

      const dias_calamidad = resolveValue(overrides, `${cedula}_dias_calamidad`, () => {
          const val = getNoveltyCount(k => k === 'CALAMIDAD');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_calamidad || 0));
      });

      const dias_sancion = resolveValue(overrides, `${cedula}_dias_sancion`, () => {
          const val = getNoveltyCount(k => k === 'SANCION' || k === 'SANCIONADO');
          return val > 0 ? val : parseLocalNumber(Number(emp.dias_sancion || 0));
      });

      const dias_ausentes_total = (dias_vacaciones || 0) + (dias_lic_rem || 0) + (dias_lic_norem || 0) + (typeof diasIncapacidad !== 'undefined' ? diasIncapacidad : 0) + (dias_incap_at || 0) + (dias_calamidad || 0) + (dias_sancion || 0);

      // MOTOR MATEMÁTICO EN CASCADA
      let variables = {
        salario_base: salarioBase,
        smlv_base: globalSmmlv,
        aux_transporte_base: globalAuxTransporte,
        valor_diario_base: MINIMO_DIARIO_INCAPACIDAD,
        dias_pagados: overrides[`${cedula}_dias_pagados`] !== undefined && overrides[`${cedula}_dias_pagados`] !== "" ? Number(overrides[`${cedula}_dias_pagados`]) : (emp.dias_pagados || Math.min(15, diasPagadosCalculados)),
        dias_ausentes_total: dias_ausentes_total,
        dias_vacaciones: dias_vacaciones,
        dias_lic_rem: dias_lic_rem,
        dias_lic_norem: dias_lic_norem,
        dias_incap_at: dias_incap_at,
        dias_calamidad: dias_calamidad,
        dias_sancion: dias_sancion,
        horas_diurnas: hrsDiurnasParaCalculo,
        horas_nocturnas: hrsNocturnasParaCalculo,
        extras_diurnas: extDiurnasParaCalculo,
        extras_nocturnas: extNocturnasParaCalculo,
        extras_festivas: extFestivasParaCalculo, // Agrupadas en una bolsa
        dias_incapacidad: diasIncapacidad,
        comisiones: comisiones,
        rodamiento: rodamiento,
        prestamos: prestamos,
        raw_prestamos_saitemp: rawDescuentosSaitemp,
        saldo_prestamo: saldoPrestamo,
        poliza_bolivar: polizaBolivar,
        poliza_plenitud: polizaPlenitud,
        libranza_comfama: libranzaComfama,
        poliza_sura: polizaSura,
        optica: optica,
        celular: celular,
        retencion: retencion,
        bonificacion: bonificacion,
        bonificacion_no_salarial: bonificacion
      };

      // Helper para evaluar, respetar overrides y guardar en scope variables
      const computeField = (fieldId, formulaFallback = '') => {
        // Regla de Negocio: Vacaciones pagadas por anticipado
        if (fieldId === 'val_vacaciones' && overrides[`${cedula}_vacaciones_pagadas`] === true) {
            variables[fieldId] = 0;
            return 0;
        }

        const aliasMap = {
          'sueldo': ['sueldo_calculado', 'sueldo_basico'],
          'total_devengados': ['total_devengado', 'total_devengos'],
          'total_deducciones': ['total_deducido', 'total_descuentos'],
          'neto_pagar': ['neto_a_pagar', 'neto'],
          'total_pagar': ['total_pagar', 'total_a_pagar']
        };

        // 1. REVISAR OVERRIDES PRIMERO
        let manualValue = overrides[`${cedula}_${fieldId}`];
        // Buscar en alias si no está en la llave directa
        for (const [key, aliases] of Object.entries(aliasMap)) {
            if (aliases.includes(fieldId) || key === fieldId) {
                aliases.forEach(a => { if (overrides[`${cedula}_${a}`] !== undefined) manualValue = overrides[`${cedula}_${a}`]; });
            }
        }

        // 2. SI HAY OVERRIDE, GANA EL USUARIO (Cortocircuito)
        if (manualValue !== undefined && manualValue !== '') {
            const cleanNum = safeParseNumber(manualValue);
            
            // Inyectar en todas las formas posibles para que ninguna fórmula falle
            variables[fieldId] = cleanNum;
            if (aliasMap[fieldId]) {
                aliasMap[fieldId].forEach(a => variables[a] = cleanNum);
            }
            // Búsqueda inversa para inyectar
            for (const [key, aliases] of Object.entries(aliasMap)) {
                if (aliases.includes(fieldId)) {
                    variables[key] = cleanNum;
                    aliases.forEach(a => variables[a] = cleanNum);
                }
            }
            return cleanNum;
        }

        // 3. SI NO HAY OVERRIDE, EVALUAR MATEMÁTICAMENTE
        const formulaStr = activeFormulas[fieldId] || formulaFallback;
        // Si no hay fórmula explícita, preservamos el valor que ya exista en variables (cargado de emp)
        const calcVal = formulaStr ? evaluateFormula(formulaStr, variables) : (variables[fieldId] || 0);
        const finalVal = parseLocalNumber(calcVal);

        variables[fieldId] = finalVal;
        
        // Asignación de alias estándar si el objeto es un key directo de aliasMap
        if (aliasMap[fieldId]) {
            aliasMap[fieldId].forEach(a => variables[a] = finalVal);
        }
        for (const [key, aliases] of Object.entries(aliasMap)) {
            if (aliases.includes(fieldId)) {
                variables[key] = finalVal;
                aliases.forEach(a => variables[a] = finalVal);
            }
        }
        
        return finalVal;
      };

      // FASE 1: Devengados Base
      const fase1 = ['sueldo', 'recargo_nocturno', 'val_extras_diurnas', 'val_extras_nocturnas', 'val_extras_festivas', 'transporte', 'incapacidad', 'comisiones', 'rodamiento', 'val_vacaciones', 'val_lic_rem', 'val_lic_norem', 'val_incap_at', 'val_calamidad', 'val_sancion'];
      // FASE 2: Suma de Devengados (SOLO LLAVES OFICIALES)
      const fase2 = ['total_devengados', 'ibc_seguridad_social', 'ibc_fsp'];
      // FASE 3: Deducciones Base
      const fase3 = ['salud', 'pension', 'solidaridad', 'prestamos', 'poliza_bolivar', 'poliza_plenitud', 'libranza_comfama', 'poliza_sura', 'optica', 'celular', 'retencion'];
      // FASE 4: Suma de Deducciones (SOLO LLAVES OFICIALES)
      const fase4 = ['total_deducciones'];
      // FASE 5: Totales Finales (Dependen obligatoriamente de la Fase 2 y Fase 4 completadas)
      const fase5 = ['total_pagar', 'neto_pagar', 'verificacion'];

      // Ejecución en cascada garantizada
      [fase1, fase2, fase3, fase4, fase5].forEach(fase => {
          fase.forEach(campoId => {
              computeField(campoId); 
          });
      });

      console.log("💰 ESCÁNER DE NÓMINA - Cédula:", cedula, {
          dias_capturados: variables.dias_calamidad,
          salario: variables.salario_base,
          formula: activeFormulas['val_calamidad'] || DEFAULT_FORMULAS['val_calamidad'],
          resultado_final_plata: variables.val_calamidad
      });

      // Si después de todo, total_pagar es 0 o NaN, FUERZA la resta matemática:
      if (!variables['total_pagar']) {
          variables['total_pagar'] = safeParseNumber(variables['total_devengados']) - safeParseNumber(variables['total_deducciones']);
      }

      const finalRow = {
        masterRow: emp,
        ...emp,
        dias_pagados: diasPagados,
        horas_debe: horasDebe,
        horas_pendientes: horasPendientes,
        horas_diurnas: finalDiurnas,
        horas_nocturnas: finalNocturnas,
        festivas_diurnas: finalFesDiu,
        festivas_nocturnas: finalFesNoc,
        extras_diurnas: finalExtDiu,
        extras_nocturnas: finalExtNoc,
        extras_festivas: finalExtFesDiu,
        extras_festivas_nocturnas: resolveValue(overrides, `${cedula}_val_extras_festivas_nocturnas`, () => 0),
        sueldo: variables['sueldo'] || 0,
        recargo_nocturno: variables['recargo_nocturno'] || 0,
        val_extras_diurnas: variables['val_extras_diurnas'] || 0,
        val_extras_nocturnas: variables['val_extras_nocturnas'] || 0,
        val_extras_festivas: variables['val_extras_festivas'] || 0,
        comisiones: variables['comisiones'] || 0,
        transporte: variables['transporte'] || 0,
        rodamiento: variables['rodamiento'] || 0,
        dias_incapacidad: diasIncapacidad,
        dias_vacaciones: variables['dias_vacaciones'] || 0,
        dias_lic_rem: variables['dias_lic_rem'] || 0,
        dias_lic_norem: variables['dias_lic_norem'] || 0,
        dias_incap_at: variables['dias_incap_at'] || 0,
        dias_calamidad: variables['dias_calamidad'] || 0,
        dias_sancion: variables['dias_sancion'] || 0,
        incapacidad: variables['incapacidad'] || 0,
        val_vacaciones: variables['val_vacaciones'] || 0,
        val_lic_rem: variables['val_lic_rem'] || 0,
        val_lic_norem: variables['val_lic_norem'] || 0,
        val_incap_at: variables['val_incap_at'] || 0,
        val_calamidad: variables['val_calamidad'] || 0,
        val_sancion: variables['val_sancion'] || 0,
        total_devengados: variables['total_devengados'] || 0,
        total_devengado: variables['total_devengados'] || 0, // Alias para UI
        ibc_seguridad_social: variables['ibc_seguridad_social'] || 0,
        ibc_fsp: variables['ibc_fsp'] || 0,
        salud: variables['salud'] || 0,
        pension: variables['pension'] || 0,
        solidaridad: variables['solidaridad'] || 0,
        prestamos: variables['prestamos'] || 0,
        saldo_prestamo: variables['saldo_prestamo'] || 0,
        poliza_bolivar: variables['poliza_bolivar'] || 0,
        poliza_plenitud: variables['poliza_plenitud'] || 0,
        libranza_comfama: variables['libranza_comfama'] || 0,
        poliza_sura: variables['poliza_sura'] || 0,
        optica: variables['optica'] || 0,
        celular: variables['celular'] || 0,
        retencion: variables['retencion'] || 0,
        total_deducciones: variables['total_deducciones'] || 0,
        total_deducido: variables['total_deducciones'] || 0, // Alias para UI
        bonificacion: variables['bonificacion'] || 0,
        total_pagar: variables['total_pagar'] || 0,
        neto_pagar: variables['neto_pagar'] || 0,
        verificacion: variables['verificacion'] || 0,
        workerDays: processedLogs,
        totalLlegadasVeces: sumLlegadasTarde,
        totalLlegadasMin: sumLlegadasMin,
        totalComidasVeces: sumComidasVeces,
        totalComidasMin: sumComidasMin,
        novedadesResumen: novedadesResumen,
        liquidation: {
            total_extra_val: (variables['recargo_nocturno']||0) + (variables['val_extras_diurnas']||0) + (variables['val_extras_nocturnas']||0) + (variables['val_extras_festivas']||0) + resolveValue(overrides, `${cedula}_val_extras_festivas_nocturnas`, () => 0)
        }
      };

      const esAdmin = emp.categoria === 'Administrativo' || emp.cargo?.toUpperCase() === 'ADMINISTRATIVO';
      if (esAdmin) {
          finalRow.horas_diurnas = 88;
          finalRow.horas_nocturnas = 0;
          finalRow.extras_diurnas = 0;
          finalRow.extras_nocturnas = 0;
          finalRow.extras_festivas = 0;
          finalRow.dias_pagados = emp.dias_pagados !== '' && emp.dias_pagados !== undefined ? Number(emp.dias_pagados) : 15;
      }

      return finalRow;
    });
  }, [nominaRows, attendanceLogs, overrides, activeFormulas, startDate, endDate, weeklySchedules]);

  // Filtering based on SearchTerm and Position selector
  const filteredPayrollData = useMemo(() => {
    return payrollData.filter(item => {
      const itemName = item.nombre || item.name || "";
      const nameMatch = itemName.toLowerCase().includes(searchTerm.toLowerCase()) || String(item.masterRow?.cedula || "").includes(searchTerm);
      const posMatch = filterPosition === "all" || item.masterRow?.cargo === filterPosition;
      return nameMatch && posMatch;
    });
  }, [payrollData, searchTerm, filterPosition]);

  const handleSaveDraft = async () => {
    setSaveStatus('saving');
    try {
      // 1. Snapshot de valores derivados actuales para que no se pierdan
      let frozenOverrides = { ...overridesRef.current };

      if (typeof filteredPayrollData !== 'undefined' && filteredPayrollData.length > 0) {
        filteredPayrollData.forEach(row => {
          const cedula = row.masterRow ? row.masterRow.cedula : row.cedula;
          
          const injectOverride = (key, value) => {
            frozenOverrides[`${cedula}_${key}`] = value;
          };

          // NOTA ARQUITECTÓNICA: NO inyectamos novedades calculadas dinámicamente (dias_incapacidad, etc.) 
          // en frozenOverrides. Si lo hiciéramos, resolveValue las leería como un 'override manual'
          // al recargar la página, congelando el cálculo en 0 y anulando el biométrico futuro.
          // El estado dinámico se recalcula solo al cargar attendanceLogs.
          // Los campos de tiempo J y K tampoco se inyectan más.

        });
      }

      // 2. RUTINA DE SANITIZACIÓN ESTRICTA (PURGA ESTRUCTURAL)
      // Eliminamos de la base de datos todas las llaves dinámicas que nunca deben tratarse como overrides manuales.
      Object.keys(frozenOverrides).forEach(key => {
          if (
              key.includes('_dias_incapacidad') ||
              key.includes('_dias_calamidad') ||
              key.includes('_dias_lic_rem') ||
              key.includes('_dias_vacaciones') ||
              key.includes('_dias_lic_norem') ||
              key.includes('_dias_incap_at') ||
              key.includes('_dias_sancion') ||
              key.includes('_hr_ent_pago') ||
              key.includes('_hr_sal_pago')
          ) {
              delete frozenOverrides[key];
          }
      });

      // 3. PERSISTENCIA DE HORARIOS (AMNESIA FIX)
      // Guardamos el estado exacto de los horarios semanales para que la app no los olvide al recargar
      if (weeklySchedules && weeklySchedules.length > 0) {
          frozenOverrides['_MASTER_SCHEDULE_JSON'] = weeklySchedules;
      }

      // Sincronizar el estado visual de overrides inmediatamente con el objeto limpio
      // Removemos el MASTER_SCHEDULE del estado local de overrides para no contaminar la UI
      const stateOverrides = { ...frozenOverrides };
      delete stateOverrides['_MASTER_SCHEDULE_JSON'];
      setOverrides(stateOverrides);
      overridesRef.current = stateOverrides;

      const payload = {
        id: 'quincena_activa',
        start_date: startDate,
        end_date: endDate,
        attendance_logs: attendanceLogs,
        overrides: frozenOverrides,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('optimoldes_payroll')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      
      setSaveStatus('success');
      setToast({ message: "Borrador guardado en la nube", type: "success" });
      setTimeout(() => setToast(null), 3000);
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 1500);
    } catch (err) {
      console.error("Error guardando borrador:", err);
      setSaveStatus('idle');
      setToast({ message: "Error al guardar el borrador", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Auto-select first worker when entering liquidacion tab
  useEffect(() => {
    if (activeTab === "liquidacion" && !selectedWorkerName && filteredPayrollData.length > 0) {
      const empleadosParaLiquidar = [...filteredPayrollData]
        .filter(emp => emp.masterRow?.area !== 'Administrativo' && emp.masterRow?.categoria !== 'Administrativo' && emp.masterRow?.cargo?.toUpperCase() !== 'ADMINISTRATIVO')
        .sort((a, b) => (a.masterRow?.nombre || "").localeCompare(b.masterRow?.nombre || ""));
        
      if (empleadosParaLiquidar.length > 0) {
         setSelectedWorkerName(empleadosParaLiquidar[0].masterRow.nombre);
      } else {
         setSelectedWorkerName(filteredPayrollData[0].masterRow.nombre);
      }
    }
  }, [activeTab, selectedWorkerName, filteredPayrollData]);

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
    setOverrides(prev => {
      const newOverrides = { ...prev, [cellKey]: val };
      
      // Limpieza de Overrides en Cascada (Cache Invalidation)
      const parts = cellKey.split('_');
      const cedula = parts[0];
      const campoEditado = parts.slice(1).join('_');

      const devengadosBase = ['sueldo', 'recargo_nocturno', 'val_extras_diurnas', 'val_extras_nocturnas', 'val_extras_festivas', 'transporte', 'incapacidad', 'comisiones', 'rodamiento'];
      const deduccionesBase = ['salud', 'pension', 'solidaridad', 'prestamos', 'poliza_bolivar', 'poliza_plenitud', 'libranza_comfama', 'poliza_sura', 'optica', 'celular', 'retencion'];
      const totalesIntermedios = ['total_devengados', 'total_devengado', 'total_deducciones', 'total_deducido'];

      if (devengadosBase.includes(campoEditado) || campoEditado === 'dias_pagados') {
          delete newOverrides[`${cedula}_total_devengados`];
          delete newOverrides[`${cedula}_total_devengado`];
          delete newOverrides[`${cedula}_total_pagar`];
          delete newOverrides[`${cedula}_neto_pagar`];
      }
      if (deduccionesBase.includes(campoEditado)) {
          delete newOverrides[`${cedula}_total_deducciones`];
          delete newOverrides[`${cedula}_total_deducido`];
          delete newOverrides[`${cedula}_total_pagar`];
          delete newOverrides[`${cedula}_neto_pagar`];
      }
      if (totalesIntermedios.includes(campoEditado)) {
          delete newOverrides[`${cedula}_total_pagar`];
          delete newOverrides[`${cedula}_neto_pagar`];
      }

      // Sincronización inmediata para guardados asíncronos en el mismo ciclo
      overridesRef.current = newOverrides;

      return newOverrides;
    });
  };
  
  const handleClearAll = async () => {
    if (!window.confirm("¿Estás seguro de limpiar las novedades? Esto borrará el borrador actual en la base de datos.")) return;
    
    try {
        // 1. Limpiar biométrico
        if (typeof setAttendanceLogs === 'function') setAttendanceLogs({});
        
        // 2. Limpiar manuales
        let newOverrides = { ...overrides };
        const camposABorrar = [
          'dias_pagados', 'horas_diurnas', 'horas_nocturnas', 'extras_diurnas',
          'extras_nocturnas', 'extras_festivas', 'comisiones', 'rodamiento',
          'dias_incapacidad', 'bonificacion_no_salarial', 'bonificacion', 
          'tot_hr_', 'vr_', 'horas_que_debe'
        ];
        
        Object.keys(newOverrides).forEach(key => {
            if (camposABorrar.some(campo => key.includes(campo))) {
                delete newOverrides[key];
            }
        });
        
        // 1. Crear una matriz completamente limpia a la fuerza
        const freshRows = nominaRows.map(emp => {
            const esAdmin = emp.categoria === 'Administrativo' || emp.cargo?.toUpperCase() === 'ADMINISTRATIVO';
            return {
                ...emp,
                dias_pagados: esAdmin ? 15 : 0, // 0 estricto
                horas_diurnas: esAdmin ? 88 : 0,
                horas_nocturnas: 0,
                extras_diurnas: 0,
                extras_nocturnas: 0,
                extras_festivas: 0,
                comisiones: 0,
                rodamiento: 0,
                dias_incapacidad: 0,
                bonificacion_no_salarial: 0
                // PROTEGIDOS: No tocar salario_base, optica, celular, prestamos ni polizas.
            };
        });

        // 2. Actualizar el estado visual
        setOverrides(newOverrides);
        setNominaRows(freshRows);
        
        // 3. Destruir caché local
        localStorage.removeItem('optinomina_draft');
        
        // 4. DESTRUIR EL BORRADOR DE LA NUBE PARA EVITAR EL "CANDADO ACTIVO" ZOMBIE
        await supabase.from('optimoldes_payroll').delete().eq('id', 'quincena_activa');

        // DAÑO EVITADO: NUNCA BORRAR LOS HORARIOS SEMANALES AL REINICIAR LA BIOMETRÍA.
        
    } catch (err) {
        console.error("Error en la limpieza:", err);
        alert("Hubo un error limpiando la quincena.");
    } finally {
        // 5. RECARGA GARANTIZADA
        window.location.reload();
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
      const cleanData = await parseBiometricCSV(file, startDate, endDate, nominaRows);
      
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
      const newOrphans = [];

      cleanData.forEach(row => {
         const key = row.cedula;
         // Si es un empleado no emparejado (null), simplemente lo ignoramos (solo se emparejan los oficiales).
         if (!key) return;
         
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
            
            // 1. Consultar si existe un turno programado para este empleado en esta fecha
            const emp = typeof nominaRows !== 'undefined' ? nominaRows.find(r => r.cedula === groupKey) || { cedula: groupKey } : { cedula: groupKey };
            const scheduledShift = typeof getScheduledShift === 'function' && typeof weeklySchedules !== 'undefined' 
                ? getScheduledShift(emp, dateStr, weeklySchedules) 
                : null;
            
            // 2. Extraer el estado del turno programado
            const turnoValor = String(typeof scheduledShift === 'object' ? (scheduledShift?.novedad || scheduledShift?.tipo || scheduledShift?.nombre || "") : (scheduledShift || "")).toUpperCase().trim();
            const esTurnoNormal = ["NORMAL", "DESCANSO", "DIURNO", "NOCTURNO", "TURNO"].some(t => turnoValor.includes(t)) || turnoValor === "";
            
            // 3. Escudo protector: Si hay una novedad programada, inyectarla para que el biométrico no la aplaste
            if (!esTurnoNormal && turnoValor) {
                currentDay.estado = turnoValor;
                currentDay.novedad = turnoValor;
            }

            // 4. Guardar el registro
            if (currentDay.hr_ent || currentDay.hr_sal || currentDay.estado) {
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

  const handleClearAttendanceData = async (scope = "worker") => {
    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) return;

    const confirmMsg = scope === "all"
      ? "¿Borrar TODAS las marcaciones biométricas de la base de datos?"
      : `¿Borrar marcaciones de ${selectedWorkerName} en el rango ${startDate} a ${endDate}?`;

    if (!confirm(confirmMsg)) return;

    setToast({ message: "Limpiando biométrico...", type: "info" });

    try {
      if (scope === "all") {
        setAttendanceLogs({});
        await supabase
          .from('optimoldes_payroll')
          .update({
            attendance_logs: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', 'quincena_activa');
        localStorage.removeItem('optinomina_draft');
      } else {
        const nuevosLogs = { ...attendanceLogs };
        const targetKey = nominaRows.find(r => (r.nombre || r.name) === selectedWorkerName)?.cedula;
        if (targetKey) {
          const existing = nuevosLogs[targetKey] || [];
          const byDate = new Map(existing.map(d => [d.dia, d]));
          dates.forEach(dateStr => {
            byDate.set(dateStr, emptyAttendanceDay(dateStr));
          });
          nuevosLogs[targetKey] = Array.from(byDate.values()).sort((a, b) => a.dia.localeCompare(b.dia));
          setAttendanceLogs(nuevosLogs);

          await supabase
            .from('optimoldes_payroll')
            .update({
              attendance_logs: nuevosLogs,
              updated_at: new Date().toISOString()
            })
            .eq('id', 'quincena_activa');
        }
      }

      setToast({
        message: scope === "all" ? "Biométrico borrado con éxito." : `Marcaciones borradas para ${selectedWorkerName}.`,
        type: "success",
      });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      console.error("Error limpiando asistencia en DB:", e);
      setToast({ message: "Error al limpiar biométrico", type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
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
  if (isAppLoading || !dataLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 font-semibold bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="animate-pulse">Cargando base de datos en tiempo real...</p>
      </div>
    );
  }
  return (
    <>
    <div className="w-full max-w-[98%] xl:max-w-[96%] mx-auto space-y-8 animate-stitch pb-12">
      
      {/* Header Banner - Sleek Glassmorphism */}
      <header className="flex flex-col items-center justify-center text-center w-full pb-6 border-b border-slate-200/80 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Nómina Optimoldes</h2>
      </header>

      {/* Global Information Alert & Formula Reset Control */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-md">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
          <Info size={16} className="text-accent shrink-0" />
          <span>Guarda tu progreso temporalmente, consolida la quincena final o elimina los registros actuales para reiniciar el proceso.</span>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleSaveDraft}
            disabled={saveStatus === 'saving'}
            className={
              saveStatus === 'success'
                ? "bg-emerald-500 text-white px-4 py-2 rounded font-bold transition-colors duration-300 text-xs inline-flex items-center gap-2"
                : "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition-colors duration-300 active:scale-95 text-xs inline-flex items-center gap-2 shadow-md"
            }
          >
            {saveStatus === 'saving' ? "⏳ Guardando..." : saveStatus === 'success' ? "✅ Progreso Guardado" : "💾 Guardar Progreso"}
          </button>

          <button
            onClick={handleCerrarQuincena}
            disabled={isClosing || !filteredPayrollData || filteredPayrollData.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2
              ${isClosing 
                ? "bg-slate-400 text-slate-200 cursor-not-allowed border border-slate-500" 
                : "bg-red-600 text-white hover:bg-red-700 hover:shadow-red-500/30 hover:shadow-lg active:scale-95 border border-red-800"}`}
          >
            {isClosing ? "⏳ Congelando..." : "🔒 Cerrar Quincena (Ultimátum)"}
          </button>
          
          <button
            onClick={handleClearAll}
            className="bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white px-4 py-2 rounded font-bold transition-colors duration-300 active:scale-95 text-xs inline-flex items-center gap-2 shadow-md"
          >
            🗑️ Eliminar Quincena
          </button>
        </div>
      </div>

      
      {/* Global Controls Bar removed and distributed to tabs */}

      {/* Tab Navigation */}
      {nominaRows.length > 0 && (
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit mx-auto mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            📊 Nómina
          </button>
          <button
            onClick={() => setActiveTab("liquidacion")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "liquidacion" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            📝 Liquidación
          </button>
          <button
            onClick={() => setActiveTab("directorio")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "directorio" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-200/50"}`}
          >
            📇 DIRECTORIO
          </button>
          <button
            onClick={() => setActiveTab("horarios")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "horarios" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-200/50"}`}
          >
            🗓️ HORARIOS
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
          <button
            onClick={() => setActiveTab("historico")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "historico" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            ⏳ Histórico
          </button>
        </div>
      )}
      
{nominaRows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-stitch">
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-12 max-w-lg shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">El área de trabajo está vacía</h2>
            <p className="text-slate-500 mt-4 text-sm font-medium leading-relaxed">
              Para comenzar, selecciona el rango de fechas en la barra superior y luego importa el archivo CSV de marcas biométricas crudo.
            </p>
          </div>
        </div>
      ) : (
        <>
      {activeTab === "directorio" && (
        <TabDirectorio 
          employees={nominaRows} 
          refreshEmployees={reloadEmployees} 
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
             handleClearAll={handleClearAll}
             overrides={overrides}
             fmtCOP={fmtCOP}
             globalSmmlv={globalSmmlv}
             setGlobalSmmlv={setGlobalSmmlv}
             globalAuxTransporte={globalAuxTransporte}
             setGlobalAuxTransporte={setGlobalAuxTransporte}
             handleSaveDraft={handleSaveDraft}
          />

          

          
        </div>
        </>
      )}

      {/* --- TAB 2: FORMULARIO DE LIQUIDACIÓN --- */}
      {activeTab === "liquidacion" && (
         <TabLiquidacion
            selectedWorkerData={filteredPayrollData.find(d => d.masterRow.nombre === selectedWorkerName) || null}
            overrides={overrides}
            handleCellEdit={(key, value) => {
               handleCellEdit(key, value === "" ? undefined : (isNaN(Number(value)) ? value : Number(value)));
            }}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            handleFileUpload={handleFileUpload}
            handleClearAttendanceData={handleClearAttendanceData}
            selectedWorkerName={selectedWorkerName}
            setSelectedWorkerName={setSelectedWorkerName}
            nominaRows={nominaRows}
            handleSaveDraft={handleSaveDraft}
         />
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

      {/* --- TAB: HISTÓRICO --- */}
      {activeTab === "historico" && (
        <TabPanelHistorico />
      )}

      {/* --- TAB: HORARIOS --- */}
      {activeTab === "horarios" && (
        <TabHorarios empleados={nominaRows} />
      )}


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
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              setDetailsSaveStatus('saving');
              try {
                await handleSaveDraft();
                setDetailsSaveStatus('success');
                setTimeout(() => {
                  setDetailsSaveStatus('idle');
                  setIsDetailsModalOpen(false);
                }, 1500);
              } catch (e) {
                setDetailsSaveStatus('idle');
              }
            }}
            disabled={detailsSaveStatus === 'saving'}
            className={`${detailsSaveStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm inline-flex items-center gap-2`}
          >
            {detailsSaveStatus === 'saving' ? "⏳ Guardando..." : 
             detailsSaveStatus === 'success' ? "✅ ¡Guardado!" : "💾 Guardar Cambios"}
          </button>
          <button 
            onClick={() => setIsDetailsModalOpen(false)} 
            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 hover:text-rose-600 rounded-full text-slate-400 transition-all shadow-sm font-bold text-lg"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Cuerpo Scrollable con Grid de 40 columnas */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50">
        
        {deudaAnteriorModal < 0 && (
          <div className="bg-rose-100 text-rose-800 p-3 rounded-xl mb-6 font-bold border border-rose-300 flex items-center gap-2 shadow-sm">
             <span className="text-xl">⚠️</span> ATENCIÓN: Este trabajador arrastra {Math.abs(deudaAnteriorModal)}h pendientes de la quincena pasada.
          </div>
        )}
        
        {/* SECCIÓN INDICADORES DE TIEMPO */}
        {(() => {
             const workerData = filteredPayrollData.find(d => d.masterRow.nombre === detailsWorkerName) || filteredPayrollData[0];
             if (!workerData) return null;
             
             const llegadasVeces = Number(workerData.totalLlegadasVeces || 0);
             const llegadasMin = Number(workerData.totalLlegadasMin || 0);
             const comidasVeces = Number(workerData.totalComidasVeces || 0);
             const comidasMin = Number(workerData.totalComidasMin || 0);

             return (
               <div className="bg-slate-900 rounded-2xl p-6 mb-6 shadow-xl border border-slate-800">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <span className="text-indigo-400">⏱️</span> Indicadores de Tiempo (Quincena)
                 </h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Llegadas Tarde (Veces)</span>
                       <span className={`text-2xl font-black tracking-tight ${llegadasVeces > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{llegadasVeces}</span>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Llegadas Tarde (Mins)</span>
                       <span className={`text-2xl font-black tracking-tight ${llegadasMin > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{llegadasMin}</span>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Excesos Comida (Veces)</span>
                       <span className={`text-2xl font-black tracking-tight ${comidasVeces > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{comidasVeces}</span>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Excesos Comida (Mins)</span>
                       <span className={`text-2xl font-black tracking-tight ${comidasMin > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{comidasMin}</span>
                    </div>
                 </div>
               </div>
             );
        })()}

        {/* SECCIÓN RESUMEN DE NOVEDADES */}
        {(() => {
            const workerData = filteredPayrollData.find(d => d.masterRow.nombre === detailsWorkerName) || filteredPayrollData[0];
            if (!workerData || !workerData.novedadesResumen || Object.keys(workerData.novedadesResumen).length === 0) return null;

            return (
                <div className="bg-slate-900 rounded-2xl p-6 mb-6 shadow-xl border border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <span className="text-amber-400">📋</span> Tipos de Novedad (Descuentan de Ordinarios)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(workerData.novedadesResumen).map(([tipo, fechas]) => (
                            <div key={tipo} className="bg-slate-800 rounded-xl p-4 border border-amber-700/30 shadow-inner">
                                <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 truncate">{tipo}</span>
                                <div className="text-2xl font-black tracking-tight text-slate-200 mb-2">
                                    {fechas.length} <span className="text-sm font-medium text-slate-500">días</span>
                                </div>
                                <div className="text-xs text-slate-400 leading-tight">
                                    Fechas: {fechas.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })()}


        <div className="space-y-8">
          {(() => {
             const workerData = filteredPayrollData.find(d => d.masterRow.nombre === detailsWorkerName) || filteredPayrollData[0];
             if (!workerData) return null;

             // --- INYECCIÓN LÓGICA DE GERENCIA: NOVEDADES Y TRANSPORTE ---
             const salarioBase = Number(workerData.masterRow?.salario_base || 0);
             const smlvBase = globalSmmlv;
             const auxTransporteMensual = globalAuxTransporte;
             const valorDia = salarioBase / 30;
             const valorDiaMinimo = smlvBase / 30;
             const resumen = workerData.novedadesResumen || {};

             // --- FIN INYECCIÓN ---
             
             // 1. Campos que vienen de la pestaña Liquidación (Horas y Días)
             const camposLiquidacion = [
               'horas_diurnas', 'horas_nocturnas', 'extras_diurnas', 'extras_nocturnas', 'extras_festivas'
             ];

             // 2. Campos con fórmulas matemáticas en la nómina (Dinero y Totales)
             const camposFormulados = [
                 'sueldo', 'recargo_nocturno', 'val_extras_diurnas', 'val_extras_nocturnas', 'val_extras_festivas', 
                 'transporte', 'incapacidad', 'total_devengados', 'salud', 'pension', 'solidaridad', 
                 'total_deducciones', 'total_pagar', 'neto_pagar', 'verificacion',
                 'val_vacaciones', 'val_lic_rem', 'val_lic_norem', 'val_incap_at', 'val_calamidad', 'val_sancion'
             ];

             // COMPENSACIÓN CRUZADA:
             const cKeyExtDiu = `${workerData.masterRow.cedula}_extras_diurnas`;
             const cKeyExtNoc = `${workerData.masterRow.cedula}_extras_nocturnas`;
             
             let extraDiurnaOriginal = Number(overrides[cKeyExtDiu] !== undefined ? overrides[cKeyExtDiu] : (workerData['extras_diurnas'] || 0));
             let extraNocturnaOriginal = Number(overrides[cKeyExtNoc] !== undefined ? overrides[cKeyExtNoc] : (workerData['extras_nocturnas'] || 0));
             
             let finalExtraDiurna = extraDiurnaOriginal;
             let finalExtraNocturna = extraNocturnaOriginal;
             let requiresWarning = false;

             if (extraDiurnaOriginal < 0 && extraNocturnaOriginal > 0) {
                 const balance = extraDiurnaOriginal + extraNocturnaOriginal;
                 
                 if (balance > 0) {
                     finalExtraNocturna = parseFloat(balance.toFixed(2));
                     finalExtraDiurna = 0;
                 } else {
                     finalExtraNocturna = 0;
                     finalExtraDiurna = 0;
                     requiresWarning = true; // Activa la alerta visual
                 }
             }

             const renderCard = (col) => {
                const cKey = `${workerData.masterRow.cedula}_${col.key}`;
                let val = overrides[cKey] !== undefined ? overrides[cKey] : (workerData[col.key] !== undefined ? workerData[col.key] : "");
                
                if (col.key === 'extras_diurnas') val = finalExtraDiurna;
                if (col.key === 'extras_nocturnas') val = finalExtraNocturna;

                if (col.isCurrency && val !== "") val = Math.round(Number(val));
                
                const isLiquidacion = camposLiquidacion.includes(col.key);
                const isFormulated = camposFormulados.includes(col.key);
                const hasBadge = isLiquidacion || isFormulated;
                
                const isWarningField = requiresWarning && (col.key === 'extras_diurnas' || col.key === 'extras_nocturnas');
                const cellWarningClass = isWarningField ? "text-red-600 font-bold bg-red-50 !text-red-600 rounded" : "";
                const containerWarningClass = isWarningField ? "border-red-300 bg-red-50/20" : "";

                return (
                  <div key={col.key} className={`relative bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group ${containerWarningClass}`}>
                     {isWarningField && (
                        <div className="absolute top-2 left-2 text-[10px] text-red-600 flex items-center gap-1 mb-1 font-bold">
                          <span>⚠️ Alerta</span>
                        </div>
                     )}
                     {isLiquidacion && (
                       <div className="absolute top-2 right-2 text-[10px] text-amber-600 flex items-center gap-1 mb-1 justify-end font-semibold" title="Viene de Liquidación">
                         <span>⏱️ Liquidación</span>
                       </div>
                     )}
                     {isFormulated && (
                       <div className="absolute top-2 right-2 text-[10px] text-indigo-500 flex items-center gap-1 mb-1 justify-end font-semibold">
                          <span>✨ Formulado</span>
                          <button onClick={() => handleOpenFormulaEditor(col.key)} className="hover:text-indigo-700 transition-colors p-1 rounded hover:bg-indigo-50" title="Editar Fórmula">⚙️</button>
                        </div>
                     )}
                     <span className={`text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mb-2 group-hover:text-emerald-600 transition-colors ${hasBadge ? 'pr-24' : ''} ${isWarningField ? 'text-red-500' : ''}`} title={col.label}>
                       {col.label}
                     </span>
                     <EditableCell
                        value={val}
                        onChange={(newVal) => handleCellEdit(cKey, newVal)}
                        isOverridden={overrides[cKey] !== undefined}
                        isCalculated={col.isCalculated}
                        isCurrency={col.isCurrency}
                        isDecimal={col.isDecimal}
                        extraClasses={cellWarningClass}
                     />
                  </div>
                )
             };

             const devengosBasicos = ['salario', 'dias_pagados', 'sueldo', 'transporte', 'rodamiento', 'comisiones', 'bonificacion_no_salarial', 'bonificacion', 'total_devengados'];
             const novedadesFinancieras = ['dias_lic_rem', 'val_lic_rem', 'dias_lic_norem', 'val_lic_norem', 'dias_incapacidad', 'incapacidad', 'dias_incap_at', 'val_incap_at', 'dias_calamidad', 'val_calamidad', 'dias_sancion', 'val_sancion'];
             const suplementario = ['horas_diurnas', 'horas_nocturnas', 'extras_diurnas', 'extras_nocturnas', 'extras_festivas', 'recargo_nocturno', 'val_extras_diurnas', 'val_extras_nocturnas', 'val_extras_festivas'];
             const deducciones = ['salud', 'pension', 'solidaridad', 'prestamos', 'saldo_prestamo', 'poliza_bolivar', 'poliza_plenitud', 'libranza_comfama', 'poliza_sura', 'optica', 'celular', 'retencion', 'total_deducciones'];
             const resultados = ['total_pagar', 'neto_pagar', 'verificacion'];

             const renderCategory = (title, keys, titleColor) => {
                 const columns = PLANILLA_COLUMNS.filter(col => keys.includes(col.key));
                 if (columns.length === 0) return null;
                 return (
                     <div key={title} className="bg-slate-50/30 rounded-2xl p-6 border border-slate-200">
                         <h4 className={`text-xs font-black uppercase tracking-widest ${titleColor} mb-4 flex items-center gap-2`}>
                             {title}
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             {columns.map(renderCard)}
                         </div>
                     </div>
                 );
             };

             return (
                 <>
                     {renderCategory("Devengos Básicos", devengosBasicos, "text-indigo-500")}
                     {renderCategory("Liquidación de Novedades", novedadesFinancieras, "text-cyan-500")}
                     {renderCategory("Trabajo Suplementario", suplementario, "text-emerald-500")}
                     {renderCategory("Deducciones y Retenciones", deducciones, "text-rose-500")}
                     {renderCategory("Liquidación Final", resultados, "text-amber-500")}
                 </>
             );
          })()}
        </div>
      </div>
    </div>
  </div>
)}

  <FormulaEditorModal
    isOpen={formulaConfig.isOpen}
    onClose={() => setFormulaConfig({ ...formulaConfig, isOpen: false })}
    campoId={formulaConfig.fieldId}
    currentFormula={formulaConfig.currentFormula}
    onSave={handleSaveFormula}
  />
  </>
);
}
