import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request) {
  try {
    const payload = await request.json();
    const { periodo, totales_consolidados, dias_detallados } = payload;

    if (!periodo || !totales_consolidados || !dias_detallados) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    // 1. Insertar periodo_nomina
    const { data: periodoData, error: periodoError } = await supabase
      .from('periodos_nomina')
      .insert([{
        identificador: periodo.identificador,
        fecha_inicio: periodo.fecha_inicio,
        fecha_fin: periodo.fecha_fin,
        estado: 'aprobado'
      }])
      .select()
      .single();

    if (periodoError) throw periodoError;

    const periodoId = periodoData.id;

    // 2. Insertar nomina_detalle
    const nominaDetalleInsert = totales_consolidados.map(t => ({
      ...t,
      periodo_id: periodoId
    }));

    if (nominaDetalleInsert.length > 0) {
      const { error: detalleError } = await supabase
        .from('nomina_detalle')
        .insert(nominaDetalleInsert);

      if (detalleError) throw detalleError;
    }

    // 3. Insertar liquidacion_diaria
    const chunkSize = 500;
    for (let i = 0; i < dias_detallados.length; i += chunkSize) {
      const chunk = dias_detallados.slice(i, i + chunkSize).map(d => ({
        ...d,
        periodo_id: periodoId
      }));

      const { error: dailyError } = await supabase
        .from('liquidacion_diaria')
        .insert(chunk);

      if (dailyError) throw dailyError;
    }

    return NextResponse.json({ success: true, periodoId });

  } catch (error) {
    console.error('Error cerrando quincena:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
