import React from 'react';
import { Info } from 'lucide-react';

const fmtCOP = (num) => {
  return new Intl.NumberFormat('es-CO').format(num || 0);
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
                               <td className="px-2 py-2 text-blue-600 font-mono">{day.hr_ent || "-"}</td>
                               <td className="px-2 py-2 text-blue-600 font-mono">{day.hr_sal || "-"}</td>
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

                               <td className="px-2 py-2 text-center text-slate-400">{Number(day.hr_lab || 0).toFixed(1)}</td>
                               <td className="px-2 py-2 text-center text-slate-400">{Number(day.desc_lunch || 0).toFixed(1)}</td>
                               <td className="px-2 py-2 text-center font-bold text-slate-600">{Number(day.hr_pag || 0).toFixed(1)}</td>
                               
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_diurnas`] !== undefined ? overrides[`${prefix}_diurnas`] : Number(day.diurnas || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_diurnas`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_nocturnas`] !== undefined ? overrides[`${prefix}_nocturnas`] : Number(day.nocturnas || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_nocturnas`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_fes_diu`] !== undefined ? overrides[`${prefix}_fes_diu`] : Number(day.fes_diu || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_fes_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_fes_noc`] !== undefined ? overrides[`${prefix}_fes_noc`] : Number(day.fes_noc || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_fes_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_ext_diu`] !== undefined ? overrides[`${prefix}_ext_diu`] : Number(day.ext_diu || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_ext_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_ext_noc`] !== undefined ? overrides[`${prefix}_ext_noc`] : Number(day.ext_noc || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_ext_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_ext_fes_diu`] !== undefined ? overrides[`${prefix}_ext_fes_diu`] : Number(day.ext_fes_diu || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_ext_fes_diu`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_ext_fes_noc`] !== undefined ? overrides[`${prefix}_ext_fes_noc`] : Number(day.ext_fes_noc || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_ext_fes_noc`, e.target.value)} className="w-10 bg-white border border-slate-200 text-right rounded focus:ring-1 outline-none" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_llegada_tarde`] !== undefined ? overrides[`${prefix}_llegada_tarde`] : Number(day.llegada_tarde || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_llegada_tarde`, e.target.value)} className="w-10 bg-rose-50 border border-slate-200 text-right rounded focus:ring-1 outline-none text-rose-700" />
                               </td>
                               <td className="px-1 py-1 text-right">
                                  <input type="text" value={overrides[`${prefix}_llegada_tarde_min`] !== undefined ? overrides[`${prefix}_llegada_tarde_min`] : Number(day.llegada_tarde_min || 0).toFixed(1)} onChange={(e) => handleCellEdit(`${prefix}_llegada_tarde_min`, e.target.value)} className="w-10 bg-rose-50 border border-slate-200 text-right rounded focus:ring-1 outline-none text-rose-700" />
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
                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">26. Horas que debe</span>
                         <div className="w-24">
                            <input
                               type="text"
                               value={overrides[`${selectedWorkerData.cedula}_horas_que_debe`] !== undefined ? overrides[`${selectedWorkerData.cedula}_horas_que_debe`] : (selectedWorkerData.horas_debe || 0)}
                               onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_horas_que_debe`, e.target.value)}
                               className="w-full bg-slate-800 text-white border-slate-700 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-right transition-all"
                            />
                         </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horas Pendientes</span>
                         <span className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                            {Number(selectedWorkerData.horas_pendientes || 0).toFixed(1)}
                         </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salario Básico (B37)</span>
                         <div className="w-28">
                            <input
                               type="text"
                               value={overrides[`${selectedWorkerData.cedula}_sueldo`] !== undefined ? overrides[`${selectedWorkerData.cedula}_sueldo`] : (selectedWorkerData.salario || 0)}
                               onChange={(e) => handleCellEdit(`${selectedWorkerData.cedula}_sueldo`, e.target.value)}
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
                               <td className="py-3 px-4 text-center text-slate-400">{Number(selectedWorkerData.horas_diurnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap">x 0.0</span></td>
                               <td className="py-3 px-4 text-right text-slate-500">$0</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">29. Nocturnas</td>
                               <td className="py-3 px-4 text-center text-indigo-300">{Number(selectedWorkerData.horas_nocturnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">x 0.35</span></td>
                               <td className="py-3 px-4 text-right text-indigo-400">${fmtCOP(selectedWorkerData.recargo_nocturno || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">30. Festiva Diurna</td>
                               <td className="py-3 px-4 text-center text-indigo-300">{Number(selectedWorkerData.festivas_diurnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">x 0.75</span></td>
                               <td className="py-3 px-4 text-right text-indigo-400">${fmtCOP(selectedWorkerData.val_extras_festivas || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">31. Fest Noc</td>
                               <td className="py-3 px-4 text-center text-indigo-300">{Number(selectedWorkerData.festivas_nocturnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-indigo-900/50 text-indigo-400 text-[9px] px-2 py-0.5 rounded-full border border-indigo-800 whitespace-nowrap">x 2.10</span></td>
                               <td className="py-3 px-4 text-right text-indigo-400">${fmtCOP(selectedWorkerData.val_extras_festivas_nocturnas || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">32. Extra Diurna</td>
                               <td className="py-3 px-4 text-center text-emerald-300">{Number(selectedWorkerData.extras_diurnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">x 1.25</span></td>
                               <td className="py-3 px-4 text-right text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_diurnas || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">33. Extra Noc</td>
                               <td className="py-3 px-4 text-center text-emerald-300">{Number(selectedWorkerData.extras_nocturnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">x 1.75</span></td>
                               <td className="py-3 px-4 text-right text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_nocturnas || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">34. Ext Fes Diu</td>
                               <td className="py-3 px-4 text-center text-emerald-300">{Number(selectedWorkerData.extras_festivas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">x 2.00</span></td>
                               <td className="py-3 px-4 text-right text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_festivas || 0)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/50 transition-colors">
                               <td className="py-3 px-4 text-slate-300 whitespace-nowrap">35. Ext Fes Noc</td>
                               <td className="py-3 px-4 text-center text-emerald-300">{Number(selectedWorkerData.extras_festivas_nocturnas || 0).toFixed(1)}</td>
                               <td className="py-3 px-4 text-center"><span className="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-800 whitespace-nowrap">x 2.50</span></td>
                               <td className="py-3 px-4 text-right text-emerald-400">${fmtCOP(selectedWorkerData.val_extras_festivas_nocturnas || 0)}</td>
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
                                  (selectedWorkerData.extras_diurnas || 0) +
                                  (selectedWorkerData.extras_nocturnas || 0) +
                                  (selectedWorkerData.extras_festivas || 0) +
                                  (selectedWorkerData.extras_festivas_nocturnas || 0)
                               ).toFixed(1)}</td>
                               <td className="py-4 px-4"></td>
                               <td className="py-4 px-4 text-right text-2xl font-black text-emerald-400 tracking-tight whitespace-nowrap">${fmtCOP(selectedWorkerData.liquidation.total_extra_val || 0)}</td>
                            </tr>
                         </tfoot>
                      </table>
                   </div>
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
