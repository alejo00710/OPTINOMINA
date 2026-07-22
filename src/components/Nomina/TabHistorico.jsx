"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import * as XLSX from 'xlsx';

export default function TabHistorico() {
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistorial() {
      try {
        const { data, error } = await supabase
          .from('historial_nominas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistorial(data || []);
      } catch (err) {
        console.error("Error fetching historial:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistorial();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const exportarNominaAExcel = (registro) => {
    try {
      const payload = registro.payload_json;
      if (!payload || !payload.nomina_calculada) {
        alert("El registro no contiene datos de nómina calculada.");
        return;
      }

      const nominaCalculada = payload.nomina_calculada;
      const wb = XLSX.utils.book_new();

      // HOJA 1: Sábana General
      const sabanaData = nominaCalculada.map(emp => ({
        "Nombre": emp.nombre,
        "Cédula": emp.cedula,
        "Cargo": emp.cargo,
        "Total Devengado": emp.total_devengados || emp.total_devengado || 0,
        "Total Deducido": emp.total_deducciones || emp.total_deducido || 0,
        "Neto a Pagar": emp.neto_pagar || 0
      }));
      const wsSabana = XLSX.utils.json_to_sheet(sabanaData);
      XLSX.utils.book_append_sheet(wb, wsSabana, "Sábana General");

      // HOJAS INDIVIDUALES
      nominaCalculada.forEach(emp => {
        let rawName = emp.nombre ? String(emp.nombre) : String(emp.cedula || 'Empleado');
        // Quitar caracteres no permitidos en nombres de hojas y limitar a 31 caracteres
        let sheetName = rawName.replace(/[\\/?*[\]]/g, '').trim().substring(0, 31);

        const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
        const polizas = safeNumber(emp.poliza_bolivar) + safeNumber(emp.poliza_sura) + safeNumber(emp.poliza_plenitud);

        const aoaData = [
          ['--- INFORMACIÓN DEL EMPLEADO ---', ''],
          ['Nombre', emp.nombre || ''],
          ['Cédula', emp.cedula || ''],
          ['Cargo', emp.cargo || ''],
          ['Salario Base', emp.salario || emp.salario_base || 0],
          ['Banco', emp.banco || ''],
          ['', ''],
          ['--- TIEMPOS Y HORAS ---', ''],
          ['Días Pagados', safeNumber(emp.dias_pagados)],
          ['Horas Diurnas', safeNumber(emp.horas_diurnas)],
          ['Horas Nocturnas', safeNumber(emp.horas_nocturnas)],
          ['Extras Diurnas', safeNumber(emp.extras_diurnas)],
          ['Extras Nocturnas', safeNumber(emp.extras_nocturnas)],
          ['Extras Festivas', safeNumber(emp.extras_festivas)],
          ['Días Incapacidad', safeNumber(emp.dias_incapacidad)],
          ['', ''],
          ['--- DEVENGADOS ---', ''],
          ['Sueldo', safeNumber(emp.sueldo)],
          ['Auxilio de Transporte', safeNumber(emp.aux_transporte || emp.transporte)],
          ['Recargo Nocturno', safeNumber(emp.recargo_nocturno)],
          ['Valor Extras Diurnas', safeNumber(emp.val_extras_diurnas)],
          ['Valor Extras Nocturnas', safeNumber(emp.val_extras_nocturnas)],
          ['Valor Extras Festivas', safeNumber(emp.val_extras_festivas)],
          ['Comisiones', safeNumber(emp.comisiones)],
          ['Incapacidades (Valor)', safeNumber(emp.incapacidad)],
          ['', ''],
          ['--- DEDUCCIONES ---', ''],
          ['Salud', safeNumber(emp.salud)],
          ['Pensión', safeNumber(emp.pension)],
          ['Solidaridad', safeNumber(emp.solidaridad)],
          ['Préstamos', safeNumber(emp.prestamos)],
          ['Pólizas / Seguros', polizas],
          ['Óptica', safeNumber(emp.optica)],
          ['Retención', safeNumber(emp.retencion)],
          ['Libranzas / Otros', safeNumber(emp.libranza_comfama)],
          ['', ''],
          ['--- RESUMEN FINAL ---', ''],
          ['TOTAL DEVENGADO', safeNumber(emp.total_devengados || emp.total_devengado)],
          ['TOTAL DEDUCIDO', safeNumber(emp.total_deducciones || emp.total_deducido)],
          ['NETO A PAGAR', safeNumber(emp.neto_pagar)]
        ];
        
        const wsEmp = XLSX.utils.aoa_to_sheet(aoaData);
        // Manejar posibles nombres duplicados de hojas
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
           const suffix = `_${counter}`;
           finalSheetName = sheetName.substring(0, 31 - suffix.length) + suffix;
           counter++;
        }
        XLSX.utils.book_append_sheet(wb, wsEmp, finalSheetName);
      });

      // Generar archivo
      const fecha = registro.created_at ? registro.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
      const fileName = `Nomina_Historico_${fecha}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (err) {
      console.error("Error exportando a Excel:", err);
      alert("Hubo un error al generar el Excel.");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Histórico de Nóminas</h2>
        <p className="text-sm text-slate-500 mt-1">Auditoría y registro de quincenas cerradas.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : historial.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">No hay nóminas cerradas en el histórico.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-4 px-6">Fecha de Cierre</th>
                <th className="py-4 px-6">Identificador</th>
                <th className="py-4 px-6">Rango de Quincena</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-6 text-sm text-slate-600 font-medium">{formatDate(item.created_at)}</td>
                  <td className="py-3 px-6 text-sm text-slate-900 font-bold">{item.identificador || 'Nómina General'}</td>
                  <td className="py-3 px-6 text-sm text-slate-600">{item.rango_fechas || '-'}</td>
                  <td className="py-3 px-6 text-center">
                    <button
                      onClick={() => exportarNominaAExcel(item)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      📊 Descargar Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
