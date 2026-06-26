import React, { useState } from 'react';
import { Plus, Edit2, Power, PowerOff, X, CheckCircle2 } from 'lucide-react';
import { upsertEmployeeRecord, toggleEmployeeStatus } from '@/utils/supabase';

export default function EmployeeDirectory({ employees, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    cargo: '',
    categoria: 'OTROS',
    salario_base: '',
    aux_transporte: '',
    rodamiento: '',
    poliza_bolivar: '',
    poliza_sura: '',
    optica: '',
    prestamos: ''
  });

  const handleOpenModal = (emp = null) => {
    if (emp) {
      setFormData({
        cedula: emp.cedula,
        nombre: emp.nombre,
        cargo: emp.cargo,
        categoria: emp.categoria,
        salario_base: emp.salario_base || emp.salario,
        aux_transporte: emp.aux_transporte || 0,
        rodamiento: emp.rodamiento || 0,
        poliza_bolivar: emp.poliza_bolivar || 0,
        poliza_sura: emp.poliza_sura || 0,
        optica: emp.optica || 0,
        prestamos: emp.prestamos || 0
      });
    } else {
      setFormData({
        cedula: '',
        nombre: '',
        cargo: '',
        categoria: 'OTROS',
        salario_base: '',
        aux_transporte: '',
        rodamiento: '',
        poliza_bolivar: '',
        poliza_sura: '',
        optica: '',
        prestamos: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const empData = {
      cedula: formData.cedula,
      nombre: formData.nombre.toUpperCase(),
      cargo: formData.cargo.toUpperCase(),
      categoria: formData.categoria.toUpperCase(),
      salario_base: Number(formData.salario_base),
      aux_transporte: Number(formData.aux_transporte),
      rodamiento: Number(formData.rodamiento),
      poliza_bolivar: Number(formData.poliza_bolivar),
      poliza_sura: Number(formData.poliza_sura),
      optica: Number(formData.optica),
      prestamos: Number(formData.prestamos),
      is_active: true
    };
    
    const res = await upsertEmployeeRecord(empData);
    setIsLoading(false);
    
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

  // formatting helper
  const fmtCOP = (val) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);

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
                <td colSpan="7" className="py-12 text-center text-slate-500">No hay empleados registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-stitch">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800">
                {formData.cedula && employees.some(e => e.cedula === formData.cedula) ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cédula</label>
                <input
                  required
                  type="text"
                  value={formData.cedula}
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: 10203040"
                  readOnly={employees.some(e => e.cedula === formData.cedula)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                  placeholder="Nombres y Apellidos"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cargo</label>
                  <input
                    required
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                    placeholder="Ej: OPERARIO"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="INYECCIÓN">INYECCIÓN</option>
                    <option value="TALLER">TALLER</option>
                    <option value="OTROS">OTROS</option>
                    <option value="NUEVOS">NUEVOS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salario Base</label>
                <input
                  required
                  type="number"
                  value={formData.salario_base}
                  onChange={(e) => setFormData({...formData, salario_base: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: 1300000"
                />
              </div>
              

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-800 mb-4">Valores Recurrentes Fijos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aux. Transporte</label>
                    <input
                      type="number"
                      value={formData.aux_transporte}
                      onChange={(e) => setFormData({...formData, aux_transporte: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rodamiento</label>
                    <input
                      type="number"
                      value={formData.rodamiento}
                      onChange={(e) => setFormData({...formData, rodamiento: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Póliza Bolívar</label>
                    <input
                      type="number"
                      value={formData.poliza_bolivar}
                      onChange={(e) => setFormData({...formData, poliza_bolivar: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Póliza Sura</label>
                    <input
                      type="number"
                      value={formData.poliza_sura}
                      onChange={(e) => setFormData({...formData, poliza_sura: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Óptica</label>
                    <input
                      type="number"
                      value={formData.optica}
                      onChange={(e) => setFormData({...formData, optica: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Préstamos</label>
                    <input
                      type="number"
                      value={formData.prestamos}
                      onChange={(e) => setFormData({...formData, prestamos: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
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
      )}
    </div>
  );
}
