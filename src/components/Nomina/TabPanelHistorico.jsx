import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/utils/supabase';
import { Calendar, Users, ArrowRight, Wallet, CheckCircle2, X, Loader2, Eye, Download, Search, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import ColillaPDF from '@/components/Contabilidad/ColillaPDF';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFViewer), { ssr: false });

export default function TabPanelHistorico() {
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);

  // PDF Viewer states
  const [loadingPDFId, setLoadingPDFId] = useState(null);
  const [empleadosPDF, setEmpleadosPDF] = useState([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedQuincena, setSelectedQuincena] = useState('');
  const [tipoConsolidado, setTipoConsolidado] = useState('');

  // Interactive Breakdown Modal states
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [breakdownEmployees, setBreakdownEmployees] = useState([]);
  const [loadingBreakdownId, setLoadingBreakdownId] = useState(null);
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [breakdownCompanyFilter, setBreakdownCompanyFilter] = useState('ALL');

  useEffect(() => {
    fetchNominas();

    const channel = supabase
      .channel('public:historico_nominas_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_nominas_v2' }, () => {
        fetchNominas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNominas = async () => {
    try {
      setLoading(true);
      // Explicitly excluding 'empleados_jsonb' for instant loading
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('id, identificador, fecha_inicio, fecha_fin, estado, total_devengado, total_deducido, total_neto_pagado, total_empleados, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching nominas:', error);
      } else {
        setNominas(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isTemporal = (emp) => {
    const tipo = String((emp.masterRow && emp.masterRow.tipo_vinculacion) || emp.tipo_vinculacion || '').toLowerCase();
    const empresa = String((emp.masterRow && emp.masterRow.empresa) || emp.empresa || '').toLowerCase();
    return tipo.includes('temporal') || tipo.includes('misión') || tipo.includes('mision') || empresa.includes('saitemp');
  };

  const handleOpenColillas = async (nomina, tipo) => {
    try {
      setLoadingPDFId(nomina.id);
      
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('empleados_jsonb')
        .eq('id', nomina.id)
        .single();
        
      if (error) throw error;
      
      const empleadosRaw = data.empleados_jsonb || [];
      let procesados = [];
      
      if (tipo === 'Optimoldes') {
         procesados = empleadosRaw.filter(emp => !isTemporal(emp));
         setSelectedQuincena(nomina.identificador);
         setTipoConsolidado('CONSOLIDADO OPTIMOLDES');
      } else {
         procesados = empleadosRaw.filter(emp => isTemporal(emp));
         setSelectedQuincena(nomina.identificador);
         setTipoConsolidado('CONSOLIDADO SAITEMP');
      }

      procesados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      
      setEmpleadosPDF(procesados);
      setIsViewerOpen(true);
    } catch (err) {
      console.error('Error fetching empleados JSON:', err);
      alert('Error cargando los detalles de la nómina.');
    } finally {
      setLoadingPDFId(null);
    }
  };

  const handleOpenBreakdown = async (nomina) => {
    try {
      setLoadingBreakdownId(nomina.id);
      setSelectedNomina(nomina);
      
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('empleados_jsonb')
        .eq('id', nomina.id)
        .single();
        
      if (error) throw error;
      
      const empleadosRaw = data.empleados_jsonb || [];
      const procesados = [...empleadosRaw].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setBreakdownEmployees(procesados);
      setBreakdownSearch('');
      setBreakdownCompanyFilter('ALL');
      setIsBreakdownOpen(true);
    } catch (err) {
      console.error('Error fetching breakdown:', err);
      alert('Error cargando el desglose de la nómina.');
    } finally {
      setLoadingBreakdownId(null);
    }
  };

  const filteredBreakdownEmployees = useMemo(() => {
    return breakdownEmployees.filter(emp => {
      const q = breakdownSearch.toLowerCase().trim();
      const matchSearch = !q || (emp.nombre || '').toLowerCase().includes(q) || String(emp.cedula || '').includes(q);
      
      if (!matchSearch) return false;
      
      if (breakdownCompanyFilter === 'OPTIMOLDES') {
        return !isTemporal(emp);
      }
      if (breakdownCompanyFilter === 'SAITEMP') {
        return isTemporal(emp);
      }
      return true;
    });
  }, [breakdownEmployees, breakdownSearch, breakdownCompanyFilter]);

  const breakdownTotals = useMemo(() => {
    const t = {
      salario_base: 0,
      total_devengado: 0,
      salud: 0,
      pension: 0,
      solidaridad: 0,
      prestamos: 0,
      poliza_bolivar: 0,
      poliza_plenitud: 0,
      comfama: 0,
      poliza_sura: 0,
      optica: 0,
      celular: 0,
      retencion: 0,
      otros_descuentos: 0,
      total_deducciones: 0,
      neto_pagar: 0
    };

    filteredBreakdownEmployees.forEach(emp => {
      t.salario_base += Number(emp.salario || emp.salario_base || 0);
      t.total_devengado += Number(emp.total_devengados || emp.total_devengado || 0);
      t.salud += Number(emp.salud || 0);
      t.pension += Number(emp.pension || 0);
      t.solidaridad += Number(emp.solidaridad || 0);
      t.prestamos += Number(emp.prestamos || 0);
      t.poliza_bolivar += Number(emp.poliza_bolivar || 0);
      t.poliza_plenitud += Number(emp.poliza_plenitud || 0);
      t.comfama += Number(emp.comfama || emp.libranza_comfama || 0);
      t.poliza_sura += Number(emp.poliza_sura || 0);
      t.optica += Number(emp.optica || 0);
      t.celular += Number(emp.celular || 0);
      t.retencion += Number(emp.retencion || 0);
      t.otros_descuentos += Number(emp.otros_descuentos || 0);
      t.total_deducciones += Number(emp.total_deducciones || emp.total_deducido || 0);
      t.neto_pagar += Number(emp.neto_pagar || 0);
    });

    return t;
  }, [filteredBreakdownEmployees]);

  const handleExportBreakdownToExcel = async () => {
    try {
      if (!filteredBreakdownEmployees || filteredBreakdownEmployees.length === 0) {
        alert("No hay registros para exportar.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Desglose Histórico");

      ws.columns = [
        { header: 'Cédula', key: 'cedula', width: 16 },
        { header: 'Nombre', key: 'nombre', width: 32 },
        { header: 'Cargo', key: 'cargo', width: 26 },
        { header: 'Tipo Vinculación', key: 'vinculacion', width: 20 },
        { header: 'Salario Base', key: 'salario_base', width: 18 },
        { header: 'Días Pagados', key: 'dias_pagados', width: 14 },
        { header: 'Total Devengado', key: 'devengado', width: 20 },
        { header: 'Salud', key: 'salud', width: 15 },
        { header: 'Pensión', key: 'pension', width: 15 },
        { header: 'Solidaridad', key: 'solidaridad', width: 15 },
        { header: 'Préstamos', key: 'prestamos', width: 15 },
        { header: 'Póliza Bolívar', key: 'poliza_bolivar', width: 15 },
        { header: 'Póliza Plenitud', key: 'poliza_plenitud', width: 16 },
        { header: 'Comfama', key: 'comfama', width: 15 },
        { header: 'Póliza Sura', key: 'poliza_sura', width: 15 },
        { header: 'Óptica', key: 'optica', width: 15 },
        { header: 'Celular', key: 'celular', width: 15 },
        { header: 'Retención', key: 'retencion', width: 15 },
        { header: 'Otros Descuentos', key: 'otros_descuentos', width: 18 },
        { header: 'Motivo Otros', key: 'motivo_otros', width: 28 },
        { header: 'Total Deducido', key: 'deducido', width: 20 },
        { header: 'Neto a Pagar', key: 'neto', width: 20 }
      ];

      filteredBreakdownEmployees.forEach(emp => {
        ws.addRow({
          cedula: emp.cedula,
          nombre: emp.nombre,
          cargo: emp.cargo || '',
          vinculacion: (emp.masterRow && emp.masterRow.tipo_vinculacion) || emp.tipo_vinculacion || '',
          salario_base: Number(emp.salario || emp.salario_base || 0),
          dias_pagados: Number(emp.dias_pagados || 0),
          devengado: Number(emp.total_devengados || emp.total_devengado || 0),
          salud: Number(emp.salud || 0),
          pension: Number(emp.pension || 0),
          solidaridad: Number(emp.solidaridad || 0),
          prestamos: Number(emp.prestamos || 0),
          poliza_bolivar: Number(emp.poliza_bolivar || 0),
          poliza_plenitud: Number(emp.poliza_plenitud || 0),
          comfama: Number(emp.comfama || emp.libranza_comfama || 0),
          poliza_sura: Number(emp.poliza_sura || 0),
          optica: Number(emp.optica || 0),
          celular: Number(emp.celular || 0),
          retencion: Number(emp.retencion || 0),
          otros_descuentos: Number(emp.otros_descuentos || 0),
          motivo_otros: emp.motivo_otros || '',
          deducido: Number(emp.total_deducciones || emp.total_deducido || 0),
          neto: Number(emp.neto_pagar || 0)
        });
      });

      // Total row
      ws.addRow({
        cedula: '',
        nombre: 'TOTALES',
        cargo: '',
        vinculacion: '',
        salario_base: breakdownTotals.salario_base,
        dias_pagados: '',
        devengado: breakdownTotals.total_devengado,
        salud: breakdownTotals.salud,
        pension: breakdownTotals.pension,
        solidaridad: breakdownTotals.solidaridad,
        prestamos: breakdownTotals.prestamos,
        poliza_bolivar: breakdownTotals.poliza_bolivar,
        poliza_plenitud: breakdownTotals.poliza_plenitud,
        comfama: breakdownTotals.comfama,
        poliza_sura: breakdownTotals.poliza_sura,
        optica: breakdownTotals.optica,
        celular: breakdownTotals.celular,
        retencion: breakdownTotals.retencion,
        otros_descuentos: breakdownTotals.otros_descuentos,
        motivo_otros: '',
        deducido: breakdownTotals.total_deducciones,
        neto: breakdownTotals.neto_pagar
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Desglose_Nomina_${selectedNomina?.identificador?.replace(/[\s/\\:]/g, '_') || 'Historico'}.xlsx`);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '$ 0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full animate-stitch">
      <div className="space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-600" size={32} />
              Contabilidad y Cierre
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Histórico inmutable de nóminas liquidadas y cerradas con desglose detallado de deducciones.
            </p>
          </div>
        </header>

        {/* Table */}
        <div className="bg-white border border-slate-200/60 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Identificador</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Periodo</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Empleados</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">T. Devengado</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">T. Deducido</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Total Neto</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-400 font-semibold animate-pulse">
                      Cargando registros históricos...
                    </td>
                  </tr>
                ) : nominas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 font-medium">
                      No hay nóminas cerradas en el histórico.
                    </td>
                  </tr>
                ) : (
                  nominas.map((nomina) => (
                    <tr key={nomina.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="text-emerald-600" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{nomina.identificador}</p>
                            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full tracking-widest">
                              {nomina.estado || 'CERRADA'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{formatDate(nomina.fecha_inicio)} - {formatDate(nomina.fecha_fin)}</span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <Users size={16} className="text-indigo-400" />
                          {nomina.total_empleados}
                        </div>
                      </td>
                      <td className="p-5 text-right font-semibold text-slate-600">
                        {formatCurrency(nomina.total_devengado)}
                      </td>
                      <td className="p-5 text-right font-semibold text-rose-600">
                        {formatCurrency(nomina.total_deducido)}
                      </td>
                      <td className="p-5 text-right font-black text-emerald-600 text-lg">
                        {formatCurrency(nomina.total_neto_pagado)}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex flex-col gap-2 items-center min-w-[190px]">
                          <button
                            onClick={() => handleOpenBreakdown(nomina)}
                            disabled={loadingBreakdownId === nomina.id}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] inline-flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 w-full justify-center"
                          >
                            {loadingBreakdownId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <><Eye size={13} className="text-emerald-400" /> Ver Desglose / Planilla</>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenColillas(nomina, 'Optimoldes')}
                            disabled={loadingPDFId === nomina.id}
                            className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl font-bold transition-all text-[10px] inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 w-full justify-center"
                          >
                            {loadingPDFId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <>PDF Optimoldes <ArrowRight size={11} /></>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenColillas(nomina, 'Saitemp')}
                            disabled={loadingPDFId === nomina.id}
                            className="bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-amber-600 px-3 py-1 rounded-xl font-bold transition-all text-[10px] inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 w-full justify-center"
                          >
                            {loadingPDFId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <>PDF Saitemp <ArrowRight size={11} /></>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Desglose Interactivo de Nómina y Deducciones */}
      {isBreakdownOpen && selectedNomina && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-stitch">
          <div className="bg-white rounded-3xl shadow-2xl flex flex-col w-full h-full max-h-[94vh] max-w-[98vw] overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-lg border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    Auditoría Inmutable
                  </span>
                  <span className="text-slate-400 text-xs">
                    {formatDate(selectedNomina.fecha_inicio)} al {formatDate(selectedNomina.fecha_fin)}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-400" size={24} />
                  {selectedNomina.identificador}
                </h2>
              </div>

              {/* KPI Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-1.5 text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Total Devengado</span>
                  <span className="text-sm font-bold text-slate-200">{formatCurrency(breakdownTotals.total_devengado)}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-1.5 text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-rose-400">Total Deducciones</span>
                  <span className="text-sm font-bold text-rose-300">{formatCurrency(breakdownTotals.total_deducciones)}</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-1.5 text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-400">Total Neto</span>
                  <span className="text-sm font-black text-emerald-300 text-base">{formatCurrency(breakdownTotals.neto_pagar)}</span>
                </div>
                <button
                  onClick={() => setIsBreakdownOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-2"
                  title="Cerrar ventana"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={breakdownSearch}
                    onChange={(e) => setBreakdownSearch(e.target.value)}
                    placeholder="Buscar por colaborador o cédula..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    onClick={() => setBreakdownCompanyFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all ${breakdownCompanyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Todos ({breakdownEmployees.length})
                  </button>
                  <button
                    onClick={() => setBreakdownCompanyFilter('OPTIMOLDES')}
                    className={`px-3 py-1 rounded-lg transition-all ${breakdownCompanyFilter === 'OPTIMOLDES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Optimoldes ({breakdownEmployees.filter(e => !isTemporal(e)).length})
                  </button>
                  <button
                    onClick={() => setBreakdownCompanyFilter('SAITEMP')}
                    className={`px-3 py-1 rounded-lg transition-all ${breakdownCompanyFilter === 'SAITEMP' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Saitemp ({breakdownEmployees.filter(e => isTemporal(e)).length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-slate-500 hidden md:inline">
                  Mostrando {filteredBreakdownEmployees.length} registros
                </span>
                <button
                  onClick={handleExportBreakdownToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <Download size={14} /> Descargar Sábana Excel
                </button>
              </div>
            </div>

            {/* Interactive Scrollable Table with Fixed Header and Footers */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider font-extrabold sticky top-0 z-10 shadow-sm text-[10px]">
                    <th className="p-3 sticky left-0 bg-slate-900 z-20 shadow-r">Cédula</th>
                    <th className="p-3 sticky left-[90px] bg-slate-900 z-20 min-w-[200px]">Colaborador</th>
                    <th className="p-3 text-right">Salario Base</th>
                    <th className="p-3 text-center">Días</th>
                    <th className="p-3 text-right font-black text-emerald-300">T. Devengado</th>
                    <th className="p-3 text-right">Salud (4%)</th>
                    <th className="p-3 text-right">Pensión (4%)</th>
                    <th className="p-3 text-right">FSP</th>
                    <th className="p-3 text-right">Préstamos</th>
                    <th className="p-3 text-right">P. Bolívar</th>
                    {/* Campos de deducción nuevos destacados */}
                    <th className="p-3 text-right bg-amber-950/80 text-amber-300 border-x border-amber-800">P. Plenitud</th>
                    <th className="p-3 text-right bg-amber-950/80 text-amber-300 border-x border-amber-800">Comfama</th>
                    <th className="p-3 text-right">P. Sura</th>
                    <th className="p-3 text-right">Óptica</th>
                    <th className="p-3 text-right bg-amber-950/80 text-amber-300 border-x border-amber-800">Celular</th>
                    <th className="p-3 text-right bg-amber-950/80 text-amber-300 border-x border-amber-800">Retención</th>
                    <th className="p-3 text-right bg-amber-950/80 text-amber-300 border-x border-amber-800 min-w-[140px]">Otros Deduc.</th>
                    <th className="p-3 text-right font-black text-rose-300">T. Deducido</th>
                    <th className="p-3 text-right font-black text-emerald-400 bg-slate-950">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBreakdownEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="19" className="p-12 text-center text-slate-400 font-bold">
                        No se encontraron colaboradores con el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredBreakdownEmployees.map((emp, idx) => {
                      const plenitud = Number(emp.poliza_plenitud || 0);
                      const comfama = Number(emp.comfama || emp.libranza_comfama || 0);
                      const celular = Number(emp.celular || 0);
                      const retencion = Number(emp.retencion || 0);
                      const otros = Number(emp.otros_descuentos || 0);

                      return (
                        <tr key={emp.cedula || idx} className="hover:bg-amber-50/20 transition-colors font-medium">
                          <td className="p-3 sticky left-0 bg-white font-mono font-bold text-slate-700 shadow-r">
                            {emp.cedula}
                          </td>
                          <td className="p-3 sticky left-[90px] bg-white font-bold text-slate-900">
                            <div>{emp.nombre}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{emp.cargo || 'N/A'}</div>
                          </td>
                          <td className="p-3 text-right text-slate-600 font-semibold">
                            {formatCurrency(emp.salario || emp.salario_base)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {emp.dias_pagados || 0}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/40">
                            {formatCurrency(emp.total_devengados || emp.total_devengado)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.salud)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.pension)}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {formatCurrency(emp.solidaridad)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.prestamos)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.poliza_bolivar)}
                          </td>
                          {/* Nuevas deducciones destacadas */}
                          <td className={`p-3 text-right border-x border-slate-100 ${plenitud > 0 ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-400'}`}>
                            {formatCurrency(plenitud)}
                          </td>
                          <td className={`p-3 text-right border-x border-slate-100 ${comfama > 0 ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-400'}`}>
                            {formatCurrency(comfama)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.poliza_sura)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(emp.optica)}
                          </td>
                          <td className={`p-3 text-right border-x border-slate-100 ${celular > 0 ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-400'}`}>
                            {formatCurrency(celular)}
                          </td>
                          <td className={`p-3 text-right border-x border-slate-100 ${retencion > 0 ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-400'}`}>
                            {formatCurrency(retencion)}
                          </td>
                          <td className={`p-3 text-right border-x border-slate-100 ${otros > 0 ? 'bg-amber-100/60 font-black text-amber-900' : 'text-slate-400'}`}>
                            <div>{formatCurrency(otros)}</div>
                            {otros > 0 && emp.motivo_otros && (
                              <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-200/60 px-1 rounded mt-0.5 max-w-[120px] truncate" title={emp.motivo_otros}>
                                {emp.motivo_otros}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-rose-700 bg-rose-50/40">
                            {formatCurrency(emp.total_deducciones || emp.total_deducido)}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700 bg-emerald-100/50 text-sm">
                            {formatCurrency(emp.neto_pagar)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Fixed Footer with Column Totals */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs sticky bottom-0 z-10 shadow-t">
                    <td className="p-3 sticky left-0 bg-slate-900 z-20">TOTALES</td>
                    <td className="p-3 sticky left-[90px] bg-slate-900 z-20">{filteredBreakdownEmployees.length} Empleados</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.salario_base)}</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-right text-emerald-400 font-black">{formatCurrency(breakdownTotals.total_devengado)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.salud)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.pension)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.solidaridad)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.prestamos)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.poliza_bolivar)}</td>
                    <td className="p-3 text-right text-amber-300 bg-amber-950/80">{formatCurrency(breakdownTotals.poliza_plenitud)}</td>
                    <td className="p-3 text-right text-amber-300 bg-amber-950/80">{formatCurrency(breakdownTotals.comfama)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.poliza_sura)}</td>
                    <td className="p-3 text-right">{formatCurrency(breakdownTotals.optica)}</td>
                    <td className="p-3 text-right text-amber-300 bg-amber-950/80">{formatCurrency(breakdownTotals.celular)}</td>
                    <td className="p-3 text-right text-amber-300 bg-amber-950/80">{formatCurrency(breakdownTotals.retencion)}</td>
                    <td className="p-3 text-right text-amber-300 bg-amber-950/80">{formatCurrency(breakdownTotals.otros_descuentos)}</td>
                    <td className="p-3 text-right text-rose-300 font-black">{formatCurrency(breakdownTotals.total_deducciones)}</td>
                    <td className="p-3 text-right text-emerald-300 font-black bg-slate-950 text-sm">{formatCurrency(breakdownTotals.neto_pagar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* Modal Visor PDF */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/95 backdrop-blur-sm animate-stitch">
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 shrink-0 bg-slate-900 shadow-xl">
            <div>
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <Wallet className="text-emerald-500" size={24} /> 
                Sábana Consolidada Contable
              </h2>
              <p className="text-slate-400 text-sm mt-1">{selectedQuincena} — {empleadosPDF.length} empleados</p>
            </div>
            <button 
              onClick={() => setIsViewerOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-800 relative h-[85vh]">
             <PDFViewer width="100%" height="100%" className="border-none" style={{ height: '85vh', width: '100%' }}>
               <ColillaPDF empleados={empleadosPDF} tituloReporte={tipoConsolidado} identificador={selectedQuincena} />
             </PDFViewer>
          </div>
        </div>
      )}
    </div>
  );
}

