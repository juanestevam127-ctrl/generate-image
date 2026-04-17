"use server";

import { supabase } from "@/lib/supabase";

export async function fetchSchedulerImagesAction(clientName: string, isSold: boolean = false) {
    try {
        let query = supabase
            .from("publicacoes_design_online")
            .select("*")
            .eq("nome_empresa", clientName)
            .eq("publicado", false)
            .is("data_agendamento", null);

        if (isSold) {
            query = query.ilike("formato", "VENDIDO %");
        } else {
            query = query.not("formato", "ilike", "VENDIDO %");
        }

        const { data, error } = await query
            .order("ordem", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("fetchSchedulerImagesAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSchedulerRecordAction(id: number | number[], updates: any) {
    try {
        const query = supabase.from("publicacoes_design_online").update(updates);
        
        if (Array.isArray(id)) {
            query.in("id", id);
        } else {
            query.eq("id", id);
        }

        const { error } = await query;
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("updateSchedulerRecordAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSchedulerImageAction(id: number) {
    try {
        const { error } = await supabase
            .from("publicacoes_design_online")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("deleteSchedulerImageAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function insertSchedulerPostAction(data: any) {
    try {
        const { data: inserted, error } = await supabase
            .from("publicacoes_design_online")
            .insert(data)
            .select();

        if (error) throw error;
        return { success: true, data: inserted };
    } catch (error: any) {
        console.error("insertSchedulerPostAction Error:", error);
        return { success: false, error: error.message };
    }
}

// Special action for format updates because it affects multiple rows by criteria
export async function updateGroupFormatAction(clientName: string, vehicle: string, oldFormat: string, newFormat: string) {
    try {
        const { error } = await supabase
            .from("publicacoes_design_online")
            .update({ formato: newFormat })
            .eq("nome_empresa", clientName)
            .eq("veiculo_gerado", vehicle)
            .eq("formato", oldFormat)
            .eq("publicado", false)
            .is("data_agendamento", null);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("updateGroupFormatAction Error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchAllScheduledPostsAction() {
    const { data, error } = await supabase
        .from("publicacoes_design_online")
        .select("id, data_agendamento, formato, veiculo_gerado, nome_empresa, descricao")
        .not("data_agendamento", "is", null)
        .eq("publicado", false)
        .order("data_agendamento", { ascending: true });

    if (error) {
        console.error("Error in fetchAllScheduledPostsAction:", error);
        return [];
    }

    return data;
}
