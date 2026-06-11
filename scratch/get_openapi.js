const supabaseUrl = 'https://arxaqnwuyesmjcsyfmbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeGFxbnd1eWVzbWpjc3lmbWJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwNzEzOCwiZXhwIjoyMDcxNDgzMTM4fQ.TtZiQfzAnjgKhRuSOVDhK0O12HefNOHlrTlTgwneBGM';

async function check() {
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.log("Paths:");
        const rpcPaths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
        console.log(rpcPaths);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

check();
