import React from 'react';
import { Info, Printer } from 'lucide-react';

const fmtCOP = (num) => {
  return new Intl.NumberFormat('es-CO').format(num || 0);
};


const GridInput = ({ globalValue, fallback, onSave, className, decimals = 1 }) => {
  const [localVal, setLocalVal] = React.useState(() => {
    if (globalValue !== undefined && globalValue !== "") return globalValue.toString();
    if (globalValue === "") return "";
    return Number(fallback).toFixed(decimals);
  });

  React.useEffect(() => {
    if (globalValue !== undefined) {
      setLocalVal(globalValue.toString());
    } else {
      setLocalVal(globalValue === "" ? "" : Number(fallback).toFixed(decimals));
    }
  }, [globalValue, fallback, decimals]);

  const handleBlur = () => {
    let cleanVal = localVal.toString().replace(',', '.');
    if (cleanVal === "") {
      onSave("");
    } else if (!isNaN(parseFloat(cleanVal))) {
      const finalNum = parseFloat(cleanVal).toString();
      onSave(finalNum);
      setLocalVal(finalNum);
    } else {
      onSave(0);
      setLocalVal("0");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={localVal}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

export default function TabLiquidacion({ 
  selectedWorkerData, 
  overrides, 
  handleCellEdit,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleFileUpload,
  handleClearAttendanceData,
  selectedWorkerName,
  setSelectedWorkerName,
  nominaRows
}) {
  if (!selectedWorkerData) {
    const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = `${selectedWorkerData.cedula}_${row.dia}`;
      const val = overrides[`${prefix}_${field}`] !== undefined ? overrides[`${prefix}_${field}`] : row[field];
      return acc + (Number(val) || 0);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };

  return (
      <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm animate-stitch">
         Selecciona un operario desde el Panel General para liquidar.
      </div>
    );
  }

  const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = `${selectedWorkerData.cedula}_${row.dia}`;
      const val = overrides[`${prefix}_${field}`] !== undefined ? overrides[`${prefix}_${field}`] : row[field];
      return acc + (Number(val) || 0);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };

  return (
    <div className="space-y-6">
       
       {/* LOCAL TOOLBAR */}
       <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end justify-between animate-stitch">
          <div className="flex gap-4 items-center flex-wrap">
             <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fecha Inicio</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
             </div>
             <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fecha Fin</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
             </div>
             <div className="flex gap-2">
                <label className="cursor-pointer bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-colors flex items-center shadow-sm">
                   <span>📂 Importar Biométrico</span>
                   <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button 
                  onClick={() => handleClearAttendanceData('worker')}
                  className="bg-rose-100 hover:bg-rose-600 text-rose-600 hover:text-white text-xs font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-colors shadow-sm"
                >
                   Limpiar Biométrico
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-sky-100 hover:bg-sky-600 text-sky-600 hover:text-white text-xs font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                   <Printer size={16} /> Imprimir Colilla
                </button>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <label className="block text-[10px] font-black uppercase text-slate-400">Operario Actual:</label>
             <select 
                value={selectedWorkerName} 
                onChange={(e) => setSelectedWorkerName(e.target.value)}
                className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-sm font-bold px-3 py-1.5 rounded-lg outline-none min-w-[200px]"
             >
               {nominaRows && nominaRows.map(member => (
                  <option key={member.nombre} value={member.nombre}>{member.nombre}</option>
               ))}
             </select>
          </div>
       </div>
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

       <div className="flex flex-col gap-6">
          {/* LEFT PANEL */}
          <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-6 overflow-hidden">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Registro Diario (A - X)</h3>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left table-auto">
                   <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-20">
                      <tr className="border-b border-slate-200 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <th colSpan="1" className="py-2 border-b border-slate-200">Fecha</th>
                            <th colSpan="2" className="py-2 bg-blue-50/50 border-b border-blue-100 text-blue-600">Marcas Biométrico</th>
                            <th colSpan="6" className="py-2 bg-slate-100 border-b border-slate-200">Control de Descansos</th>
                            <th colSpan="5" className="py-2 bg-indigo-50/50 border-b border-indigo-100 text-indigo-600">Liquidación Base</th>
                            <th colSpan="8" className="py-2 bg-amber-50/50 border-b border-amber-100 text-amber-700">Clasificación Extras/Recargos</th>
                            <th colSpan="2" className="py-2 bg-rose-50/50 border-b border-rose-100 text-rose-600">Llegadas</th>
                      </tr>
                      <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                         <th className="px-2 py-2" title="Día/Fecha">A (Fecha)</th>
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

                         const getTotal = (field) => {
    if (!selectedWorkerData || !selectedWorkerData.workerDays) return "0.0";
    const sum = selectedWorkerData.workerDays.reduce((acc, row) => {
      const prefix = `${selectedWorkerData.cedula}_${row.dia}`;
      const val = overrides[`${prefix}_${field}`] !== undefined ? overrides[`${prefix}_${field}`] : row[field];
      return acc + (Number(val) || 0);
    }, 0);
    return sum === 0 ? "0.0" : sum.toFixed(1);
  };

  const isAnomalo = day.estado === 'incompleto';
  const defaultStatus = isAnomalo ? 'ANÓMALO' : 'NORMAL';
  const statusVal = overrides[`${prefix}_novedad_status`] || defaultStatus;
  
  let rowBg = "hover:bg-slate-50 transition-colors";
  if (statusVal === "CALAMIDAD") rowBg = "bg-red-500 text-white hover:bg-red-600";
  else if (statusVal === "INCAPACIDAD EG") rowBg = "bg-orange-400 text-white hover:bg-orange-500";
  else if (statusVal === "NO MARCÓ RELOJ") rowBg = "bg-yellow-300 text-black hover:bg-yellow-400";
  else if (statusVal === "DESCANSO") rowBg = "bg-green-200 text-black hover:bg-green-300";
  else if (statusVal === "ANÓMALO") rowBg = "bg-amber-50/80 outline outline-1 outline-amber-200";

  return (
                            <tr key={displayDate} className={`${rowBg}`}>
                               <td className="px-2 py-2 whitespace-nowrap flex items-center gap-1">
                                  <span className={statusVal === 'NORMAL' || statusVal === 'ANÓMALO' ? "text-slate-400" : "opacity-80"}>{dayName}</span> 
                                  {displayDate}
                                  <select 
                                     value={statusVal} 
                                     onChange={(e) => handleCellEdit(`${prefix}_novedad_status`, e.target.value)} 
                                     className={`ml-1 appearance-none rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer text-center ${statusVal === 'NORMAL' ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : statusVal === 'ANÓMALO' ? 'bg-amber-100 text-amber-700 animate-pulse hover:bg-amber-200' : 'bg-white/40 text-current hover:bg-white/60'}`}
                                  >
                                     <option value="NORMAL">NORMAL</option>
                                     <option value="ANÓMALO">ANÓMALO</option>
                                     <option value="CALAMIDAD">CALAMIDAD</option>
                                     <option value="INCAPACIDAD EG">INCAPACIDAD EG</option>
                                     <option value="NO MARCÓ RELOJ">NO MARCÓ RELOJ</option>
                                     <option value="DESCANSO">DESCANSO</option>
                                  </select>
                               </td>
                               <td className="px-1 py-1">
                                  <input type="time" value={overrides[`${prefix}_hr_ent`] !== undefined ? overrides[`${prefix}_hr_ent`] : (day.hr_ent || "")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent`, e.target.value)} className="w-full bg-transparent text-center font-mono outline-none focus:ring-1 focus:bg-slate-50 rounded text-blue-600" />
                               </td>
                               <td className="px-1 py-1">
                                  <input type="time" value={overrides[`${prefix}_hr_sal`] !== undefined ? overrides[`${prefix}_hr_sal`] : (day.hr_sal || "")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal`, e.target.value)} className="w-full bg-transparent text-center font-mono outline-none focus:ring-1 focus:bg-slate-50 rounded text-blue-600" />
                               </td>
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_ent_desc1`] !== undefined ? overrides[`${prefix}_hr_ent_desc1`] : (day.hr_ent_desc1 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_desc1`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_sal_desc1`] !== undefined ? overrides[`${prefix}_hr_sal_desc1`] : (day.hr_sal_desc1 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_desc1`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-2 py-2 text-center text-slate-400 font-mono">{day.total_desc1 && day.total_desc1 !== "NaN" ? day.total_desc1 : "00:00"}</td>
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_ent_desc2`] !== undefined ? overrides[`${prefix}_hr_ent_desc2`] : (day.hr_ent_desc2 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_desc2`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_sal_desc2`] !== undefined ? overrides[`${prefix}_hr_sal_desc2`] : (day.hr_sal_desc2 || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_desc2`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-2 py-2 text-center text-slate-400 font-mono">{day.total_desc2 && day.total_desc2 !== "NaN" ? day.total_desc2 : "00:00"}</td>
                               
                               {/* Pago Entrada/Salida */}
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_ent_pago`] !== undefined ? overrides[`${prefix}_hr_ent_pago`] : (day.hr_ent_pago || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_ent_pago`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none text-purple-600" />
                               </td>
                               <td className="px-1 py-1">
                                  <input type="text" value={overrides[`${prefix}_hr_sal_pago`] !== undefined ? overrides[`${prefix}_hr_sal_pago`] : (day.hr_sal_pago || "-")} onChange={(e) => handleCellEdit(`${prefix}_hr_sal_pago`, e.target.value)} className="w-10 bg-white border border-slate-200 text-center font-mono rounded focus:ring-1 outline-none text-purple-600" />
                               </td>

                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_hr_lab`]} fallback={day.hr_lab || 0} onSave={(val) => handleCellEdit(`${prefix}_hr_lab`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded text-slate-500" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_desc_lunch`]} fallback={day.desc_lunch || 0} onSave={(val) => handleCellEdit(`${prefix}_desc_lunch`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded text-slate-500" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_hr_pag`]} fallback={day.hr_pag || 0} onSave={(val) => handleCellEdit(`${prefix}_hr_pag`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded font-bold text-slate-600" />
                               </td>
                               
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_diurnas`]} fallback={day.diurnas || 0} onSave={(val) => handleCellEdit(`${prefix}_diurnas`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_nocturnas`]} fallback={day.nocturnas || 0} onSave={(val) => handleCellEdit(`${prefix}_nocturnas`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_fes_diu`]} fallback={day.fes_diu || 0} onSave={(val) => handleCellEdit(`${prefix}_fes_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_fes_noc`]} fallback={day.fes_noc || 0} onSave={(val) => handleCellEdit(`${prefix}_fes_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_ext_diu`]} fallback={day.ext_diu || 0} onSave={(val) => handleCellEdit(`${prefix}_ext_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_ext_noc`]} fallback={day.ext_noc || 0} onSave={(val) => handleCellEdit(`${prefix}_ext_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_ext_fes_diu`]} fallback={day.ext_fes_diu || 0} onSave={(val) => handleCellEdit(`${prefix}_ext_fes_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_ext_fes_noc`]} fallback={day.ext_fes_noc || 0} onSave={(val) => handleCellEdit(`${prefix}_ext_fes_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_llegada_tarde`]} fallback={day.llegada_tarde || 0} onSave={(val) => handleCellEdit(`${prefix}_llegada_tarde`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded text-rose-600" />
                               </td>
                               <td className="px-1 py-1">
                                  <GridInput globalValue={overrides[`${prefix}_llegada_tarde_min`]} fallback={day.llegada_tarde_min || 0} onSave={(val) => handleCellEdit(`${prefix}_llegada_tarde_min`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-50 rounded text-rose-600" />
                               </td>
                            </tr>
                         )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-slate-700 text-[10px] font-bold">
                       <tr>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-1 py-1"></td>
                          <td className="px-1 py-1"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-1 py-1"></td>
                          <td className="px-1 py-1"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-1 py-1"></td>
                          <td className="px-1 py-1 text-right pr-2 uppercase tracking-widest text-slate-500">TOTAL</td>
                          <td className="px-2 py-2 text-center text-slate-700">{getTotal('hr_lab')}</td>
                          <td className="px-2 py-2 text-center text-slate-700">{getTotal('desc_lunch')}</td>
                          <td className="px-2 py-2 text-center font-black text-slate-800">{getTotal('hr_pag')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('diurnas')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('nocturnas')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('fes_diu')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('fes_noc')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('ext_diu')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('ext_noc')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('ext_fes_diu')}</td>
                          <td className="px-1 py-1 text-center">{getTotal('ext_fes_noc')}</td>
                          <td className="px-1 py-1 text-center text-red-600">{getTotal('llegada_tarde')}</td>
                          <td className="px-1 py-1 text-center text-red-600">{getTotal('llegada_tarde_min')}</td>
                       </tr>
                    </tfoot>
                </table>
             </div>
          </div>

          {/* BOTTOM PANEL */}
          <div className="w-full max-w-full mx-auto mt-6 mb-12 overflow-hidden">
             <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Liquidación de Horas (26-38)</h3>
                   
                   <div className="space-y-4 mb-6">
                      {(() => {
                         const salarioBase = Number(overrides[`${selectedWorkerData.cedula}_salario_base`] !== undefined ? overrides[`${selectedWorkerData.cedula}_salario_base`] : (selectedWorkerData.masterRow?.salario_base || selectedWorkerData.salario_base || selectedWorkerData.salario || 0));
                         const calcValor = (horas, porcentaje) => Math.round((salarioBase / 240) * (porcentaje / 100) * (horas || 0));
                         
                         const horasDebe = Number(overrides[`${selectedWorkerData.cedula}_horas_que_debe`] !== undefined ? overrides[`${selectedWorkerData.cedula}_horas_que_debe`] : (selectedWorkerData.horas_debe || 0));
                         
                         const getTotHr = (field, defaultVal) => overrides[`${selectedWorkerData.cedula}_tot_hr_${field}`] !== undefined ? Number(overrides[`${selectedWorkerData.cedula}_tot_hr_${field}`]) : defaultVal;
                         
                         const tDiurnas = getTotHr('diurnas', Number(selectedWorkerData.horas_diurnas || 0));
                         const tNocturnas = getTotHr('nocturnas', Number(selectedWorkerData.horas_nocturnas || 0));
                         const tFesDiu = getTotHr('fes_diu', Number(selectedWorkerData.festivas_diurnas || 0));
                         const tFesNoc = getTotHr('fes_noc', Number(selectedWorkerData.festivas_nocturnas || 0));
                         
                         const baseExtraDiurna = Number(selectedWorkerData.extras_diurnas || 0);
                         const horasExtraDiurnaReal = getTotHr('ext_diu', Math.max(0, baseExtraDiurna - horasDebe));
                         
                         const totalExtraNoc = getTotHr('ext_noc', Number(selectedWorkerData.extras_nocturnas || 0));
                         const totalExtFesDiu = getTotHr('ext_fes_diu', Number(selectedWorkerData.extras_festivas || 0));
                         const totalExtFesNoc = getTotHr('ext_fes_noc', Number(selectedWorkerData.extras_festivas_nocturnas || 0));
                         
                         const horasPendientes = horasExtraDiurnaReal + totalExtraNoc + totalExtFesDiu + totalExtFesNoc;
                         
                         const getVr = (field, defaultVal) => overrides[`${selectedWorkerData.cedula}_vr_${field}`] !== undefined && overrides[`${selectedWorkerData.cedula}_vr_${field}`] !== "" ? overrides[`${selectedWorkerData.cedula}_vr_${field}`] : defaultVal;
                         
                         const vNocturnas = getVr('nocturnas', calcValor(tNocturnas, 35));
                         const vFesDiu = getVr('fes_diu', calcValor(tFesDiu, 75));
                         const vFesNoc = getVr('fes_noc', calcValor(tFesNoc, 210));
                         const vExtDiu = getVr('ext_diu', calcValor(horasExtraDiurnaReal, 150));
                         const vExtNoc = getVr('ext_noc', calcValor(totalExtraNoc, 150));
                         const vExtFesDiu = getVr('ext_fes_diu', calcValor(totalExtFesDiu, 200));
                         const vExtFesNoc = getVr('ext_fes_noc', calcValor(totalExtFesNoc, 200));
                         const vTotalExtras = Number(vNocturnas) + Number(vFesDiu) + Number(vFesNoc) + Number(vExtDiu) + Number(vExtNoc) + Number(vExtFesDiu) + Number(vExtFesNoc);

                         return (
                            <>
                               <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">26. Horas que debe</span>
                                  <div className="w-24">
                                     <input
                                        type="number" step="0.1"
                                        value={overrides[`${selectedWorkerData.cedula}_horas_que_debe`] !== undefined ? overrides[`${selectedWorkerData.cedula}_horas_que_debe`] : (selectedWorkerData.horas_debe !== undefined ? selectedWorkerData.horas_debe : "")}
                                        onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_horas_que_debe`, e.target.value)}
                                        className="w-full bg-slate-800 text-white border-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-right transition-all"
                                     />
                                  </div>
                               </div>
                               
                               <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horas Pendientes</span>
                                  <span className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                     {horasPendientes.toFixed(1)}
                                  </span>
                               </div>

                               <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salario Básico (B37)</span>
                                  <div className="w-28">
                                     <input
                                        type="number"
                                        value={overrides[`${selectedWorkerData.cedula}_salario_base`] !== undefined ? overrides[`${selectedWorkerData.cedula}_salario_base`] : (selectedWorkerData.masterRow?.salario_base || selectedWorkerData.salario_base || selectedWorkerData.salario || "")}
                                        onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_salario_base`, e.target.value)}
                                        className="w-full bg-slate-800 text-emerald-400 border-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-right transition-all"
                                     />
                                  </div>
                               </div>

                               <div className="border-t border-slate-800 pt-4 w-full overflow-x-auto">
                                  <table className="w-full border-collapse">
                                     <thead>
                                        <tr className="border-b border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                           <th className="py-3 px-4 text-left whitespace-nowrap">ITEM</th>
                                           <th className="py-3 px-4 text-center whitespace-nowrap">T. Hr.</th>
                                           <th className="py-3 px-4 text-center whitespace-nowrap">%</th>
                                           <th className="py-3 px-4 text-right whitespace-nowrap">Vr. Pagar</th>
                                        </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-800/60 text-sm font-bold">
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">28. Diurnas</td>
                                           <td className="py-2 px-2 text-center text-slate-400">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_diurnas`]} fallback={tDiurnas} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_diurnas`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap">0%</span></td>
                                           <td className="py-2 px-2 text-right">
                                               <div className="flex justify-end items-center gap-1">
                                                  <span className="text-slate-500">$</span>
                                                  <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_diurnas`]} fallback={0} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_diurnas`, val)} className="w-24 bg-transparent text-right text-slate-500 outline-none focus:ring-1 rounded" decimals={0} />
                                               </div>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">29. Nocturnas</td>
                                           <td className="py-2 px-2 text-center text-indigo-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_nocturnas`]} fallback={tNocturnas} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_nocturnas`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-indigo-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">35%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-indigo-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_nocturnas`]} fallback={vNocturnas} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_nocturnas`, val)} className="w-24 bg-transparent text-right text-indigo-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">30. Festiva Diurna</td>
                                           <td className="py-2 px-2 text-center text-indigo-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_fes_diu`]} fallback={tFesDiu} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_fes_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-indigo-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">75%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-indigo-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_fes_diu`]} fallback={vFesDiu} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_fes_diu`, val)} className="w-24 bg-transparent text-right text-indigo-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">31. Fest Noc</td>
                                           <td className="py-2 px-2 text-center text-indigo-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_fes_noc`]} fallback={tFesNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_fes_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-indigo-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">210%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-indigo-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_fes_noc`]} fallback={vFesNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_fes_noc`, val)} className="w-24 bg-transparent text-right text-indigo-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">32. Extra Diurna</td>
                                           <td className="py-2 px-2 text-center text-emerald-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_ext_diu`]} fallback={horasExtraDiurnaReal} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_ext_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-emerald-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">150%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-emerald-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_ext_diu`]} fallback={vExtDiu} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_ext_diu`, val)} className="w-24 bg-transparent text-right text-emerald-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">33. Extra Noc</td>
                                           <td className="py-2 px-2 text-center text-emerald-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_ext_noc`]} fallback={totalExtraNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_ext_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-emerald-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">150%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-emerald-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_ext_noc`]} fallback={vExtNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_ext_noc`, val)} className="w-24 bg-transparent text-right text-emerald-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">34. Ext Fes Diu</td>
                                           <td className="py-2 px-2 text-center text-emerald-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_ext_fes_diu`]} fallback={totalExtFesDiu} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_ext_fes_diu`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-emerald-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">200%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-emerald-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_ext_fes_diu`]} fallback={vExtFesDiu} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_ext_fes_diu`, val)} className="w-24 bg-transparent text-right text-emerald-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                           <td className="py-3 px-4 text-slate-300 whitespace-nowrap">35. Ext Fes Noc</td>
                                           <td className="py-2 px-2 text-center text-emerald-300">
                                              <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_tot_hr_ext_fes_noc`]} fallback={totalExtFesNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_tot_hr_ext_fes_noc`, val)} className="w-full bg-transparent text-center outline-none focus:ring-1 focus:bg-slate-800 rounded text-emerald-300" />
                                           </td>
                                           <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">200%</span></td>
                                           <td className="py-2 px-2 text-right">
                                              <div className="flex justify-end items-center gap-1">
                                                 <span className="text-emerald-400">$</span>
                                                 <GridInput globalValue={overrides[`${selectedWorkerData.cedula}_vr_ext_fes_noc`]} fallback={vExtFesNoc} onSave={(val) => handleCellEdit(`${selectedWorkerData.cedula}_vr_ext_fes_noc`, val)} className="w-24 bg-transparent text-right text-emerald-400 outline-none focus:ring-1 rounded" decimals={0} />
                                              </div>
                                           </td>
                                        </tr>
                                     </tbody>
                                     <tfoot className="border-t border-slate-600">
                                        <tr>
                                           <td className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right whitespace-nowrap">TOTALES</td>
                                           <td className="py-4 px-4 text-center text-lg font-black text-white whitespace-nowrap">{Number(
                                              (selectedWorkerData.horas_diurnas || 0) +
                                              (selectedWorkerData.horas_nocturnas || 0) +
                                              (selectedWorkerData.festivas_diurnas || 0) +
                                              (selectedWorkerData.festivas_nocturnas || 0) +
                                              horasExtraDiurnaReal +
                                              totalExtraNoc +
                                              totalExtFesDiu +
                                              totalExtFesNoc
                                           ).toFixed(1)}</td>
                                           <td className="py-4 px-4"></td>
                                           <td className="py-4 px-4 text-right text-2xl font-black text-emerald-400 tracking-tight whitespace-nowrap">${fmtCOP(vTotalExtras)}</td>
                                        </tr>
                                     </tfoot>
                                  </table>
                               </div>
                            </>
                         );
                      })()}
                </div>
             </div>

             <div className="w-full max-w-md mx-auto mb-12">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-hidden break-words">
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 border-b border-slate-100 pb-2">NOVEDADES:</h3>
                   <div className="flex flex-wrap gap-2 mb-6">
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-slate-200 rounded-sm"></span> NORMAL</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded-sm"></span> ANÓMALO</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> CALAMIDAD</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-orange-400 rounded-sm"></span> INCAPACIDAD</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-yellow-300 rounded-sm border border-slate-200"></span> NO MARCÓ</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold"><span className="w-3 h-3 bg-green-200 rounded-sm border border-slate-200"></span> DESCANSO</span>
                   </div>
                   
                   <div className="space-y-1.5 text-sm font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {Number(selectedWorkerData.horas_nocturnas) > 0 && <p className="flex justify-between"><span>Recargo Nocturno</span> <span className="text-slate-900">{Number(selectedWorkerData.horas_nocturnas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.festivas_diurnas) > 0 && <p className="flex justify-between"><span>Festiva Diurna</span> <span className="text-slate-900">{Number(selectedWorkerData.festivas_diurnas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.festivas_nocturnas) > 0 && <p className="flex justify-between"><span>Festiva Nocturna</span> <span className="text-slate-900">{Number(selectedWorkerData.festivas_nocturnas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.extras_diurnas) > 0 && <p className="flex justify-between"><span>Extra Diurna</span> <span className="text-slate-900">{Number(selectedWorkerData.extras_diurnas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.extras_nocturnas) > 0 && <p className="flex justify-between"><span>Extra Nocturna</span> <span className="text-slate-900">{Number(selectedWorkerData.extras_nocturnas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.extras_festivas) > 0 && <p className="flex justify-between"><span>Extra Festiva Diurna</span> <span className="text-slate-900">{Number(selectedWorkerData.extras_festivas).toFixed(1)} hrs</span></p>}
                      {Number(selectedWorkerData.extras_festivas_nocturnas) > 0 && <p className="flex justify-between"><span>Extra Festiva Nocturna</span> <span className="text-slate-900">{Number(selectedWorkerData.extras_festivas_nocturnas).toFixed(1)} hrs</span></p>}
                      {Number(
                          (selectedWorkerData.horas_nocturnas || 0) +
                          (selectedWorkerData.festivas_diurnas || 0) +
                          (selectedWorkerData.festivas_nocturnas || 0) +
                          (selectedWorkerData.extras_diurnas || 0) +
                          (selectedWorkerData.extras_nocturnas || 0) +
                          (selectedWorkerData.extras_festivas || 0) +
                          (selectedWorkerData.extras_festivas_nocturnas || 0)
                      ) === 0 && <p className="text-slate-400 italic text-center text-xs">Sin novedades en la quincena</p>}
                   </div>
                </div>
             </div>
          </div>
       </div>
       </div>
    </div>
  );
}
