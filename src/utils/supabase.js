import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Check your .env.local file.');
}

// Inicializamos el cliente de Supabase
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// --- SERVICIOS DE BASE DE DATOS (NÓMINA) ---

// Función para guardar todo el estado actual en la nube
export const savePayrollToCloud = async (payrollData) => {
  try {
    const { error } = await supabase
      .from('optimoldes_payroll')
      .upsert({
        id: 'quincena_activa', // Clave estática para siempre tener el último estado
        start_date: payrollData.startDate,
        end_date: payrollData.endDate,
        nomina_rows: payrollData.nominaRows,
        attendance_logs: payrollData.attendanceLogs,
        overrides: payrollData.overrides,
        hidden_columns: payrollData.hiddenColumns,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error guardando en Supabase:", error);
    return { success: false, error };
  }
};

export const loadEmployeesFromCloud = async () => {
  try {
    const { data, error } = await supabase
      .from('optimoldes_employees')
      .select('cedula, biometric_id, nombre, cargo, categoria, banco, tipo_vinculacion, salario_base, aux_transporte, rodamiento, poliza_bolivar, poliza_sura, optica, prestamos')
      .eq('is_active', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error cargando empleados:", error);
    return { success: false, data: [] };
  }
};

// Función para cargar el estado desde la nube al iniciar la app
export const loadPayrollFromCloud = async () => {
  try {
    const { data, error } = await supabase
      .from('optimoldes_payroll')
      .select('*')
      .eq('id', 'quincena_activa')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 es "no hay filas", lo cual es normal la primera vez

    return { success: true, data };
  } catch (error) {
    console.error("Error cargando desde Supabase:", error);
    return { success: false, error };
  }
};
export const uploadEmployeesBulk = async (employees) => {
  try {
    const mappedData = employees.map(emp => ({
      cedula: String(emp.cedula),
      nombre: emp.nombre,
      cargo: emp.cargo || 'OPERARIO',
      categoria: emp.categoria || 'OTROS',
      salario_base: emp.salario || emp.salario_base || 0,
      is_active: true
    }));
    const { error } = await supabase.from('optimoldes_employees').upsert(mappedData, { onConflict: 'cedula' });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error subiendo empleados:", error);
    return { success: false, error };
  }
};

export const upsertEmployeeRecord = async (empData) => {
  try {
    const { error } = await supabase.from('optimoldes_employees').upsert([empData], { onConflict: 'cedula' });
    if (error) {
      alert("❌ ERROR SUPABASE: " + error.message);
      throw error;
    }
    alert("✅ GUARDADO CORRECTO");
    return { success: true };
  } catch (error) {
    console.error("Error upserting employee:", error);
    return { success: false, error };
  }
};

export const toggleEmployeeStatus = async (cedula, currentStatus) => {
  try {
    const { error } = await supabase.from('optimoldes_employees').update({ is_active: !currentStatus }).eq('cedula', cedula);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error toggling status:", error);
    return { success: false, error };
  }
};
