import React, { useState } from 'react';
import EditableCell from '@/components/Nomina/EditableCell';
import SaitempModal from '@/components/Nomina/SaitempModal';
import { PLANILLA_COLUMNS } from '@/utils/constants';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  fmtCOP,
  globalSmmlv,
  setGlobalSmmlv,
  globalAuxTransporte,
  setGlobalAuxTransporte
}) {
  const [vinculacionFiltro, setVinculacionFiltro] = useState('Empresa');
  const [isSaitempModalOpen, setIsSaitempModalOpen] = useState(false);
  const [empleadoSaitemp, setEmpleadoSaitemp] = useState(null);

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

  const handleDownloadSaitempExcel = async () => {
    const empleadosMision = filteredPayrollData.filter(row => {
      const tipo = (row.masterRow && row.masterRow.tipo_vinculacion) || 'Empresa';
      return tipo === 'Temporal';
    });

    if (empleadosMision.length === 0) {
      alert("No hay empleados en misión para generar el reporte.");
      return;
    }

    const formatHour = (val) => (val && Number(val) > 0) ? Number(val).toFixed(1) : '';
    const formatValue = (val) => (val && Number(val) > 0) ? Math.round(Number(val)) : '';
    const formatNovedad = (val) => (val && Number(val) > 0) ? Number(val) : '';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NOVEDADES');

    worksheet.columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'ÁREA/PROCESO', key: 'area', width: 20 },
      { header: 'IDENTIFICACIÓN', key: 'id', width: 20 },
      { header: 'NOMBRES Y APELLIDOS', key: 'nombres', width: 35 },
      { header: 'FECHA INICIO NOVEDAD (DD-MM-AA)', key: 'inicio', width: 20 },
      { header: 'FECHA FINAL NOVEDAD (DD-MM-AA)', key: 'fin', width: 20 },
      { header: 'TOTAL DÍAS', key: 'dias', width: 10 },
      { header: 'RECARGO NOCTURNO Hrs.', key: 'rn', width: 15 },
      { header: 'HORAS EXTRAS DIURNAS', key: 'hed', width: 15 },
      { header: 'HORAS EXTRAS NOCTURNAS', key: 'hen', width: 15 },
      { header: 'HORAS EXTRAS FESTIVAS DIURNAS', key: 'hefd', width: 15 },
      { header: 'AUXILIO DE RODAMIENTO A COMERCIAL', key: 'rodamiento', width: 20 },
      { header: 'COMISIÓN DE VENTA (PRESTACIONAL)', key: 'comisiones', width: 20 },
      { header: 'DESCUENTOS DE NÓMINA', key: 'descuentos', width: 20 },
      { header: 'OBSERVACIONES', key: 'obs', width: 40 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBDD7EE' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    empleadosMision.forEach((emp, index) => {
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

      worksheet.addRow({
        no: index + 1,
        area: (emp.cargo || '').toUpperCase(),
        id: emp.cedula,
        nombres: emp.nombre,
        inicio: "",
        fin: "",
        dias: formatNovedad(emp.dias_incapacidad),
        rn: formatHour(emp.horas_nocturnas),
        hed: formatHour(emp.extras_diurnas),
        hen: formatHour(emp.extras_nocturnas),
        hefd: formatHour(emp.extras_festivas),
        rodamiento: formatValue(emp.rodamiento),
        comisiones: formatValue(emp.comisiones),
        descuentos: formatValue(deduccionesSaitemp),
        obs: obsArray.join(", ")
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Reporte_SAITEMP.xlsx');
  };

  const handleDownloadSaitempPDF = () => {
    const empleadosMision = filteredPayrollData.filter(row => {
      const tipo = (row.masterRow && row.masterRow.tipo_vinculacion) || 'Empresa';
      return tipo === 'Temporal';
    });

    if (empleadosMision.length === 0) {
      alert("No hay empleados en misión para generar el reporte.");
      return;
    }

    const formatHour = (val) => (val && Number(val) > 0) ? Number(val).toFixed(1) : '';
    const formatValue = (val) => (val && Number(val) > 0) ? Math.round(Number(val)) : '';
    const formatNovedad = (val) => (val && Number(val) > 0) ? Number(val) : '';

    const bodyData = empleadosMision.map((emp, index) => {
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

      return [
        index + 1,
        (emp.cargo || '').toUpperCase(),
        emp.cedula,
        emp.nombre,
        "", // Inicio
        "", // Fin
        formatNovedad(emp.dias_incapacidad),
        formatHour(emp.horas_nocturnas),
        formatHour(emp.extras_diurnas),
        formatHour(emp.extras_nocturnas),
        formatHour(emp.extras_festivas),
        formatValue(emp.rodamiento),
        formatValue(emp.comisiones),
        formatValue(deduccionesSaitemp),
        obsArray.join(", ")
      ];
    });

    const doc = new jsPDF('landscape');
    
    autoTable(doc, {
      head: [[
        "No.", "ÁREA", "CÉDULA", "EMPLEADO", 
        "INICIO", "FIN", "DÍAS", "R.N", 
        "H.E.D", "H.E.N", "H.E.F.D", "RODAM.", 
        "COMISIÓN", "DEDUC.", "OBSERV."
      ]],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 6, cellPadding: 1, textColor: 50, overflow: 'linebreak' },
      margin: { left: 5, right: 5, top: 15 },
      columnStyles: {
        1: { cellWidth: 18 },
        2: { cellWidth: 15 },
        3: { cellWidth: 40 },
        14: { cellWidth: 35 }
      }
    });

    doc.save('Reporte_SAITEMP.pdf');
  };

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
             🏢 Vinculados
           </button>
           <button
             onClick={() => setVinculacionFiltro('Temporal')}
             className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${vinculacionFiltro === 'Temporal' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             ⏱️ En Misión
           </button>
         </div>

         <div className="flex gap-2 items-center">
           <div className="flex rounded-xl overflow-hidden shadow-md">
             <button
               onClick={handleDownloadSaitempExcel}
               className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-2 border-r border-emerald-600/30"
             >
               📊 Excel
             </button>
             <button
               onClick={handleDownloadSaitempPDF}
               className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all flex items-center gap-2"
             >
               📕 PDF
             </button>
           </div>
         </div>
      </div>

      <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-6 items-center">
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">SMMLV Actual</label>
          <input 
            type="number"
            value={globalSmmlv}
            onChange={(e) => setGlobalSmmlv(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Auxilio de Transporte</label>
          <input 
            type="number"
            value={globalAuxTransporte}
            onChange={(e) => setGlobalAuxTransporte(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Día Mínimo</span>
          <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{Math.round(globalSmmlv / 30)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tope Auxilio (2 SMMLV)</span>
          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{globalSmmlv * 2}</span>
        </div>
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
                          {vinculacionFiltro === 'Temporal' && (
                             <button
                               onClick={() => {
                                 const mergedData = {
                                    ...row,
                                    horas_nocturnas: overrides[`${row.cedula}_horas_nocturnas`] !== undefined ? overrides[`${row.cedula}_horas_nocturnas`] : row.horas_nocturnas,
                                    extras_diurnas: overrides[`${row.cedula}_extras_diurnas`] !== undefined ? overrides[`${row.cedula}_extras_diurnas`] : row.extras_diurnas,
                                    extras_nocturnas: overrides[`${row.cedula}_extras_nocturnas`] !== undefined ? overrides[`${row.cedula}_extras_nocturnas`] : row.extras_nocturnas,
                                    extras_festivas: overrides[`${row.cedula}_extras_festivas`] !== undefined ? overrides[`${row.cedula}_extras_festivas`] : row.extras_festivas
                                 };
                                 setEmpleadoSaitemp(mergedData);
                                 setIsSaitempModalOpen(true);
                               }}
                               className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors whitespace-nowrap"
                             >
                               📋 FORMATO SAITEMP
                             </button>
                           )}
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

      <SaitempModal 
        isOpen={isSaitempModalOpen} 
        onClose={() => setIsSaitempModalOpen(false)} 
        employee={empleadoSaitemp} 
      />
    </section>
  );
}
