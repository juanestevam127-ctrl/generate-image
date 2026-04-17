"use server";

import { supabase } from "@/lib/supabase";

// --- Regular Clients (Table: clientes) ---
export async function addClientAction(data: any) {
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
        json_stories: data.jsonStories
    };

    const { data: inserted, error } = await supabase
        .from("clientes")
        .insert([dbData])
        .select();

    if (error) throw error;
    return { success: true, data: inserted[0] };
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

    const { error } = await supabase
        .from("clientes")
        .update(dbUpdates)
        .eq("id", id);

    if (error) throw error;
    return { success: true };
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
        json_feed: data.jsonFeed,
        json_stories: data.jsonStories
    };

    const { data: inserted, error } = await supabase
        .from("clientes_vendidos")
        .insert([dbData])
        .select();

    if (error) throw error;
    return { success: true, data: inserted[0] };
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

    const { error } = await supabase
        .from("clientes_vendidos")
        .update(dbUpdates)
        .eq("id", id);

    if (error) throw error;
    return { success: true };
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
