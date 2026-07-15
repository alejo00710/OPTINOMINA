"use client";
import { useState, useEffect } from "react";
import { fmtCOP, parseLocalNumber } from "@/utils/mathNomina";

export default function EditableCell({ value, onChange, isOverridden, isCalculated = false, isCurrency = false, isDecimal = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => { setLocalVal(value); }, [value]);

  let displayValue = value;
  if (!isEditing) {
    if (isCurrency) displayValue = `$ ${fmtCOP(value)}`;
    else if (isDecimal) displayValue = Number(value).toFixed(1);
  }

  const handleBlur = () => {
    setIsEditing(false);
    const cleanNum = parseLocalNumber(localVal);
    onChange(cleanNum);
  };

  const getContainerClasses = () => {
    if (isOverridden) return 'bg-amber-50/50 hover:bg-amber-100/50';
    if (isCalculated) return 'bg-indigo-50/50 border border-indigo-200 hover:bg-indigo-100/50';
    return 'hover:bg-slate-100/50';
  };

  return (
    <div
      title={isCalculated && !isOverridden ? "Dato calculado desde Liquidación" : ""}
      className={`relative group px-3 py-2 -mx-3 -my-2 rounded-lg transition-all duration-200 cursor-text ${getContainerClasses()}`}
      onClick={() => setIsEditing(true)}
    >
      {isOverridden && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" title="Valor congelado"></span>
      )}
      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
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