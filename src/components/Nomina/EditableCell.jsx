"use client";
import { useState, useEffect } from "react";
import { fmtCOP, parseLocalNumber } from "@/utils/mathNomina";

export default function EditableCell({
  value,
  onChange,
  isOverridden = false,
  isCalculated = false,
  isCurrency = false,
  isDecimal = false,
  isReadOnly = false,
  disabled = false,
  extraClasses = ""
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);
  const [hasUserTyped, setHasUserTyped] = useState(false);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const canEdit = !isReadOnly && !disabled;

  let displayValue = value;
  if (!isEditing) {
    if (value === "" || value === null || value === undefined) {
      displayValue = isCurrency ? "$ 0" : (isDecimal ? "0.0" : "0");
    } else if (isCurrency) {
      displayValue = `$ ${fmtCOP(value)}`;
    } else if (isDecimal) {
      displayValue = Number(value).toFixed(1);
    }
  }

  const startEditing = () => {
    if (!canEdit) return;
    setHasUserTyped(false);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Solo enviar al estado de overrides si el usuario realmente digitó algo
    if (!hasUserTyped) {
      setLocalVal(value);
      return;
    }
    setHasUserTyped(false);

    if (localVal === '' || localVal === null || localVal === undefined || (typeof localVal === 'string' && localVal.trim() === '')) {
      onChange('');
      return;
    }

    const cleanNum = parseLocalNumber(localVal);
    // Disparar si el valor limpio numéricamente cambió
    const prevNum = parseLocalNumber(value);
    if (cleanNum !== prevNum || String(value) === '') {
      onChange(cleanNum);
    }
  };

  const getContainerClasses = () => {
    if (!canEdit) return 'cursor-default opacity-85';
    if (isOverridden) {
      return 'bg-amber-50/70 border border-amber-300 ring-1 ring-amber-300/40 hover:bg-amber-100/70';
    }
    if (isCalculated) {
      return 'bg-indigo-50/50 border border-indigo-200 hover:bg-indigo-100/50';
    }
    return 'hover:bg-slate-100/50 border border-transparent';
  };

  return (
    <div
      title={
        !canEdit
          ? "Campo protegido / Solo lectura"
          : isOverridden
          ? "Valor sobreescrito manualmente (Override activo)"
          : isCalculated
          ? "Dato calculado desde Liquidación / Fórmulas"
          : "Haz clic para editar manualmente"
      }
      className={`relative group px-3 py-2 -mx-3 -my-2 rounded-lg transition-all duration-200 ${canEdit ? 'cursor-text' : 'cursor-default'} ${getContainerClasses()}`}
      onClick={startEditing}
    >
      {/* Pin / Indicador sutil de override manual en la esquina */}
      {isOverridden && !isEditing && (
        <span
          title="Valor sobreescrito a mano (Override)"
          className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-xs ring-1 ring-white"></span>
        </span>
      )}

      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={localVal}
          onChange={(e) => {
            setHasUserTyped(true);
            setLocalVal(e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          className="w-full bg-transparent border-none p-0 m-0 text-sm font-semibold text-slate-900 focus:ring-0 outline-none text-right"
        />
      ) : (
        <div className={`w-full text-right text-sm font-medium flex items-center justify-end gap-1.5 ${isOverridden ? 'text-amber-950 font-bold' : 'text-slate-700'} ${extraClasses}`}>
          {isOverridden && (
            <span
              title="Manual"
              className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
            />
          )}
          <span>{displayValue}</span>
        </div>
      )}
    </div>
  );
}
