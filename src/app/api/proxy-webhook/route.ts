import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url, payload } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Fetch configuracoes_gerais from Supabase
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        
        let configData = {};
        const { data: configRows } = await supabase.from('configuracoes_gerais').select('*').limit(1);
        if (configRows && configRows.length > 0) {
            configData = {
                servidor_url: configRows[0].servidor_url,
                bucket_nome: configRows[0].bucket_nome,
                pasta_nome: configRows[0].pasta_nome,
                secret_access_key: configRows[0].secret_access_key,
                access_key_id: configRows[0].access_key_id
            };
        }

        const mergedPayload = {
            ...payload,
            ...configData
        };

        console.log(`[Proxy Webhook] Target: ${url}`);
        console.log(`[Proxy Webhook] Payload Size: ${JSON.stringify(mergedPayload).length} chars`);

        // Add a timeout to avoid hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7200000); // 2 hours timeout

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mergedPayload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const status = response.status;
        const text = await response.text();

        // Check if response is JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { message: text };
        }

        return NextResponse.json(data, { status });

    } catch (error) {
        console.error("[Proxy Webhook] Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: (error as Error).message },
            { status: 500 }
        );
    }
}
