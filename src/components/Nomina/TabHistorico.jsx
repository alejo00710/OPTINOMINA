"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function TabHistorico() {
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    async function fetchHistorial() {
      try {
        const { data, error } = await supabase
          .from('historial_nominas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistorial(data || []);
      } catch (err) {
        console.error("Error fetching historial:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistorial();
  }, []);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Histórico de Nóminas</h2>
        <p className="text-sm text-slate-500 mt-1">Auditoría y registro de quincenas cerradas.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : historial.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">No hay nóminas cerradas en el histórico.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-4 px-6">Fecha de Cierre</th>
                <th className="py-4 px-6">Identificador</th>
                <th className="py-4 px-6">Rango de Quincena</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 text-sm text-slate-600 font-medium">{formatDate(item.created_at)}</td>
                    <td className="py-3 px-6 text-sm text-slate-900 font-bold">{item.identificador || 'Nómina General'}</td>
                    <td className="py-3 px-6 text-sm text-slate-600">{item.rango_fechas || '-'}</td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => toggleRow(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        👁️ {expandedRows[item.id] ? 'Ocultar Detalle' : 'Ver Detalle'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows[item.id] && (
                    <tr>
                      <td colSpan="4" className="bg-slate-50 p-4 border-t border-slate-200">
                        <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs overflow-auto max-h-96 custom-scrollbar shadow-inner">
                          {JSON.stringify(item.payload_json, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
