import React from "react";
import { fmtCOP } from "@/utils/mathNomina";

export default function NominaSummaryCards({ totals, filteredPayrollData, categorySegmentedData }) {
  return (
    <>
          {/* Quick Metrics */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stitch-card p-6 bg-slate-900 text-white relative overflow-hidden group shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Neto a Pagar (AL)</p>
              <h3 className="text-3xl font-black tracking-tight">${fmtCOP(totals.neto_pagar)}</h3>
              <p className="text-[9px] font-bold text-yellow-400 mt-3 uppercase tracking-wider">Transferencias quincenales</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Devengado (W)</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">${fmtCOP(totals.total_devengados)}</h3>
              <p className="text-[9px] font-bold text-emerald-500 mt-3 uppercase tracking-wider">Sueldos, recargos y extras</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deducciones (AI)</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">${fmtCOP(totals.total_deducciones)}</h3>
              <p className="text-[9px] font-bold text-rose-500 mt-3 uppercase tracking-wider">Salud, Pensión, Pólizas, Préstamos</p>
            </div>
            <div className="stitch-card p-6 bg-white/80 border border-white/40 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Colaboradores Activos</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{filteredPayrollData.length} Operarios</h3>
              <p className="text-[9px] font-bold text-indigo-500 mt-3 uppercase tracking-wider">Filtro de planilla</p>
            </div>
          </section>

      {/* Segmentación de Costos por Categoría */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(categorySegmentedData).map(([catName, data]) => {
              let themeClass = "border-blue-200/50 bg-gradient-to-br from-blue-50/30 to-white";
              let pillClass = "bg-blue-100 text-blue-800";
              let iconColor = "text-blue-500";
              if (catName === "INYECCIÓN") {
                themeClass = "border-cyan-200/50 bg-gradient-to-br from-cyan-50/30 to-white";
                pillClass = "bg-cyan-100 text-cyan-800";
                iconColor = "text-cyan-500";
              } else if (catName === "TALLER") {
                themeClass = "border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-white";
                pillClass = "bg-purple-100 text-purple-800";
                iconColor = "text-purple-500";
              } else if (catName === "OTROS") {
                themeClass = "border-slate-200/50 bg-gradient-to-br from-slate-50/30 to-white";
                pillClass = "bg-slate-100 text-slate-800";
                iconColor = "text-slate-500";
              } else if (catName === "NUEVOS") {
                themeClass = "border-emerald-200/50 bg-gradient-to-br from-emerald-50/30 to-white";
                pillClass = "bg-emerald-100 text-emerald-800";
                iconColor = "text-emerald-500";
              }

              return (
                <div key={catName} className={`stitch-card p-5 border shadow-sm transition-all duration-300 hover:shadow-md ${themeClass}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${pillClass}`}>
                      {catName}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {data.count} {data.count === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Neto a Pagar:</span>
                      <span className="text-base font-black text-slate-900">${fmtCOP(data.neto)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Costo Recargos/Extras:</span>
                      <span className={`text-xs font-extrabold ${iconColor}`}>${fmtCOP(data.extras)}</span>
                    </div>
                  </div>
                </div>
              );
        })}
      </section>
    </>
  );
}
