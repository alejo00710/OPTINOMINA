import React from 'react';

export default function ColillaImprimible({ empleado, periodo }) {
  if (!empleado) return null;

  const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
  const formatHour = (val) => (val !== null && val !== undefined && val !== '') ? Number(val).toFixed(1) : '0.0';

  const formatCurrency = (val) => {
    // The screenshot shows $1.973.754 without spaces
    return '$' + safeNumber(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDate = () => {
    // Use the end of the period or today, for now just a static format based on the screenshot, or dynamic.
    // The screenshot has "30/06/2026"
    const today = new Date();
    return today.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const polizas = safeNumber(empleado.poliza_bolivar) + safeNumber(empleado.poliza_sura) + safeNumber(empleado.poliza_plenitud);
  const prestamos = safeNumber(empleado.prestamos);
  const saldoPrestamo = safeNumber(empleado.saldo_prestamo);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #colilla-imprimible, #colilla-imprimible * {
            visibility: visible;
          }
          #colilla-imprimible {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        #colilla-imprimible * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>
      <div id="colilla-imprimible" className="w-full max-w-4xl mx-auto bg-[#ffffff] text-[#000000] font-sans text-[11px] p-6">
          
        {/* 1. ENCABEZADO */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo-optimoldes.png" alt="Optimoldes Logo" className="h-24 w-auto object-contain" />
            </div>
            <span className="text-[#4b5563] font-bold text-[10px] mt-2">NIT. 900.069.620-9</span>
            <span className="text-[#6b7280] text-[9px]">Carrera 41 C No. 50-16 - Teléfono: 277 77 18 - Itagüí</span>
          </div>
          <div className="text-right flex flex-col justify-end pt-4">
            <div className="text-[#3b71ca] font-bold text-lg tracking-wide uppercase">COMPROBANTE DE PAGO DE NÓMINA</div>
            <div className="text-[#000000] font-bold text-sm mt-1 uppercase">NOM-{empleado.consecutivo ? String(empleado.consecutivo).padStart(5, '0') : '00001'} {new Date().getFullYear().toString().slice(-2)}</div>
          </div>
        </div>

        {/* 2. TABLA DE INFORMACIÓN */}
        <div className="border border-[#9ca3af] flex flex-col mb-2">
          {/* Fila 1 */}
          <div className="flex border-b border-[#9ca3af]">
            <div className="w-[15%] p-1 flex flex-col">
              <span className="text-[10px] font-bold">FECHA</span>
              <span className="font-bold text-sm">{formatDate()}</span>
            </div>
            <div className="w-[60%] p-1 flex flex-col">
              <span className="text-[10px] font-bold">PAGADO A</span>
              <span className="font-bold text-sm uppercase">{empleado.nombre}</span>
              <div className="text-[10px] mt-1 flex gap-10 uppercase">
                <span>CC. {empleado.cedula}</span>
                <span>CARGO: {empleado.cargo}</span>
              </div>
            </div>
            <div className="w-[25%] p-1 flex flex-col items-end text-right">
              <span className="text-[10px] font-bold">VALOR A PAGAR</span>
              <span className="font-bold text-xl">{formatCurrency(safeNumber(empleado.neto_pagar))}</span>
            </div>
          </div>
        </div>

        {/* 3. DETALLE Y SALARIO */}
        <div className="flex justify-between px-1 mb-1 border-b-2 border-[#1f2937] pb-1 uppercase">
          <div className="font-bold text-[10px]">DETALLE: {periodo}</div>
          <div className="font-bold text-[10px]">SALARIO BÁSICO: {formatCurrency(safeNumber(empleado.salario || empleado.salario_base))}</div>
        </div>

        {/* 4. TABLA DE CONCEPTOS */}
        <table className="w-full border-collapse border border-[#9ca3af] mb-2 uppercase text-[10px]">
          <thead>
            <tr className="border-b border-[#9ca3af] font-bold bg-[#ffffff]">
              <th className="border-r border-[#9ca3af] px-2 py-1 text-center font-normal">DESCRIPCIÓN</th>
              <th className="border-r border-[#9ca3af] px-2 py-1 w-28 text-center font-normal">PAGOS</th>
              <th className="px-2 py-1 w-28 text-center font-normal">DEDUCCIONES</th>
            </tr>
          </thead>
          <tbody>
            {/* DEVENGADOS */}
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{formatHour(empleado.horas_diurnas)} Hrs. DIURNAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.sueldo))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{formatHour(empleado.horas_nocturnas)} Hrs. RECARGO NOCTURNO</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.recargo_nocturno))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{formatHour(empleado.extras_diurnas)} Hrs. EXTRAS DIURNAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.val_extras_diurnas))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{formatHour(empleado.extras_nocturnas)} Hrs. EXTRAS NOCTURNAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.val_extras_nocturnas))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{formatHour(empleado.extras_festivas)} Hrs. EXTRAS FESTIVAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.val_extras_festivas))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{safeNumber(empleado.dias_incapacidad)} DÍAS INCAPACIDAD</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.incapacidad))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">{safeNumber(empleado.dias_pagados)} DÍAS AUXILIO DE TRANSPORTE</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.aux_transporte || empleado.transporte))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">AUXILIO DE RODAMIENTO</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.rodamiento))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">COMISIONES DE VENTA</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.comisiones))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">BONIFICACIÓN NO SALARIAL</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.bonificacion))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">AJUSTE DE VACACIONES PAGADAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.vacaciones))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">PRIMA DE SERVICIOS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.prima))}</td>
              <td className="px-2 text-right"></td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">INTERESES A LAS CESANTIAS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right">{formatCurrency(safeNumber(empleado.intereses_cesantias))}</td>
              <td className="px-2 text-right"></td>
            </tr>

            {/* DEDUCCIONES */}
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">APORTES A SALUD TRABAJADOR (4%)</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.salud))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">APORTES A PENSIÓN TRABAJADOR (4%)</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.pension))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">APORTES A FSP (1%)</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.solidaridad))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">ABONO A PRÉSTAMOS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(prestamos)}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">POLIZA DE BOLIVAR</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.poliza_bolivar))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">CONVENIO PLENITUD</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.poliza_plenitud))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">LIBRANZA COMFAMA</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.libranza_comfama))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">POLIZA SURA</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.poliza_sura))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">ÓPTICA</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.optica))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">CELULAR</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.celular))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">SEMANA DE LA SALUD</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.semana_salud))}</td>
            </tr>
            <tr>
              <td className="border-r border-[#9ca3af] px-2 text-left">RETENCIÓN SOBRE SALARIOS</td>
              <td className="border-r border-[#9ca3af] px-2 text-right"></td>
              <td className="px-2 text-right">{formatCurrency(safeNumber(empleado.retencion))}</td>
            </tr>

            {/* Espaciador para completar tabla */}
            <tr>
              <td className="border-r border-[#9ca3af] px-2 py-4 text-left"></td>
              <td className="border-r border-[#9ca3af] px-2 py-4 text-right"></td>
              <td className="px-2 py-4 text-right"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-[#9ca3af] font-bold">
              <td className="border-r border-[#9ca3af] px-2 py-1 text-right">TOTALES</td>
              <td className="border-r border-[#9ca3af] px-2 py-1 text-right">{formatCurrency(safeNumber(empleado.total_devengados || empleado.total_devengado))}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(safeNumber(empleado.total_deducciones || empleado.total_deducido))}</td>
            </tr>
          </tfoot>
        </table>

        {/* 5. PIE DE PÁGINA */}
        <div className="border border-[#9ca3af] p-1 mb-8 font-normal text-[10px]">
          VALOR (En letras):
        </div>

        <div className="flex justify-between items-end mt-12">
          <div className="w-1/2 flex items-center">
            <span className="font-normal text-[10px] underline mr-2">Saldo Préstamo:</span>
            <span className="font-bold text-[10px] underline">{formatCurrency(saldoPrestamo)}</span>
          </div>
          <div className="w-1/2 flex flex-col items-center">
            <div className="text-center font-bold text-[10px] w-full">FIRMA DE RECIBIDO</div>
            <div className="mt-8 border-b border-[#000000] w-64 text-left font-bold text-[10px] pb-1 pl-1">C.C.</div>
          </div>
        </div>
      </div>
    </>
  );
}
