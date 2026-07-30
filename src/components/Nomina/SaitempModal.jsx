import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, Plus } from 'lucide-react';

export default function SaitempModal({ isOpen, onClose, employee }) {
  const [novedades, setNovedades] = useState([
    { id: 1, novedad: '', fechaInicio: '', fechaFinal: '', totalDias: '' }
  ]);
  
  const [formData, setFormData] = useState({
    recargoNocturno: '',
    horasExtrasDiurnas: '',
    horasExtrasNocturnas: '',
    horasExtrasFestivasDiurnas: '',
    descuentos: '',
    auxilios: '',
    comisiones: '',
    observaciones: ''
  });

  const formatHour = (val) => (val !== null && val !== undefined && val !== '') ? Number(val).toFixed(1) : '';

  useEffect(() => {
    if (employee && isOpen) {
      setNovedades([{ id: 1, novedad: '', fechaInicio: '', fechaFinal: '', totalDias: '' }]);
      setFormData({
        recargoNocturno: formatHour(employee.horas_nocturnas),
        horasExtrasDiurnas: formatHour(employee.extras_diurnas),
        horasExtrasNocturnas: formatHour(employee.extras_nocturnas),
        horasExtrasFestivasDiurnas: formatHour(employee.extras_festivas),
        descuentos: '',
        auxilios: '',
        comisiones: '',
        observaciones: ''
      });
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNovedadChange = (id, field, value) => {
    setNovedades(prev => prev.map(nov => nov.id === id ? { ...nov, [field]: value } : nov));
  };

  const addNovedad = () => {
    setNovedades(prev => [...prev, { id: Date.now(), novedad: '', fechaInicio: '', fechaFinal: '', totalDias: '' }]);
  };

  const removeNovedad = (id) => {
    setNovedades(prev => prev.filter(nov => nov.id !== id));
  };

  const handleSave = () => {
    console.log("Reporte SAITEMP guardado para", employee.nombre, { novedades, ...formData });
    onClose();
  };

  const novedadesOptions = [
    'INGRESO', 'INCAPACIDAD EG', 'RENUNCIA/TERM. CONTRATO', 'AUSENCIA', 'CALAMIDAD', 
    'PERMISO REMUNERADO', 'PERMISO NO REMUNERADO', 'ABANDONO', 'LICENCIA MATERNIDAD', 'SANCIONADO',
    'FALLECIMIENTO', 'TRABAJO EN CASA', 'INCAPACIDAD AT', 'OTRO NO ESPECIFICADO'
  ];

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[100] animate-fadeIn p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-500 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              📋 Formato SAITEMP
            </h3>
            <p className="text-amber-100 text-sm font-semibold mt-1">
              Reporte de novedades para personal en misión
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-slate-50">
          
          {/* SECCIÓN 1 (Info Empleado) */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1. Información del Empleado</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identificación</label>
                <div className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold text-sm border border-slate-200">{employee.cedula}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombres y Apellidos</label>
                <div className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold text-sm border border-slate-200">{employee.nombre}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo / Área</label>
                <div className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold text-sm border border-slate-200 capitalize">{employee.cargo?.toLowerCase() || 'N/A'}</div>
              </div>
            </div>
          </section>

          {/* Bloques de Novedad Dinámicos */}
          <div className="space-y-6">
            {novedades.map((nov, index) => (
              <div key={nov.id} className="border border-gray-200 bg-slate-50 p-4 rounded-lg relative shadow-sm">
                
                {novedades.length > 1 && (
                  <button
                    onClick={() => removeNovedad(nov.id)}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 font-bold text-xs flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-rose-100 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}

                <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider mb-4 border-b border-amber-200 pb-2">Novedad #{index + 1}</h4>

                {/* SECCIÓN 2 (Tipo de Novedad) */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3">2. Tipo de Novedad</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {novedadesOptions.map(opt => (
                      <label key={opt} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${nov.novedad === opt ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                        <input 
                          type="radio" 
                          name={`novedad-${nov.id}`} 
                          value={opt}
                          checked={nov.novedad === opt}
                          onChange={(e) => handleNovedadChange(nov.id, 'novedad', e.target.value)}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SECCIÓN 3 (Fechas) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3">3. Fechas de Novedad</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Inicio</label>
                      <input type="date" value={nov.fechaInicio} onChange={(e) => handleNovedadChange(nov.id, 'fechaInicio', e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Final</label>
                      <input type="date" value={nov.fechaFinal} onChange={(e) => handleNovedadChange(nov.id, 'fechaFinal', e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Días</label>
                      <input type="number" value={nov.totalDias} onChange={(e) => handleNovedadChange(nov.id, 'totalDias', e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addNovedad}
              className="w-full border-dashed border-2 border-blue-400 hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Añadir otra novedad
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SECCIÓN 4 (Horas y Recargos) */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">4. Horas y Recargos (Total Quincena)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RECARGO NOCTURNO Hrs.</label>
                  <input type="number" name="recargoNocturno" value={formData.recargoNocturno} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HORAS EXTRAS DIURNAS</label>
                  <input type="number" name="horasExtrasDiurnas" value={formData.horasExtrasDiurnas} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HORAS EXTRAS NOCTURNAS</label>
                  <input type="number" name="horasExtrasNocturnas" value={formData.horasExtrasNocturnas} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HORAS EXTRAS FESTIVAS DIURNAS</label>
                  <input type="number" name="horasExtrasFestivasDiurnas" value={formData.horasExtrasFestivasDiurnas} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
              </div>
            </section>

            {/* SECCIÓN 5 (Adicionales) */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">5. Adicionales (Total Quincena)</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DESCUENTOS DE NÓMINA</label>
                  <input type="text" name="descuentos" value={formData.descuentos} onChange={handleChange} placeholder="Ej. 9886.0 - Poliza" className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">AUXILIO DE RODAMIENTO A COMERCIAL</label>
                  <input type="text" name="auxilios" value={formData.auxilios} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">COMISIÓN DE VENTA (PRESTACIONAL)</label>
                  <input type="text" name="comisiones" value={formData.comisiones} onChange={handleChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow" />
                </div>
              </div>
            </section>
          </div>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones / Detalles Extra</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow resize-none"></textarea>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-6 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Save size={18} />
            Guardar Reporte
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
