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
        console.log("RPC Details:");
        for (const [path, info] of Object.entries(data.paths)) {
            if (path.startsWith('/rpc/')) {
                console.log(`\n--- ${path} ---`);
                console.log(JSON.stringify(info, null, 2));
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

check();
