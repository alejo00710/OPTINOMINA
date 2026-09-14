import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/utils/supabase';
import { Calendar, Users, ArrowRight, Wallet, CheckCircle2, X, Loader2 } from 'lucide-react';
import ColillaPDF from '@/components/Contabilidad/ColillaPDF';

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFViewer), { ssr: false });

export default function TabPanelHistorico() {
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadingPDFId, setLoadingPDFId] = useState(null);
  const [empleadosPDF, setEmpleadosPDF] = useState([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedQuincena, setSelectedQuincena] = useState('');

  useEffect(() => {
    fetchNominas();
  }, []);

  const fetchNominas = async () => {
    try {
      setLoading(true);
      // Explicitly excluding 'empleados_jsonb' for instant loading
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('id, identificador, fecha_inicio, fecha_fin, estado, total_devengado, total_neto_pagado, total_empleados, created_at')
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

  const handleOpenColillas = async (nomina) => {
    try {
      setLoadingPDFId(nomina.id);
      setSelectedQuincena(nomina.identificador);
      
      const { data, error } = await supabase
        .from('historico_nominas_v2')
        .select('empleados_jsonb')
        .eq('id', nomina.id)
        .single();
        
      if (error) throw error;
      
      setEmpleadosPDF(data.empleados_jsonb || []);
      setIsViewerOpen(true);
    } catch (err) {
      console.error('Error fetching empleados JSON:', err);
      alert('Error cargando los detalles de la nómina.');
    } finally {
      setLoadingPDFId(null);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '$ 0';
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
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Periodo</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Empleados</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">T. Devengado</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Total Neto</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-semibold animate-pulse">
                      Cargando registros históricos...
                    </td>
                  </tr>
                ) : nominas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500 font-medium">
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
                      <td className="p-5 text-right font-black text-emerald-600 text-lg">
                        {formatCurrency(nomina.total_neto_pagado)}
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleOpenColillas(nomina)}
                          disabled={loadingPDFId === nomina.id}
                          className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold transition-all text-xs inline-flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {loadingPDFId === nomina.id ? (
                            <><Loader2 size={14} className="animate-spin" /> Cargando...</>
                          ) : (
                            <>Sábana Consolidada <ArrowRight size={14} /></>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

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
               <ColillaPDF empleados={empleadosPDF} identificador={selectedQuincena} />
             </PDFViewer>
          </div>
        </div>
      )}
    </div>
  );
}
