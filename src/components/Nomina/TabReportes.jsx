import React from "react";
import NominaSummaryCards from "./NominaSummaryCards";

export default function TabReportes({ totals, filteredPayrollData, categorySegmentedData, bankTotals, fmtCOP }) {
  return (
    <div className="space-y-6 animate-stitch">
      <NominaSummaryCards 
        totals={totals} 
        filteredPayrollData={filteredPayrollData} 
        categorySegmentedData={categorySegmentedData} 
      />

      {/* Bank Transfer Summaries */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="stitch-card p-6 bg-gradient-to-br from-yellow-50/50 to-white border border-yellow-200/50 shadow-md flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest mb-1">TOTAL TRANSFERENCIAS BANCOLOMBIA</p>
            <p className="text-xs text-slate-500 font-bold">Colaboradores inscritos en Bancolombia</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900">${fmtCOP(bankTotals.bancolombia)}</h3>
        </div>
        <div className="stitch-card p-6 bg-gradient-to-br from-blue-50/50 to-white border border-blue-200/50 shadow-md flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">TOTAL TRANSFERENCIAS CAJA SOCIAL</p>
            <p className="text-xs text-slate-500 font-bold">Colaboradores inscritos en Caja Social</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900">${fmtCOP(bankTotals.cajaSocial)}</h3>
        </div>
      </section>
    </div>
  );
}
