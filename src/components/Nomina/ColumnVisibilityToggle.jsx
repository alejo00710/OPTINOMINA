import React from "react";
import { SlidersHorizontal } from "lucide-react";

export default function ColumnVisibilityToggle({ hiddenColumns, setHiddenColumns, showColumnManager, setShowColumnManager, PLANILLA_COLUMNS }) {
  return (
    <>
      {/* Selector de Columnas (Ocultar/Mostrar) */}
      <div className="relative w-full md:w-auto">
                <button
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:border-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 duration-150"
                >
                  <SlidersHorizontal size={14} className="text-slate-400" />
                  Columnas ({PLANILLA_COLUMNS.length - Object.values(hiddenColumns).filter(Boolean).length} visibles)
                </button>

                {showColumnManager && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-40 max-h-[300px] overflow-y-auto space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Mostrar / Ocultar Columnas</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                      {PLANILLA_COLUMNS.map(col => {
                        const isProtected = ["consecutivo", "nombre"].includes(col.key);
                        if (isProtected) return null;
                        const isHidden = !!hiddenColumns[col.key];
  return (
                          <label key={col.key} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => setHiddenColumns(prev => ({
                                ...prev,
                                [col.key]: !prev[col.key]
                              }))}
                              className="accent-slate-900 cursor-pointer"
                            />
                            <span className="truncate" title={col.label}>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
    </>
  );
}
