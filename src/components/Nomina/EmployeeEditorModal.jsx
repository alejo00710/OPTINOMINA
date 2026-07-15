"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import { parseLocalNumber } from '@/utils/mathNomina';
import { upsertEmployeeRecord } from '@/utils/supabase';
import EditableCell from './EditableCell';

export default function EmployeeEditorModal({ isOpen, onClose, employee, refreshEmployees }) {
  const [formData, setFormData] = useState({
    cedula: '',
    biometric_id: '',
    nombre: '',
    cargo: '',
    categoria: 'OTROS',
    salario_base: 0,
    aux_transporte: 0,
    rodamiento: 0,
    poliza_bolivar: 0,
    poliza_sura: 0,
    optica: 0,
    prestamos: 0,
    banco: '',
    tipo_vinculacion: 'Empresa'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        cedula: employee.cedula || '',
        biometric_id: employee.biometric_id || '',
        nombre: employee.nombre || '',
        cargo: employee.cargo || '',
        categoria: employee.categoria || 'OTROS',
        salario_base: employee.salario_base || employee.salario || 0,
        aux_transporte: employee.aux_transporte || 0,
        rodamiento: employee.rodamiento || 0,
        poliza_bolivar: employee.poliza_bolivar || 0,
        poliza_sura: employee.poliza_sura || 0,
        optica: employee.optica || 0,
        prestamos: employee.prestamos || 0,
        banco: employee.banco || '',
        tipo_vinculacion: employee.tipo_vinculacion || 'Empresa'
      });
    } else {
      setFormData({
        cedula: '',
    biometric_id: '',
        nombre: '',
        cargo: '',
        categoria: 'OTROS',
        salario_base: 0,
        aux_transporte: 0,
        rodamiento: 0,
        poliza_bolivar: 0,
        poliza_sura: 0,
        optica: 0,
        prestamos: 0,
        banco: '',
        tipo_vinculacion: 'Empresa'
      });
    }
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cedula || !formData.nombre) {
      alert("Faltan campos obligatorios");
      return;
    }
    
    try {
      console.log("🚀 INTENTANDO GUARDAR PAYLOAD:", formData);
      setIsLoading(true);
      
      const empData = {
        cedula: formData.cedula,
        biometric_id: formData.biometric_id,
        nombre: formData.nombre.toUpperCase(),
        cargo: formData.cargo.toUpperCase(),
        categoria: formData.categoria.toUpperCase(),
        salario_base: parseLocalNumber(formData.salario_base),
        aux_transporte: parseLocalNumber(formData.aux_transporte),
        rodamiento: parseLocalNumber(formData.rodamiento),
        poliza_bolivar: parseLocalNumber(formData.poliza_bolivar),
        poliza_sura: parseLocalNumber(formData.poliza_sura),
        optica: parseLocalNumber(formData.optica),
        prestamos: parseLocalNumber(formData.prestamos),
        banco: formData.banco ? formData.banco.toUpperCase() : '',
        tipo_vinculacion: formData.tipo_vinculacion,
        is_active: true
      };
      
      console.log("Enviando a Supabase...", empData);
      const result = await upsertEmployeeRecord(empData);
      
      if (!result.success) {
        throw new Error(result.error?.message || "Error desconocido de Supabase");
      }
      
      alert("✅ GUARDADO CORRECTO");
      if (refreshEmployees) {
        await refreshEmployees();
      }
      if (onClose) {
        onClose(); // Cierra el modal
      }
      
    } catch (error) {
      console.error("Error capturado:", error);
      alert("❌ ERROR SUPABASE: " + (error.message || JSON.stringify(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumChange = (field, val) => {
    setFormData({ ...formData, [field]: val });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {employee ? 'Editar Empleado' : 'Añadir Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-500"/>
          </button>
        </div>
        
        {/* Body con Scroll interno */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Informacion General */}
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cédula</span>
              <input
                required
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                readOnly={!!employee}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none"
                placeholder="Ej: 10203040"
              />
            </div>
            
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">ID Biométrico (ZKTeco)</span>
              <input
                type="text"
                value={formData.biometric_id}
                onChange={(e) => setFormData({...formData, biometric_id: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none"
                placeholder="Ej: 123"
              />
            </div>
            
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</span>
              <input
                required
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none uppercase"
                placeholder="Nombres y Apellidos"
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo</span>
              <input
                required
                type="text"
                value={formData.cargo}
                onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none uppercase"
                placeholder="Ej: OPERARIO"
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</span>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none bg-transparent appearance-none"
                dir="rtl"
              >
                <option value="INYECCIÓN">INYECCIÓN</option>
                <option value="TALLER">TALLER</option>
                <option value="OTROS">OTROS</option>
                <option value="NUEVOS">NUEVOS</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Banco</span>
              <input
                type="text"
                value={formData.banco}
                onChange={(e) => setFormData({...formData, banco: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none uppercase"
                placeholder="Ej: BANCOLOMBIA"
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Vinculación</span>
              <select
                value={formData.tipo_vinculacion}
                onChange={(e) => setFormData({...formData, tipo_vinculacion: e.target.value})}
                className="w-full text-right text-sm font-medium text-slate-900 focus:ring-0 outline-none bg-transparent appearance-none"
                dir="rtl"
              >
                <option value="Empresa">Empresa</option>
                <option value="Temporal">Temporal</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Salario Base</span>
              <EditableCell
                value={formData.salario_base}
                onChange={(v) => handleNumChange('salario_base', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Aux. Transporte</span>
              <EditableCell
                value={formData.aux_transporte}
                onChange={(v) => handleNumChange('aux_transporte', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Rodamiento</span>
              <EditableCell
                value={formData.rodamiento}
                onChange={(v) => handleNumChange('rodamiento', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Póliza Bolívar</span>
              <EditableCell
                value={formData.poliza_bolivar}
                onChange={(v) => handleNumChange('poliza_bolivar', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Póliza Sura</span>
              <EditableCell
                value={formData.poliza_sura}
                onChange={(v) => handleNumChange('poliza_sura', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Óptica</span>
              <EditableCell
                value={formData.optica}
                onChange={(v) => handleNumChange('optica', v)}
                isCurrency={true}
              />
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Préstamos</span>
              <EditableCell
                value={formData.prestamos}
                onChange={(v) => handleNumChange('prestamos', v)}
                isCurrency={true}
              />
            </div>
            
                      </div>
            
            <div className="mt-8 flex justify-end gap-3 z-10 relative pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
              >
                {isLoading ? 'Guardando...' : <><CheckCircle2 className="w-4 h-4" /> Guardar Empleado</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}