import React, { useState, useEffect } from 'react';

export default function FormulaEditorModal({ isOpen, onClose, campoId, currentFormula, onSave }) {
  const [formula, setFormula] = useState(currentFormula || '');

  useEffect(() => {
    if (isOpen) {
      setFormula(currentFormula || '');
    }
  }, [isOpen, currentFormula]);

  if (!isOpen) return null;

  const variables = [
    'sueldo', 'dias_pagados', 'horas_diurnas', 'horas_nocturnas', 
    'extras_diurnas', 'extras_nocturnas', 'extras_festivas',
    'salario_base', 'aux_transporte'
  ];

  const handleSave = () => {
    onSave(formula);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <span>⚙️</span> Configurar Fórmula: <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">{campoId}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-colors font-bold text-lg leading-none">
            ✕
          </button>
        </div>
        
        {/* Cuerpo */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">Fórmula Matemática</label>
            <textarea
              className="w-full h-32 p-4 font-mono text-green-400 bg-slate-900 rounded-xl outline-none border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none shadow-inner"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Ej: (sueldo / 30) * dias_pagados"
              spellCheck="false"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">Variables Disponibles</label>
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {variables.map(v => (
                <button 
                  key={v}
                  onClick={() => setFormula(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + `${v} `)}
                  className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm active:scale-95"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Haz clic en una variable para insertarla en la fórmula.</p>
          </div>
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
          <button 
            onClick={() => onSave('')}
            className="px-5 py-2.5 rounded-xl font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm flex items-center gap-2"
          >
            🗑️ Eliminar Fórmula
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2"
            >
              💾 Guardar Fórmula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
