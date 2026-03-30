import { supabase } from "./supabase";
import { addMinutes, isBefore, isAfter, parseISO } from "date-fns";

export const POST_TYPE_CONFIG: Record<string, { delay: number; label: string }> = {
    "CARROSSEL": { delay: 30, label: "Carrossel" },
    "REELS": { delay: 15, label: "Reels / Vídeo" },
    "ESTATICA": { delay: 10, label: "Imagem Estática" },
    "IMAGEM": { delay: 10, label: "Imagem Estática" },
    "STORY": { delay: 10, label: "Story" },
    "STORIES": { delay: 10, label: "Story" },
};

export interface ScheduledPost {
    id: number;
    data_agendamento: string;
    formato: string;
    veiculo_gerado: string;
    nome_empresa: string;
    postType?: string;
}

export function getPostDelay(postType: string): number {
    const type = postType?.toUpperCase() || "ESTATICA";
    return POST_TYPE_CONFIG[type]?.delay || 10;
}

export async function fetchAllScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
        .from("publicacoes_design_online")
        .select("id, data_agendamento, formato, veiculo_gerado, nome_empresa, descricao")
        .not("data_agendamento", "is", null)
        .eq("publicado", false)
        .order("data_agendamento", { ascending: true });

    if (error) {
        console.error("Error fetching scheduled posts:", error);
        return [];
    }

    // Grouping logic similar to components
    // Since we need to know the 'postType' (Carousel, etc)
    // We'll process the raw records
    const grouped: Record<string, ScheduledPost> = {};
    
    (data || []).forEach(row => {
        const key = `${row.nome_empresa}-${row.veiculo_gerado}-${row.formato}-${row.data_agendamento}`;
        if (!grouped[key]) {
            // Determine postType for the group
            const albumSize = data.filter(r => 
                r.nome_empresa === row.nome_empresa && 
                r.veiculo_gerado === row.veiculo_gerado && 
                r.formato === row.formato && 
                r.data_agendamento === row.data_agendamento
            ).length;

            let type = "ESTATICA";
            const fmt = row.formato.toUpperCase();
            if (fmt.includes("REELS")) type = "REELS";
            else if (fmt.includes("STORY") || fmt.includes("STORIES")) type = "STORY";
            else if (albumSize > 1) type = "CARROSSEL";

            grouped[key] = {
                ...row,
                postType: type
            } as ScheduledPost;
        }
    });

    return Object.values(grouped);
}

export interface SchedulingConflict {
    existingPost: ScheduledPost;
    reason: string;
}

export function checkSchedulingConflicts(
    proposedTime: Date,
    proposedType: string,
    existingPosts: ScheduledPost[],
    excludePostIds: number[] = []
): SchedulingConflict[] {
    const conflicts: SchedulingConflict[] = [];
    const proposedDuration = getPostDelay(proposedType);
    const proposedEnd = addMinutes(proposedTime, proposedDuration);

    existingPosts.forEach(post => {
        if (excludePostIds.includes(post.id)) return;

        const existingStart = parseISO(post.data_agendamento);
        const existingDuration = getPostDelay(post.postType || "ESTATICA");
        const existingEnd = addMinutes(existingStart, existingDuration);

        // Check for overlap
        // A conflict occurs if:
        // (ProposedStart < ExistingEnd) AND (ProposedEnd > ExistingStart)
        const isOverlapping = isBefore(proposedTime, existingEnd) && isAfter(proposedEnd, existingStart);

        if (isOverlapping) {
            conflicts.push({
                existingPost: post,
                reason: `O post "${post.veiculo_gerado}" (${post.nome_empresa}) está agendado para ${existingStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} e exige um intervalo de ${existingDuration} minutos.`
            });
        }
    });

    return conflicts;
}
