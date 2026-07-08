import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        // Security check using an environment variable
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        const now = new Date().toISOString();

        // 1. Get all pending posts that should have been published by now
        const { data: pendingPosts, error: fetchError } = await supabase
            .from('publicacoes_design_online')
            .select('*')
            .eq('publicado', false)
            .or('enviado_webhook.is.null,enviado_webhook.eq.false')
            .lte('data_agendamento', now)
            .not('data_agendamento', 'is', null);

        if (fetchError) throw fetchError;

        if (!pendingPosts || pendingPosts.length === 0) {
            return NextResponse.json({ message: 'No pending posts to process' });
        }

        // 2. Group by veiculo_gerado and nome_empresa
        const groups: Record<string, any[]> = {};
        pendingPosts.forEach(post => {
            const key = `${post.nome_empresa}-${post.veiculo_gerado}-${post.formato}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(post);
        });

        const results = [];

        // 3. Process each group
        for (const [key, posts] of Object.entries(groups)) {
            const firstPost = posts[0];
            const clientName = firstPost.nome_empresa;
            
            // Check if format starts with "VENDIDO " OR if client exists in clientes_vendidos table
            const { count: isSoldClientCount } = await supabase
                .from('clientes_vendidos')
                .select('*', { count: 'exact', head: true })
                .eq('name', clientName);

            const isSold = (firstPost.formato && firstPost.formato.toUpperCase().startsWith("VENDIDO ")) || 
                           (isSoldClientCount !== null && isSoldClientCount > 0);

            const webhookUrl = isSold
                ? "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/postagens-vendidos"
                : "https://criadordigital-n8n-webhook.5rqumh.easypanel.host/webhook/agendar_postagem";

            // Fetch client details
            let client: any = null;
            let clientError: any = null;

            if (isSold) {
                const { data, error } = await supabase
                    .from('clientes_vendidos')
                    .select('*')
                    .eq('name', clientName)
                    .single();
                client = data;
                clientError = error;

                // Fallback to 'clientes' if credentials are missing
                if (client && (!client.id_facebook || !client.id_instagram || !client.token)) {
                    const { data: standardClient } = await supabase
                        .from('clientes')
                        .select('*')
                        .eq('name', clientName)
                        .single();
                    if (standardClient) {
                        client = {
                            ...client,
                            id_facebook: client.id_facebook || standardClient.id_facebook,
                            id_instagram: client.id_instagram || standardClient.id_instagram,
                            token: client.token || standardClient.token
                        };
                    }
                }
            } else {
                const { data, error } = await supabase
                    .from('clientes')
                    .select('*')
                    .eq('name', clientName)
                    .single();
                client = data;
                clientError = error;
            }

            if (clientError || !client) {
                console.error(`Client not found for post group ${key}:`, clientError);
                continue;
            }

            const isReels = firstPost.formato === 'REELS' || firstPost.formato === 'VENDIDO REELS';
            const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
            const isVideo = (url: string) => url && videoExtensions.some(ext => url.toLowerCase().endsWith(ext));

            const cleanDescription = firstPost.descricao || "";

            const payload = {
                client: client.name,
                facebook_id: client.id_facebook,
                instagram_id: client.id_instagram,
                token: client.token,
                images: posts.map(p => p.imagem),
                video: posts.find(p => isVideo(p.imagem))?.imagem,
                reels_cover: posts.find(p => !isVideo(p.imagem))?.imagem,
                description: cleanDescription,
                format: firstPost.formato,
                post_type: isReels 
                    ? 'REELS' 
                    : (firstPost.formato === 'FEED' || firstPost.formato === 'VENDIDO FEED'
                        ? (posts.length > 1 ? 'CARROSSEL' : 'ESTATICA')
                        : 'IMAGEM'),
                scheduled_at: firstPost.data_agendamento,
                scheduled_at_local: "",
                timezone: "America/Sao_Paulo",
                timezone_offset: -180, // Approximate for BRT
                is_carousel: !isReels && posts.length > 1,
                veiculo_gerado: firstPost.veiculo_gerado
            };

            // Call Webhook
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const ids = posts.map(p => p.id);
                    await supabase
                        .from('publicacoes_design_online')
                        .update({ enviado_webhook: true })
                        .in('id', ids);

                    results.push({ key, status: 'success' });
                } else {
                    results.push({ key, status: 'failed', error: await res.text() });
                }
            } catch (err) {
                results.push({ key, status: 'error', error: (err as Error).message });
            }
        }

        return NextResponse.json({ processed: results.length, details: results });
    } catch (error) {
        console.error('Error in cron job:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
