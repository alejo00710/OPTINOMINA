import React, { useState } from 'react';
import { Plus, Edit2, Power, PowerOff, X, CheckCircle2 } from 'lucide-react';
import { upsertEmployeeRecord, toggleEmployeeStatus } from '@/utils/supabase';
import EmployeeEditorModal from './EmployeeEditorModal';
import { fmtCOP, parseLocalNumber } from "@/utils/mathNomina";

export default function EmployeeDirectory({ employees, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleOpenModal = (emp = null) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (empData) => {
    const res = await upsertEmployeeRecord(empData);
    if (res.success) {
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } else {
      alert("Error guardando empleado.");
    }
  };

  const handleToggleStatus = async (cedula, currentStatus) => {
    if (window.confirm(`¿Seguro que deseas ${currentStatus ? 'desactivar' : 'activar'} a este empleado?`)) {
      const res = await toggleEmployeeStatus(cedula, currentStatus);
      if (res.success && onRefresh) {
        onRefresh();
      }
    }
  };

  
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Directorio de Empleados</h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de datos maestros de la nómina.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Añadir Empleado
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="py-4 px-6">Cédula</th>
              <th className="py-4 px-6">Nombre Completo</th>
              <th className="py-4 px-6">Cargo</th>
              <th className="py-4 px-6">Categoría</th>
              <th className="py-4 px-6">Salario Base</th>
              <th className="py-4 px-6">Rodamiento</th>
              <th className="py-4 px-6">Préstamos</th>
              <th className="py-4 px-6 text-center">Estado</th>
              <th className="py-4 px-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => (
              <tr key={emp.cedula} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-6 text-sm text-slate-600 font-medium">{emp.cedula}</td>
                <td className="py-3 px-6 text-sm text-slate-900 font-bold">{emp.nombre}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{emp.cargo}</td>
                <td className="py-3 px-6 text-sm text-slate-600">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                    {emp.categoria}
                  </span>
                </td>
                <td className="py-3 px-6 text-sm text-slate-900 font-bold">{fmtCOP(emp.salario_base || emp.salario)}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{fmtCOP(emp.rodamiento)}</td>
                <td className="py-3 px-6 text-sm text-slate-600">{fmtCOP(emp.prestamos)}</td>
                <td className="py-3 px-6 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${emp.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {emp.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleOpenModal(emp)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(emp.cedula, emp.is_active !== false)}
                      className={`p-1.5 rounded-lg transition-colors ${emp.is_active !== false ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      title={emp.is_active !== false ? 'Desactivar' : 'Activar'}
                    >
                      {emp.is_active !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-500">No hay empleados registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EmployeeEditorModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        employee={selectedEmployee} 
        onSave={handleSave} 
      />
    </div>
  );
}
