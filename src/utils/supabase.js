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