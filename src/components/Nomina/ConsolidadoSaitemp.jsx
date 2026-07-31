import React, { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

export default function ConsolidadoSaitemp({ empleadosLiquidados }) {
  const [copied, setCopied] = useState(false);

  // Funciones de formateo seguro
  const formatHour = (val) => (val && Number(val) > 0) ? Number(val).toFixed(1) : '';
  const formatValue = (val) => (val && Number(val) > 0) ? Math.round(Number(val)) : '';
  const formatNovedad = (val) => (val && Number(val) > 0) ? Number(val) : '';

  // Generar datos formateados para renderizar y para copiar al portapapeles
  const tableData = empleadosLiquidados.map(emp => {
    const deduccionesSaitemp = 
      (Number(emp.prestamos) || 0) + 
      (Number(emp.poliza_bolivar) || 0) + 
      (Number(emp.poliza_plenitud) || 0) + 
      (Number(emp.libranza_comfama) || 0) + 
      (Number(emp.poliza_sura) || 0) + 
      (Number(emp.optica) || 0) + 
      (Number(emp.celular) || 0);

    const obsArray = [];
    if (Number(emp.prestamos) > 0) obsArray.push("Abono a Préstamo");
    if (Number(emp.poliza_bolivar) > 0) obsArray.push("Póliza Bolívar");
    if (Number(emp.poliza_plenitud) > 0) obsArray.push("Póliza Plenitud");
    if (Number(emp.libranza_comfama) > 0) obsArray.push("Libranza Comfama");
    if (Number(emp.poliza_sura) > 0) obsArray.push("Póliza Sura");
    if (Number(emp.optica) > 0) obsArray.push("Óptica");
    if (Number(emp.celular) > 0) obsArray.push("Celular");

    return {
      cedula: emp.cedula || '',
      nombre: emp.nombre || '',
      diasNovedad: formatNovedad(emp.dias_incapacidad),
      recargoNocturno: formatHour(emp.horas_nocturnas),
      extrasDiurnas: formatHour(emp.extras_diurnas),
      extrasNocturnas: formatHour(emp.extras_nocturnas),
      extrasFestivas: formatHour(emp.extras_festivas),
      rodamiento: formatValue(emp.rodamiento),
      deducciones: formatValue(deduccionesSaitemp),
      observaciones: obsArray.join(", ")
    };
  });

  const handleCopyTSV = async () => {
    // Encabezados exactos para SAITEMP
    const headers = [
      "Identificación", "Nombres", "Días Novedad", 
      "Recargo Nocturno", "Extras Diurnas", "Extras Nocturnas", 
      "Extras Festivas", "Auxilio de Rodamiento", "Deducciones", "Observaciones"
    ];
    
    // Crear string separado por tabuladores (\t) para que pegue perfecto en Excel
    let tsvString = headers.join('\t') + '\n';
    
    tableData.forEach(row => {
      tsvString += [
        row.cedula,
        row.nombre,
        row.diasNovedad,
        row.recargoNocturno,
        row.extrasDiurnas,
        row.extrasNocturnas,
        row.extrasFestivas,
        row.rodamiento,
        row.deducciones,
        row.observaciones
      ].join('\t') + '\n';
    });

    try {
      await navigator.clipboard.writeText(tsvString);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar: ', err);
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = tsvString;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8 animate-stitch">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            📋 Reporte Consolidado SAITEMP
          </h3>
          <p className="text-amber-100 text-sm font-semibold mt-1">
            Resumen global de horas, extras y novedades para exportar a la temporal
          </p>
        </div>
        <button 
          onClick={handleCopyTSV}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 ${copied ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-amber-700 hover:bg-slate-50'}`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={18} /> ¡Copiado Exitosamente!
            </>
          ) : (
            <>
              <Copy size={18} /> Copiar formato para Excel
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Identificación</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[200px]">Nombres</th>
              <th className="px-4 py-3 text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">Días Nov.</th>
              <th className="px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">Rec. Noct.</th>
              <th className="px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Ext. Diur.</th>
              <th className="px-4 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Ext. Noct.</th>
              <th className="px-4 py-3 text-[10px] font-black text-purple-600 uppercase tracking-widest text-center">Ext. Fest.</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Rodamiento</th>
              <th className="px-4 py-3 text-[10px] font-black text-rose-600 uppercase tracking-widest text-right">Deducciones</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[250px]">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tableData.length > 0 ? (
              tableData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-slate-700 whitespace-nowrap">{row.cedula}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.nombre}</td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-600 text-center">{row.diasNovedad}</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-600 text-center">{row.recargoNocturno}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600 text-center">{row.extrasDiurnas}</td>
                  <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-center">{row.extrasNocturnas}</td>
                  <td className="px-4 py-3 text-sm font-bold text-purple-600 text-center">{row.extrasFestivas}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-600 text-right">{row.rodamiento ? `$${row.rodamiento.toLocaleString()}` : ''}</td>
                  <td className="px-4 py-3 text-sm font-bold text-rose-600 text-right">{row.deducciones ? `$${row.deducciones.toLocaleString()}` : ''}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500 leading-tight">{row.observaciones}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center text-slate-500 text-sm font-semibold">
                  No hay empleados procesados para el consolidado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
