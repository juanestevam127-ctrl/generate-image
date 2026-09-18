"use server";
import { createClient } from "@supabase/supabase-js";

const externalSupabaseUrl = "https://zkakyywtnfldnlrgjqoj.supabase.co";
const externalSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWt5eXd0bmZsZG5scmdqcW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY1NTMyNSwiZXhwIjoyMTA1MjMxMzI1fQ.30M_66nNkHASw8WxdlT1OKuMjC-1Yu4AtUZmn73Eb0I";
const externalSupabase = createClient(externalSupabaseUrl, externalSupabaseKey);

export async function fetchImportacaoVeiculosAction(clientName: string) {
    try {
        const { data, error } = await externalSupabase
            .from("Veiculo")
            .select("id, marca, modelo, ano, observacoes, status")
            .eq("status", "DISPONIVEL");

        if (error) {
            console.error("Error fetching vehicles:", error);
            return { success: false, error: error.message };
        }

        // Filter vehicles that have a payload for this client
        const vehicles = data.filter(v => {
            if (!v.observacoes) return false;
            let obs = v.observacoes;
            if (typeof obs === "string") {
                try {
                    obs = JSON.parse(obs);
                    v.observacoes = obs; // Keep it parsed for the frontend
                } catch(e) {
                    return false;
                }
            }
            if (!obs.geradorPayloads) return false;
            return obs.geradorPayloads.some((p: any) => p.layoutName === clientName);
        });

        return { success: true, vehicles };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
