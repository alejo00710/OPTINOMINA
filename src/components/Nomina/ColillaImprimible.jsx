import React from 'react';

export default function ColillaImprimible({ empleado, periodo }) {
  if (!empleado) return null;

  const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('es-CO');
  };

  const polizas = safeNumber(empleado.poliza_bolivar) + safeNumber(empleado.poliza_sura) + safeNumber(empleado.poliza_plenitud);
  const prestamos = safeNumber(empleado.prestamos);

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
      `}</style>
      <div id="colilla-imprimible" className="w-full bg-white text-black font-sans text-[10px] p-6 uppercase">
        
        {/* 1. ENCABEZADO */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <span className="font-bold text-sm">OPTIMOLDES S.A.S</span>
            <span className="text-gray-800">NIT. 900.069.620-9</span>
            <span className="text-gray-800">CARRERA 41 C NO. 50-16 - TELÉFONO: 277 77 18 - ITAGÜÍ</span>
          </div>
          <div className="border border-gray-600 rounded-xl p-2 text-right w-1/2 flex flex-col justify-center">
            <div className="text-blue-700 font-black text-xl leading-tight">COMPROBANTE DE PAGO DE NÓMINA</div>
            <div className="text-black font-bold mt-1 text-xs">NOM-{empleado.consecutivo ? String(empleado.consecutivo).padStart(5, '0') : '00001'}</div>
          </div>
        </div>

        {/* 2. TABLA DE INFORMACIÓN */}
        <div className="border border-black flex flex-col mb-1">
          {/* Fila 1 */}
          <div className="flex border-b border-black">
            <div className="w-1/4 border-r border-black p-1 flex flex-col justify-center">
              <span>FECHA</span>
              <span className="font-bold text-xs">{formatDate()}</span>
            </div>
            <div className="w-1/2 border-r border-black p-1 flex flex-col justify-center text-center">
              <span>PAGADO A</span>
              <span className="font-bold text-base">{empleado.nombre}</span>
            </div>
            <div className="w-1/4 p-1 flex flex-col justify-center text-right">
              <span>VALOR A PAGAR</span>
              <span className="font-bold text-xl">{formatCurrency(safeNumber(empleado.neto_pagar))}</span>
            </div>
          </div>
          {/* Fila 2 */}
          <div className="border-b border-black p-1 text-center font-bold text-xs">
            CC. {empleado.cedula} &nbsp;&nbsp;&nbsp; CARGO: {empleado.cargo}
          </div>
          {/* Fila 3 */}
          <div className="flex justify-between p-1 font-bold text-xs">
            <div>DETALLE: NÓMINA {periodo || 'QUINCENAL'}</div>
            <div>SALARIO BÁSICO {formatCurrency(safeNumber(empleado.salario || empleado.salario_base))}</div>
          </div>
        </div>

        {/* 3. TABLA DE CONCEPTOS */}
        <table className="w-full border-collapse border border-black mt-1">
          <thead>
            <tr className="border-y border-black font-bold">
              <th className="border-x border-black px-1 py-1 w-20 text-center">CODIGO</th>
              <th className="border-x border-black px-1 py-1 text-left">DESCRIPCIÓN</th>
              <th className="border-x border-black px-1 py-1 w-28 text-right">PAGOS</th>
              <th className="border-x border-black px-1 py-1 w-28 text-right">DEDUCCIONES</th>
            </tr>
          </thead>
          <tbody>
            {/* DEVENGADOS */}
            {safeNumber(empleado.sueldo) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720101</td>
                <td className="border-x border-black px-1 text-left">SUELDO</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.sueldo))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.aux_transporte || empleado.transporte) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720102</td>
                <td className="border-x border-black px-1 text-left">AUXILIO DE TRANSPORTE</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.aux_transporte || empleado.transporte))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.val_extras_diurnas) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720105</td>
                <td className="border-x border-black px-1 text-left">HORAS EXTRAS DIURNAS</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.val_extras_diurnas))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.val_extras_nocturnas) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720106</td>
                <td className="border-x border-black px-1 text-left">HORAS EXTRAS NOCTURNAS</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.val_extras_nocturnas))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.val_extras_festivas) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720107</td>
                <td className="border-x border-black px-1 text-left">HORAS EXTRAS FESTIVAS</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.val_extras_festivas))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.recargo_nocturno) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720108</td>
                <td className="border-x border-black px-1 text-left">RECARGO NOCTURNO</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.recargo_nocturno))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.comisiones) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720110</td>
                <td className="border-x border-black px-1 text-left">COMISIONES</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.comisiones))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}
            {safeNumber(empleado.incapacidad) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">720115</td>
                <td className="border-x border-black px-1 text-left">INCAPACIDADES (VALOR)</td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.incapacidad))}</td>
                <td className="border-x border-black px-1 text-right"></td>
              </tr>
            )}

            {/* DEDUCCIONES */}
            {safeNumber(empleado.salud) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">237005</td>
                <td className="border-x border-black px-1 text-left">APORTES A SALUD</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.salud))}</td>
              </tr>
            )}
            {safeNumber(empleado.pension) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">238030</td>
                <td className="border-x border-black px-1 text-left">APORTES A PENSIÓN</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.pension))}</td>
              </tr>
            )}
            {safeNumber(empleado.solidaridad) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">238035</td>
                <td className="border-x border-black px-1 text-left">FONDO DE SOLIDARIDAD</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.solidaridad))}</td>
              </tr>
            )}
            {prestamos > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">136505</td>
                <td className="border-x border-black px-1 text-left">PRÉSTAMOS</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(prestamos)}</td>
              </tr>
            )}
            {polizas > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">237010</td>
                <td className="border-x border-black px-1 text-left">PÓLIZAS / SEGUROS</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(polizas)}</td>
              </tr>
            )}
            {safeNumber(empleado.optica) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">237015</td>
                <td className="border-x border-black px-1 text-left">ÓPTICA</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.optica))}</td>
              </tr>
            )}
            {safeNumber(empleado.retencion) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">236505</td>
                <td className="border-x border-black px-1 text-left">RETENCIÓN EN LA FUENTE</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.retencion))}</td>
              </tr>
            )}
            {safeNumber(empleado.libranza_comfama) > 0 && (
              <tr>
                <td className="border-x border-black px-1 text-center">237020</td>
                <td className="border-x border-black px-1 text-left">LIBRANZAS / OTROS</td>
                <td className="border-x border-black px-1 text-right"></td>
                <td className="border-x border-black px-1 text-right">{formatCurrency(safeNumber(empleado.libranza_comfama))}</td>
              </tr>
            )}
            
            {/* Espaciador para asegurar un minimo de altura si se quiere (opcional) */}
            <tr>
              <td className="border-x border-black px-1 py-4"></td>
              <td className="border-x border-black px-1 py-4 text-left"></td>
              <td className="border-x border-black px-1 py-4 text-right"></td>
              <td className="border-x border-black px-1 py-4 text-right"></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-y border-black font-bold">
              <td className="border-x border-black px-1 py-1"></td>
              <td className="border-x border-black px-1 py-1 text-right">TOTALES</td>
              <td className="border-x border-black px-1 py-1 text-right">{formatCurrency(safeNumber(empleado.total_devengados || empleado.total_devengado))}</td>
              <td className="border-x border-black px-1 py-1 text-right">{formatCurrency(safeNumber(empleado.total_deducciones || empleado.total_deducido))}</td>
            </tr>
          </tfoot>
        </table>

        {/* 4. PIE DE PÁGINA */}
        <div className="border border-black p-1 mt-1 mb-8 font-bold text-xs">
          VALOR (EN LETRAS):
        </div>

        <div className="flex justify-between items-end px-2 mt-10">
          <div className="w-1/2">
            <span className="font-bold underline text-xs">SALDO PRÉSTAMO: {formatCurrency(0)}</span>
          </div>
          <div className="w-1/2 flex flex-col items-end">
            <div className="border-b border-black w-64 mb-1"></div>
            <div className="w-64 text-left font-bold text-xs">FIRMA DE RECIBIDO</div>
            <div className="w-64 text-left font-bold text-xs">C.C.</div>
          </div>
        </div>
      </div>
    </>
  );
}
