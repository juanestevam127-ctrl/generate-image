const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const TABLE_NAME = 'publicacoes_design_online';
    console.log(`Checking ${TABLE_NAME} table...`);
    
    try {
        // Total
        const { count: total, error: e1 } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true });
        if (e1) throw e1;
        console.log("Total records:", total);
        
        // Unpublished
        const { count: unpublished, error: e2 } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true })
            .eq('publicado', false);
        console.log("Unpublished records (publicado=false):", unpublished);
        
        // Published
        const { count: published, error: e3 } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true })
            .eq('publicado', true);
        console.log("Published records (publicado=true):", published);

        // Fetch first 5 records to see values
        const { data: samples, error: e4 } = await supabase
            .from(TABLE_NAME)
            .select('id, nome_empresa, formato, publicado, created_at')
            .limit(10);
        
        console.log("Sample records:");
        console.table(samples);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

check();
