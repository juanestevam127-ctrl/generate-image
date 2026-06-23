"use server";

import { supabase } from "@/lib/supabase";

// --- Regular Clients (Table: clientes) ---
async function getNextGroupAndSchedule() {
    // Query all clients with non-null divisao_developrs
    const { data: clients, error } = await supabase
        .from("clientes")
        .select("divisao_developrs, horario_developers")
        .not("divisao_developrs", "is", null);
    
    if (error) throw error;

    const activeClients = clients || [];
    const hours = ["13h", "14h", "15h", "16h", "17h"];
    
    let group = 1;
    while (true) {
        const groupClients = activeClients.filter(c => c.divisao_developrs === group);
        
        if (groupClients.length < 5) {
            const usedHours = groupClients.map(c => c.horario_developers);
            const freeHour = hours.find(h => !usedHours.includes(h)) || "13h";
            return { divisao_developrs: group, horario_developers: freeHour };
        }
        
        group++;
    }
}

export async function getNextDivisaoAction() {
    try {
        const next = await getNextGroupAndSchedule();
        return { success: true, data: next };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addClientAction(data: any) {
    let nextDivisao = null;
    let nextHorario = null;

    if (data.clienteAtivo !== false) {
        const groupAndSchedule = await getNextGroupAndSchedule();
        nextDivisao = groupAndSchedule.divisao_developrs;
        nextHorario = groupAndSchedule.horario_developers;
    }

    const dbData = {
        name: data.name,
        webhook_url: data.webhookUrl,
        webhook_postagens: data.webhookPostagens,
        prompt: data.prompt,
        columns: data.columns,
        caption_template: data.captionTemplate,
        id_facebook: data.facebookId,
        id_instagram: data.instagramId,
        token: data.token,
        json_feed: data.jsonFeed,
        json_stories: data.jsonStories,
        divisao_developrs: nextDivisao,
        horario_developers: nextHorario,
        guide_stories: data.guideStories,
        guide_feed: data.guideFeed,
        cliente_ativo: data.clienteAtivo
    };

    try {
        const { data: inserted, error } = await supabase
            .from("clientes")
            .insert([dbData])
            .select();

        if (error) throw error;
        return { success: true, data: inserted[0] };
    } catch (e: any) {
        console.error("Add Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function updateClientAction(id: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.columns) dbUpdates.columns = updates.columns;
    if (updates.captionTemplate !== undefined) dbUpdates.caption_template = updates.captionTemplate;
    if (updates.facebookId !== undefined) dbUpdates.id_facebook = updates.facebookId;
    if (updates.instagramId !== undefined) dbUpdates.id_instagram = updates.instagramId;
    if (updates.token !== undefined) dbUpdates.token = updates.token;
    if (updates.guideStories !== undefined) dbUpdates.guide_stories = updates.guideStories;
    if (updates.guideFeed !== undefined) dbUpdates.guide_feed = updates.guideFeed;
    if (updates.clienteAtivo !== undefined) dbUpdates.cliente_ativo = updates.clienteAtivo;

    try {
        // If activation status is specified, we check if we need to assign or clear group/schedule
        if (updates.clienteAtivo !== undefined) {
            const { data: currentClient, error: getError } = await supabase
                .from("clientes")
                .select("cliente_ativo, divisao_developrs")
                .eq("id", id)
                .single();

            if (!getError && currentClient) {
                if (updates.clienteAtivo === true && (!currentClient.cliente_ativo || !currentClient.divisao_developrs)) {
                    const groupAndSchedule = await getNextGroupAndSchedule();
                    dbUpdates.divisao_developrs = groupAndSchedule.divisao_developrs;
                    dbUpdates.horario_developers = groupAndSchedule.horario_developers;
                } else if (updates.clienteAtivo === false) {
                    dbUpdates.divisao_developrs = null;
                    dbUpdates.horario_developers = null;
                }
            }
        }

        const { data: updated, error } = await supabase
            .from("clientes")
            .update(dbUpdates)
            .eq("id", id)
            .select();

        if (error) throw error;
        return { success: true, data: updated ? updated[0] : null };
    } catch (e: any) {
        console.error("Update Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteClientAction(id: string) {
    const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

// --- Sold Clients (Table: clientes_vendidos) ---
export async function addSoldClientAction(data: any) {
    const dbData = {
        name: data.name,
        webhook_url: data.webhookUrl,
        webhook_postagens: data.webhookPostagens,
        prompt: data.prompt,
        columns: data.columns,
        caption_template: data.captionTemplate,
        id_facebook: data.facebookId,
        id_instagram: data.instagramId,
        token: data.token,
        json_stories: data.jsonStories,
        guide_stories: data.guideStories,
        guide_feed: data.guideFeed,
        cliente_ativo: data.clienteAtivo
    };

    try {
        const { data: inserted, error } = await supabase
            .from("clientes_vendidos")
            .insert([dbData])
            .select();

        if (error) throw error;
        return { success: true, data: inserted[0] };
    } catch (e: any) {
        console.error("Add Sold Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function updateSoldClientAction(id: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.columns) dbUpdates.columns = updates.columns;
    if (updates.captionTemplate !== undefined) dbUpdates.caption_template = updates.captionTemplate;
    if (updates.facebookId !== undefined) dbUpdates.id_facebook = updates.facebookId;
    if (updates.instagramId !== undefined) dbUpdates.id_instagram = updates.instagramId;
    if (updates.token !== undefined) dbUpdates.token = updates.token;
    if (updates.guideStories !== undefined) dbUpdates.guide_stories = updates.guideStories;
    if (updates.guideFeed !== undefined) dbUpdates.guide_feed = updates.guideFeed;
    if (updates.clienteAtivo !== undefined) dbUpdates.cliente_ativo = updates.clienteAtivo;

    try {
        const { error } = await supabase
            .from("clientes_vendidos")
            .update(dbUpdates)
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("Update Sold Client Error:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteSoldClientAction(id: string) {
    const { error } = await supabase
        .from("clientes_vendidos")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

// --- Layout Clients (Table: design_online_layouts_clientes) ---
export async function addLayoutClientAction(data: any) {
    const dbData = {
        nome_cliente: data.name,
        webhook_url: data.webhookUrl,
        webhook_postagens: data.webhookPostagens,
        prompt: data.prompt,
        columns: data.columns,
        instagram_user_id: data.instagramUserId,
        instagram_token: data.instagramToken,
        facebook_user_id: data.facebookUserId,
        facebook_token: data.facebookToken,
        modelo_feed_id: data.modeloFeedId,
        modelo_stories_id: data.modeloStoriesId,
        json_cliente: data.jsonCliente
    };

    const { data: inserted, error } = await supabase
        .from("design_online_layouts_clientes")
        .insert([dbData])
        .select();

    if (error) throw error;
    return { success: true, data: inserted[0] };
}

export async function updateLayoutClientAction(id: string, updates: any) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.nome_cliente = updates.name;
    if (updates.webhookUrl) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.webhookPostagens) dbUpdates.webhook_postagens = updates.webhookPostagens;
    if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
    if (updates.columns) dbUpdates.columns = updates.columns;
    if (updates.instagramUserId) dbUpdates.instagram_user_id = updates.instagramUserId;
    if (updates.instagramToken) dbUpdates.instagram_token = updates.instagramToken;
    if (updates.facebookUserId) dbUpdates.facebook_user_id = updates.facebookUserId;
    if (updates.facebookToken) dbUpdates.facebook_token = updates.facebookToken;
    if (updates.modeloFeedId) dbUpdates.modelo_feed_id = updates.modeloFeedId;
    if (updates.modeloStoriesId) dbUpdates.modelo_stories_id = updates.modeloStoriesId;
    if (updates.jsonCliente) dbUpdates.json_cliente = updates.jsonCliente;

    const { error } = await supabase
        .from("design_online_layouts_clientes")
        .update(dbUpdates)
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

export async function deleteLayoutClientAction(id: string) {
    const { error } = await supabase
        .from("design_online_layouts_clientes")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

// --- Users (Table: usuarios) ---
export async function registerUserAction(userData: any) {
    const { error } = await supabase
        .from("usuarios")
        .insert([userData]);

    if (error) throw error;
    return { success: true };
}

export async function removeUserAction(email: string) {
    const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("email", email);

    if (error) throw error;
    return { success: true };
}
