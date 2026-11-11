import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/utils/supabase';
import { ArrowRight, Wallet, CheckCircle2, X, Loader2 } from 'lucide-react';
import ColillaPDF from '@/components/Contabilidad/ColillaPDF';

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
  
  // Modal de Detalle de Nómina en Pantalla
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailNomina, setDetailNomina] = useState(null);
  const [detailEmployees, setDetailEmployees] = useState([]);
  const [detailSearch, setDetailSearch] = useState('');
  const [loadingDetailId, setLoadingDetailId] = useState(null);

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

  const handleOpenDetail = async (nomina) => {
    try {
      setLoadingDetailId(nomina.id);
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('empleados_jsonb')
        .eq('id', nomina.id)
        .single();

      if (error) throw error;
      const empleadosRaw = data.empleados_jsonb || [];
      empleadosRaw.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setDetailEmployees(empleadosRaw);
      setDetailNomina(nomina);
      setDetailSearch('');
      setIsDetailOpen(true);
    } catch (err) {
      console.error('Error fetching detail JSON:', err);
      alert('Error cargando los detalles de la nómina.');
    } finally {
      setLoadingDetailId(null);
    }
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
              Histórico inmutable de nóminas liquidadas y cerradas.
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
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="2" className="p-12 text-center text-slate-400 font-semibold animate-pulse">
                      Cargando registros históricos...
                    </td>
                  </tr>
                ) : nominas.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="p-12 text-center text-slate-500 font-medium">
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetail(nomina)}
                            disabled={loadingDetailId === nomina.id}
                            className="bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {loadingDetailId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <>📋 Ver Detalle</>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenColillas(nomina, 'Optimoldes')}
                            disabled={loadingPDFId === nomina.id}
                            className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {loadingPDFId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <>PDF Optimoldes <ArrowRight size={12} /></>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenColillas(nomina, 'Saitemp')}
                            disabled={loadingPDFId === nomina.id}
                            className="bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {loadingPDFId === nomina.id ? (
                              <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                            ) : (
                              <>PDF Saitemp <ArrowRight size={12} /></>
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

      {/* Modal Detalle en Pantalla */}
      {isDetailOpen && detailNomina && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-stitch">
          <div className="bg-white w-full max-w-7xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Encabezado del Modal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
                    📋
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Detalle de Quincena Cerrada
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {detailNomina.identificador} — {detailEmployees.length} empleados registrados
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar empleado o cédula..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-sm"
                />
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors font-bold text-lg"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabla Detallada */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm z-10">
                    <th className="py-3 px-4">Empleado</th>
                    <th className="py-3 px-3 text-center">Días Pag.</th>
                    <th className="py-3 px-3 text-center text-emerald-700 bg-emerald-50/70">Hrs Diurnas</th>
                    <th className="py-3 px-3 text-center text-indigo-700">Hrs Nocturnas</th>
                    <th className="py-3 px-3 text-center text-amber-700">Ext. Diurnas</th>
                    <th className="py-3 px-3 text-center text-amber-800">Ext. Nocturnas</th>
                    <th className="py-3 px-3 text-center text-purple-700">Ext. Festivas</th>
                    <th className="py-3 px-4 text-center">Novedades / Alertas</th>
                    <th className="py-3 px-4 text-right">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {detailEmployees
                    .filter(emp => {
                      if (!detailSearch) return true;
                      const term = detailSearch.toLowerCase();
                      const name = (emp.nombre || emp.nombre_completo || '').toLowerCase();
                      const doc = String(emp.cedula || '').toLowerCase();
                      return name.includes(term) || doc.includes(term);
                    })
                    .map((emp, idx) => {
                      const hrsDiurnas = emp.horas_diurnas ?? emp.t_diurnas ?? emp.diurnas ?? 0;
                      const hrsNocturnas = emp.horas_nocturnas ?? emp.rn_hrs ?? 0;
                      const extDiu = emp.extras_diurnas ?? emp.hed_hrs ?? 0;
                      const extNoc = emp.extras_nocturnas ?? emp.hen_hrs ?? 0;
                      const extFes = emp.extras_festivas ?? emp.hef_hrs ?? 0;

                      return (
                        <tr key={emp.cedula || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{emp.nombre || emp.nombre_completo || 'Sin nombre'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.cedula} · {emp.cargo || 'Operario'}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">{emp.dias_pagados || 0}</td>
                          <td className="py-3 px-3 text-center font-black text-emerald-700 bg-emerald-50/40">
                            {Number(hrsDiurnas).toFixed(1)} hrs
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-indigo-700">
                            {Number(hrsNocturnas) > 0 ? `${Number(hrsNocturnas).toFixed(1)} hrs` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-amber-700">
                            {Number(extDiu) > 0 ? `${Number(extDiu).toFixed(1)} hrs` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-amber-800">
                            {Number(extNoc) > 0 ? `${Number(extNoc).toFixed(1)} hrs` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-purple-700">
                            {Number(extFes) > 0 ? `${Number(extFes).toFixed(1)} hrs` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {emp.mensaje_descuento_actual && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                  ✂️ {emp.mensaje_descuento_actual}
                                </span>
                              )}
                              {emp.mensaje_cobro_deuda && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  ℹ️ {emp.mensaje_cobro_deuda}
                                </span>
                              )}
                              {!emp.mensaje_descuento_actual && !emp.mensaje_cobro_deuda && (
                                <span className="text-[10px] text-slate-400 italic">Normal</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                            ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(emp.neto_pagar || 0)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
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
