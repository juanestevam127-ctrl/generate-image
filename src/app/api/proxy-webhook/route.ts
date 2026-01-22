import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url, payload } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        console.log(`[Proxy Webhook] Target: ${url}`);
        console.log(`[Proxy Webhook] Payload Size: ${JSON.stringify(payload).length} chars`);

        // Add a timeout to avoid hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
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
