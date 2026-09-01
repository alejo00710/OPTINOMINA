'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function HistoricoNomina() {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [detalles, setDetalles] = useState([]);
  const [diasDiarios, setDiasDiarios] = useState([]); // NUEVO ESTADO: Datos diarios
  const [expandedCedula, setExpandedCedula] = useState(null); // NUEVO ESTADO: Acordeón
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingDetalles, setIsFetchingDetalles] = useState(false);

  // Cargar lista de periodos al montar
  useEffect(() => {
    async function fetchPeriodos() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('periodos_nomina')
          .select('*')
          .order('fecha_inicio', { ascending: false });

        if (error) throw error;
        setPeriodos(data || []);
        if (data && data.length > 0) {
          setSelectedPeriodo(data[0].id);
        }
      } catch (error) {
        console.error('Error cargando periodos:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPeriodos();
  }, []);

  // Cargar detalles cuando cambia el periodo seleccionado
  useEffect(() => {
    async function fetchDetalles() {
      if (!selectedPeriodo) return;
      setIsFetchingDetalles(true);
      setExpandedCedula(null); // Resetear expansión al cambiar periodo
      try {
        // 1. Cargar detalles del periodo (Tabla nomina_detalle)
        const { data: detallesData, error: detallesError } = await supabase
          .from('nomina_detalle')
          .select('*')
          .eq('periodo_id', selectedPeriodo);

        if (detallesError) throw detallesError;

        // NUEVO: Cargar liquidacion_diaria
        const { data: diariosData, error: diariosError } = await supabase
          .from('liquidacion_diaria')
          .select('*')
          .eq('periodo_id', selectedPeriodo)
          .order('fecha', { ascending: true });

        if (diariosError) throw diariosError;
        setDiasDiarios(diariosData || []);

        // 2. Extraer cédulas únicas
        const cedulas = [...new Set(detallesData.map(d => d.empleado_cedula))];

        // 3. Cargar empleados para esas cédulas
        const { data: empData, error: empError } = await supabase
          .from('optimoldes_employees')
          .select('cedula, nombre, cargo')
          .in('cedula', cedulas);

        if (empError) throw empError;

        // 4. Crear mapa de empleados para acceso rápido { [cedula]: { nombre, cargo } }
        const empMap = {};
        if (empData) {
          empData.forEach(emp => {
            empMap[emp.cedula] = emp;
          });
        }

        // 5. Cruzar datos (Join manual en JS por si no hay FK estricta)
        const combinedData = detallesData.map(d => ({
          ...d,
          nombre: empMap[d.empleado_cedula]?.nombre || 'Desconocido',
          cargo: empMap[d.empleado_cedula]?.cargo || 'Sin cargo',
        }));

        // Ordenar alfabéticamente por nombre
        combinedData.sort((a, b) => a.nombre.localeCompare(b.nombre));

        setDetalles(combinedData);
      } catch (error) {
        console.error('Error cargando detalles de nómina:', error);
      } finally {
        setIsFetchingDetalles(false);
      }
    }
    
    fetchDetalles();
  }, [selectedPeriodo]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const toggleRow = (cedula) => {
    setExpandedCedula(prev => prev === cedula ? null : cedula);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Histórico de Nómina</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Consulta los periodos liquidados y cerrados.</p>
        </div>
        
        <div className="flex-shrink-0">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
            Seleccionar Periodo
          </label>
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            disabled={isLoading || periodos.length === 0}
            className="w-full md:w-64 bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
          >
            {periodos.length === 0 && <option value="">No hay periodos cerrados</option>}
            {periodos.map(p => (
              <option key={p.id} value={p.id}>
                {p.identificador} ({p.fecha_inicio} al {p.fecha_fin})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading || isFetchingDetalles ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">
            <span className="text-2xl block mb-2">⏳</span>
            Cargando información del periodo...
          </div>
        ) : detalles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold">
            No hay registros detallados para este periodo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black tracking-widest text-slate-500">
                  <th className="px-6 py-4">Nombre del Empleado</th>
                  <th className="px-6 py-4">Cédula</th>
                  <th className="px-6 py-4 text-center">Días Pagados</th>
                  <th className="px-6 py-4 text-right">Total Devengado</th>
                  <th className="px-6 py-4 text-right">Total Deducido</th>
                  <th className="px-6 py-4 text-right text-emerald-700">Neto a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {detalles.map((row) => {
                  const isExpanded = expandedCedula === row.empleado_cedula;
                  const employeeDays = diasDiarios.filter(d => d.empleado_cedula === row.empleado_cedula);
                  
                  return (
                    <React.Fragment key={row.empleado_cedula}>
                      <tr 
                        onClick={() => toggleRow(row.empleado_cedula)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                            <div>
                              <div className="font-bold text-slate-800">{row.nombre}</div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{row.cargo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">{row.empleado_cedula}</td>
                        <td className="px-6 py-4 text-center">{row.dias_pagados}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.total_devengado)}</td>
                        <td className="px-6 py-4 text-right text-rose-600/80">{formatCurrency(row.total_deducido)}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(row.neto_a_pagar)}</td>
                      </tr>
                      
                      {/* FILA EXPANDIDA */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <td colSpan={6} className="p-0">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-t border-slate-200 shadow-inner">
                              
                              {/* COLUMNA A: Desglose Financiero */}
                              <div className="col-span-1 space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Desglose Financiero</h3>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                  
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Aux. Transporte</span>
                                    <span className="font-bold">{formatCurrency(row.aux_transporte)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Rodamiento</span>
                                    <span className="font-bold">{formatCurrency(row.rodamiento)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Recargo Nocturno</span>
                                    <span className="font-bold">{formatCurrency(row.recargo_nocturno)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Valor Extras Totales</span>
                                    <span className="font-bold">{formatCurrency(row.valor_horas_extras)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">Incapacidad</span>
                                    <span className="font-bold">{formatCurrency(row.incapacidad)}</span>
                                  </div>
                                  
                                  <hr className="border-slate-100 my-2" />
                                  
                                  <div className="flex justify-between text-[11px] text-rose-600">
                                    <span>Salud & Pensión</span>
                                    <span className="font-bold">{formatCurrency(Number(row.salud) + Number(row.pension))}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-rose-600">
                                    <span>Solidaridad</span>
                                    <span className="font-bold">{formatCurrency(row.fondo_solidaridad)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-rose-600">
                                    <span>Préstamo</span>
                                    <span className="font-bold">{formatCurrency(row.prestamo)}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-rose-600">
                                    <span>Pólizas (Bolívar, Sura, Óptica)</span>
                                    <span className="font-bold">{formatCurrency(Number(row.poliza_bolivar) + Number(row.poliza_sura) + Number(row.optica))}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-rose-600">
                                    <span>Libranza Comfama</span>
                                    <span className="font-bold">{formatCurrency(row.libranza_comfama)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* COLUMNA B: Desglose Diario */}
                              <div className="col-span-1 lg:col-span-2">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Registro Diario de Permanencia</h3>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] uppercase font-bold text-slate-500">
                                        <th className="px-3 py-2">Fecha</th>
                                        <th className="px-3 py-2">Estado</th>
                                        <th className="px-3 py-2 text-center">Entrada</th>
                                        <th className="px-3 py-2 text-center">Salida</th>
                                        <th className="px-3 py-2 text-center">Hrs Lab</th>
                                        <th className="px-3 py-2 text-center text-amber-600">Ext Diu</th>
                                        <th className="px-3 py-2 text-center text-indigo-600">Ext Noc</th>
                                        <th className="px-3 py-2 text-center text-rose-600">Ext Fes</th>
                                        <th className="px-3 py-2">Observación</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[10px]">
                                      {employeeDays.length === 0 ? (
                                        <tr><td colSpan={9} className="px-4 py-3 text-center text-slate-400">Sin registros diarios</td></tr>
                                      ) : (
                                        employeeDays.map((d, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-mono">{d.fecha}</td>
                                            <td className="px-3 py-2">
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                d.estado_marcacion === 'DESCANSO' ? 'bg-slate-100 text-slate-500' :
                                                d.estado_marcacion === 'NOVEDAD' ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
                                              }`}>
                                                {d.estado_marcacion}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono">{d.reloj_entrada || '-'}</td>
                                            <td className="px-3 py-2 text-center font-mono">{d.reloj_salida || '-'}</td>
                                            <td className="px-3 py-2 text-center font-bold">{d.horas_laboradas || '-'}</td>
                                            <td className="px-3 py-2 text-center text-amber-600">{d.extras_diurnas || '-'}</td>
                                            <td className="px-3 py-2 text-center text-indigo-600">{d.extras_nocturnas || '-'}</td>
                                            <td className="px-3 py-2 text-center text-rose-600">{d.extras_festivas || '-'}</td>
                                            <td className="px-3 py-2 text-slate-500 truncate max-w-[100px]" title={d.observacion}>{d.observacion || '-'}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
