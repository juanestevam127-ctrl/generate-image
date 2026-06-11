const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data, error } = await supabase.rpc('list_public_tables');
        if (error) throw error;
        console.log("Data from list_public_tables:", data);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

check();
