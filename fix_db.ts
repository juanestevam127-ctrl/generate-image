import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fix() {
    // 1. Fetch VeiculoOperador rows that have a clickupTaskId
    const { data: veiculos } = await supabase.from('VeiculoOperador').select('id, clickupTaskId, clienteId').not('clickupTaskId', 'is', null);
    
    // 2. We can't easily fetch all ClickUp tasks without hitting the API.
    // Instead, I'll just fix the specific one we know is broken.
    
    const badId = '7fc062a9-4b92-4b8a-9c64-7bfa3cc9bcbc';
    const correctClienteId = 'ff2821b3-c72f-40d4-ae80-76024522dd24'; // Barella

    const { error } = await supabase.from('VeiculoOperador').update({ clienteId: correctClienteId }).eq('id', badId);
    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("Updated vehicle", badId, "to Barella");
    }
}
fix();
