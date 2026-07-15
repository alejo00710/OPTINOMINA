import React, { useState } from 'react';
import EditableCell from '@/components/Nomina/EditableCell';
import { PLANILLA_COLUMNS } from '@/utils/constants';

export default function TabPanelGeneral({
  nominaRows,
  setNominaRows,
  filteredPayrollData,
  hiddenColumns,
  handleLiquidar,
  handleDetalles,
  handleCellEdit,
  handleClearAll,
  overrides,
  fmtCOP
}) {
  const [vinculacionFiltro, setVinculacionFiltro] = useState('Empresa');

  const COLUMNAS_ESENCIALES = ['salario', 'total_devengados', 'total_deducciones', 'neto_pagar'];
  const COLUMNAS_FIJAS = ['consecutivo', 'cedula', 'nombre', 'cargo'];
  const hasUserConfiguredVisibility = Object.keys(hiddenColumns).length > 0;
  
  const visibleColumns = PLANILLA_COLUMNS.filter(c => {
    if (COLUMNAS_FIJAS.includes(c.key)) return false;
    if (hasUserConfiguredVisibility) return !hiddenColumns[c.key];
    return COLUMNAS_ESENCIALES.includes(c.key);
  });

  const displayData = filteredPayrollData.filter(row => {
    const tipo = (row.masterRow && row.masterRow.tipo_vinculacion) || 'Empresa';
    return tipo === vinculacionFiltro;
  });

  return (
    <section className="bg-white/70 backdrop-blur-md border border-white/40 shadow-xl overflow-hidden rounded-3xl animate-stitch">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
         <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Planilla General de Nómina</h4>
            <p className="text-xs font-bold text-slate-500 mt-1">Selecciona un operario para liquidar o edita sus valores</p>
         </div>
         
         <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
           <button
             onClick={() => setVinculacionFiltro('Empresa')}
             className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${vinculacionFiltro === 'Empresa' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             🏢 Planta / Empresa
           </button>
           <button
             onClick={() => setVinculacionFiltro('Temporal')}
             className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${vinculacionFiltro === 'Temporal' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             ⏱️ Temporal
           </button>
         </div>

         <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 transition-all active:scale-95 flex items-center gap-2"
         >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Limpiar Quincena
         </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto custom-scrollbar">
         <table className="w-full text-left table-auto">
            <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-20">
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[110px] min-w-[110px]">Cédula</th>
                <th className="px-4 py-3 sticky left-[110px] bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0]">Nombre Completo</th>
                <th className="px-4 py-3">Cargo</th>
                
                {/* Render dynamic columns from PLANILLA_COLUMNS based on visibility */}
                {visibleColumns.map(col => (
                   <th key={col.key} className="px-4 py-3 text-right whitespace-nowrap">{col.label}</th>
                ))}
                
                <th className="px-4 py-3 text-center sticky right-0 bg-slate-50 z-30 shadow-[-1px_0_0_0_#e2e8f0]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold">
               {displayData.map((row) => (
                 <tr key={row.consecutivo} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0] w-[110px] min-w-[110px]">{row.cedula}</td>
                    <td className="px-4 py-4 text-slate-900 font-bold sticky left-[110px] bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0] whitespace-nowrap">{row.nombre}</td>
                    <td className="px-4 py-4 text-slate-500 capitalize whitespace-nowrap">{(row.cargo || "").toLowerCase()}</td>
                    
                    {visibleColumns.map(col => {
                       const cKey = `${row.cedula}_${col.key}`;
                       // Prioritize override, then calculated payroll value, then default
                       let val = overrides[cKey] !== undefined ? overrides[cKey] : (row[col.key] !== undefined ? row[col.key] : "");
                       if (col.isCurrency && val !== "" && !isNaN(val)) val = Math.round(Number(val));
                       
                       return (
                          <td key={col.key} className="px-2 py-2 min-w-[120px]">
                             <EditableCell
                                value={val}
                                onChange={(newVal) => handleCellEdit(cKey, newVal)}
                                isOverridden={overrides[cKey] !== undefined}
                                isCalculated={col.isCalculated}
                                isCurrency={col.isCurrency}
                                isDecimal={col.isDecimal}
                             />
                          </td>
                       )
                    })}

                    <td className="px-4 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-1px_0_0_0_#e2e8f0]">
                       <div className="flex justify-center gap-2">
                          <button 
                             onClick={() => handleDetalles(row.nombre)}
                             className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                          >
                             Detalles
                          </button>
                          <button 
                             onClick={() => handleLiquidar(row.nombre)}
                             className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                          >
                             Liquidar
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
               
               {displayData.length === 0 && (
                 <tr>
                    <td colSpan={100} className="px-6 py-12 text-center text-slate-400 font-bold">
                       No se encontraron operarios.
                    </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>
    </section>
  );
}
