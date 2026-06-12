"use client";
import { useState } from "react";
import { fmtCOP } from "@/utils/mathNomina";

export default function EditableCell({ value, onChange, isOverridden, isCurrency = false, isDecimal = false }) {
  const [isEditing, setIsEditing] = useState(false);

  let displayValue = value;
  if (!isEditing) {
    if (isCurrency) displayValue = `$ ${fmtCOP(value)}`;
    else if (isDecimal) displayValue = Number(value).toFixed(2);
  }

  return (
    <div
      className={`relative group px-3 py-2 -mx-3 -my-2 rounded-lg transition-all duration-200 cursor-text
      ${isOverridden ? 'bg-amber-50/50' : 'hover:bg-slate-100/50'}`}
      onClick={() => setIsEditing(true)}
    >
      {isOverridden && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" title="Valor congelado"></span>
      )}

      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full bg-transparent border-none p-0 m-0 text-sm font-semibold text-slate-900 focus:ring-0 outline-none text-right"
        />
      ) : (
        <div className={`w-full text-right text-sm font-medium ${isOverridden ? 'text-amber-900' : 'text-slate-700'}`}>
          {displayValue}
        </div>
      )}
    </div>
  );
}