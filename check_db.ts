import { supabase } from './src/lib/supabase';

async function check() {
    console.log("Checking publicacoes_design_online table...");
    
    // Count all
    const { count: total, error: err1 } = await supabase
        .from('publicacoes_design_online')
        .select('*', { count: 'exact', head: true });
    
    console.log("Total records:", total);
    
    // Count unpublished
    const { count: unpublished, error: err2 } = await supabase
        .from('publicacoes_design_online')
        .select('*', { count: 'exact', head: true })
        .eq('publicado', false);
    
    console.log("Unpublished records:", unpublished);
    
    // Count published
    const { count: published, error: err3 } = await supabase
        .from('publicacoes_design_online')
        .select('*', { count: 'exact', head: true })
        .eq('publicado', true);
    
    console.log("Published records:", published);

    // Count with data_agendamento
    const { count: scheduled, error: err4 } = await supabase
        .from('publicacoes_design_online')
        .select('*', { count: 'exact', head: true })
        .not('data_agendamento', 'is', null);
    
    console.log("Scheduled records:", scheduled);
}

check();
