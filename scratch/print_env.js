console.log("Environment variables:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("DB") || k.includes("PASS") || k.includes("KEY") || k.includes("URL")));
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY);
