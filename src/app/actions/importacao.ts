"use server";
import { supabase } from "@/lib/supabase";

export async function fetchImportacaoVeiculosAction(clienteId: string) {
    try {
        const { data, error } = await supabase
            .from("VeiculoOperador")
            .select("*")
            .eq("clienteId", clienteId)
            .order("createdAt", { ascending: false });

        if (error) {
            console.error("Error fetching vehicles:", error);
            return { success: false, error: error.message };
        }

        return { success: true, vehicles: data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function marcarVeiculoComoImportadoAction(id: string) {
    try {
        const { error } = await supabase
            .from("VeiculoOperador")
            .update({ importado: true })
            .eq("id", id);
        
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
