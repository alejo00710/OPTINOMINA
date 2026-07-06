import React, { useState, useEffect } from 'react';

export default function TabColillas({
  nominaRows,
  payrollData,
  fmtCOP,
  startDate,
  endDate
}) {
  const [selectedWorkerName, setSelectedWorkerName] = useState("");

  // Ensure default selection when data changes
  useEffect(() => {
    if (nominaRows.length > 0 && !nominaRows.find(r => r.nombre === selectedWorkerName)) {
      setSelectedWorkerName(nominaRows[0].nombre);
    }
  }, [nominaRows, selectedWorkerName]);

  const selectedWorkerData = payrollData.find(d => d.masterRow.nombre === selectedWorkerName) || null;

  return (
    <div className="space-y-6 animate-stitch">
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-xl">
            🖨️
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Desprendibles de Pago (Colillas)</h4>
            <p className="text-slate-500 text-xs font-semibold">Generación de desprendibles listos para imprimir o exportar digitalmente.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Seleccionar Operario:</span>
          <select
            value={selectedWorkerName}
            onChange={(e) => setSelectedWorkerName(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-sm font-black text-slate-800 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            {nominaRows.map(member => (
              <option key={member.nombre} value={member.nombre}>
                {member.nombre}
              </option>
            ))}
          </select>
          <button 
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            Imprimir Colilla
          </button>
        </div>
      </section>

      {/* Colilla Form */}
      {selectedWorkerData && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl space-y-8 print:p-0 print:border-none print:shadow-none print:bg-transparent" id="printable-colilla">
          {/* Header info */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200/60">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-950">OPTIMOLDES S.A.S.</h3>
              <p className="text-xs font-bold text-slate-500">NIT 900.069.620-9</p>
              <p className="text-[10px] text-slate-400 font-medium">Carrera 41 C No. 50-16 - Itagüí • Tel: 277 77 18</p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                Comprobante Quincenal
              </span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Periodo: {startDate} a {endDate}</p>
            </div>
          </div>

          {/* Worker Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs bg-slate-50/50 p-6 rounded-2xl border border-slate-100 print:bg-transparent">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Nombre del Trabajador</span>
              <span className="font-black text-slate-900">{selectedWorkerData.nombre}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Cédula de Ciudadanía</span>
              <span className="font-bold text-slate-800">{selectedWorkerData.cedula}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Cargo de Operación</span>
              <span className="font-bold text-slate-800 capitalize">{(selectedWorkerData.cargo || "").toLowerCase()}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Salario Básico Mensual</span>
              <span className="font-bold text-slate-800">${fmtCOP(selectedWorkerData.salario)}</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Días Liquidados</span>
              <span className="font-bold text-slate-800">{selectedWorkerData.dias_pagados} Días</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block">Entidad Bancaria</span>
              <span className="font-black text-slate-900">{selectedWorkerData.banco}</span>
            </div>
          </div>

          {/* Income & Deduction Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Devengos */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h5 className="font-black text-xs text-slate-900 uppercase tracking-widest text-emerald-600">Devengos (Ingresos)</h5>
              </div>
              <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Sueldo ordinario ({selectedWorkerData.dias_pagados}d):</span>
                  <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.sueldo)}</span>
                </div>
                {selectedWorkerData.recargo_nocturno > 0 && (
                  <div className="flex justify-between">
                    <span>Recargo Nocturno ({selectedWorkerData.horas_nocturnas?.toFixed(1)}h):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.recargo_nocturno)}</span>
                  </div>
                )}
                {selectedWorkerData.val_extras_diurnas > 0 && (
                  <div className="flex justify-between">
                    <span>Extras Diurnas ({selectedWorkerData.extras_diurnas?.toFixed(1)}h):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.val_extras_diurnas)}</span>
                  </div>
                )}
                {selectedWorkerData.val_extras_nocturnas > 0 && (
                  <div className="flex justify-between">
                    <span>Extras Nocturnas ({selectedWorkerData.extras_nocturnas?.toFixed(1)}h):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.val_extras_nocturnas)}</span>
                  </div>
                )}
                {selectedWorkerData.val_extras_festivas > 0 && (
                  <div className="flex justify-between">
                    <span>Extras Festivas ({selectedWorkerData.extras_festivas?.toFixed(1)}h):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.val_extras_festivas)}</span>
                  </div>
                )}
                {selectedWorkerData.transporte > 0 && (
                  <div className="flex justify-between">
                    <span>Auxilio Legal Transporte:</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.transporte)}</span>
                  </div>
                )}
                {(selectedWorkerData.rodamiento > 0 || selectedWorkerData.comisiones > 0) && (
                  <div className="flex justify-between">
                    <span>Rodamiento / Comisiones:</span>
                    <span className="font-bold text-slate-900">${fmtCOP((selectedWorkerData.rodamiento || 0) + (selectedWorkerData.comisiones || 0))}</span>
                  </div>
                )}
                {selectedWorkerData.incapacidad > 0 && (
                  <div className="flex justify-between">
                    <span>Incapacidad Médica ({selectedWorkerData.dias_incapacidad}d):</span>
                    <span className="font-bold text-slate-900">${fmtCOP(selectedWorkerData.incapacidad)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deducciones */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h5 className="font-black text-xs text-slate-900 uppercase tracking-widest text-rose-600">Deducciones (Descuentos)</h5>
              </div>
              <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Aporte Salud (4%):</span>
                  <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.salud)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aporte Pensión (4%):</span>
                  <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.pension)}</span>
                </div>
                {selectedWorkerData.solidaridad > 0 && (
                  <div className="flex justify-between">
                    <span>Fondo Solidaridad Pensional:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.solidaridad)}</span>
                  </div>
                )}
                {selectedWorkerData.prestamos > 0 && (
                  <div className="flex justify-between">
                    <span>Amortización Préstamos:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.prestamos)}</span>
                  </div>
                )}
                {selectedWorkerData.poliza_bolivar > 0 && (
                  <div className="flex justify-between">
                    <span>Póliza Seguro Bolívar:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.poliza_bolivar)}</span>
                  </div>
                )}
                {selectedWorkerData.poliza_plenitud > 0 && (
                  <div className="flex justify-between">
                    <span>Seguro Plenitud Funerario:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.poliza_plenitud)}</span>
                  </div>
                )}
                {selectedWorkerData.libranza_comfama > 0 && (
                  <div className="flex justify-between">
                    <span>Crédito Libranza Comfama:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.libranza_comfama)}</span>
                  </div>
                )}
                {selectedWorkerData.poliza_sura > 0 && (
                  <div className="flex justify-between">
                    <span>Seguro Póliza Sura:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.poliza_sura)}</span>
                  </div>
                )}
                {(selectedWorkerData.optica > 0 || selectedWorkerData.celular > 0) && (
                  <div className="flex justify-between">
                    <span>Descuento Óptica / Celular:</span>
                    <span className="font-bold text-rose-600">${fmtCOP((selectedWorkerData.optica || 0) + (selectedWorkerData.celular || 0))}</span>
                  </div>
                )}
                {selectedWorkerData.retencion > 0 && (
                  <div className="flex justify-between">
                    <span>Retención en la Fuente:</span>
                    <span className="font-bold text-rose-600">${fmtCOP(selectedWorkerData.retencion)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Total net payment summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Devengado (W)</span>
              <span className="text-base font-extrabold text-slate-900">${fmtCOP(selectedWorkerData.total_devengados)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Deducciones (AI)</span>
              <span className="text-base font-extrabold text-slate-900">${fmtCOP(selectedWorkerData.total_deducciones)}</span>
            </div>
            
            <div className="bg-slate-950 text-white p-6 rounded-3xl text-right space-y-1 shadow-md print:shadow-none print:border print:border-slate-300">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block print:text-slate-500">Neto Transferido (AL)</span>
              <span className="text-2xl font-black text-yellow-400 block print:text-slate-900">${fmtCOP(selectedWorkerData.neto_pagar)} COP</span>
            </div>
          </div>

          {/* Signature layout */}
          <div className="pt-12 grid grid-cols-2 gap-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="space-y-4">
              <div className="border-b border-slate-300 h-10" />
              <p>Elaborado y Pagado por Empresa</p>
            </div>
            <div className="space-y-4">
              <div className="border-b border-slate-300 h-10" />
              <p>Recibido Conforme Trabajador (Firma y C.C)</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
