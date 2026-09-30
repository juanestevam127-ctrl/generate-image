"use server";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getVeiculoByTaskIdAction(taskId: string) {
    try {
        const { data, error } = await supabase
            .from("VeiculoOperador")
            .select("*")
            .eq("clickupTaskId", taskId)
            .single();
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateVeiculoDadosAction(id: string, novosDados: any) {
    try {
        const { error } = await supabase
            .from("VeiculoOperador")
            .update({ dados: novosDados })
            .eq("id", id);
        if (error) throw error;
        revalidatePath("/veiculos");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
