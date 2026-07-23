import React, { useState } from 'react';
import { Save, Calendar as CalendarIcon } from 'lucide-react';

const CeldaTurno = ({ valor, onChange, getTurnColor }) => {
  const [showMenu, setShowMenu] = useState(false);
  const oficiales = ['6AM A 2PM', '2PM A 10PM', '10PM A 6AM', '6AM A 6PM', '6PM A 6AM', '7:30 A 5PM', 'DESCANSO', 'VACACIONES', 'LICENCIA'];

  return (
    <div className="relative w-full h-full">
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowMenu(true)}
        onBlur={() => setTimeout(() => setShowMenu(false), 200)}
        placeholder="Turno..."
        className={`w-full h-full p-2 text-xs text-center border-none focus:ring-inset focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-300 uppercase transition-colors ${getTurnColor(valor)}`}
      />
      {showMenu && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 shadow-xl z-50 rounded overflow-hidden">
          {oficiales.map(opc => (
            <div 
              key={opc} 
              className="px-3 py-2 text-xs hover:bg-slate-100 cursor-pointer text-slate-700 font-medium"
              onClick={() => {
                onChange(opc);
                setShowMenu(false);
              }}
            >
              {opc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TabHorarios({ empleados }) {
  const [semana, setSemana] = useState('');
  const [horarios, setHorarios] = useState({});
  const [empleadosOcultos, setEmpleadosOcultos] = useState([]);

  const dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

  const handleCellChange = (cedula, dia, valor) => {
    setHorarios(prev => ({
      ...prev,
      [`${cedula}_${dia}`]: valor
    }));
  };

  const handleSave = () => {
    console.log('Guardando Programación Semanal...');
    console.log('Semana:', semana);
    console.log('Horarios:', horarios);
    alert('Programación Semanal guardada (simulación). Verifica la consola.');
  };

  const jerarquiaCategorias = {
    'Monitor': 1,
    'Calidad': 2,
    'Montador': 3,
    'Operario de produccion': 4,
    'Operador': 5,
    'Programador': 6,
    'Mecanico': 7,
    'Supernumerario': 8
  };

  const catProduccion = ['Monitor', 'Calidad', 'Operario de produccion', 'Montador', 'Supernumerario'];
  const catTaller = ['Mecanico', 'Programador', 'Operador'];

  const baseFiltrados = empleados.filter(emp => emp.categoria !== 'Administrativo' && !empleadosOcultos.includes(emp.cedula));

  const sortEmployees = (arr) => arr.sort((a, b) => {
    const pesoA = jerarquiaCategorias[a.categoria] || 99;
    const pesoB = jerarquiaCategorias[b.categoria] || 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  const addRowNumbers = (arr) => {
    let categoriaActual = '';
    let contador = 1;
    return arr.map(emp => {
        const cat = emp.categoria || '';
        if (cat !== categoriaActual) {
            categoriaActual = cat;
            contador = 1;
        }
        return { ...emp, numeroFila: contador++ };
    });
  };

  const empleadosProduccion = addRowNumbers(sortEmployees(baseFiltrados.filter(emp => catProduccion.includes(emp.categoria))));
  const empleadosTaller = addRowNumbers(sortEmployees(baseFiltrados.filter(emp => catTaller.includes(emp.categoria))));
  const empleadosOtros = addRowNumbers(sortEmployees(baseFiltrados.filter(emp => !catProduccion.includes(emp.categoria) && !catTaller.includes(emp.categoria))));

  const todosVisibles = [...empleadosProduccion, ...empleadosTaller, ...empleadosOtros];

  const getTurnColor = (turno = '') => {
    const t = turno.toUpperCase().trim();
    if (t === '') return 'bg-white';

    if (t.includes('6AM A 2PM')) return 'bg-green-200 text-black';
    if (t.includes('2PM A 10PM')) return 'bg-blue-200 text-black';
    if (t.includes('10PM A 6AM')) return 'bg-orange-200 text-black';
    if (t.includes('6AM A 6PM') || t.includes('6PM A 6AM')) return 'bg-yellow-300 text-black';
    if (t.includes('VACACIONES') || t.includes('LICENCIA')) return 'bg-yellow-400 font-bold text-black';
    if (t.includes('DESCANSO')) return 'bg-white font-bold text-black';

    const oficiales = ['6AM A 2PM', '2PM A 10PM', '10PM A 6AM', '6AM A 6PM', '6PM A 6AM', '7:30 A 5PM', 'DESCANSO', 'VACACIONES', 'LICENCIA'];
    if (t !== '' && !oficiales.includes(t)) {
      return 'bg-yellow-100 text-black font-semibold';
    }

    return 'bg-white font-semibold text-slate-700';
  };

  const handleFillDay = (dia) => {
    setHorarios(prev => {
      const next = { ...prev };
      const allDescanso = todosVisibles.every(emp => next[`${emp.cedula}_${dia}`] === 'DESCANSO');
      
      todosVisibles.forEach(emp => {
        next[`${emp.cedula}_${dia}`] = allDescanso ? '' : 'DESCANSO';
      });
      return next;
    });
  };

  const handleFillWeek = (cedula) => {
    setHorarios(prev => {
      const next = { ...prev };
      const valorLunes = next[`${cedula}_LUNES`] || '';
      ['MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'].forEach(dia => {
        next[`${cedula}_${dia}`] = valorLunes;
      });
      return next;
    });
  };

  const renderRow = (emp) => (
    <tr key={emp.cedula} className="hover:bg-slate-50 transition-colors group">
      <td className="p-2 border border-gray-800 text-xs font-bold text-slate-400 text-center bg-white group-hover:bg-slate-50 sticky left-0 z-10">
        <div className="flex items-center justify-center gap-1">
          <button 
            onClick={() => setEmpleadosOcultos(prev => [...prev, emp.cedula])}
            className="text-[8px] text-red-500 hover:text-red-700 opacity-20 group-hover:opacity-100 transition-opacity"
            title="Ocultar trabajador"
          >
            [-]
          </button>
          <span>{emp.numeroFila}</span>
        </div>
      </td>
      <td className="p-2 border border-gray-800 text-xs font-black text-slate-700 bg-white group-hover:bg-slate-50 sticky left-12 z-10 flex items-center justify-between">
        <span>{emp.nombre}</span>
        <button 
          onClick={() => handleFillWeek(emp.cedula)}
          className="opacity-20 group-hover:opacity-100 transition-opacity hover:bg-slate-200 rounded p-1"
          title="Copiar Lunes a toda la semana"
        >
          ➡️
        </button>
      </td>
      <td className="p-2 border border-gray-800 text-xs font-semibold text-slate-500 capitalize bg-white">{emp.categoria || emp.cargo || ''}</td>
      {dias.map(dia => {
        const cellKey = `${emp.cedula}_${dia}`;
        const valorActual = horarios[cellKey] || '';
        return (
          <td key={dia} className="p-0 border border-gray-800 bg-white relative min-w-[120px]">
            <CeldaTurno 
              valor={valorActual}
              onChange={(val) => handleCellChange(emp.cedula, dia, val)}
              getTurnColor={getTurnColor}
            />
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="space-y-6 animate-stitch">
      
      <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Gestión de Horarios y Turnos</h4>
            <p className="text-slate-500 text-xs font-semibold">Programación semanal basada en el archivo T.SEMANAL.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Semana:</span>
            <input 
              type="week" 
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-sm font-black text-slate-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button 
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            <Save size={16} />
            Guardar Programación
          </button>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200/60 shadow-md overflow-visible">
        <div className="overflow-x-auto overflow-y-visible custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max border-gray-800">
            <thead>
              <tr className="bg-blue-900 text-white font-bold text-xs uppercase">
                <th className="p-3 border border-gray-800 text-center w-12 bg-blue-900 sticky left-0 z-20">N°</th>
                <th className="p-3 border border-gray-800 sticky left-12 z-20 bg-blue-900 min-w-[200px]">PERSONAL</th>
                <th className="p-3 border border-gray-800 min-w-[150px]">PUESTO</th>
                {dias.map(dia => (
                  <th key={dia} className="p-3 border border-gray-800 text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{dia}</span>
                      <button 
                        onClick={() => handleFillDay(dia)}
                        className="text-[10px] bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                        title={`Asignar DESCANSO a todos el ${dia}`}
                      >
                        <span>🛏️</span> Descanso
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            {empleadosProduccion.length > 0 && (
              <tbody>
                {empleadosProduccion.map(renderRow)}
              </tbody>
            )}

            {empleadosTaller.length > 0 && (
              <tbody>
                <tr className="bg-blue-900 text-white font-bold text-xs uppercase">
                  <td colSpan={dias.length + 3} className="p-2 border border-gray-800 text-center tracking-widest sticky left-0 z-10 bg-blue-900">
                    --- TALLER ---
                  </td>
                </tr>
                {empleadosTaller.map(renderRow)}
              </tbody>
            )}

            {empleadosOtros.length > 0 && (
              <tbody>
                <tr className="bg-blue-900 text-white font-bold text-xs uppercase">
                  <td colSpan={dias.length + 3} className="p-2 border border-gray-800 text-center tracking-widest sticky left-0 z-10 bg-blue-900">
                    --- OTROS ---
                  </td>
                </tr>
                {empleadosOtros.map(renderRow)}
              </tbody>
            )}

            {todosVisibles.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={dias.length + 3} className="p-8 text-center text-slate-400 text-sm font-semibold">
                    No hay empleados registrados para programar o todos están ocultos.
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </section>

      {empleadosOcultos.length > 0 && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4 w-fit shadow-sm">
          <span className="text-sm font-bold text-slate-600">Trabajadores Ocultos ({empleadosOcultos.length}):</span>
          <select 
            className="p-2 border border-slate-300 rounded bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            value=""
            onChange={(e) => {
              if(e.target.value) {
                setEmpleadosOcultos(prev => prev.filter(ced => ced !== e.target.value));
              }
            }}
          >
            <option value="">Selecciona para restaurar...</option>
            {empleadosOcultos.map(ced => {
              const emp = empleados.find(e => e.cedula === ced);
              return <option key={ced} value={ced}>{emp?.nombre} ({emp?.categoria})</option>;
            })}
          </select>
        </div>
      )}

    </div>
  );
}
