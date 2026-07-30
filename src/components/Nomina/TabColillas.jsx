import React, { useState, useEffect } from 'react';
import ColillaImprimible from './ColillaImprimible';

export default function TabColillas({
  nominaRows,
  payrollData,
  fmtCOP,
  startDate,
  endDate
}) {
  const [selectedWorkerName, setSelectedWorkerName] = useState("");
  const [detallePeriodo, setDetallePeriodo] = useState("NÓMINA 2026-06-07 / 2026-06-21");

  // Ensure default selection when data changes
  useEffect(() => {
    if (nominaRows.length > 0 && !nominaRows.find(r => r.nombre === selectedWorkerName)) {
      setSelectedWorkerName(nominaRows[0].nombre);
    }
  }, [nominaRows, selectedWorkerName]);

  const selectedWorkerData = payrollData.find(d => d.masterRow && d.masterRow.nombre === selectedWorkerName) || payrollData.find(d => d.nombre === selectedWorkerName) || null;

  return (
    <div className="space-y-6 animate-stitch">
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-xl">
            🖨️
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Desprendibles de Pago (Colillas)</h4>
            <p className="text-slate-500 text-xs font-semibold">Generación de desprendibles listos para imprimir o exportar digitalmente.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Detalle del Periodo:</span>
            <input 
              type="text"
              value={detallePeriodo}
              onChange={(e) => setDetallePeriodo(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none w-56 uppercase"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Seleccionar Operario:</span>
            <select
              value={selectedWorkerName}
              onChange={(e) => setSelectedWorkerName(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              {nominaRows.map(member => (
                <option key={member.nombre} value={member.nombre}>
                  {member.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end h-full">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 h-[38px] mt-auto"
            >
              Imprimir Colilla
            </button>
          </div>
        </div>
      </section>

      {/* Colilla Form */}
      {selectedWorkerData && (
        <div className="w-full mx-auto bg-white p-0 md:p-6 print:p-0">
          <ColillaImprimible 
             empleado={selectedWorkerData} 
             periodo={detallePeriodo} 
          />
        </div>
      )}
    </div>
  );
}
